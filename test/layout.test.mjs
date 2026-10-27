import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));

test('dist contains only the site, drafts use shared templates and never enter publication', async () => {
  const workspace = await mkdtemp(path.join(root, '.test-workspace-'));
  const run = (args, env = {}) => execFileSync(process.execPath, ['scripts/site.mjs', ...args], {
    cwd: workspace,
    env: { ...process.env, SITE_INPUT: '', SITE_DRAFTS: '', SITE_INCLUDE_DRAFTS: '', ...env },
    encoding: 'utf8', stdio: 'pipe',
  });
  try {
    for (const name of ['src', 'scripts']) await cp(path.join(root, name), path.join(workspace, name), { recursive: true });
    await cp(path.join(root, 'eleventy.config.js'), path.join(workspace, 'eleventy.config.js'));
    await writeFile(path.join(workspace, 'package.json'), '{"type":"module"}');
    await mkdir(path.join(workspace, 'drafts', 'ai-playground'), { recursive: true });
    const draftFile = path.join(workspace, 'drafts', 'ai-playground', 'review-only.md');
    await writeFile(draftFile, `---
title: 검토 전용 AI 글
summary: 게시 빌드에는 들어가지 않아야 한다.
date: 2026-10-27
category:
  slug: ai-playground
  name: AI 놀이터
postTags: []
---

**AI 초안**이며 {{ literal }} 예시를 유지한다.
`);
    const read = (folder, name) => readFile(path.join(workspace, folder, name), 'utf8');
    await mkdir(path.join(workspace, 'drafts', '.previous-preview'), { recursive: true });
    await writeFile(path.join(workspace, 'drafts', '.previous-preview', 'hidden.md'), 'Hidden snapshot must not be rendered.');
    run(['build'], { SITE_INCLUDE_DRAFTS: '1', SITE_DRAFTS: 'drafts' });
    assert.match(await read('dist', 'posts/game/eternal-return/lumia-outing.html'), /<h1>루미아섬 나들이<\/h1>/);
    assert.match(await read('dist', 'posts/game/eternal-return/lumia-outing.html'), /noindex/);
    assert.doesNotMatch(await read('dist', 'posts/index.html'), /검토 전용 AI 글/);
    assert.match(await read('dist', 'style.css'), /--bg/);
    assert.match(await read('dist', 'quotes.js'), /quote/);
    assert.equal(await read('dist', '.nojekyll'), '');
    assert.deepEqual((await readdir(path.join(workspace, 'dist'))).sort(), ['.nojekyll', 'about', 'categories', 'index.html', 'posts', 'quotes.js', 'style.css', 'tags']);
    await writeFile(path.join(workspace, 'dist', 'old-generated.html'), 'obsolete');
    run(['build']);
    await assert.rejects(read('dist', 'old-generated.html'), { code: 'ENOENT' });
    run(['review-build']);
    const draft = await read('.draft-build', 'posts/ai-playground/review-only.html');
    assert.match(draft, /<strong>AI 초안<\/strong>/);
    assert.match(draft, /{{ literal }}/);
    assert.match(draft, /noindex/);
    assert.match(await read('.draft-build', 'posts/index.html'), /검토 전용 AI 글/);
    assert.match(await read('.draft-build', 'posts/index.html'), /루미아섬 나들이/);
    await assert.rejects(read('.draft-build', 'posts/.previous-preview/hidden.html'), { code: 'ENOENT' });
    await assert.rejects(read('dist', 'posts/ai-playground/review-only.html'), { code: 'ENOENT' });
    await assert.rejects(readFile(path.join(workspace, 'src/content/posts/ai-playground/review-only.md')), { code: 'ENOENT' });
    await assert.rejects(readFile(path.join(workspace, 'index.html')), { code: 'ENOENT' });
    await assert.rejects(readFile(path.join(workspace, '.generated-pages.json')), { code: 'ENOENT' });
    assert.throws(() => run(['build', '--output=src']), /Only --port/);
    await rm(draftFile);
    run(['review-build']);
    await assert.rejects(read('.draft-build', 'posts/ai-playground/review-only.html'), { code: 'ENOENT' });
    const conflict = path.join(workspace, 'drafts', 'game', 'eternal-return', 'lumia-outing.md');
    await mkdir(path.dirname(conflict), { recursive: true });
    await writeFile(conflict, 'Conflicting draft');
    assert.throws(() => run(['review-build']), /Draft conflicts with published post/);
  } finally {
    if (path.dirname(workspace) !== path.resolve(root)) throw new Error('Unexpected test workspace');
    await rm(workspace, { recursive: true, force: true });
  }
});

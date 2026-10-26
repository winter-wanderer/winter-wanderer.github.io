import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { syncOutput } from '../scripts/sync-output.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

test('Markdown posts build listings and obsolete pages are removed', async () => {
  const workspace = await mkdtemp(path.join(root, '.test-workspace-'));
  const input = path.join(workspace, 'src');
  const output = path.join(workspace, 'output');
  const published = path.join(workspace, 'published');
  const manifest = path.join(published, '.generated-pages.json');
  const id = randomUUID().slice(0, 8);
  const postName = `test-entry-${id}`;
  const categorySlug = `music-${id}`;
  const tagSlug = `c-sharp-${id}`;
  const fixture = path.join(input, 'content', 'posts', 'game', 'eternal-return', `${postName}.md`);
  const otherFixture = path.join(input, 'content', 'posts', categorySlug, 'album-note.md');
  const build = () => execSync(`npm run generate -- --output="${output}"`, {
    cwd: root, env: { ...process.env, SITE_INPUT: path.relative(root, input).replaceAll('\\', '/') }, stdio: 'pipe',
  });

  try {
    await cp(path.join(root, 'src'), input, { recursive: true });
    await mkdir(path.dirname(fixture), { recursive: true });
    await writeFile(fixture, `---
title: 자동 목록 검증
summary: 새 글을 추가하면 목록에도 나타난다.
date: 2026-10-27
category:
  slug: game
  name: 게임
topic:
  slug: eternal-return
  name: 이터널리턴
postTags:
  - slug: ${tagSlug}
    name: 'C#'
---

마크다운으로 작성한 **새 글**입니다.

\`\`\`text
{{ example }}
\`\`\`
`, 'utf8');
    await mkdir(path.dirname(otherFixture), { recursive: true });
    await writeFile(otherFixture, `---
title: 새 카테고리 검증
summary: 다른 카테고리도 자동으로 만들어진다.
date: 2026-10-28
category:
  slug: ${categorySlug}
  name: 음악
postTags: []
---

두 번째 글입니다.
`, 'utf8');
    await mkdir(published, { recursive: true });
    await writeFile(manifest, '[]\n', 'utf8');

    build();
    const read = (relative) => readFile(path.join(output, relative), 'utf8');
    const article = await read(`posts/game/eternal-return/${postName}.html`);
    assert.match(article, /<h1>자동 목록 검증<\/h1>/);
    assert.match(article, /마크다운으로 작성한 <strong>새 글<\/strong>입니다/);
    assert.match(article, /{{ example }}/);
    assert.match(article, /<meta name="robots" content="noindex">/);
    for (const page of ['index.html', 'posts/index.html', 'posts/game/index.html', 'posts/game/eternal-return/index.html']) {
      assert.match(await read(page), new RegExp(`${postName}\\.html`), page);
    }
    assert.match(await read('categories/index.html'), /음악/);
    assert.match(await read(`posts/${categorySlug}/index.html`), /새 카테고리 검증/);
    assert.match(await read('tags/index.html'), new RegExp(`/tags/${tagSlug}/`));
    assert.match(await read(`tags/${tagSlug}/index.html`), /C#/);
    assert.match(await read(`tags/${tagSlug}/index.html`), /자동 목록 검증/);
    for (const page of ['index.html', 'posts/index.html', 'posts/game/index.html', 'posts/game/eternal-return/index.html', `posts/${categorySlug}/index.html`, 'categories/index.html', 'tags/index.html', 'about/index.html', `tags/${tagSlug}/index.html`]) {
      assert.match(await read(page), /<meta name="robots" content="noindex">/, page);
    }
    const existing = await read('posts/game/eternal-return/lumia-outing.html');
    assert.match(existing, /<h1>루미아섬 나들이<\/h1>/);
    assert.match(existing, /이번에도 사관 스킨은 받아야지/);
    assert.doesNotMatch(existing, /flow\.team|dak\.gg|시간나는대로/);

    await syncOutput(published, output, manifest);
    assert.match(await readFile(path.join(published, `posts/game/eternal-return/${postName}.html`), 'utf8'), /자동 목록 검증/);
    await rm(fixture);
    await rm(otherFixture);
    if (output !== path.join(workspace, 'output')) throw new Error('Unexpected test output path');
    await rm(output, { recursive: true, force: true });
    build();
    await syncOutput(published, output, manifest);
    const pages = JSON.parse(await readFile(manifest, 'utf8'));
    assert.ok(!pages.includes(`posts/game/eternal-return/${postName}.html`));
    assert.ok(!pages.includes(`tags/${tagSlug}/index.html`));
    assert.ok(!pages.includes(`posts/${categorySlug}/index.html`));
    await assert.rejects(readFile(path.join(published, `posts/game/eternal-return/${postName}.html`)));
    await assert.rejects(readFile(path.join(published, `tags/${tagSlug}/index.html`)));
    await assert.rejects(readFile(path.join(published, `posts/${categorySlug}/index.html`)));
  } finally {
    if (workspace.startsWith(root + path.sep + '.test-workspace-')) {
      await rm(workspace, { recursive: true, force: true });
    }
  }
});

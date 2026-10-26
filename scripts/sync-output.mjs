import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function safePagePath(root, value) {
  const parts = typeof value === 'string' ? value.split('/') : [];
  if (typeof value !== 'string' || !value.endsWith('.html') || parts.some((part) => !part || part === '.' || part === '..' || /[\\:\0]/.test(part))) {
    throw new Error(`Invalid generated page path: ${value}`);
  }
  const target = path.resolve(root, value);
  if (!target.startsWith(root + path.sep)) throw new Error(`Generated page escapes project: ${value}`);
  return target;
}

async function htmlPages(directory, prefix = '') {
  const pages = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) pages.push(...await htmlPages(path.join(directory, entry.name), relative));
    else if (entry.isFile() && entry.name.endsWith('.html')) pages.push(relative);
  }
  return pages.sort();
}

export async function syncOutput(root, output, manifestPath) {
  const previous = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!Array.isArray(previous) || previous.some((page) => typeof page !== 'string')) {
    throw new Error('Invalid generated page manifest');
  }
  const current = await htmlPages(output);
  for (const page of [...previous, ...current]) safePagePath(root, page);

  for (const page of current) {
    const target = safePagePath(root, page);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(output, page), target);
  }
  const currentSet = new Set(current);
  for (const page of previous) {
    if (!currentSet.has(page)) await rm(safePagePath(root, page), { force: true });
  }
  await writeFile(manifestPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await syncOutput(projectRoot, path.join(projectRoot, '.site-build'), path.join(projectRoot, '.generated-pages.json'));
}

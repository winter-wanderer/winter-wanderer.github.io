import { spawn } from 'node:child_process';
import { lstat, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const mode = process.argv[2];
const modes = {
  build: { output: 'dist', drafts: false, serve: false },
  dev: { output: '.site-build', drafts: false, serve: true },
  'review-build': { output: '.draft-build', drafts: true, serve: false },
  'dev:drafts': { output: '.draft-build', drafts: true, serve: true },
};
const selected = modes[mode];
if (!selected) throw new Error(`Unknown site command: ${mode}`);
// Only the port may be overridden; callers cannot redirect a draft build into dist.
const extra = process.argv.slice(3);
if (extra.some(arg => !/^--port=\d{1,5}$/.test(arg))) throw new Error('Only --port=<number> is supported.');
const output = path.resolve(root, selected.output);
if (path.dirname(output) !== root) throw new Error('Output escapes project root.');
try {
  if ((await lstat(output)).isSymbolicLink()) throw new Error('Refusing to clean a linked output directory.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await rm(output, { recursive: true, force: true });
const require = createRequire(import.meta.url);
const cli = path.resolve(path.dirname(require.resolve('@11ty/eleventy')), '../cmd.cjs');
const args = [cli, `--output=${selected.output}`, ...(selected.serve ? ['--serve', ...extra] : [])];
const child = spawn(process.execPath, args, {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, SITE_INPUT: 'src', SITE_DRAFTS: 'drafts', SITE_INCLUDE_DRAFTS: selected.drafts ? '1' : '0' },
});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });

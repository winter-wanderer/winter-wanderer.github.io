import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = path.resolve(root, '.site-build');
if (output !== path.join(root, '.site-build')) throw new Error('Unexpected build directory');
await rm(output, { recursive: true, force: true });

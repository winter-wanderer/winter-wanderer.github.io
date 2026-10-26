import http from 'node:http';
import { readFile } from 'node:fs/promises';

const routes = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/posts/', ['posts/index.html', 'text/html']],
  ['/posts/index.html', ['posts/index.html', 'text/html']],
  ['/posts/game/', ['posts/game/index.html', 'text/html']],
  ['/posts/game/index.html', ['posts/game/index.html', 'text/html']],
  ['/posts/game/eternal-return/', ['posts/game/eternal-return/index.html', 'text/html']],
  ['/posts/game/eternal-return/index.html', ['posts/game/eternal-return/index.html', 'text/html']],
  ['/posts/game/eternal-return/lumia-outing.html', ['posts/game/eternal-return/lumia-outing.html', 'text/html']],
  ['/categories/', ['categories/index.html', 'text/html']],
  ['/categories/index.html', ['categories/index.html', 'text/html']],
  ['/tags/', ['tags/index.html', 'text/html']],
  ['/tags/index.html', ['tags/index.html', 'text/html']],
  ['/about/', ['about/index.html', 'text/html']],
  ['/about/index.html', ['about/index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/quotes.js', ['quotes.js', 'text/javascript']],
]);

http.createServer(async (request, response) => {
  const route = routes.get(new URL(request.url, 'http://localhost').pathname);
  if (!route) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const contents = await readFile(new URL(route[0], import.meta.url));
    response.writeHead(200, {
      'Content-Type': `${route[1]}; charset=utf-8`,
      'Cache-Control': 'no-store',
    }).end(contents);
  } catch {
    response.writeHead(500).end('Unable to load file');
  }
}).listen(4173, '127.0.0.1', () => {
  console.log('Preview: http://127.0.0.1:4173');
});

// serve.ts — a tiny static server for app/ (Node 22, standard library only).
// Development convenience so the cover studio can be tried locally without a
// build step: `node serve.ts` serves app/ on http://localhost:8080 (or
// `--port <n>`). It only serves files under app/, sends the MIME types an
// offline web app needs, and does nothing else — this is not a web server
// for the internet.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));

function portFromArgs() {
  const args = process.argv.slice(2);
  const at = args.indexOf('--port');
  const wanted = at === -1 ? 8080 : Number(args[at + 1]);
  return Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;
}

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2'],
  ['.woff', 'font/woff'],
  ['.ttf', 'font/ttf'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function safePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const joined = resolve(join(root, normalize(decoded)));
  if (joined !== root && !joined.startsWith(root + sep)) return null;
  return joined;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = url.pathname;
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = safePath(pathname);
  if (!file) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

const port = portFromArgs();
server.listen(port, '127.0.0.1', () => {
  console.log(`Vice Coast Cover Studio is on http://localhost:${port}`);
});

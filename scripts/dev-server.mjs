import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url ?? '/index.html');
  const file = path.join(process.cwd(), urlPath);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});
server.listen(5173, '0.0.0.0', () => console.log('DesktopRef dev server: http://localhost:5173'));

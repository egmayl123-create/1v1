const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const STATE_FILE = path.join(ROOT, 'data', 'state.json');

function send(res, code, type, body) {
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function readState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Public, read-only tournament data.
  if (u.pathname === '/api/state' && req.method === 'GET') {
    try {
      return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(readState()));
    } catch (err) {
      console.error('state.json read error:', err);
      return send(res, 500, 'application/json; charset=utf-8', JSON.stringify({ error: 'state' }));
    }
  }

  if (u.pathname === '/health' && req.method === 'GET') {
    return send(res, 200, 'text/plain; charset=utf-8', 'OK');
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'text/plain; charset=utf-8', 'Method Not Allowed');
  }

  let relative = decodeURIComponent(u.pathname);
  if (relative === '/' || relative === '/admin' || relative === '/admin/') {
    relative = '/index.html';
  }

  const requested = path.resolve(ROOT, '.' + relative);
  const rootPrefix = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;

  if (requested !== ROOT && !requested.startsWith(rootPrefix)) {
    return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
  }

  if (!fs.existsSync(requested) || fs.statSync(requested).isDirectory()) {
    return send(res, 404, 'text/plain; charset=utf-8', 'Not found');
  }

  try {
    const type = MIME[path.extname(requested).toLowerCase()] || 'application/octet-stream';
    const data = fs.readFileSync(requested);
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': requested.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  } catch (err) {
    console.error('file read error:', err);
    return send(res, 500, 'text/plain; charset=utf-8', 'Server error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tournament site listening on 0.0.0.0:${PORT}`);
});

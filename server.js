const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const PORT = Number(process.env.PORT || 5500);
const ROOT = __dirname;
const PID_FILE = path.join(ROOT, '.server.pid');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function send(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not found', 'text/plain; charset=utf-8');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
    });
    res.end(data);
  });
}

function getSafeFilePath(requestPath) {
  const normalized = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  const resolved = path.join(ROOT, normalized);
  if (!resolved.startsWith(ROOT)) {
    return null;
  }
  return resolved;
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsed.pathname;

  if (pathname === '/env.js') {
    const envPayload = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    };
    const js = `window.__ENV__ = ${JSON.stringify(envPayload)};`;
    send(res, 200, js, 'application/javascript; charset=utf-8');
    return;
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = getSafeFilePath(requestedPath);
  if (!filePath) {
    send(res, 400, 'Bad request', 'text/plain; charset=utf-8');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      send(res, 404, 'Not found', 'text/plain; charset=utf-8');
      return;
    }
    sendFile(res, filePath);
  });
});

function cleanupPidFile() {
  if (fs.existsSync(PID_FILE)) {
    fs.unlinkSync(PID_FILE);
  }
}

fs.writeFileSync(PID_FILE, String(process.pid));

process.on('SIGINT', () => {
  cleanupPidFile();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanupPidFile();
  process.exit(0);
});

process.on('exit', cleanupPidFile);

server.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});

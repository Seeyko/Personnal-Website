/**
 * Development server with URL rewriting for clean blog URLs
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
};

const server = http.createServer((req, res) => {
    let url = req.url.split('?')[0]; // Remove query string for file lookup
    const query = req.url.includes('?') ? req.url.split('?')[1] : '';

    // URL Rewriting rules
    // /blog/ -> blog.html
    // /blog/some-slug/ -> blog.html (JS will read the slug from URL)
    if (url === '/blog' || url === '/blog/') {
        url = '/blog.html';
    } else if (url.match(/^\/blog\/[^\/]+\/?$/)) {
        // /blog/{slug}/ -> serve blog.html, JS will handle the slug
        url = '/blog.html';
    }

    // /contenu -> content.html (Mon contenu)
    if (url === '/contenu' || url === '/contenu/') {
        url = '/content.html';
    }

    // Default to index.html for root
    if (url === '/') {
        url = '/index.html';
    }

    const filePath = path.join(ROOT, url);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n  Development server running at:`);
    console.log(`  http://localhost:${PORT}\n`);
    console.log(`  Clean blog URLs supported:`);
    console.log(`  http://localhost:${PORT}/blog/`);
    console.log(`  http://localhost:${PORT}/blog/hello-world/\n`);
});

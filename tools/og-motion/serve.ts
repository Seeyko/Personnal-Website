// Sert la scène : /og-motion/* depuis ce dossier, le reste depuis frontend/ (vrais assets du site).
// bun tools/og-motion/serve.ts [port]
import { join, normalize } from 'node:path';

const here = import.meta.dir;
const front = join(here, '..', '..', 'frontend');
const port = Number(process.argv[2] || 8765);

Bun.serve({
  port,
  hostname: '127.0.0.1',
  async fetch(req) {
    const path = normalize(decodeURIComponent(new URL(req.url).pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = path.startsWith('/og-motion/') ? join(here, path.slice('/og-motion/'.length)) : join(front, path);
    const f = Bun.file(file);
    return (await f.exists()) ? new Response(f) : new Response('not found', { status: 404 });
  }
});
console.log(`og-motion : http://127.0.0.1:${port}/og-motion/scene.html`);

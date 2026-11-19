import { build } from 'esbuild';

await build({
    entryPoints: ['entry.jsx'],
    bundle: true,
    // Not `minify: true`: minified identifiers would turn the CSS-module classes
    // into one-letter names (.a, .e…) that clash with the site's own CSS.
    minifyWhitespace: true,
    minifySyntax: true,
    format: 'iife',
    target: ['es2019'],
    jsx: 'automatic',
    loader: { '.module.css': 'local-css' },
    define: { 'process.env.NODE_ENV': '"production"' },
    legalComments: 'none',
    outfile: '../../frontend/assets/vendor/xeet/xeet.js',
    logLevel: 'info',
});

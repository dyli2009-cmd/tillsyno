import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const cwd=fileURLToPath(new URL('.',import.meta.url));
await build({absWorkingDir:cwd,entryPoints:{pilot:'src/main.mjs',callback:'src/callback.mjs',app:'src/app.mjs'},bundle:true,outdir:cwd,format:'iife',platform:'browser',target:['es2020'],minify:true,sourcemap:false,legalComments:'linked'});
console.log('Built pilot.js and callback.js. Not a deployment or a live login test.');

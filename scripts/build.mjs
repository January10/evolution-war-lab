import {rm,mkdir,readFile,writeFile,copyFile,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),dist=resolve(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await copyFile(resolve(root,'index.html'),resolve(dist,'index.html'));
await cp(resolve(root,'src'),resolve(dist,'src'),{recursive:true});
const ordered=['core/rng.js','core/data.js','core/game.js','ui/draw.js','ui/sound.js','main.js'];
const contents=await Promise.all(ordered.map(async p=>{
  const js=await readFile(resolve(root,'src',p),'utf8');
  return `// ==== ${p} ====\n${js.replace(/^import[^\n]*;[\t ]*$/gm,'').replace(/^export\s+/gm,'')}`;
}));
const stylesheet=await readFile(resolve(root,'src/style.css'),'utf8');
const raw=await readFile(resolve(root,'index.html'),'utf8');
const bundled=raw.replace('<link rel="stylesheet" href="./src/style.css" />',`<style>\n${stylesheet}\n</style>`)
  .replace('<script type="module" src="./src/main.js"></script>',`<script>\n'use strict';\n${contents.join('\n\n').replaceAll('</script','<\\/script')}\n</script>`);
if(bundled.includes('src/main.js"></script>')||bundled.includes(' href="./src/style.css"'))throw new Error('Single-file build did not inline resources');
await writeFile(resolve(dist,'play.html'),bundled,'utf8');
console.log('Built dist/ static website and dist/play.html standalone offline playable HTML.');

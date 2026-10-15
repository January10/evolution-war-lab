import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,resolve,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)),process.argv[2]||'.');
const port=Number(process.env.PORT||5173);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const decoded=decodeURIComponent(url.pathname);
    const file=resolve(root,'.'+decoded,decoded.endsWith('/')?'index.html':'');
    const rel=relative(root,file);
    if(rel.startsWith('..')||rel.startsWith('/')||rel==='..') throw Object.assign(new Error('Forbidden'),{status:403});
    const info=await stat(file);
    if(!info.isFile())throw Object.assign(new Error('Not found'),{status:404});
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
  }catch(err){res.writeHead(err.status||404,{'Content-Type':'text/plain; charset=utf-8'});res.end(err.status===403?'Forbidden':'Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Evolution War Lab: http://127.0.0.1:${port} (root: ${root})`));

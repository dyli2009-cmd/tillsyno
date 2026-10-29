const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const qaRoot=__dirname;
http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/__qa/hash'&&req.method==='POST'){const chunks=[];req.on('data',x=>chunks.push(x));req.on('end',()=>res.end(require('node:crypto').createHash('sha256').update(Buffer.concat(chunks)).digest()));return;}
 if(u.pathname==='/__qa/results'&&req.method==='POST'){let body='';req.on('data',x=>body+=x);req.on('end',()=>{res.end('ok')});return;}
 const name=u.pathname==='/'?'/qa.html':u.pathname;
 if(name.includes('..')){res.writeHead(403);return res.end()}
 const p=['/qa.html','/qa-matrix.html','/qa-visual.html','/qa-bootstrap.js'].includes(name)?path.join(qaRoot,name):path.join(root,name);
 try{let data=fs.readFileSync(p);if(name.endsWith('all-in-one.html')){
 let s=data.toString().replace(/<script[^>]+src="[^"]*(?:auth\/|auth-config|supabase|offline\.js)[^"]*"[^>]*><\/script>/g,'').replace('data-auth-pending','');
 s=s.replace('</body>','<script src="/qa-bootstrap.js"></script></body>');data=s;
 }
 res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css':name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':'application/octet-stream');res.end(data);
 }catch(e){res.writeHead(404);res.end('Missing '+name)}
}).listen(Number(process.argv[process.argv.indexOf("--port")+1])||Number(process.env.PORT)||3000,process.argv.includes('--host')?process.argv[process.argv.indexOf('--host')+1]:'127.0.0.1');

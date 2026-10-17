const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'dist');
http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(filename,(error,data)=>{
  res.writeHead(error?404:200,{'Content-Type':filename.endsWith('.js')?'text/javascript; charset=utf-8':filename.endsWith('.png')?'image/png':filename.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache'});
  res.end(error?'Not found':data);
 });
}).listen(5174,'127.0.0.1',()=>console.log('Listening on http://127.0.0.1:5174'));


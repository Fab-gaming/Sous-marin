const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const page=fs.readFileSync(path.join(__dirname,'index.html'));
const srv=http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(page)});
const wss=new WebSocketServer({server:srv}),rooms=new Map();
const send=(w,o)=>w.readyState===1&&w.send(JSON.stringify(o));
wss.on('connection',ws=>{
  ws.state={};ws.id=Math.random().toString(36).slice(2,8);
  ws.on('message',raw=>{
    let d;try{d=JSON.parse(raw)}catch{return}
    if(d.join){
      if(ws.room)return;
      const code=String(d.join).slice(0,20);
      let r=rooms.get(code);if(!r)rooms.set(code,r=new Set());
      if(r.size>=2){send(ws,{full:1});return}
      ws.room=r;ws.code=code;send(ws,{you:ws.id});
      r.forEach(p=>send(ws,{from:p.id,p:p.state}));r.add(ws);return;
    }
    if(!ws.room)return;
    for(const k in d){if(d[k]===null)delete ws.state[k];else ws.state[k]=d[k]}
    ws.room.forEach(p=>p!==ws&&send(p,{from:ws.id,p:d}));
  });
  ws.on('close',()=>{
    if(!ws.room)return;
    ws.room.delete(ws);ws.room.forEach(p=>send(p,{left:ws.id}));
    if(!ws.room.size)rooms.delete(ws.code);
  });
});
setInterval(()=>wss.clients.forEach(w=>w.readyState===1&&w.ping()),25000);
srv.listen(process.env.PORT||3000,()=>console.log('Serveur prêt'));

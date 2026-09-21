// ---------------------------------------------------------------------------
// Turning player and AI intent into unit orders: move, gather, build, attack,
// patrol, garrison, and the building/production commands.
// ---------------------------------------------------------------------------
function orderGather(u,n){if(u.ctype!==n.res)u.carry=0;u.state='gather';u.node=n;u.ctype=n.res;u.path=[];u.target=null;u.site=null;u.stuck=0;}
function orderBuild(u,b){u.state='build';u.site=b;u.path=[];u.target=null;u.stuck=0;}
function orderMove(u,tx,ty,amove){u.gspeed=null;u.state=amove?'amove':'move';u.target=null;u.site=null;u.pdest=null;u.auto=false;u.post=[tx*TILE+HALF,ty*TILE+HALF];goTo(u,tx,ty);}
function orderAttack(u,t){if(UNITS[u.type].convert){if(!t.w&&foe(t.team,u.team)&&UNITS[t.type].cls!=='hero'){u.state='convert';u.target=t;u.conv=0;u.path=[];}return;}if(!canTarget(u,t)&&!(UNITS[u.type].minRange)){const g=approachTile(u,t);orderMove(u,g[0],g[1],false);return;}u.state='attack';u.target=t;u.prev='idle';u.path=[];u.auto=false;}
function orderStop(u){u.state='idle';u.path=[];u.target=null;u.site=null;u.auto=false;u.orders=[];u.pa=u.pb=null;setPost(u);}
function orderPatrol(u,tx,ty){
  u.state='patrol';u.target=null;u.site=null;u.auto=false;
  const[ux,uy]=ut(u);u.pa=[ux,uy];u.pb=[tx,ty];u.pTo='b';u.post=[u.x,u.y];goTo(u,tx,ty);
}
function groupMove(list,tx,ty,amove){
  let slow=99;for(const u of list)if(!UNITS[u.type].fly)slow=Math.min(slow,UNITS[u.type].speed);
  list.forEach((u,i)=>{const o=OFFS[i%OFFS.length];let g=[tx+o[0],ty+o[1]];if(!UNITS[u.type].fly){g=nearestFree(g[0],g[1])||nearestFree(tx,ty);if(!g)return;}orderMove(u,g[0],g[1],amove);if(!UNITS[u.type].fly&&list.length>1)u.gspeed=Math.max(slow,1.0);});
}
function entityAt(wx,wy,anyTeam){
  let best=null;
  for(const u of units){if(u.dead||(!anyTeam&&!visibleE(u)))continue;if(Math.hypot(u.x-wx,u.y-wy+(UNITS[u.type].fly?6:0))<=UNITS[u.type].r+3&&(!best||UNITS[u.type].fly))best=u;}
  if(best)return best;
  const tx=Math.floor(wx/TILE),ty=Math.floor(wy/TILE);
  for(const b of buildings)if(!b.dead&&tx>=b.tx&&tx<b.tx+b.w&&ty>=b.ty&&ty<b.ty+b.h&&(anyTeam||visibleE(b)))return b;
  const r=resAt.get(idx(tx,ty));if(r&&!r.dead&&(anyTeam||explored[idx(tx,ty)]))return r;
  return null;
}
function applyOrder(u,wx,wy,t){ // returns true if the unit should be group-moved instead
  if(t&&t.team!==undefined&&!t.res&&foe(t.team,0)){orderAttack(u,t);return false;}
  if(t&&t.res){if(u.type==='worker'){orderGather(u,t);return false;}return true;}
  if(t&&t.team===0&&t!==u&&capOf(t)>0&&t.gar&&t.gar.length<capOf(t)&&!UNITS[u.type].fly&&UNITS[u.type].cls!=='animal'&&(!t.w||t.done)){
    u.state='enter';u.enterT=t;u.path=[];u.target=null;u.site=null;return false;
  }
  if(t&&t.w&&t.team===0&&u.type==='worker'){
    if(!t.done){orderBuild(u,t);return false;}
    if(t.farm){orderGather(u,t);return false;}
    if(t.hp<t.maxHp){orderBuild(u,t);return false;}
  }
  return true;
}
function ghostAt(wx,wy){
  const tx=Math.floor(wx/TILE),ty=Math.floor(wy/TILE);
  for(const g of memBld.values())if(tx>=g.tx&&tx<g.tx+g.w&&ty>=g.ty&&ty<g.ty+g.h)return g;
  return null;
}
function issueOrder(wx,wy,shift){
  const own=sel.filter(e=>!e.w&&!e.res&&e.team===0&&!e.dead);
  const tx=Math.floor(wx/TILE),ty=Math.floor(wy/TILE);
  if(!own.length){const b=sel[0];if(b&&b.w&&b.team===0&&(BLD[b.type].trains)){const t=entityAt(wx,wy);b.rally=t&&t.res?{e:t}:t&&t.w&&t.farm&&t.team===0?{e:t}:{x:tx,y:ty};msg('Rally point set');}return;}
  const t=entityAt(wx,wy);const movers=[];
  // no entity under the cursor, but we remember an enemy building there: go and hit it
  const ghost=t?null:ghostAt(wx,wy);
  for(const u of own){
    if(shift&&u.state!=='idle'){(u.orders=u.orders||[]).push({wx,wy,t});continue;}
    u.orders=[];
    if(applyOrder(u,wx,wy,t))movers.push(u);
  }
  if(movers.length)groupMove(movers,tx,ty,(movers.some(u=>u.type!=='worker')&&!t)||!!ghost);
  pulse={x:wx,y:wy,age:0,c:(t&&t.team!==undefined&&foe(t.team,0))||ghost?'#ff5555':'#7cff8a'};sfx('click');
}
function nextOrder(u){
  if(!u.orders||!u.orders.length)return false;
  const o=u.orders.shift();if(o.t&&o.t.dead)return nextOrder(u);
  if(applyOrder(u,o.wx,o.wy,o.t)){const tx=Math.floor(o.wx/TILE),ty=Math.floor(o.wy/TILE);orderMove(u,tx,ty,u.type!=='worker');}
  return true;
}
function tryTrain(b,type){
  const d=UNITS[type];
  if(!unitAvailable(b.team,type))return'Not available to your civilization';
  if(techLevel(b.team)<d.tech)return'Requires Tech Level '+d.tech;
  if(b.queue.length>=6)return'Queue is full';
  const c=costOf(b.team,d);
  if(!canAfford(b.team,c))return'Not enough resources ('+costStr(c)+')';
  if(popUsed(b.team)+d.pop>popCap(b.team))return'Population cap reached — build Prefab Shelters';
  pay(b.team,c);b.queue.push(type);return null;
}
function nextInLine(team,line){const l=lineLvl(team,line);return l<3?line+(l+1):null}
function tryResearch(b,id){
  const t=TECHS[id];if(!t)return'Unknown';
  if(hasTech(b.team,id))return'Already researched';
  if(t.req&&!hasTech(b.team,t.req))return'Requires '+TECHS[t.req].name;
  if(techLevel(b.team)<t.tech)return'Requires Tech Level '+t.tech;
  if(b.queue.includes('#'+id)||buildings.some(o=>o.team===b.team&&!o.dead&&o.queue.includes('#'+id)))return'Already in progress';
  if(b.queue.length>=6)return'Queue is full';
  if(!canAfford(b.team,t.cost))return'Not enough resources ('+costStr(t.cost)+')';
  pay(b.team,t.cost);b.queue.push('#'+id);return null;
}
function cancelQueue(b,i){const q=b.queue[i];if(q===undefined)return;if(q[0]==='#')refund(b.team,TECHS[q.slice(1)].cost);else refund(b.team,costOf(b.team,UNITS[q]));b.queue.splice(i,1);if(i===0)b.qprog=0;}
function placeValid(type,tx,ty){const d=BLD[type];for(let y=ty;y<ty+d.h;y++)for(let x=tx;x<tx+d.w;x++)if(occupied(x,y))return false;return flatArea(tx,ty,d.w,d.h);}
function ghostPos(type){const d=BLD[type];const wx=mwx(),wy=mwy();return[Math.floor(wx/TILE)-((d.w-1)>>1),Math.floor(wy/TILE)-((d.h-1)>>1)]}
function lineTiles(a,b){const t=[];const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(Math.abs(dx),Math.abs(dy));for(let i=0;i<=n;i++)t.push([Math.round(a[0]+dx*i/n||a[0]),Math.round(a[1]+dy*i/n||a[1])]);return t}
function placeAt(type,tx,ty,quiet){
  const d=BLD[type],c=costOf(0,d);
  if(!placeValid(type,tx,ty)){if(!quiet)msg('Cannot build there');return null;}
  if(!canAfford(0,c)){if(!quiet)msg('Not enough resources ('+costStr(c)+')');return null;}
  pay(0,c);return placeBuilding(0,type,tx,ty,false);
}
function assignBuilders(sites){
  let workers=sel.filter(e=>!e.w&&!e.res&&e.team===0&&e.type==='worker'&&!e.dead);
  if(!workers.length){const w=units.filter(u=>u.team===0&&u.type==='worker'&&!u.dead).sort((a,c)=>distTo(a,sites[0])-distTo(c,sites[0]))[0];if(w)workers=[w];}
  workers.forEach((w,i)=>orderBuild(w,sites[i%sites.length]));
}
function tryPlace(){
  const type=placing,[tx,ty]=ghostPos(type);
  const b=placeAt(type,tx,ty);if(!b)return false;assignBuilders([b]);sfx('click');return true;
}
function placeWallLine(a,b,type='wall'){
  const sites=[];for(const[x,y]of lineTiles(a,b)){const w=placeAt(type,x,y,true);if(w)sites.push(w);}
  if(sites.length)assignBuilders(sites);else msg('Cannot build a wall there');
}

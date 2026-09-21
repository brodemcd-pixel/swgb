// ---------------------------------------------------------------------------
// Global simulation state, team/alliance helpers and the small maths and
// bookkeeping utilities the rest of the engine is built on.
// ---------------------------------------------------------------------------
let memBld,height,ramp,mapType,entDirty=false,pathBudget=999,sides,aiPers,nP,mission,objectives,projectiles,wrecks,shake,dust,theme,gateAt,stats,alerts,grid,units,buildings,resources,fx,msgs,res,tick,nextId,cam,sel,placing,pending,groups,gameOver,aiMult,started,terrain,resAt,techs,civs,explored,vis,fogCv,fogCtx,paused=false,speed=1,menu=null,wallStart=null,pulse=null,muted=false,aiState;
const mouse={x:0,y:0,down:false,sx:0,sy:0,inCanvas:false},keys={};
let currentCmds=[],lastCmdKey='',lastLaserSfx=0;

function idx(x,y){return y*MW+x}
function inMap(x,y){return x>=0&&y>=0&&x<MW&&y<MH}
function blockedT(x,y,team){if(!inMap(x,y))return true;const g=grid[idx(x,y)];if(g===5)return gateAt.get(idx(x,y))!==team;return g!==0&&g!==4}
function occupied(x,y){return !inMap(x,y)||grid[idx(x,y)]!==0}
function hAt(x,y){return inMap(x,y)?height[idx(x,y)]:0}
function isRamp(x,y){return inMap(x,y)&&ramp[idx(x,y)]===1}
// Ground units change elevation only on a ramp tile; everything else has to walk around.
function canStep(x,y,nx,ny){
  if(height[idx(nx,ny)]===height[idx(x,y)])return true;
  return ramp[idx(x,y)]===1||ramp[idx(nx,ny)]===1;
}
function flatArea(tx,ty,w,h){
  const h0=hAt(tx,ty);
  for(let y=ty;y<ty+h;y++)for(let x=tx;x<tx+w;x++){
    if(!inMap(x,y))return false;
    if(height[idx(x,y)]!==h0||ramp[idx(x,y)])return false;
  }
  return true;
}
function ut(u){return[Math.floor(u.x/TILE),Math.floor(u.y/TILE)]}
function cx(e){return e.w?(e.tx+e.w/2)*TILE:e.x}
function cy(e){return e.w?(e.ty+e.h/2)*TILE:e.y}
function tileOf(e){return e.w?[Math.floor(e.tx+e.w/2),Math.floor(e.ty+e.h/2)]:ut(e)}
function clamp(v,a,b){return v<a?a:v>b?b:v}
// In-place filter. The update loop runs this on half a dozen lists every tick;
// doing it without allocating keeps the garbage collector out of the frame.
function compact(arr,keep){let k=0;for(let i=0;i<arr.length;i++){const v=arr[i];if(keep(v))arr[k++]=v;}arr.length=k;return arr;}
function distTo(a,b){
  const ax=cx(a),ay=cy(a);
  if(b.w){const bx=b.tx*TILE,by=b.ty*TILE;const px=clamp(ax,bx,bx+b.w*TILE),py=clamp(ay,by,by+b.h*TILE);return Math.hypot(ax-px,ay-py);}
  return Math.hypot(ax-b.x,ay-b.y)-UNITS[b.type].r;
}
function sideOf(t){return sides&&sides[t]!==undefined?sides[t]:t}
function foe(a,b){return a!==GAIA&&b!==GAIA&&sideOf(a)!==sideOf(b)}
function friend(a,b){return a!==GAIA&&b!==GAIA&&sideOf(a)===sideOf(b)}
function aiTeams(){const r=[];for(let t=1;t<nP;t++)r.push(t);return r}
const STANCES=['aggressive','defensive','hold','passive'];
const STANCE_NAME={aggressive:'Aggressive',defensive:'Defensive',hold:'Hold Position',passive:'Passive'};
const STANCE_DESC={aggressive:'Attacks anything it spots and pursues it.',defensive:'Engages enemies that come close, then returns to its post.',hold:'Never moves on its own. Fires at whatever comes into range.',passive:'Never attacks on its own. Only obeys direct orders.'};
const STANCE_HOT={aggressive:'E',defensive:'R',hold:'H',passive:'N'};
function acqRange(u,d){
  const s=u.stance;
  if(s==='passive')return 0;
  if(s==='hold')return d.range+0.5;
  if(s==='defensive')return d.range+1.5;
  return Math.max(d.range+2,d.los-1);
}
function capOf(e){return e.w?(BLD[e.type].garrison||0):(UNITS[e.type].cap||0)}
function garrisonUnit(u,e){
  const cap=capOf(e);
  if(!cap||!e.gar||e.gar.length>=cap)return false;
  if(e.team!==u.team||u.dead||e.dead)return false;
  if(e.w&&!e.done)return false;
  const d=UNITS[u.type];
  if(d.fly||d.cls==='animal')return false;
  u.state='idle';u.target=null;u.site=null;u.node=null;u.enterT=null;u.path=[];u.orders=[];
  u.x=cx(e);u.y=cy(e);
  const i=units.indexOf(u);if(i>=0)units.splice(i,1);
  const j=sel.indexOf(u);if(j>=0)sel.splice(j,1);
  e.gar.push(u);
  if(u.team===0)sfx('click');
  return true;
}
function ungarrison(e,hurt){
  if(!e.gar||!e.gar.length)return[];
  const out=[],bx=e.w?e.tx+(e.w>>1):Math.floor(e.x/TILE),by=e.w?e.ty+e.h:Math.floor(e.y/TILE);
  while(e.gar.length){
    const u=e.gar.pop();
    const p=nearestFree(bx,by,bx,by,7);
    if(p){u.x=p[0]*TILE+HALF;u.y=p[1]*TILE+HALF;}else{u.x=cx(e);u.y=cy(e)+TILE;}
    u.state='idle';u.path=[];u.dead=false;setPost(u);
    if(hurt)u.hp=Math.max(1,Math.round(u.hp*0.5));
    units.push(u);out.push(u);
  }
  return out;
}
function setPost(u,x,y){u.post=[x===undefined?u.x:x,y===undefined?u.y:y];}
function mwx(){return mouse.x/zoom+cam.x}
function mwy(){return mouse.y/zoom+cam.y}
function msg(t,team=0){if(team!==0)return;msgs.push({t,age:0});if(msgs.length>5)msgs.shift();}
function techLevel(team){return techs[team].has('tech4')?4:techs[team].has('tech3')?3:techs[team].has('tech2')?2:1}
function hasTech(team,id){return techs[team].has(id)}
function lineLvl(team,line){let l=0;for(let i=1;i<=3;i++)if(techs[team].has(line+i))l=i;return l}
function costOf(team,def,type){
  const c={...def.cost};const civ=civs?civs[team]:null;
  if(civ==='alliance'&&def.cls==='air')for(const k in c)c[k]=Math.round(c[k]*0.85);
  if(civ==='cartel'&&def.cls==='troop')for(const k in c)c[k]=Math.round(c[k]*0.85);
  if(civ==='swamp'&&def.farm)for(const k in c)c[k]=Math.round(c[k]*0.5);
  return c;
}
function canAfford(team,cost){for(const k in cost)if(res[team][k]<cost[k])return false;return true}
function pay(team,cost){for(const k in cost)res[team][k]-=cost[k]}
function refund(team,cost){for(const k in cost)res[team][k]+=cost[k]}
function costStr(c){return Object.keys(c).filter(k=>c[k]).map(k=>c[k]+' '+k[0].toUpperCase()+k.slice(1)).join(' · ')}
function popUsed(team){let p=0;for(const u of units){if(u.team!==team||u.dead)continue;p+=UNITS[u.type].pop;if(u.gar)for(const g of u.gar)p+=UNITS[g.type].pop;}for(const b of buildings)if(b.team===team&&!b.dead&&b.gar)for(const g of b.gar)p+=UNITS[g.type].pop;for(const b of buildings)if(b.team===team&&!b.dead)for(const q of b.queue)if(q[0]!=='#')p+=UNITS[q].pop;return p}
function popCap(team){let c=0;for(const b of buildings)if(b.team===team&&!b.dead&&b.done&&BLD[b.type].pop)c+=BLD[b.type].pop;return Math.min(100,c)}
function unitAvailable(team,type){const d=UNITS[type];if(d.civ&&d.civ!==civs[team])return false;return true}

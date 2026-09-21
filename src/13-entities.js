// ---------------------------------------------------------------------------
// Spawning, movement, projectiles, damage and death for units and buildings.
// ---------------------------------------------------------------------------
function placeBuilding(team,type,tx,ty,done){
  const d=BLD[type];
  const b={id:nextId++,team,type,tx,ty,w:d.w,h:d.h,hp:done?d.hp:d.hp*0.1,maxHp:d.hp,done:!!done,prog:0,queue:[],qprog:0,cd:0,face:-Math.PI/2,target:null,dead:false,rally:null,powered:true,amount:d.farm?d.amount:0,res:d.farm?'food':null,farm:!!d.farm,gar:d.garrison?[]:null,gtarget:null};
  for(let y=ty;y<ty+d.h;y++)for(let x=tx;x<tx+d.w;x++){grid[idx(x,y)]=d.farm?4:d.gate?5:3;if(d.gate)gateAt.set(idx(x,y),team);}
  buildings.push(b);
  for(const u of units)if(!UNITS[u.type].fly&&!u.dead){const[ux,uy]=ut(u);if(blockedT(ux,uy,u.team)){const n=nearestFree(ux,uy);if(n){u.x=n[0]*TILE+HALF;u.y=n[1]*TILE+HALF;u.path=[];}}}
  return b;
}
function spawnUnit(team,type,tx,ty){
  const d=UNITS[type];let p=[tx,ty];if(!d.fly){p=nearestFree(tx,ty);if(!p)return null;}
  let hp=d.hp;if(team<2&&civs[team]==='dominion'&&d.cls==='mech')hp=Math.round(hp*1.15);
  const u={id:nextId++,team,type,x:p[0]*TILE+HALF,y:p[1]*TILE+HALF,hp,maxHp:hp,sh:0,state:'idle',path:[],dest:null,target:null,node:null,site:null,carry:0,ctype:null,gt:0,cd:0,face:team===1?Math.PI/2:-Math.PI/2,prev:null,pdest:null,stuck:0,dead:false,lastHit:-999,conv:0,wt:0,vx:0,vy:0,auto:false,gar:d.cap?[]:null,pa:null,pb:null,pTo:'b',stance:d.cls==='worker'||d.convert?'passive':d.cls==='artillery'?'defensive':'aggressive'};
  u.post=[u.x,u.y];
  u.maxSh=maxShield(u);u.sh=u.maxSh;
  units.push(u);return u;
}
function maxShield(u){const d=UNITS[u.type];let s=d.shield||0;if(u.team!==GAIA&&techs[u.team]&&hasTech(u.team,'shields')&&d.cls!=='animal')s+=Math.round(u.maxHp*0.3);return s}
function goTo(u,tx,ty){
  const d=UNITS[u.type];u.dest=[tx,ty];u.stall=0;u.lastD=undefined;
  if(d.fly){u.path=[[tx,ty]];u.pendPath=null;return;}
  // A* is the expensive part of a tick; when a big fight makes everyone repath at
  // once, queue the overflow for the next tick instead of stalling the frame.
  if(pathBudget<=0){u.pendPath=[tx,ty];u.path=[];return;}
  pathBudget--;u.pendPath=null;
  const[sx,sy]=ut(u);u.path=findPath(sx,sy,tx,ty,u.team)||[];
}
function stepMove(u){
  const d=UNITS[u.type];
  if(!u.path||!u.path.length)return true;
  const [px,py]=u.path[0],gx=px*TILE+HALF,gy=py*TILE+HALF;
  if(!d.fly&&(blockedT(px,py,u.team)||!canStep(...ut(u),px,py))){if(u.dest){goTo(u,u.dest[0],u.dest[1]);}else u.path=[];if(!u.path.length)return true;return false;}
  const dx=gx-u.x,dy=gy-u.y,dist=Math.hypot(dx,dy);
  const last=u.path.length===1,thr=last?Math.max(d.speed,4):Math.max(d.speed,13);
  if(dist<=thr){if(last&&dist<=d.speed){u.x=gx;u.y=gy;}u.path.shift();u.stall=0;u.lastD=undefined;if(!u.path.length){u.vx=0;u.vy=0;}return u.path.length===0;}
  if(u.lastD!==undefined&&dist>=u.lastD-0.2){if(++u.stall>45){u.stall=0;u.lastD=undefined;u.path.shift();return u.path.length===0;}}else u.stall=0;
  u.lastD=dist;
  const sp=(u.gspeed&&(u.state==='move'||u.state==='amove'))?Math.min(d.speed,u.gspeed):d.speed;
  u.vx=dx/dist*sp;u.vy=dy/dist*sp;u.x+=u.vx;u.y+=u.vy;u.face=Math.atan2(dy,dx);return false;
}
function removeRes(n){
  if(n.w&&n.farm){ // farm depleted: auto-reseed
    const c=costOf(n.team,BLD.farm);if(canAfford(n.team,c)){pay(n.team,c);n.amount=BLD.farm.amount;if(n.team===0&&tick%600<20)msg('Farm reseeded ('+costStr(c)+')');}else{kill(n);if(n.team===0)msg('A farm went fallow — not enough Carbon to reseed');}
    return;
  }
  n.dead=true;entDirty=true;grid[idx(n.tx,n.ty)]=0;resAt.delete(idx(n.tx,n.ty));
}
function nearestRes(u,type,r){
  let best=null,bd=r*TILE;
  for(const n of resources){if(n.dead||(type&&n.res!==type))continue;const d=Math.hypot(cx(n)-u.x,cy(n)-u.y);if(d<bd){bd=d;best=n;}}
  if(!type||type==='food')for(const b of buildings){if(!b.farm||b.dead||!b.done||b.team!==u.team||b.amount<=0)continue;const d=Math.hypot(cx(b)-u.x,cy(b)-u.y)+64;if(d<bd){bd=d;best=b;}}
  return best;
}
function nearestDrop(u){let best=null,bd=1e12;for(const b of buildings){if(b.team!==u.team||b.dead||!b.done||!BLD[b.type].drop)continue;const d=distTo(u,b);if(d<bd){bd=d;best=b;}}return best}
function canTarget(a,t){
  if(t.dead)return false;const ad=a.w?BLD[a.type]:UNITS[a.type];
  if(!t.w&&UNITS[t.type].fly&&ad.noAir)return false;
  if(!a.w&&ad.minRange&&distTo(a,t)<ad.minRange*TILE)return false;
  return true;
}
function findEnemy(e,r,opts={}){
  let best=null,bd=r*TILE;const ed=e.w?BLD[e.type]:UNITS[e.type];
  for(const u of units){if(u.dead||!foe(u.team,e.team))continue;if(UNITS[u.type].fly&&ed.noAir)continue;const d=distTo(e,u);if(d<bd){bd=d;best=u;}}
  if(best||opts.unitsOnly)return best;bd=r*TILE;
  for(const b of buildings){if(b.dead||!foe(b.team,e.team))continue;const d=distTo(e,b);if(d<bd){bd=d;best=b;}}
  return best;
}
function elevOf(e){
  if(!e.w&&UNITS[e.type].fly)return 0;
  const[tx,ty]=tileOf(e);return hAt(tx,ty);
}
function calcDmg(a,t){
  const ad=a.w?BLD[a.type]:UNITS[a.type];let dmg=ad.dmg;
  // shooting downhill hits harder; shooting uphill is wasteful
  const ha=elevOf(a),ht=elevOf(t);
  if(ha>ht)dmg*=1.25;else if(ht>ha)dmg*=0.8;
  if(!a.w&&a.team!==GAIA&&techs[a.team]){const cls=ad.cls;const line=cls==='troop'?'troopAtk':cls==='mech'?'mechAtk':cls==='air'?'airAtk':null;if(line)dmg+=lineLvl(a.team,line)*LINES[line][3];}
  const cls=t.w?'building':UNITS[t.type].cls;const mult=(ad.bonus&&ad.bonus[cls])||1;
  let arm=t.w?BLD[t.type].armor:UNITS[t.type].armor;
  if(!t.w&&t.team!==GAIA&&techs[t.team]){const c=UNITS[t.type].cls;const line=c==='troop'?'troopArm':c==='mech'?'mechArm':c==='air'?'airArm':null;if(line)arm+=lineLvl(t.team,line);}
  return Math.max(1,Math.round(dmg*mult-arm));
}
function fire(a,t){
  const ad=a.w?BLD[a.type]:UNITS[a.type];
  const sx=cx(a),sy=cy(a);
  if(a.w)a.face=Math.atan2(cy(t)-sy,cx(t)-sx);
  if(ad.blast){
    // lobbed shell: led slightly, so a unit that changes course can still slip the blast
    const dist=Math.hypot(cx(t)-sx,cy(t)-sy),dur=clamp(dist/9,12,46);
    const lead=t.w?0:Math.min(1,dur/28);
    const gx=cx(t)+(t.vx||0)*dur*lead,gy=cy(t)+(t.vy||0)*dur*lead;
    projectiles.push({shell:true,x:sx,y:sy,x0:sx,y0:sy,x1:gx,y1:gy,h:0,t:0,dur,src:a,team:a.team,def:ad,tgt:t,r:(ad.splash||1)*TILE});
    if(onScreen(a))sfx('launch');
  }else{
    projectiles.push({x:sx,y:sy,gx:cx(t),gy:cy(t),face:0,spd:Math.max(9,ad.range*2.4),src:a,team:a.team,def:ad,tgt:t,life:90});
    if(tick-lastLaserSfx>3&&onScreen(a)){lastLaserSfx=tick;sfx('laser');}
  }
}
function stepProjectiles(){
  for(const p of projectiles){
    if(p.shell){
      p.t++;const k=Math.min(1,p.t/p.dur);
      p.x=p.x0+(p.x1-p.x0)*k;p.y=p.y0+(p.y1-p.y0)*k;
      p.h=Math.sin(k*Math.PI)*Math.min(48,Math.hypot(p.x1-p.x0,p.y1-p.y0)*0.25+10);
      if(k>=1){p.done=true;impact(p);}
    }else{
      if(p.tgt&&!p.tgt.dead){p.gx=cx(p.tgt);p.gy=cy(p.tgt);}
      const dx=p.gx-p.x,dy=p.gy-p.y,dd=Math.hypot(dx,dy);
      p.face=Math.atan2(dy,dx);
      if(dd<=p.spd||--p.life<=0){p.x=p.gx;p.y=p.gy;p.done=true;impact(p);}
      else{p.x+=dx/dd*p.spd;p.y+=dy/dd*p.spd;}
    }
  }
  compact(projectiles,p=>!p.done);
}
function impact(p){
  const ad=p.def,src=p.src;
  if(p.shell){
    fx.push({x:p.x,y:p.y,age:0,blast:true,r:p.r,c:LASERC[p.team]});
    if(onScreen({x:p.x,y:p.y})){sfx('boom');shake=Math.min(16,shake+(p.r>TILE*1.2?8:5));}
    const hit=new Set();
    if(p.tgt&&!p.tgt.dead&&distTo({x:p.x,y:p.y},p.tgt)<=p.r*0.8){hit.add(p.tgt);damage(p.tgt,calcDmg(src,p.tgt),src);}
    for(const u of units){if(u.dead||hit.has(u)||!foe(u.team,p.team))continue;if(UNITS[u.type].fly&&ad.noAir)continue;
      if(Math.hypot(u.x-p.x,u.y-p.y)<=p.r+UNITS[u.type].r)damage(u,Math.max(1,Math.round(calcDmg(src,u)*0.5)),src);}
    for(const b of buildings){if(b.dead||hit.has(b)||!foe(b.team,p.team))continue;
      if(distTo({x:p.x,y:p.y},b)<=p.r)damage(b,Math.max(1,Math.round(calcDmg(src,b)*0.5)),src);}
  }else if(p.tgt&&!p.tgt.dead){
    damage(p.tgt,calcDmg(src,p.tgt),src);
    for(let i=0;i<3;i++)dust.push({x:p.x+(Math.random()-.5)*7,y:p.y+(Math.random()-.5)*7,r:1.5,age:0,life:10,spark:true,c:LASERC[p.team]});
  }
}
function damage(t,dmg,src){
  if(t.dead)return;
  if(!t.w){t.lastHit=tick;if(t.sh>0){t.sh-=dmg;if(t.sh<0){t.hp+=t.sh;t.sh=0;}}else t.hp-=dmg;}else t.hp-=dmg;
  if(t.hp<=0){kill(t,src);if(src&&!src.w&&src.type==='worker'&&!t.w&&t.type==='grazer'){src.huntTarget=t;}return;}
  if(!t.w){
    if(t.team===GAIA){if(src&&t.state!=='flee'){t.state='flee';const ang=Math.atan2(t.y-cy(src),t.x-cx(src));const g=nearestFree(clamp(Math.round(t.x/TILE+Math.cos(ang)*7),1,MW-2),clamp(Math.round(t.y/TILE+Math.sin(ang)*7),1,MH-2));if(g)goTo(t,g[0],g[1]);}}
    else if(t.state==='idle'&&UNITS[t.type].cls!=='worker'&&!UNITS[t.type].convert&&src&&!src.dead&&canTarget(t,src)){t.target=src;t.state='attack';t.prev='idle';}
    else if(t.type==='worker'&&t.team===1&&src&&!src.w&&t.state!=='attack'){ /* AI workers keep working */ }
  }
  if(t.w&&t.team===0&&tick-(t.lastWarn||-999)>600){t.lastWarn=tick;msg('Your '+BLD[t.type].name+' is under attack!');sfx('alert');alerts.push({x:cx(t),y:cy(t),age:0});}
}
function kill(e,src){
  if(e.dead)return;e.dead=true;entDirty=true;
  if(stats&&stats[e.team]){if(e.w&&e.done){stats[e.team].blost++;if(src&&stats[src.team]&&foe(src.team,e.team))stats[src.team].bkilled++;}else if(!e.w){stats[e.team].losses++;if(src&&stats[src.team]&&foe(src.team,e.team))stats[src.team].kills++;}}
  if(e.gar&&e.gar.length){e.dead=false;ungarrison(e,true);e.dead=true;}
  if(e.w){for(let y=e.ty;y<e.ty+e.h;y++)for(let x=e.tx;x<e.tx+e.w;x++){grid[idx(x,y)]=0;gateAt.delete(idx(x,y));}
    for(const q of e.queue)if(q[0]==='#')refund(e.team,TECHS[q.slice(1)].cost);else refund(e.team,costOf(e.team,UNITS[q]));
    if(e.done){fx.push({x:cx(e),y:cy(e),age:0,blast:true,r:e.w*TILE*0.7,c:'#ffb15c'});wrecks.push({x:cx(e),y:cy(e),bw:e.w*TILE,bh:e.h*TILE,building:true,team:e.team,age:0,seed:Math.random()});if(onScreen(e))shake=Math.min(18,shake+Math.min(12,e.w*3));}
    if(onScreen(e))sfx('boom');
    if(e.team===0&&e.done)msg('Your '+BLD[e.type].name+' was destroyed');
    if(e.team===1&&e.done&&MILITARY_BLD.includes(e.type))msg('Enemy '+BLD[e.type].name+' destroyed!');
    checkEnd();
  }else{
    if(e.type!=='grazer'){const d0=UNITS[e.type];wrecks.push({x:e.x,y:e.y,r:d0.r*(ART[e.type]||1),cls:d0.cls,team:e.team,face:e.face,age:0,seed:Math.random(),fly:!!d0.fly});
      for(let i=0;i<6;i++)dust.push({x:e.x,y:e.y,r:1.7,age:0,life:34,deb:true,vx:(Math.random()-.5)*2.8,vy:-1.2-Math.random()*1.8,c:'#4a4238'});
      if(onScreen(e))shake=Math.min(16,shake+(d0.cls==='mech'||d0.cls==='artillery'?4:1.5));}
    if(e.type==='grazer'){const[tx,ty]=ut(e);const p=nearestFree(tx,ty,tx,ty,3);if(p){grid[idx(p[0],p[1])]=2;const r={id:nextId++,res:'food',tx:p[0],ty:p[1],w:1,h:1,amount:120,max:120,seed:Math.random(),carcass:true,born:tick};resources.push(r);resAt.set(idx(p[0],p[1]),r);}}
    else if(onScreen(e))sfx('die');
  }
}
function spriteFor(type){
  const s=SPRITES[type];if(!s)return null;
  let im=SPRITE_IMG[type];
  if(!im){im=new Image();im.onload=()=>im.ok=true;im.onerror=()=>{im.bad=true;msg('Could not load sprite for '+type);};im.src=typeof s==='string'?s:s.url;SPRITE_IMG[type]=im;}
  return im.ok?im:null;
}
function setSprite(type,url,opt){
  opt=opt||{};SPRITES[type]={url,mode:opt.mode||'rotate',scale:opt.scale||1};delete SPRITE_IMG[type];
  try{localStorage.setItem('gbl_sprites',JSON.stringify(SPRITES));}catch(e){}
  spriteFor(type);
  msg('Sprite set for '+(UNITS[type]?UNITS[type].name:type));sfx('done');return true;
}
function clearSprites(){for(const k in SPRITES)delete SPRITES[k];for(const k in SPRITE_IMG)delete SPRITE_IMG[k];try{localStorage.removeItem('gbl_sprites');}catch(e){}msg('Custom sprites cleared');}
try{Object.assign(SPRITES,JSON.parse(localStorage.getItem('gbl_sprites')||'{}'));}catch(e){}
function puff(x,y,r,c,life){dust.push({x,y,r,age:0,life:life||26,c:c||'rgba(150,130,100,'});}
function smoke(x,y,r){dust.push({x,y,r,age:0,life:46,smoke:true,c:'rgba(58,54,50,'});}
function onScreen(e){const x=cx(e)-cam.x,y=cy(e)-cam.y;return x>-64&&y>-64&&x<VW+64&&y<VH+64}
function alive(team){return buildings.filter(b=>b.team===team&&!b.dead&&MILITARY_BLD.includes(b.type)).length}
function sideAlive(side){let n=0;for(let t=0;t<nP;t++)if(sideOf(t)===side)n+=alive(t);return n}
function endGame(win,headline){
  if(gameOver)return;gameOver=true;
  const o=document.getElementById('overlay');o.classList.remove('hidden');
  o.querySelector('h1').textContent=win?'VICTORY':'DEFEAT';
  o.querySelector('h2').textContent=headline||(win?'THE ENEMY HAS BEEN WIPED OUT':'YOUR FORCES HAVE BEEN DESTROYED');
  o.querySelectorAll('p,.row,.civ').forEach(x=>x.classList.add('hidden'));
  document.getElementById('end').classList.remove('hidden');
  const S=stats,m=tick/3600|0,sec=(tick/60|0)%60;
  let rows='<tr><td></td><td><b>You</b></td>';
  for(const t of aiTeams())rows+='<td><b>'+TEAMNAME[t]+'</b></td>';
  rows+='</tr>';
  const line=(lbl,f)=>{let r='<tr><td>'+lbl+'</td><td>'+f(S[0])+'</td>';for(const t of aiTeams())r+='<td>'+f(S[t])+'</td>';return r+'</tr>';};
  rows+=line('Units killed',x=>x.kills)+line('Units lost',x=>x.losses)+line('Buildings destroyed',x=>x.bkilled)+line('Buildings lost',x=>x.blost)+line('Resources gathered',x=>x.gathered);
  rows+='<tr><td>Tech level</td><td>'+techLevel(0)+'</td>';for(const t of aiTeams())rows+='<td>'+techLevel(t)+'</td>';rows+='</tr>';
  rows+='<tr><td>Game time</td><td colspan='+nP+'>'+m+':'+String(sec).padStart(2,'0')+'</td></tr>';
  document.getElementById('statsbox').innerHTML='<div id="stats"><table>'+rows+'</table></div>';
  if(mission&&win)campaignWin(mission.id);
  document.getElementById('endbtns').innerHTML=mission
    ? '<button onclick="location.reload()">Back to menu</button>'
    : '<button onclick="location.reload()">Play again</button>';
  sfx(win?'win':'lose');
}
function checkEnd(){
  if(gameOver||mission)return;
  const mine=sideAlive(0);
  let enemy=0;for(let t=1;t<nP;t++)if(sideOf(t)!==0)enemy+=alive(t);
  if(mine&&enemy)return;
  endGame(!!mine);
}
function stepMission(){
  if(!mission||gameOver)return;
  for(const t of mission.triggers||[]){
    if(t.fired)continue;
    let hit=false;
    try{hit=t.at!==undefined?tick>=t.at:!!t.when();}catch(e){}
    if(hit){t.fired=true;try{t.run();}catch(e){}}
  }
  for(const o of objectives){
    if(o.state!=='open')continue;
    let d=false;try{d=!!o.done();}catch(e){}
    if(d){o.state='done';msg('Objective complete: '+o.text);sfx('done');}
    else if(o.failed){let f=false;try{f=!!o.failed();}catch(e){}if(f){o.state='failed';msg('Objective failed: '+o.text);sfx('alert');}}
  }
  let lost=false;try{lost=!!mission.lose();}catch(e){}
  if(lost){endGame(false,mission.loseText||'MISSION FAILED');return;}
  let won=false;try{won=!!mission.win();}catch(e){}
  if(won)endGame(true,mission.winText||'MISSION COMPLETE');
}

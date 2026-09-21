// ---------------------------------------------------------------------------
// Map generation: terrain, elevation with ramps, resource placement and the
// pre-rendered terrain canvas.
// ---------------------------------------------------------------------------
function newGame(o){
  MW=MH=o.size;zoom=1;resize();dust=[];projectiles=[];wrecks=[];shake=0;
  grid=new Uint8Array(MW*MH);gateAt=new Map();alerts=[];theme=THEMES[o.theme||'desert'];
  units=[];buildings=[];resources=[];fx=[];msgs=[];resAt=new Map();
  const opp=o.opponents||[{civ:o.aiCiv,pers:'balanced'}];
  nP=1+opp.length;
  sides=[0];aiPers=[null];civs=[o.civ];res=[];techs=[];stats=[];
  for(const q of opp){sides.push(1);aiPers.push(q.pers||'balanced');civs.push(q.civ);}
  for(let t=0;t<nP;t++){
    res.push({food:200,carbon:250,ore:100,nova:100});
    techs.push(new Set());
    stats.push({kills:0,losses:0,bkilled:0,blost:0,gathered:0,g_food:0,g_carbon:0,g_ore:0,g_nova:0});
  }
  height=new Uint8Array(MW*MH);ramp=new Uint8Array(MW*MH);mapType=o.mapType||'open';memBld=new Map();
  explored=new Uint8Array(MW*MH);vis=new Uint8Array(MW*MH);
  fogCv=document.createElement('canvas');fogCv.width=MW;fogCv.height=MH;fogCtx=fogCv.getContext('2d');
  aiState={};for(const t of aiTeams())aiState[t]={lastAttack:0,waves:0};
  tick=0;nextId=1;sel=[];placing=null;pending=null;groups={};gameOver=false;aiMult=o.ai;paused=false;speed=1;menu=null;
  mission=o.mission||null;objectives=[];
  genMap(o);buildTerrain();
  if(mission&&mission.setup)mission.setup();
  refreshFog();refreshPower();
  const p=buildings.find(b=>b.team===0&&b.type==='hq')||units.find(u=>u.team===0);
  cam=p?{x:cx(p)-VW/2,y:cy(p)-VH/2}:{x:0,y:0};clampCam();
  started=true;
  if(mission){
    objectives=mission.objectives.map(o2=>({...o2,state:'open'}));
    for(const t of mission.triggers||[])t.fired=false;
    msg(mission.name);if(mission.hint)msg(mission.hint);
  }else{
    msg('Welcome, Commander. Build a Power Core near your production buildings.');
    msg('Destroy every enemy Command Center and military building to win.');
  }
  document.getElementById('overlay').classList.add('hidden');refreshTop();
}
function flatten(tx,ty,r){
  for(let y=ty-r;y<=ty+r;y++)for(let x=tx-r;x<=tx+r;x++){
    if(!inMap(x,y))continue;
    height[idx(x,y)]=0;ramp[idx(x,y)]=0;
    if(grid[idx(x,y)]===1)grid[idx(x,y)]=0;
  }
}
function genElevation(type,bases){
  if(type==='open')return;
  const nearBase=(x,y,r)=>bases.some(b=>Math.hypot(x-(b.x+2),y-(b.y+2))<r);
  const count=Math.max(2,Math.round(MW*MH/(type==='highlands'?900:1700)));
  const plateaus=[];
  for(let i=0;i<count;i++){
    let cx0=0,cy0=0,tries=0;
    do{cx0=7+Math.random()*(MW-14)|0;cy0=7+Math.random()*(MH-14)|0;tries++;}while(nearBase(cx0,cy0,17)&&tries<50);
    if(nearBase(cx0,cy0,15))continue;
    const rx=4+Math.random()*4,ry=4+Math.random()*4,wob=0.8+Math.random()*0.45;
    const tiles=[];
    for(let y=-10;y<=10;y++)for(let x=-10;x<=10;x++){
      const tx=cx0+x,ty=cy0+y;
      if(tx<2||ty<2||tx>MW-3||ty>MH-3)continue;
      if(nearBase(tx,ty,13))continue;
      if((x*x)/(rx*rx)+(y*y)/(ry*ry)<=wob){height[idx(tx,ty)]=1;tiles.push([tx,ty]);}
    }
    if(tiles.length>14)plateaus.push(tiles);else for(const[x,y]of tiles)height[idx(x,y)]=0;
  }
  // Every plateau gets two or three ramps, spread around its rim, so high ground is
  // always contestable instead of being a wall.
  for(const tiles of plateaus){
    const ORTH=[[1,0],[-1,0],[0,1],[0,-1]];
    const border=tiles.filter(([x,y])=>ORTH.some(([ox,oy])=>inMap(x+ox,y+oy)&&height[idx(x+ox,y+oy)]===0));
    if(!border.length)continue;
    const chosen=[];
    const want=2+(Math.random()*2|0);
    for(let k=0;k<want&&border.length;k++){
      let best=null,bd=-1;
      for(const t of border){
        const d=chosen.length?Math.min.apply(null,chosen.map(c=>Math.hypot(c[0]-t[0],c[1]-t[1]))):Math.random()*99;
        if(d>bd){bd=d;best=t;}
      }
      if(!best)break;chosen.push(best);
      // carve a short two-wide ramp down the slope
      const[bx,by]=best;
      let dir=null;
      for(const[ox,oy]of ORTH)if(inMap(bx+ox,by+oy)&&height[idx(bx+ox,by+oy)]===0){dir=[ox,oy];break;}
      if(!dir)continue;
      const side=dir[0]?[0,1]:[1,0];
      for(let w=-1;w<=1;w++)for(let dstep=0;dstep<2;dstep++){
        const rx2=bx+side[0]*w-dir[0]*dstep,ry2=by+side[1]*w-dir[1]*dstep;
        if(!inMap(rx2,ry2)||height[idx(rx2,ry2)]!==1)continue;
        ramp[idx(rx2,ry2)]=1;if(grid[idx(rx2,ry2)]===1)grid[idx(rx2,ry2)]=0;
      }
      for(let w=-1;w<=1;w++){
        const lx=bx+dir[0]+side[0]*w,ly=by+dir[1]+side[1]*w;
        if(inMap(lx,ly)&&grid[idx(lx,ly)]===1)grid[idx(lx,ly)]=0;
      }
    }
  }
}
function genChokes(bases){
  // a rocky spine across the middle with a few gaps to fight over
  const vertical=Math.random()<0.5;
  const mid=Math.floor((vertical?MW:MH)/2)+((Math.random()*5|0)-2);
  const len=vertical?MH:MW;
  const gaps=[];
  const nGaps=2+(Math.random()*2|0);
  for(let i=0;i<nGaps;i++)gaps.push(Math.floor(len*(i+0.7)/(nGaps+0.4)));
  for(let a=2;a<len-2;a++){
    if(gaps.some(g=>Math.abs(a-g)<=2))continue;
    for(let t=-1;t<=1;t++){
      const x=vertical?mid+t:a,y=vertical?a:mid+t;
      if(!inMap(x,y))continue;
      if(bases.some(b=>Math.hypot(x-(b.x+2),y-(b.y+2))<13))continue;
      grid[idx(x,y)]=1;height[idx(x,y)]=0;ramp[idx(x,y)]=0;
    }
  }
}
function reachableFrom(tx,ty){
  const seen=new Uint8Array(MW*MH),q=[idx(tx,ty)];seen[idx(tx,ty)]=1;
  while(q.length){
    const i=q.pop(),x=i%MW,y=(i/MW)|0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;
      const nx=x+dx,ny=y+dy;
      if(!inMap(nx,ny)||seen[idx(nx,ny)])continue;
      if(grid[idx(nx,ny)]===1||!canStep(x,y,nx,ny))continue;
      seen[idx(nx,ny)]=1;q.push(idx(nx,ny));
    }
  }
  return seen;
}
function buildingNear(x,y){return buildings.some(b=>x>=b.tx-1&&x<=b.tx+b.w&&y>=b.ty-1&&y<=b.ty+b.h)}
function genMap(o){
  o=o||{};
  const CORN=[{x:5,y:MH-10,dx:1,dy:-1},{x:MW-9,y:6,dx:-1,dy:1},{x:5,y:6,dx:1,dy:1},{x:MW-9,y:MH-10,dx:-1,dy:-1}];
  const bases=CORN.slice(0,nP);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)if(x===0||y===0||x===MW-1||y===MH-1)grid[idx(x,y)]=1;
  const nearBase=(x,y,r)=>bases.some(b=>Math.hypot(x-(b.x+2),y-(b.y+2))<r);
  genElevation(mapType,bases);
  if(mapType==='chokes')genChokes(bases);
  const nRocks=Math.round(MW*MH/(mapType==='chokes'?75:mapType==='highlands'?95:mapType==='plateaus'?75:45));
  for(let i=0;i<nRocks;i++){
    const cx0=2+Math.random()*(MW-4)|0,cy0=2+Math.random()*(MH-4)|0;
    if(nearBase(cx0,cy0,16))continue;
    const r=1+Math.random()*2.5;
    for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++)if(Math.hypot(x,y)<=r*(0.7+Math.random()*.5)){const tx=cx0+x,ty=cy0+y;if(tx>0&&ty>0&&tx<MW-1&&ty<MH-1)grid[idx(tx,ty)]=1;}
  }
  for(const b of bases)flatten(b.x+2,b.y+2,7);
  // If the terrain generator ever walls a base off, drop back to flat ground rather
  // than shipping an unplayable map.
  {
    const home=bases[0],seen=reachableFrom(home.x+2,home.y+2);
    const ok=bases.every(b=>seen[idx(b.x+2,b.y+2)]);
    if(!ok){height.fill(0);ramp.fill(0);for(const b of bases)flatten(b.x+2,b.y+2,7);}
  }
  bases.forEach((b,team)=>{
    const bx=b.x+2,by=b.y+2;
    placeCluster('food',bx+5*b.dx,by-3*b.dy,7,150);
    placeCluster('carbon',bx+9*b.dx,by+1*b.dy,24,150);
    placeCluster('ore',bx+1*b.dx,by+8*b.dy,9,500);
    placeCluster('nova',bx+7*b.dx,by+7*b.dy,7,600);
    spawnHerd(bx+3*b.dx,by+12*b.dy,4);
    if(o.noStart)return;
    placeBuilding(team,'hq',b.x,b.y,true);
    for(let i=0;i<4;i++){const u=spawnUnit(team,'worker',bx-2+i,by+3*b.dy);const n=u&&nearestRes(u,['food','carbon','carbon','food'][i],40);if(n)orderGather(u,n);}
  });
  window.__bases=bases;
  const extra=Math.round(MW*MH/300);
  for(let i=0;i<extra;i++){
    const cx0=4+Math.random()*(MW-8)|0,cy0=4+Math.random()*(MH-8)|0;
    if(nearBase(cx0,cy0,15))continue;
    const t=RES[i%4];placeCluster(t,cx0,cy0,t==='carbon'?14:t==='food'?5:7,t==='carbon'?150:t==='ore'?500:t==='food'?150:600);
  }
  for(let i=0;i<Math.round(MW/14);i++){const x=4+Math.random()*(MW-8)|0,y=4+Math.random()*(MH-8)|0;if(!nearBase(x,y,14))spawnHerd(x,y,3+Math.random()*3|0);}
}
function spawnHerd(x,y,n){for(let i=0;i<n;i++){const u=spawnUnit(GAIA,'grazer',x+(Math.random()*5|0)-2,y+(Math.random()*5|0)-2);if(u){u.state='wander';u.wt=Math.random()*200|0;}}}
function placeCluster(type,cx0,cy0,n,amount){
  let x=cx0,y=cy0,tries=0;
  while(n>0&&tries<500){tries++;
    if(x>0&&y>0&&x<MW-1&&y<MH-1&&grid[idx(x,y)]===0&&!buildingNear(x,y)){
      grid[idx(x,y)]=2;const r={id:nextId++,res:type,tx:x,ty:y,w:1,h:1,amount,max:amount,seed:Math.random()};
      resources.push(r);resAt.set(idx(x,y),r);n--;
    }
    x=cx0+Math.round((Math.random()-.5)*7);y=cy0+Math.round((Math.random()-.5)*7);
  }
}
function buildTerrain(){
  terrain=document.createElement('canvas');terrain.width=MW*TILE;terrain.height=MH*TILE;
  const t=terrain.getContext('2d');
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    const hi=height[idx(x,y)]===1;
    const l=theme.l+(hi?13:0)+Math.random()*6|0;t.fillStyle=`hsl(${theme.h+(hi?4:0)},${theme.s+(hi?7:0)}%,${l}%)`;t.fillRect(x*TILE,y*TILE,TILE,TILE);
    if(Math.random()<.25){t.fillStyle=theme.speck;t.beginPath();t.arc(x*TILE+Math.random()*TILE,y*TILE+Math.random()*TILE,2+Math.random()*4,0,7);t.fill();}
    if(Math.random()<.06){t.strokeStyle=theme.decor;t.lineWidth=1.5;const px=x*TILE+Math.random()*TILE,py=y*TILE+Math.random()*TILE;t.beginPath();for(let k=0;k<3;k++){t.moveTo(px,py);t.lineTo(px+(Math.random()-.5)*10,py-4-Math.random()*6);}t.stroke();}
  }
  // cliff faces: a shaded lip on every edge where high ground meets low
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    if(height[idx(x,y)]!==1||ramp[idx(x,y)])continue;
    const px=x*TILE,py=y*TILE;
    if(hAt(x,y-1)===0){t.fillStyle='rgba(255,255,255,.13)';t.fillRect(px,py,TILE,3);}
    if(hAt(x-1,y)===0){t.fillStyle='rgba(255,255,255,.08)';t.fillRect(px,py,3,TILE);}
    if(hAt(x+1,y)===0){t.fillStyle='rgba(0,0,0,.28)';t.fillRect(px+TILE-3,py,3,TILE);}
    if(hAt(x,y+1)===0){
      t.fillStyle='rgba(0,0,0,.34)';t.fillRect(px,py+TILE-9,TILE,9);
      t.fillStyle='rgba(0,0,0,.5)';t.fillRect(px,py+TILE-3,TILE,3);
      t.fillStyle='rgba(0,0,0,.2)';t.fillRect(px,py+TILE,TILE,6);
      t.strokeStyle='rgba(255,255,255,.1)';t.lineWidth=1;
      for(let k=0;k<3;k++){const rx=px+4+k*10;t.beginPath();t.moveTo(rx,py+TILE-8);t.lineTo(rx+2,py+TILE-1);t.stroke();}
    }
  }
  // ramps: a striped slope so the way up reads at a glance
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)if(ramp[idx(x,y)]===1){
    const px=x*TILE,py=y*TILE;
    t.fillStyle='rgba(0,0,0,.14)';t.fillRect(px,py,TILE,TILE);
    t.strokeStyle='rgba(255,240,200,.22)';t.lineWidth=2;
    for(let k=0;k<4;k++){t.beginPath();t.moveTo(px+2,py+5+k*8);t.lineTo(px+TILE-2,py+5+k*8);t.stroke();}
  }
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)if(grid[idx(x,y)]===1){
    const px=x*TILE,py=y*TILE;
    t.fillStyle=theme.rock[0];t.fillRect(px,py,TILE,TILE);
    t.fillStyle=theme.rock[1];t.beginPath();t.ellipse(px+HALF+(Math.random()-.5)*8,py+HALF+(Math.random()-.5)*8,14,10,Math.random()*3,0,7);t.fill();
    t.fillStyle=theme.rock[2];t.beginPath();t.ellipse(px+HALF-4,py+HALF-5,6,4,0,0,7);t.fill();
  }
}

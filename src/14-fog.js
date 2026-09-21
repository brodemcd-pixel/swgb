// ---------------------------------------------------------------------------
// Power coverage, fog of war (including remembered enemy buildings) and shield
// regeneration.
// ---------------------------------------------------------------------------
function refreshPower(){
  const cores=buildings.filter(b=>b.type==='core'&&b.done&&!b.dead);
  for(const b of buildings){if(b.dead)continue;const d=BLD[b.type];
    b.powered=!d.power||cores.some(c=>c.team===b.team&&Math.hypot(cx(c)-cx(b),cy(c)-cy(b))<=BLD.core.radius*TILE);}
}
const CIRC={};function circ(r){if(CIRC[r])return CIRC[r];const a=[];for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r+r)a.push([x,y]);return CIRC[r]=a;}
function reveal(tx,ty,r){for(const[ox,oy]of circ(r)){const x=tx+ox,y=ty+oy;if(inMap(x,y)){const i=idx(x,y);vis[i]=1;explored[i]=1;}}}
function footprintSeen(b){
  for(let y=b.ty;y<b.ty+b.h;y++)for(let x=b.tx;x<b.tx+b.w;x++)if(inMap(x,y)&&vis[idx(x,y)])return true;
  return false;
}
function refreshFog(){
  vis.fill(0);const bonus=civs[0]==='alliance'?1:0;
  // side 0 shares vision, so an ally's units light the map for you too
  for(const u of units)if(friend(u.team,0)&&!u.dead){const[tx,ty]=ut(u);reveal(tx,ty,UNITS[u.type].los+bonus+(hAt(tx,ty)?1:0));}
  for(const b of buildings)if(friend(b.team,0)&&!b.dead){const[tx,ty]=tileOf(b);reveal(tx,ty,(b.done?BLD[b.type].los:3)+bonus+(hAt(tx,ty)?1:0));}
  // Enemy buildings are remembered as a frozen snapshot of what you last saw, not as
  // a live feed: the ghost keeps standing until you look again and find it gone.
  for(const b of buildings){
    if(b.dead||friend(b.team,0)||b.team===GAIA)continue;
    if(footprintSeen(b))memBld.set(b.id,{id:b.id,type:b.type,team:b.team,tx:b.tx,ty:b.ty,w:b.w,h:b.h,done:b.done,seenAt:tick});
  }
  for(const[id,g]of memBld){
    if(g.seenAt===tick)continue;
    if(footprintSeen(g))memBld.delete(id);
  }
  const img=fogCtx.createImageData(MW,MH),d=img.data;
  for(let i=0;i<MW*MH;i++){d[i*4+3]=vis[i]?0:explored[i]?120:255;}
  fogCtx.putImageData(img,0,0);
}
function visibleE(e){if(friend(e.team,0))return true;if(e.w)return footprintSeen(e);const[tx,ty]=ut(e);return inMap(tx,ty)&&vis[idx(tx,ty)]}
function stepShields(){
  const gens=buildings.filter(b=>b.type==='shieldgen'&&b.done&&!b.dead&&b.powered);
  for(const u of units){if(u.dead||u.team===GAIA)continue;
    if(tick%300===u.id%300)u.maxSh=maxShield(u);
    if(u.sh<u.maxSh&&tick-u.lastHit>180&&tick%20===u.id%20){let rate=1;if(civs[u.team]==='swamp')rate*=2;if(gens.some(g=>g.team===u.team&&Math.hypot(cx(g)-u.x,cy(g)-u.y)<=BLD.shieldgen.radius*TILE))rate*=4;u.sh=Math.min(u.maxSh,u.sh+rate);}
  }
}

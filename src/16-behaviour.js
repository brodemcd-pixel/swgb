// ---------------------------------------------------------------------------
// Per-tick unit behaviour — the state machine each unit runs, plus building
// production and the crowd separation pass.
// ---------------------------------------------------------------------------
function stepUnit(u){
  const d=UNITS[u.type];if(u.cd>0)u.cd--;
  if(u.gar)stepGarrison(u);
  if(u.pendPath&&pathBudget>0){const p=u.pendPath;u.pendPath=null;goTo(u,p[0],p[1]);}
  switch(u.state){
    case'idle':
      if(u.orders&&u.orders.length&&nextOrder(u))break;
      if(d.cls==='animal')break;
      if(d.convert){if(tick%30===u.id%30)healNearby(u);break;}
      if(tick%15===u.id%15){const ar=acqRange(u,d);if(ar>0){const e=findEnemy(u,ar);if(e&&canTarget(u,e)){u.target=e;u.state='attack';u.prev='idle';u.auto=true;}}}break;
    case'move':if(stepMove(u)){u.state='idle';setPost(u);}break;
    case'enter':{
      const e=u.enterT;
      if(!e||e.dead||!e.gar||e.gar.length>=capOf(e)){u.enterT=null;u.state='idle';u.path=[];break;}
      if(distTo(u,e)<=TILE*1.3){if(!garrisonUnit(u,e)){u.enterT=null;u.state='idle';}}
      else{if(!u.path.length||tick%30===u.id%30){const g=e.w?approachTile(u,e):tileOf(e);goTo(u,g[0],g[1]);}
        if(stepMove(u)&&distTo(u,e)>TILE*1.3){u.enterT=null;u.state='idle';}}
      break;}
    case'amove':
      if(tick%10===u.id%10&&u.stance!=='passive'){const e=findEnemy(u,Math.max(d.range+2,6));if(e&&canTarget(u,e)){u.target=e;u.state='attack';u.prev='amove';u.pdest=u.dest;u.auto=true;break;}}
      if(stepMove(u)){u.state='idle';setPost(u);}break;
    case'patrol':
      if(tick%10===u.id%10&&u.stance!=='passive'){const e=findEnemy(u,Math.max(d.range+2,6));if(e&&canTarget(u,e)){u.target=e;u.state='attack';u.prev='patrol';u.auto=true;break;}}
      if(stepMove(u)){
        if(!u.pa||!u.pb){u.state='idle';setPost(u);break;}
        const to=u.pTo==='b'?u.pa:u.pb;u.pTo=u.pTo==='b'?'a':'b';u.post=[u.x,u.y];goTo(u,to[0],to[1]);
      }break;
    case'attack':stepAttack(u,d);break;
    case'convert':stepConvert(u,d);break;
    case'gather':stepGather(u,d);break;
    case'return':stepReturn(u,d);break;
    case'build':stepBuild(u,d);break;
    case'transport':break;
    case'wander':if(u.path.length)stepMove(u);else if(--u.wt<=0){u.wt=120+Math.random()*240|0;const[tx,ty]=ut(u);const g=nearestFree(clamp(tx+(Math.random()*7|0)-3,1,MW-2),clamp(ty+(Math.random()*7|0)-3,1,MH-2));if(g)goTo(u,g[0],g[1]);}break;
    case'flee':if(stepMove(u)){u.state='wander';u.wt=60;}break;
  }
}
function healNearby(u){let best=null,bh=1;for(const o of units){if(o.dead||o.team!==u.team||o===u)continue;const f=o.hp/o.maxHp;if(f<bh&&Math.hypot(o.x-u.x,o.y-u.y)<4*TILE){bh=f;best=o;}}if(best){best.hp=Math.min(best.maxHp,best.hp+3);fx.push({x1:u.x,y1:u.y,x2:best.x,y2:best.y,age:0,c:'#9fe1ff'});}}
function stepAttack(u,d){
  const t=u.target;
  if(!t||t.dead){u.target=null;u.auto=false;
    if(u.huntTarget){u.huntTarget=null;const n=nearestRes(u,'food',4);if(n){orderGather(u,n);return;}}
    if(u.prev==='amove'&&u.pdest){u.state='amove';goTo(u,u.pdest[0],u.pdest[1]);return;}
    if(u.prev==='patrol'&&u.pa&&u.pb){const to=u.pTo==='b'?u.pb:u.pa;u.state='patrol';goTo(u,to[0],to[1]);return;}
    u.state='idle';u.path=[];
    if(u.post&&u.stance!=='hold'&&Math.hypot(u.x-u.post[0],u.y-u.post[1])>4*TILE)orderMove(u,Math.floor(u.post[0]/TILE),Math.floor(u.post[1]/TILE),false);
    return;}
  const dist=distTo(u,t);
  if(u.auto){
    if(u.stance==='hold'&&dist>d.range*TILE+6){u.target=null;u.auto=false;u.state='idle';u.path=[];return;}
    if(u.stance==='defensive'&&u.post&&Math.hypot(u.x-u.post[0],u.y-u.post[1])>6*TILE){
      u.target=null;u.auto=false;orderMove(u,Math.floor(u.post[0]/TILE),Math.floor(u.post[1]/TILE),false);return;}
  }
  if(d.minRange&&dist<d.minRange*TILE){ // back away
    if(!u.path.length||tick%20===u.id%20){const ang=Math.atan2(u.y-cy(t),u.x-cx(t));const[tx,ty]=ut(u);const g=nearestFree(clamp(Math.round(tx+Math.cos(ang)*3),1,MW-2),clamp(Math.round(ty+Math.sin(ang)*3),1,MH-2));if(g)goTo(u,g[0],g[1]);}
    stepMove(u);return;}
  if(dist<=d.range*TILE+6){
    u.path=[];u.face=Math.atan2(cy(t)-u.y,cx(t)-u.x);
    if(u.cd<=0){fire(u,t);u.cd=d.cd;}
  }else{
    if(u.stance==='hold'&&u.auto){u.target=null;u.auto=false;u.state='idle';return;}
    if(!u.path.length||tick%30===u.id%30){const g=d.fly?tileOf(t):approachTile(u,t);goTo(u,g[0],g[1]);}
    stepMove(u);
  }
}
function stepConvert(u,d){
  const t=u.target;
  if(!t||t.dead||t.team===u.team){u.target=null;u.state='idle';u.conv=0;u.path=[];return;}
  if(distTo(u,t)<=d.range*TILE+6){
    u.path=[];u.face=Math.atan2(cy(t)-u.y,cx(t)-u.x);
    if(u.cd>0)return;
    u.conv++;if(tick%6===0)fx.push({x1:u.x,y1:u.y,x2:t.x,y2:t.y,age:0,c:'#ffe81f'});
    if(u.conv>=300){const old=t.team;t.team=u.team;t.state='idle';t.target=null;t.path=[];t.node=null;t.site=null;t.prev=null;if(old===0)sel=sel.filter(s=>s!==t);msg((u.team===0?'Converted an enemy ':'The enemy converted your ')+UNITS[t.type].name+'!');sfx('convert');u.conv=0;u.cd=600;u.state='idle';}
  }else{u.conv=Math.max(0,u.conv-2);if(!u.path.length||tick%30===u.id%30){const g=approachTile(u,t);goTo(u,g[0],g[1]);}stepMove(u);}
}
function gatherRate(u){let r=1;if(u.team===1)r*=aiMult;if(hasTech(u.team,'harvest1'))r*=1.2;if(hasTech(u.team,'harvest2'))r*=1.2;if(civs[u.team]==='cartel')r*=1.1;return r}
function stepGather(u,d){
  let n=u.node;
  if(!n||n.dead||(n.w&&n.amount<=0)){n=nearestRes(u,u.ctype,14);if(!n){if(u.carry>0){u.state='return';u.path=[];return;}u.state='idle';u.node=null;return;}u.node=n;u.path=[];}
  if(u.carry>=10){u.state='return';u.path=[];return;}
  if(distTo(u,n)<=TILE*0.9){
    u.face=Math.atan2(cy(n)-u.y,cx(n)-u.x);u.gt+=gatherRate(u);
    if(u.gt>=20){u.gt=0;u.carry++;n.amount--;if(n.amount<=0)removeRes(n);}
  }else{
    if(!u.path.length){const g=n.farm?[n.tx+(u.id%2),n.ty+((u.id>>1)%2)]:approachTile(u,n);goTo(u,g[0],g[1]);if(!u.path.length&&++u.stuck>30){u.stuck=0;u.node=null;}}
    stepMove(u);
  }
}
function stepReturn(u,d){
  const b=nearestDrop(u);if(!b){u.state='idle';return;}
  if(distTo(u,b)<=TILE*0.9){res[u.team][u.ctype]+=u.carry;const S=stats[u.team];S.gathered+=u.carry;S['g_'+u.ctype]=(S['g_'+u.ctype]||0)+u.carry;u.carry=0;u.state='gather';u.path=[];}
  else{if(!u.path.length){const g=approachTile(u,b);goTo(u,g[0],g[1]);if(!u.path.length&&++u.stuck>60){u.stuck=0;u.state='idle';}}stepMove(u);}
}
function stepBuild(u,d){
  const s=u.site;
  if(!s||s.dead||(s.done&&s.hp>=s.maxHp)){u.site=null;u.state='idle';u.path=[];
    if(s&&!s.dead){ // chain to nearby unfinished/damaged buildings, else gather
      let best=null,bd=12*TILE;for(const b of buildings){if(b.dead||b.team!==u.team||(b.done&&b.hp>=b.maxHp))continue;const dd=distTo(u,b);if(dd<bd){bd=dd;best=b;}}
      if(best){orderBuild(u,best);return;}
      if(u.team===0){const n=s.farm?s:nearestRes(u,null,8);if(n)orderGather(u,n);}
    }return;}
  if(distTo(u,s)<=TILE*0.9){
    u.face=Math.atan2(cy(s)-u.y,cx(s)-u.x);const bd=BLD[s.type];
    if(!s.done){s.prog++;s.hp=Math.min(s.maxHp,s.hp+s.maxHp*0.9/bd.time);if(s.prog>=bd.time){s.done=true;s.hp=s.maxHp;if(s.team===0){msg(bd.name+' complete');sfx('done');}refreshPower();}}
    else{s.hp=Math.min(s.maxHp,s.hp+s.maxHp/bd.time*0.7);} // repair
  }else{if(!u.path.length){const g=approachTile(u,s);goTo(u,g[0],g[1]);if(!u.path.length&&++u.stuck>60){u.stuck=0;u.state='idle';}}stepMove(u);}
}
function stepGarrison(e){
  const gr=e.w?7:0;
  if(!e.gar.length){e.gtarget=null;return;}
  if(tick%60===0)for(const g of e.gar)g.hp=Math.min(g.maxHp,g.hp+2);
  if(!gr)return;
  if(!e.gtarget||e.gtarget.dead||distTo(e,e.gtarget)>gr*TILE+6)e.gtarget=(tick%10===e.id%10)?findEnemy(e,gr):null;
  if(!e.gtarget)return;
  for(const g of e.gar){
    const gd=UNITS[g.type];
    if(gd.dmg<=0||gd.range<2)continue;
    if(g.cd>0){g.cd--;continue;}
    if(!canTarget(g,e.gtarget))continue;
    g.x=cx(e);g.y=cy(e);
    fire(g,e.gtarget);g.cd=gd.cd;
  }
}
function stepBuilding(b){
  const d=BLD[b.type];if(!b.done)return;
  if(b.gar)stepGarrison(b);
  if(b.queue.length){
    b.qprog+=b.powered?1:0.5;const q=b.queue[0];
    if(q[0]==='#'){const t=TECHS[q.slice(1)];if(b.qprog>=t.time){b.queue.shift();b.qprog=0;techs[b.team].add(q.slice(1));if(b.team===0){msg(t.name+' researched');sfx('done');}if(q.slice(1)==='shields')for(const u of units)if(u.team===b.team)u.maxSh=maxShield(u);}}
    else{let time=UNITS[q].time;if(civs[b.team]==='dominion'&&b.type==='troop')time*=0.8;
      if(b.qprog>=time){b.queue.shift();b.qprog=0;const u=spawnUnit(b.team,q,b.tx+(b.w>>1),b.ty+b.h);
        if(u){if(b.rally){if(b.rally.e&&!b.rally.e.dead&&q==='worker')orderGather(u,b.rally.e);else if(b.rally.x!==undefined)orderMove(u,b.rally.x,b.rally.y,q!=='worker');}
          else if(q==='worker'&&b.team===0){const n=nearestRes(u,'food',12)||nearestRes(u,null,12);if(n)orderGather(u,n);}}}}
  }
  if(d.dmg){
    if(b.cd>0)b.cd-=b.powered?1:0.5;
    if(!b.target||b.target.dead||distTo(b,b.target)>d.range*TILE+6){if(tick%10===b.id%10)b.target=findEnemy(b,d.range);else b.target=null;}
    if(b.target&&b.cd<=0){fire(b,b.target);b.cd=d.cd;}
  }
}
// Separation uses a reused bucket grid (head/next linked lists) so a tick that
// pushes a hundred units apart allocates nothing and cannot trigger a GC pause.
let sepHead=null,sepNext=null,sepPX=null,sepPY=null,sepCols=0,sepRows=0;
const SEP_CELL=40;
function separate(){
  const n=units.length;if(!n)return;
  const cols=Math.ceil(MW*TILE/SEP_CELL)+2,rows=Math.ceil(MH*TILE/SEP_CELL)+2;
  if(!sepHead||sepCols!==cols||sepRows!==rows){sepCols=cols;sepRows=rows;sepHead=new Int32Array(cols*rows);}
  if(!sepNext||sepNext.length<n){sepNext=new Int32Array(n*2);sepPX=new Float32Array(n*2);sepPY=new Float32Array(n*2);}
  sepHead.fill(-1);
  for(let i=0;i<n;i++){
    sepPX[i]=0;sepPY[i]=0;
    const u=units[i];if(u.dead){sepNext[i]=-1;continue;}
    const gx=clamp(((u.x/SEP_CELL)|0)+1,0,cols-1),gy=clamp(((u.y/SEP_CELL)|0)+1,0,rows-1);
    const k=gy*cols+gx;sepNext[i]=sepHead[k];sepHead[k]=i;
  }
  for(let i=0;i<n;i++){
    const a=units[i];if(a.dead)continue;
    const fa=!!UNITS[a.type].fly,ra=UNITS[a.type].r;
    const gx=clamp(((a.x/SEP_CELL)|0)+1,0,cols-1),gy=clamp(((a.y/SEP_CELL)|0)+1,0,rows-1);
    for(let oy=-1;oy<=1;oy++){
      const ry=gy+oy;if(ry<0||ry>=rows)continue;
      for(let ox=-1;ox<=1;ox++){
        const rx=gx+ox;if(rx<0||rx>=cols)continue;
        for(let j=sepHead[ry*cols+rx];j!==-1;j=sepNext[j]){
          if(j<=i)continue;
          const b=units[j];if(b.dead||!!UNITS[b.type].fly!==fa)continue;
          const dx=b.x-a.x,dy=b.y-a.y,min=ra+UNITS[b.type].r;
          if(dx>min||dx<-min||dy>min||dy<-min)continue;
          let dist=Math.sqrt(dx*dx+dy*dy);
          if(dist<min){
            let nx,ny;
            if(dist<0.01){nx=Math.random()-.5;ny=Math.random()-.5;dist=1;}else{nx=dx/dist;ny=dy/dist;}
            const f=(min-dist)*0.2;sepPX[i]-=nx*f;sepPY[i]-=ny*f;sepPX[j]+=nx*f;sepPY[j]+=ny*f;
          }
        }
      }
    }
  }
  for(let i=0;i<n;i++){
    const u=units[i];if(u.dead||(!sepPX[i]&&!sepPY[i]))continue;
    const nx=u.x+sepPX[i],ny=u.y+sepPY[i];
    const gx0=Math.floor(u.x/TILE),gy0=Math.floor(u.y/TILE),gx1=Math.floor(nx/TILE),gy1=Math.floor(ny/TILE);
    if(UNITS[u.type].fly||(!blockedT(gx1,gy1,u.team)&&canStep(gx0,gy0,gx1,gy1))){u.x=nx;u.y=ny;}
  }
}

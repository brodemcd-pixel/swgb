// ---------------------------------------------------------------------------
// The computer opponent: base layout, build order, economy balancing, army
// composition and attack waves, shaped by its personality.
// ---------------------------------------------------------------------------
function findBuildSpot(team,type,center){
  const d=BLD[type];let hq=buildings.find(b=>b.team===team&&b.type==='hq'&&!b.dead);
  let hx,hy;
  if(center){hx=center[0];hy=center[1];}
  else{
    if(!hq)return null;hx=hq.tx+2;hy=hq.ty+2;
    if(d.power){const cores=buildings.filter(b=>b.team===team&&b.type==='core'&&!b.dead);
      for(const c of cores){const s2=findBuildSpot(team,type,[c.tx+1,c.ty+1]);if(s2)return s2;}}
  }
  const enemy=buildings.find(b=>foe(b.team,team)&&b.type==='hq'&&!b.dead);
  const dirA=enemy?Math.atan2(cy(enemy)-hy*TILE,cx(enemy)-hx*TILE):0;
  const powered=d.power&&center;const maxR=powered?7:18;
  const r0=powered?2:(type==='shelter'||type==='farm')?6:type==='core'?5:3;
  const cores=buildings.filter(b=>b.team===team&&b.type==='core'&&!b.dead);
  const reserved=(tx,ty)=>type==='core'?cores.some(c=>Math.hypot(c.tx+1-(tx+1),c.ty+1-(ty+1))<8):!d.power&&cores.some(c=>Math.hypot(c.tx+1-(tx+d.w/2),c.ty+1-(ty+d.h/2))<5.5);
  for(let r=r0;r<=maxR;r++){
    const angles=[];for(let k=0;k<20;k++)angles.push(k/20*Math.PI*2);
    if(type==='turret'||type==='sentry'||type==='fort'||type==='core')angles.sort((x,y)=>Math.abs(Math.atan2(Math.sin(x-dirA),Math.cos(x-dirA)))-Math.abs(Math.atan2(Math.sin(y-dirA),Math.cos(y-dirA))));
    else angles.sort(()=>Math.random()-.5);
    for(const ang of angles){
      const tx=Math.round(hx+Math.cos(ang)*r)-(d.w>>1),ty=Math.round(hy+Math.sin(ang)*r)-(d.h>>1);
      let ok=!reserved(tx,ty)&&flatArea(tx,ty,d.w,d.h);
      for(let y=ty-1;y<=ty+d.h&&ok;y++)for(let x=tx-1;x<=tx+d.w;x++)if(occupied(x,y)){ok=false;break;}
      if(ok)return[tx,ty];
    }
  }
  return null;
}
function aiBuild(team,type,center){
  const d=BLD[type],c=costOf(team,d);if(!canAfford(team,c))return false;
  if(techLevel(team)<d.tech)return false;
  const spot=findBuildSpot(team,type,center);
  if(!spot){
    if(d.power&&type!=='core'&&buildings.filter(b=>b.team===team&&b.type==='core'&&!b.dead).length<3&&!buildings.some(b=>b.team===team&&b.type==='core'&&!b.done))return aiBuild(team,'core');
    return false;
  }
  pay(team,c);const b=placeBuilding(team,type,spot[0],spot[1],false);
  const ws=units.filter(u=>u.team===team&&u.type==='worker'&&!u.dead&&u.state!=='build');
  const w=ws.find(u=>u.state==='idle')||ws.sort((x,y)=>distTo(x,b)-distTo(y,b))[0];
  if(w)orderBuild(w,b);return true;
}
function aiTick(team){
  const P=AI_TYPES[aiPers[team]]||AI_TYPES.balanced;
  const R=res[team];
  if(aiMult>1&&tick%600===0)for(const k of RES)R[k]+=25;
  const my=units.filter(u=>u.team===team&&!u.dead),myB=buildings.filter(b=>b.team===team&&!b.dead);
  const workers=my.filter(u=>u.type==='worker'),army=my.filter(u=>UNITS[u.type].cls!=='worker'&&!UNITS[u.type].convert);
  const hq=myB.find(b=>b.type==='hq'&&b.done);
  const minutes=tick/3600,tl=techLevel(team);
  const cnt=t=>myB.filter(b=>b.type===t).length,done=t=>myB.filter(b=>b.type===t&&b.done);
  const st=aiState[team]||(aiState[team]={lastAttack:0,waves:0});
  if(!hq){
    if(workers.length&&!myB.some(b=>b.type==='hq'))aiBuild(team,'hq',workers[0]&&ut(workers[0]));
    for(const w of workers)if(w.state==='idle'){const s2=myB.find(b=>!b.done);if(s2)orderBuild(w,s2);}
    return;
  }
  // ---- which tech level is it saving for
  let wantTech=null;
  if(tl===1&&minutes>P.tech[0])wantTech='tech2';
  else if(tl===2&&minutes>P.tech[1])wantTech='tech3';
  else if(tl===3&&minutes>P.tech[2])wantTech='tech4';
  const saving=wantTech&&!hasTech(team,wantTech)&&!hq.queue.includes('#'+wantTech)&&!canAfford(team,TECHS[wantTech].cost);
  // ---- worker assignment
  const counts={food:0,carbon:0,ore:0,nova:0};
  for(const w of workers)if(w.ctype&&(w.state==='gather'||w.state==='return'))counts[w.ctype]++;
  const want=saving?{food:.5,carbon:.15,ore:.15,nova:.2}
    :tl===1?{food:.4,carbon:.35,ore:.1,nova:.15}
    :tl===2?{food:.35,carbon:.25,ore:.2,nova:.2}
    :{food:.3,carbon:.2,ore:.25,nova:.25};
  let farAvg=0,farN=0;
  for(const w of workers){
    if(w.state==='gather'&&w.node){const dd=nearestDrop(w);if(dd){farAvg+=distTo(w,dd)/TILE;farN++;}}
    if(w.state!=='idle')continue;
    let best=null,bs=-1e9;for(const t of RES){const sc=want[t]*workers.length-counts[t]-R[t]/900;if(sc>bs){bs=sc;best=t;}}
    let n=nearestRes(w,best,45)||nearestRes(w,null,70);
    if(best==='food'&&!n){const g=units.find(u=>u.team===GAIA&&!u.dead&&Math.hypot(u.x-w.x,u.y-w.y)<30*TILE);if(g){orderAttack(w,g);continue;}}
    if(n){orderGather(w,n);counts[n.res]++;}
  }
  {const score={};for(const t of RES)score[t]=want[t]*workers.length-counts[t]-R[t]/900;
   const hi=RES.reduce((x,y)=>score[x]>score[y]?x:y),lo=RES.reduce((x,y)=>score[x]<score[y]?x:y);
   if(score[hi]-score[lo]>2.5){const w=workers.find(w2=>w2.state==='gather'&&w2.ctype===lo);const n=w&&(nearestRes(w,hi,45)||nearestRes(w,hi,80));if(n)orderGather(w,n);}}
  const foodSources=resources.filter(r=>!r.dead&&r.res==='food'&&Math.hypot(cx(r)-cx(hq),cy(r)-cy(hq))<28*TILE).length+done('farm').reduce((a,f)=>a+(f.amount>0?1:0),0);
  // ---- workers
  const targetW=Math.round(Math.min(26,11+tl*3+(aiMult>1?4:0))*P.workers);
  const wq=hq.queue.filter(q=>q==='worker').length;
  if(workers.length+wq<targetW&&hq.queue.length<2)tryTrain(hq,'worker');
  // ---- tech research
  if(!hq.queue.length){
    if(wantTech&&!hasTech(team,wantTech))tryResearch(hq,wantTech);
    else if(tl>=2&&!hasTech(team,'harvest1')&&R.food>300)tryResearch(hq,'harvest1');
    else if(tl>=3&&!hasTech(team,'harvest2')&&R.food>500)tryResearch(hq,'harvest2');
  }
  // ---- construction
  const building=myB.filter(b=>!b.done).length;
  if(building<2){
    const pu=popUsed(team),pc=popCap(team),plan=[];
    const unpowered=myB.find(b=>b.done&&BLD[b.type].power&&!b.powered);
    if(cnt('core')<1)plan.push(['core']);
    else if(unpowered&&!myB.some(b=>b.type==='core'&&!b.done))plan.push(['core',tileOf(unpowered)]);
    if(cnt('troop')<1)plan.push(['troop']);
    if(pu+2>=pc&&pc<100)plan.push(['shelter']);
    if(foodSources<3&&cnt('farm')<4+tl*2)plan.push(['farm']);
    if(farN&&farAvg/farN>11&&cnt('depot')<3){const w=workers.find(w2=>w2.state==='gather'&&w2.node);if(w)plan.push(['depot',tileOf(w.node)]);}
    if(tl>=2&&cnt('research')<1)plan.push(['research']);
    if(tl>=2&&cnt('mech')<1&&P.mix!=='troop')plan.push(['mech']);
    if(cnt('troop')<(P.mix==='troop'?3:2)&&minutes>4)plan.push(['troop']);
    if(tl>=2&&cnt('turret')<Math.round((1+tl)*P.turrets)&&R.ore>250)plan.push(['turret']);
    if(tl>=3&&cnt('air')<1)plan.push(['air']);
    if(tl>=3&&cnt('heavy')<1&&minutes>9)plan.push(['heavy']);
    if(tl>=3&&cnt('fort')<1&&R.ore>500)plan.push(['fort']);
    if(tl>=3&&hasTech(team,'shields')&&cnt('shieldgen')<1)plan.push(['shieldgen']);
    if(tl>=3&&cnt('mech')<2&&minutes>10)plan.push(['mech']);
    if(tl>=3&&cnt('temple')<1&&minutes>11&&R.nova>400)plan.push(['temple']);
    if(cnt('sentry')<Math.round(2*P.turrets)&&R.ore>150&&minutes>3)plan.push(['sentry']);
    if(cnt('core')<3&&myB.filter(b=>BLD[b.type].power).length>=4*cnt('core'))plan.push(['core']);
    if(pu+7>=pc&&pc<100)plan.push(['shelter']);
    let slots=2-building;
    for(const[t,c]of plan){if(saving&&!['core','troop','shelter','farm','depot'].includes(t))continue;if(aiBuild(team,t,c)&&--slots<=0)break;}
  }
  // ---- research centre
  for(const rc of done('research')){
    if(rc.queue.length)continue;
    const order=['troopAtk','troopArm','mechAtk','airAtk','mechArm','airArm'];let did=false;
    if(tl>=3&&!hasTech(team,'shields')&&R.ore>400&&R.nova>400){if(!tryResearch(rc,'shields'))did=true;}
    if(!did)for(const l of order){const n=nextInLine(team,l);if(n&&R.ore>250&&R.nova>250&&!tryResearch(rc,n))break;}
  }
  // ---- read the enemy army and counter it
  const enemies=units.filter(u=>!u.dead&&foe(u.team,team));
  const eAir=enemies.filter(u=>UNITS[u.type].fly).length,eMech=enemies.filter(u=>UNITS[u.type].cls==='mech').length;
  const eB=buildings.filter(b=>!b.dead&&foe(b.team,team)).length;
  const uniq=CIVS[civs[team]].unique;
  const threatNear=enemies.some(u=>UNITS[u.type].cls!=='worker'&&Math.hypot(u.x-cx(hq),u.y-cy(hq))<22*TILE);
  const armyCount=army.length;
  for(const b of myB){
    if(!b.done||b.queue.length)continue;
    if(saving&&armyCount>=4+tl*3)continue;
    if(armyCount>=(6+minutes*2.5)*aiMult*1.2*P.wave&&!threatNear)continue;
    if(b.type==='troop'){let t='trooper';if(eAir>=3&&tl>=2)t='aa';else if(tl>=3&&Math.random()<.35)t='grenadier';else if(tl>=2&&Math.random()<.3)t='mounted';tryTrain(b,t)||tryTrain(b,'trooper');}
    if(b.type==='mech'){let t='smech';if(eMech>=4&&tl>=3)t='destroyer';else if(tl>=4&&R.ore>400&&(P.mix==='heavy'||Math.random()<.4))t='heavy';tryTrain(b,t)||tryTrain(b,'smech');}
    if(b.type==='air'){let t='fighter';if(tl>=3&&eB>6&&Math.random()<.5)t='bomber';tryTrain(b,t)||tryTrain(b,'fighter');}
    if(b.type==='heavy'&&army.filter(u=>UNITS[u.type].cls==='artillery').length<4)tryTrain(b,'artillery');
    if(b.type==='fort')tryTrain(b,uniq);
    if(b.type==='temple'&&my.filter(u=>u.type==='mystic').length<2)tryTrain(b,'mystic');
  }
  // ---- defend
  const threat=enemies.find(u=>myB.some(b=>Math.hypot(cx(u)-cx(b),cy(u)-cy(b))<10*TILE));
  // Tuck a couple of shooters into a turret when the base is hit; let them back out
  // once it is quiet so they are not parked inside for the rest of the game.
  if(threat){
    const host=myB.filter(b=>b.done&&b.gar&&b.gar.length<capOf(b)&&Math.hypot(cx(b)-cx(threat),cy(b)-cy(threat))<12*TILE)
      .sort((x,y)=>(BLD[y.type].dmg?1:0)-(BLD[x.type].dmg?1:0))[0];
    if(host){
      const ready=army.filter(a=>a.state==='idle'&&UNITS[a.type].range>=3&&!UNITS[a.type].fly).slice(0,2);
      for(const a of ready){a.state='enter';a.enterT=host;a.path=[];a.target=null;}
    }
  }else if(tick%600===0){
    for(const b of myB)if(b.gar&&b.gar.length)ungarrison(b);
  }
  if(threat){
    for(const a of army)if((a.state==='idle'||a.state==='amove')&&canTarget(a,threat)){a.target=threat;a.state='attack';a.prev='idle';a.auto=true;}
    for(const m of my.filter(u=>u.type==='mystic'&&u.state==='idle'))if(!threat.w&&Math.hypot(m.x-threat.x,m.y-threat.y)<12*TILE)orderAttack(m,threat);
    return;
  }
  // ---- attack waves
  const idle=army.filter(a=>a.state==='idle');
  const need=Math.max(4,Math.round(Math.min(36,7+Math.floor(minutes*1.4)+(aiMult>1?3:0))*P.wave));
  if(idle.length>=need&&minutes>P.firstAttack&&tick-st.lastAttack>1800){
    st.lastAttack=tick;st.waves++;
    const targets=buildings.filter(b=>!b.dead&&foe(b.team,team));
    if(targets.length){
      const nearest=targets.sort((x,y)=>Math.hypot(cx(x)-cx(hq),cy(x)-cy(hq))-Math.hypot(cx(y)-cx(hq),cy(y)-cy(hq)))[0];
      const g=tileOf(nearest);groupMove(idle,g[0],g[1],true);
      const mys=my.filter(u=>u.type==='mystic'&&u.state==='idle');groupMove(mys,g[0],g[1],false);
    }
  }
  for(const a of army)if(a.hp<a.maxHp*0.25&&a.state==='attack'&&Math.hypot(a.x-cx(hq),a.y-cy(hq))>20*TILE&&Math.random()<.3){const g=tileOf(hq);orderMove(a,g[0],g[1]+5,false);}
}

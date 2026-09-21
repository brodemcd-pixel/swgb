// ---------------------------------------------------------------------------
// The simulation tick: runs every subsystem in order and advances the world.
// ---------------------------------------------------------------------------
function clampCam(){VW=W/zoom;VH=H/zoom;cam.x=clamp(cam.x,MW*TILE<VW?(MW*TILE-VW)/2:0,Math.max(0,MW*TILE-VW));cam.y=clamp(cam.y,MH*TILE<VH?(MH*TILE-VH)/2:0,Math.max(0,MH*TILE-VH));}
function setZoom(z,ax,ay){
  const old=zoom;zoom=clamp(z,0.55,2.4);
  if(ax===undefined){ax=W/2;ay=H/2;}
  const wx=ax/old+cam.x,wy=ay/old+cam.y;
  cam.x=wx-ax/zoom;cam.y=wy-ay/zoom;clampCam();
}
function update(){
  tick++;pathBudget=6;
  for(const u of units)if(!u.dead)stepUnit(u);
  if(dust.length<220)for(const u of units){
    if(u.dead)continue;const cl=UNITS[u.type].cls;
    if(u.path.length&&(cl==='mech'||cl==='artillery')){
      const per=u.type==='heavy'?16:26;
      if((tick+u.id)%per===0&&onScreen(u))puff(u.x+(Math.random()-.5)*10,u.y+8+(Math.random()-.5)*4,u.type==='heavy'?7:4.5);
    }
    if(u.hp<u.maxHp*0.35&&cl!=='animal'&&(tick+u.id)%22===0&&onScreen(u))smoke(u.x+(Math.random()-.5)*6,u.y-4,2.4);
  }
  separate();
  for(const b of buildings)if(!b.dead)stepBuilding(b);
  stepShields();
  for(const e of fx)e.age++;compact(fx,e=>e.age<(e.blast?18:10));
  for(const m of msgs)m.age++;compact(msgs,m=>m.age<480);
  if(pulse&&++pulse.age>25)pulse=null;
  for(const a of alerts)a.age++;compact(alerts,a=>a.age<420);
  stepProjectiles();
  if(shake>0){shake*=0.87;if(shake<0.25)shake=0;}
  for(const p of dust){
    p.age++;
    if(p.deb){p.vy+=0.13;p.x+=p.vx;p.y+=p.vy;}
    else if(p.spark){p.r*=0.93;}
    else{p.r+=p.smoke?0.42:0.35;p.y-=p.smoke?0.28:0.08;}
  }
  compact(dust,p=>p.age<(p.life||26));
  for(const w of wrecks){w.age++;if(w.age<200&&w.age%(w.building?7:14)===0)smoke(w.x+(Math.random()-.5)*(w.bw||10)*0.5,w.y+(Math.random()-.5)*8,w.building?5:3);}
  compact(wrecks,w=>w.age<(w.building?3200:1100));
  for(const r of resources)if(r.carcass&&tick-r.born>3600&&tick%60===0){r.amount-=5;if(r.amount<=0)removeRes(r);}
  if(!(mission&&mission.noAI))for(const t of aiTeams())if(tick%120===(60+t*37)%120)aiTick(t);
  if(tick%15===0)stepMission();
  if(tick%30===0)refreshPower();
  if(tick%8===0)refreshFog();
  if(entDirty){compact(units,u=>!u.dead);compact(buildings,b=>!b.dead);compact(resources,r=>!r.dead);compact(sel,e=>!e.dead);entDirty=false;}
  if(tick%10===0){refreshPanel();refreshTop();drawMinimap();refreshObjectives();}
}
function scroll(){
  if(!started)return;const sp=12/zoom;
  if(keys.ArrowLeft)cam.x-=sp;if(keys.ArrowRight)cam.x+=sp;if(keys.ArrowUp)cam.y-=sp;if(keys.ArrowDown)cam.y+=sp;
  if(mouse.inCanvas&&!mouse.down&&document.hasFocus()){const m=14;if(mouse.x<m)cam.x-=sp;if(mouse.x>W-m)cam.x+=sp;if(mouse.y<m+28)cam.y-=sp;if(mouse.y>H-m)cam.y+=sp;}
  clampCam();
}

// ---------------------------------------------------------------------------
// The campaign: mission-scripting helpers, the six mission definitions and
// campaign progress storage.
// ---------------------------------------------------------------------------
// Mission helpers. All coordinates are tiles. Missions run setup() after the map
// is generated, so they can rely on the four base corners being clear.
function mHome(){return[7,MH-8]}
function mFar(){return[MW-7,8]}
function mSpawn(team,type,tx,ty,n,opt){
  opt=opt||{};const out=[];
  for(let i=0;i<(n||1);i++){
    const o=OFFS[i%OFFS.length];
    const u=spawnUnit(team,type,tx+o[0],ty+o[1]);
    if(!u)continue;
    if(opt.stance)u.stance=opt.stance;
    if(opt.face!==undefined)u.face=opt.face;
    setPost(u);out.push(u);
  }
  return out;
}
function mBuild(team,type,tx,ty){
  for(let y=ty;y<ty+BLD[type].h;y++)for(let x=tx;x<tx+BLD[type].w;x++){
    if(!inMap(x,y))return null;
    const r=resAt.get(idx(x,y));if(r)removeRes(r);
    grid[idx(x,y)]=0;
  }
  return placeBuilding(team,type,tx,ty,true);
}
function mClear(tx,ty,r){
  for(let y=ty-r;y<=ty+r;y++)for(let x=tx-r;x<=tx+r;x++){
    if(!inMap(x,y)||x<1||y<1||x>MW-2||y>MH-2)continue;
    const n=resAt.get(idx(x,y));if(n)removeRes(n);
    if(grid[idx(x,y)]===1)grid[idx(x,y)]=0;
  }
}
function mReveal(tx,ty,r){for(const[ox,oy]of circ(r)){const x=tx+ox,y=ty+oy;if(inMap(x,y))explored[idx(x,y)]=1;}}
function mCam(tx,ty){cam.x=tx*TILE-VW/2;cam.y=ty*TILE-VH/2;clampCam();}
function mGive(team,r){for(const k in r)res[team][k]+=r[k];}
function mTech(team,list){for(const t of list)techs[team].add(t);}
function mUnits(team,f){return units.filter(u=>u.team===team&&!u.dead&&(!f||f(u)))}
function mBldgs(team,f){return buildings.filter(b=>b.team===team&&!b.dead&&(!f||f(b)))}
function mArmy(team){return mUnits(team,u=>UNITS[u.type].cls!=='worker'&&UNITS[u.type].cls!=='animal')}
function mRaid(team,list,tx,ty){
  const all=[];
  for(const[type,n]of list)all.push(...mSpawn(team,type,tx,ty,n));
  const g=mHome();groupMove(all,g[0],g[1],true);
  return all;
}
function mNear(list,tx,ty,r){return list.filter(u=>Math.hypot(u.x-(tx*TILE+HALF),u.y-(ty*TILE+HALF))<r*TILE).length}
function mTime(t){const s=Math.max(0,Math.ceil(t/60));return (s/60|0)+':'+String(s%60).padStart(2,'0')}

const MISSIONS=[
{
  id:'m1',name:'Mission 1 — Landfall',
  blurb:'A scouting force makes planetfall. No base, no reinforcements — just the squad you brought.',
  hint:'Box-select your squad and right-click the enemy outpost to attack it.',
  size:56,theme:'desert',civ:'alliance',opponents:[{civ:'dominion',pers:'balanced'}],noStart:true,noAI:true,
  setup(){
    const[hx,hy]=mHome();
    mSpawn(0,'trooper',hx+1,hy-2,6);
    mSpawn(0,'worker',hx,hy,2);
    const ox=Math.floor(MW*0.58),oy=Math.floor(MH*0.42);
    mClear(ox,oy,5);
    mBuild(1,'depot',ox,oy);
    mBuild(1,'sentry',ox-3,oy+2);
    mBuild(1,'sentry',ox+3,oy-1);
    mSpawn(1,'trooper',ox+1,oy+3,4,{stance:'defensive'});
    mReveal(ox+1,oy+1,7);
    this.ox=ox;this.oy=oy;
  },
  objectives:[
    {text:'Destroy the enemy outpost',done:()=>mBldgs(1).length===0},
    {text:()=>'Keep at least one Engineer alive ('+mUnits(0,u=>u.type==='worker').length+' left)',done:()=>mBldgs(1).length===0&&mUnits(0,u=>u.type==='worker').length>0}
  ],
  triggers:[
    {at:60,run(){msg('Scouts report a supply outpost to the north-east. Take it apart.');}},
    {when(){return mBldgs(1).length<3},run(){msg('Good. Keep pushing — finish the rest of the outpost.');}}
  ],
  win:()=>mBldgs(1).length===0&&mUnits(0,u=>u.type==='worker').length>0,
  lose:()=>mUnits(0).length===0,
  winText:'THE OUTPOST IS OURS',loseText:'THE LANDING PARTY WAS WIPED OUT'
},
{
  id:'m2',name:'Mission 2 — Foothold',
  blurb:'Raise a base on the ridge and hold it. The enemy will test you three times.',
  hint:'Build a Power Core first, then a Troop Center. Raids come at 3, 5 and 7 minutes.',
  size:56,theme:'desert',civ:'alliance',opponents:[{civ:'dominion',pers:'balanced'}],noStart:true,noAI:true,
  setup(){
    const[hx,hy]=mHome();
    mBuild(0,'hq',hx-2,hy-2);
    const ws=mSpawn(0,'worker',hx+2,hy+2,5);
    for(const w of ws){const n=nearestRes(w,null,30);if(n)orderGather(w,n);}
    mGive(0,{food:150,carbon:250,ore:100,nova:50});
    mSpawn(0,'trooper',hx+3,hy-1,2);
  },
  objectives:[
    {text:'Build a Power Core',done:()=>mBldgs(0,b=>b.type==='core'&&b.done).length>0},
    {text:'Build a Troop Center',done:()=>mBldgs(0,b=>b.type==='troop'&&b.done).length>0},
    {text:'Field 6 military units',done:()=>mArmy(0).length>=6},
    {text:()=>'Hold the ridge for '+mTime(8*3600-tick),done:()=>tick>=8*3600}
  ],
  triggers:[
    {at:90,run(){msg('Engineers are gathering. Get a Power Core up before you build anything else.');}},
    {at:3*3600,run(){msg('Enemy raiders inbound from the north!');sfx('alert');mRaid(1,[['trooper',3]],MW-10,10);}},
    {at:5*3600,run(){msg('Second wave — heavier this time.');sfx('alert');mRaid(1,[['trooper',4],['mounted',2]],MW-10,10);}},
    {at:7*3600,run(){msg('Final push. Hold the line!');sfx('alert');mRaid(1,[['trooper',5],['mounted',2],['smech',1]],MW-10,10);}}
  ],
  win:()=>tick>=8*3600&&mBldgs(0,b=>b.type==='hq').length>0,
  lose:()=>mBldgs(0,b=>b.type==='hq').length===0,
  winText:'THE RIDGE HELD',loseText:'THE COMMAND CENTER WAS LOST'
},
{
  id:'m3',name:'Mission 3 — Ore and Ice',
  blurb:'Strip the ice field of its ore while a raiding enemy tries to stop you.',
  hint:'Set your defenders to Hold Position so they stay on the mine instead of chasing.',
  size:64,theme:'ice',civ:'swamp',opponents:[{civ:'cartel',pers:'rusher'}],
  setup(){
    mTech(0,['tech2']);
    mGive(0,{food:300,carbon:400,ore:150,nova:200});
    const[hx,hy]=mHome();
    mSpawn(0,'worker',hx+2,hy+2,4);
    mSpawn(0,'trooper',hx+4,hy-2,3);
    mGive(1,{food:400,carbon:400,ore:300,nova:200});
  },
  objectives:[
    {text:()=>'Mine 800 Ore ('+(stats[0].g_ore|0)+'/800)',done:()=>stats[0].g_ore>=800},
    {text:'Keep your Command Center standing',done:()=>stats[0].g_ore>=800&&mBldgs(0,b=>b.type==='hq').length>0}
  ],
  triggers:[
    {at:120,run(){msg('The ore seams are rich here. Put Engineers on them and defend the line.');}},
    {at:4*3600,run(){msg('Raiders are probing your mining line.');sfx('alert');mRaid(1,[['mounted',3]],MW-10,10);}},
    {when(){return stats[0].g_ore>=400},run(){msg('Half way. The enemy will not let the rest go quietly.');mRaid(1,[['trooper',4],['smech',1]],MW-10,10);}}
  ],
  win:()=>stats[0].g_ore>=800&&mBldgs(0,b=>b.type==='hq').length>0,
  lose:()=>mBldgs(0,b=>b.type==='hq').length===0,
  winText:'THE SEAMS ARE STRIPPED',loseText:'THE MINING BASE WAS OVERRUN'
},
{
  id:'m4',name:'Mission 4 — The Long Walk',
  blurb:'Walk three Engineers across hostile forest to the extraction point. Two must survive.',
  hint:'Attack-move your escort and keep the Engineers behind it. Patrol is useful on the flanks.',
  size:64,theme:'forest',civ:'alliance',opponents:[{civ:'swamp',pers:'balanced'}],noStart:true,noAI:true,
  setup(){
    const[hx,hy]=mHome();
    mSpawn(0,'worker',hx,hy,3);
    mSpawn(0,'trooper',hx+2,hy-2,5);
    mSpawn(0,'mounted',hx+3,hy,2);
    const z=mFar();this.zone={x:z[0],y:z[1],r:4};
    mClear(z[0],z[1],4);
    mReveal(z[0],z[1],6);
    mBuild(0,'depot',z[0]-1,z[1]-1);
  },
  objectives:[
    {text:()=>'Get 2 Engineers to the extraction point ('+mNear(mUnits(0,u=>u.type==='worker'),mFar()[0],mFar()[1],4)+'/2)',
     done:()=>mNear(mUnits(0,u=>u.type==='worker'),mFar()[0],mFar()[1],4)>=2},
    {text:()=>'Keep at least 2 Engineers alive ('+mUnits(0,u=>u.type==='worker').length+' left)',
     done:()=>mNear(mUnits(0,u=>u.type==='worker'),mFar()[0],mFar()[1],4)>=2,
     failed:()=>mUnits(0,u=>u.type==='worker').length<2}
  ],
  triggers:[
    {at:60,run(){msg('Extraction point marked to the north-east. Move out.');}},
    {when(){return mUnits(0).some(u=>u.x>MW*TILE*0.35)},run(){msg('Ambush!');sfx('alert');mRaid(1,[['trooper',4]],Math.floor(MW*0.4),Math.floor(MH*0.55));}},
    {when(){return mUnits(0).some(u=>u.x>MW*TILE*0.6)},run(){msg('More of them in the trees ahead.');sfx('alert');mRaid(1,[['trooper',3],['mounted',3]],Math.floor(MW*0.68),Math.floor(MH*0.4));}},
    {when(){return mUnits(0).some(u=>u.x>MW*TILE*0.8)},run(){msg('Last of them between you and the landing zone.');sfx('alert');mRaid(1,[['trooper',4],['smech',2]],MW-14,14);}}
  ],
  win(){return mNear(mUnits(0,u=>u.type==='worker'),mFar()[0],mFar()[1],4)>=2},
  lose:()=>mUnits(0,u=>u.type==='worker').length<2,
  winText:'EXTRACTION COMPLETE',loseText:'THE CONVOY NEVER ARRIVED'
},
{
  id:'m5',name:'Mission 5 — Siege',
  blurb:'A fortified enemy sits on the far ridge. You have a working base and the tech to crack it.',
  hint:'Artillery outranges turrets. Put it on Hold Position behind your line and let it work.',
  size:64,theme:'desert',civ:'dominion',opponents:[{civ:'alliance',pers:'turtle'}],
  setup(){
    mTech(0,['tech2','tech3','troopAtk1','mechAtk1']);
    mGive(0,{food:900,carbon:1100,ore:800,nova:700});
    const[hx,hy]=mHome();
    mSpawn(0,'worker',hx+2,hy+2,6);
    mBuild(0,'core',hx+4,hy-4);
    mBuild(0,'troop',hx+6,hy-3);
    mBuild(0,'shelter',hx+2,hy-5);mBuild(0,'shelter',hx+5,hy-6);
    mSpawn(0,'trooper',hx+5,hy-1,4);
    // the enemy stronghold
    mTech(1,['tech2','tech3']);
    mGive(1,{food:900,carbon:900,ore:900,nova:900});
    const[ex,ey]=mFar();
    mBuild(1,'core',ex-4,ey+3);
    mBuild(1,'troop',ex-7,ey+2);
    mBuild(1,'turret',ex-2,ey+5);
    mBuild(1,'turret',ex-6,ey+6);
    mBuild(1,'turret',ex+1,ey+1);
    mBuild(1,'fort',ex-4,ey+7);
    mSpawn(1,'trooper',ex-3,ey+4,5,{stance:'defensive'});
    mSpawn(1,'smech',ex-5,ey+4,2,{stance:'defensive'});
    mReveal(ex-3,ey+4,9);
  },
  objectives:[
    {text:'Destroy the enemy Fortress',done:()=>mBldgs(1,b=>b.type==='fort').length===0},
    {text:'Destroy every enemy Command Center and military building',done:()=>mBldgs(1,b=>MILITARY_BLD.includes(b.type)).length===0}
  ],
  triggers:[
    {at:120,run(){msg('Their turrets will shred infantry. Build a Heavy Weapons Factory and bring Artillery.');}},
    {when(){return mBldgs(1,b=>b.type==='turret').length<2},run(){msg('Their outer guns are down. Push in.');}}
  ],
  win:()=>mBldgs(1,b=>MILITARY_BLD.includes(b.type)).length===0,
  lose:()=>mBldgs(0,b=>b.type==='hq').length===0,
  winText:'THE STRONGHOLD HAS FALLEN',loseText:'THE SIEGE WAS BROKEN'
},
{
  id:'m6',name:'Mission 6 — Two Fronts',
  blurb:'Two enemy commanders, allied against you, on a full-sized map. No tricks left — just play better.',
  hint:'One rushes, one booms. Scout early and decide which one dies first.',
  size:80,theme:'desert',civ:'alliance',opponents:[{civ:'dominion',pers:'rusher'},{civ:'cartel',pers:'economist'}],
  setup(){mGive(0,{food:150,carbon:150,ore:100,nova:100});},
  objectives:[
    {text:()=>'Destroy the Red commander ('+mBldgs(1,b=>MILITARY_BLD.includes(b.type)).length+' buildings left)',done:()=>mBldgs(1,b=>MILITARY_BLD.includes(b.type)).length===0},
    {text:()=>'Destroy the Gold commander ('+mBldgs(2,b=>MILITARY_BLD.includes(b.type)).length+' buildings left)',done:()=>mBldgs(2,b=>MILITARY_BLD.includes(b.type)).length===0}
  ],
  triggers:[
    {at:120,run(){msg('Red moves early. Gold builds. Choose your moment.');}},
    {at:6*3600,run(){msg('Gold is well into Tech Level 3. The longer this runs, the worse it gets.');}}
  ],
  win:()=>mBldgs(1,b=>MILITARY_BLD.includes(b.type)).length===0&&mBldgs(2,b=>MILITARY_BLD.includes(b.type)).length===0,
  lose:()=>mBldgs(0,b=>MILITARY_BLD.includes(b.type)).length===0,
  winText:'BOTH COMMANDERS ARE BROKEN',loseText:'YOU WERE CAUGHT BETWEEN THEM'
}
];

function campaignDone(){try{return JSON.parse(localStorage.getItem('gbl_campaign')||'[]');}catch(e){return[];}}
function campaignWin(id){
  try{
    const d=campaignDone();
    if(!d.includes(id)){d.push(id);localStorage.setItem('gbl_campaign',JSON.stringify(d));}
  }catch(e){}
}
function missionUnlocked(i){
  if(i===0)return true;
  return campaignDone().includes(MISSIONS[i-1].id);
}
function startMission(m){
  newGame({civ:m.civ,opponents:m.opponents,ai:0.9,size:m.size,theme:m.theme,mission:m,noStart:m.noStart});
}

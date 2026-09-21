// ---------------------------------------------------------------------------
// Save and load to browser storage.
// ---------------------------------------------------------------------------
function saveGame(){
  if(!started||gameOver)return;
  if(mission){msg('Campaign missions cannot be saved — finish the mission or restart it');return;}
  const ref=e=>e?e.id:null;
  const data={v:5,MW,tick,nextId,res,civs,aiMult,aiState,stats,sides,aiPers,nP,mapType,height:Array.from(height),ramp:Array.from(ramp),memBld:[...memBld],themeKey:Object.keys(THEMES).find(k=>THEMES[k]===theme),gates:[...gateAt],techs:techs.map(s=>[...s]),grid:Array.from(grid),explored:Array.from(explored),cam,
    units:units.map(u=>({...u,target:ref(u.target),node:ref(u.node),site:ref(u.site),enterT:null,gtarget:null,huntTarget:null,path:[],pdest:u.pdest,orders:[]})),
    buildings:buildings.map(b=>({...b,target:null,gtarget:null,rally:b.rally?(b.rally.e?{e:b.rally.e.id}:b.rally):null})),
    resources:resources.map(r=>({...r}))};
  try{localStorage.setItem('gbl_save',JSON.stringify(data));msg('Game saved');sfx('done');}catch(e){msg('Save failed: '+e.message);}
}
function loadGame(){
  let data;try{data=JSON.parse(localStorage.getItem('gbl_save'));}catch(e){}
  if(!data){msg('No saved game found');return;}
  if(!data.sides){msg('That save is from an older version and cannot be loaded');return;}
  MW=MH=data.MW;nP=data.nP||2;sides=data.sides||[0,1];aiPers=data.aiPers||[null,'balanced'];mission=null;objectives=[];stats=data.stats||[{kills:0,losses:0,bkilled:0,blost:0,gathered:0},{kills:0,losses:0,bkilled:0,blost:0,gathered:0}];theme=THEMES[data.themeKey||'desert'];gateAt=new Map(data.gates||[]);alerts=[];tick=data.tick;nextId=data.nextId;res=data.res;civs=data.civs;aiMult=data.aiMult;aiState=data.aiState;techs=data.techs.map(a=>new Set(a));
  grid=Uint8Array.from(data.grid);explored=Uint8Array.from(data.explored);vis=new Uint8Array(MW*MH);
  height=data.height?Uint8Array.from(data.height):new Uint8Array(MW*MH);ramp=data.ramp?Uint8Array.from(data.ramp):new Uint8Array(MW*MH);mapType=data.mapType||'open';memBld=new Map(data.memBld||[]);
  fogCv=document.createElement('canvas');fogCv.width=MW;fogCv.height=MH;fogCtx=fogCv.getContext('2d');
  units=data.units;buildings=data.buildings;resources=data.resources;resAt=new Map();for(const r of resources)resAt.set(idx(r.tx,r.ty),r);
  const all=new Map();for(const e of[...units,...buildings,...resources])all.set(e.id,e);
  for(const u of units){u.target=all.get(u.target)||null;u.node=all.get(u.node)||null;u.site=all.get(u.site)||null;if(u.target===undefined)u.target=null;if(!u.stance)u.stance=UNITS[u.type].cls==='worker'?'passive':'aggressive';if(!u.post)u.post=[u.x,u.y];}
  for(const b of buildings){if(b.rally&&b.rally.e)b.rally={e:all.get(b.rally.e)||null};}
  fx=[];msgs=[];sel=[];placing=null;pending=null;groups={};gameOver=false;paused=false;speed=1;menu=null;dust=[];projectiles=[];wrecks=[];shake=0;zoom=1;resize();
  buildTerrain();refreshPower();refreshFog();cam=data.cam;clampCam();started=true;
  document.getElementById('overlay').classList.add('hidden');msg('Game loaded');refreshTop();
}

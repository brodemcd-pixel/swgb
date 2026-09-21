// ---------------------------------------------------------------------------
// Mouse, keyboard and start-screen input handling.
// ---------------------------------------------------------------------------
cvs.addEventListener('mousemove',e=>{mouse.x=e.offsetX;mouse.y=e.offsetY;mouse.inCanvas=true;});
cvs.addEventListener('mouseleave',()=>mouse.inCanvas=false);
cvs.addEventListener('mousedown',e=>{
  if(!started||gameOver||paused)return;mouse.x=e.offsetX;mouse.y=e.offsetY;ac();
  if(e.button===0){
    if(BLD[placing]&&(BLD[placing].wall||BLD[placing].gate)){wallStart=ghostPos(placing);return;}
    if(placing){if(tryPlace()&&!e.shiftKey)placing=null;return;}
    if(pending==='patrol'){const tx=Math.floor(mwx()/TILE),ty=Math.floor(mwy()/TILE);
      sel.filter(u=>!u.w&&!u.res&&u.team===0).forEach(u=>orderPatrol(u,tx,ty));
      pending=null;pulse={x:mwx(),y:mwy(),age:0,c:'#ffe81f'};sfx('click');return;}
    if(pending==='amove'){const tx=Math.floor(mwx()/TILE),ty=Math.floor(mwy()/TILE);groupMove(sel.filter(u=>!u.w&&!u.res&&u.team===0&&u.type!=='worker'),tx,ty,true);pending=null;pulse={x:mwx(),y:mwy(),age:0,c:'#ff5555'};sfx('click');return;}
    mouse.down=true;mouse.sx=mouse.x;mouse.sy=mouse.y;
  }
});
addEventListener('mouseup',e=>{
  if(e.button===0){
    if(placing&&wallStart){placeWallLine(wallStart,ghostPos(placing),placing);wallStart=null;if(!e.shiftKey)placing=null;return;}
    if(mouse.down){mouse.down=false;finishSelect(e.shiftKey);}
  }
});
cvs.addEventListener('contextmenu',e=>{e.preventDefault();if(!started||gameOver||paused)return;if(placing||pending||menu){placing=null;pending=null;menu=null;wallStart=null;return;}issueOrder(e.offsetX/zoom+cam.x,e.offsetY/zoom+cam.y,e.shiftKey);});
cvs.addEventListener('dblclick',e=>{const t=entityAt(e.offsetX/zoom+cam.x,e.offsetY/zoom+cam.y);if(t&&!t.w&&!t.res&&t.team===0){sel=units.filter(u=>u.team===0&&u.type===t.type&&u.x>cam.x&&u.x<cam.x+VW&&u.y>cam.y&&u.y<cam.y+VH);lastCmdKey='';refreshPanel();}});
function finishSelect(shift){
  const x1=Math.min(mouse.sx,mouse.x)/zoom+cam.x,x2=Math.max(mouse.sx,mouse.x)/zoom+cam.x,y1=Math.min(mouse.sy,mouse.y)/zoom+cam.y,y2=Math.max(mouse.sy,mouse.y)/zoom+cam.y;
  if(x2-x1<6&&y2-y1<6){
    const t=entityAt(mwx(),mwy());
    if(shift&&t&&!t.w&&!t.res&&t.team===0){const i=sel.indexOf(t);if(i>=0)sel.splice(i,1);else{sel=sel.filter(s=>!s.w&&!s.res&&s.team===0);sel.push(t);}}
    else sel=t?[t]:[];
  }else{
    let found=units.filter(u=>u.team===0&&u.x>=x1&&u.x<=x2&&u.y>=y1&&u.y<=y2);
    if(found.some(u=>u.type!=='worker'))found=found.filter(u=>u.type!=='worker'); // prefer military in mixed box
    if(shift){sel=sel.filter(s=>!s.w&&!s.res&&s.team===0);for(const u of found)if(!sel.includes(u))sel.push(u);}
    else sel=found;
  }
  menu=null;lastCmdKey='';refreshPanel();
}
let mmDrag=false;
function mmMove(e){const r=mm.getBoundingClientRect();const s=MW/138;cam.x=(e.clientX-r.left)*s*TILE-VW/2;cam.y=(e.clientY-r.top)*s*TILE-VH/2;clampCam();}
mm.addEventListener('mousedown',e=>{if(!started)return;if(e.button===2){const r=mm.getBoundingClientRect();const s=MW/138;issueOrder((e.clientX-r.left)*s*TILE,(e.clientY-r.top)*s*TILE);return;}mmDrag=true;mmMove(e);});
mm.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{if(mmDrag)mmMove(e);});
addEventListener('mouseup',()=>mmDrag=false);
cvs.addEventListener('wheel',e=>{if(!started)return;e.preventDefault();const d=e.deltaMode===1?e.deltaY*18:e.deltaY;setZoom(zoom*Math.exp(-clamp(d,-240,240)*0.0022),e.offsetX,e.offsetY);},{passive:false});
cvs.addEventListener('dragover',e=>e.preventDefault());
cvs.addEventListener('drop',e=>{
  e.preventDefault();const f=e.dataTransfer.files[0];if(!f||!f.type.startsWith('image/'))return;
  const u=sel.find(s=>!s.w&&!s.res);
  if(!u){msg('Select a unit first, then drop an image onto the map to use it as that unit type\'s sprite');return;}
  const r=new FileReader();r.onload=()=>setSprite(u.type,r.result);r.readAsDataURL(f);
});
addEventListener('keydown',e=>{
  if(e.key==='F1'){e.preventDefault();toggleGuide();return;}
  if(!started||gameOver)return;keys[e.key]=true;
  if(e.key==='Escape'){if(!document.getElementById('guide').classList.contains('hidden')){toggleGuide();return;}if(placing||pending||menu){placing=null;pending=null;menu=null;wallStart=null;}else sel=[];return;}
  if(e.key==='F2'||e.key==='Pause'){e.preventDefault();togglePause();return;}
  if(e.key==='+'||e.key==='=')setSpeed(Math.min(3,speed+0.5));if(e.key==='-')setSpeed(Math.max(0.5,speed-0.5));
  if(paused)return;
  if(e.key===' '){const hq=buildings.find(b=>b.team===0&&b.type==='hq');if(hq){cam.x=cx(hq)-VW/2;cam.y=cy(hq)-VH/2;clampCam();}e.preventDefault();return;}
  if(e.key==='/'){const list=idleProd(0);if(list.length){const cur=list.indexOf(sel[0]);const b=list[(cur+1)%list.length];sel=[b];cam.x=cx(b)-VW/2;cam.y=cy(b)-VH/2;clampCam();menu=null;lastCmdKey='';refreshPanel();}e.preventDefault();return;}
  if(e.key==='.'||e.key===','){const list=units.filter(u=>u.team===0&&u.state==='idle'&&(e.key==='.'?u.type==='worker':u.type!=='worker'));if(list.length){const cur=list.indexOf(sel[0]);const u=list[(cur+1)%list.length];sel=[u];cam.x=u.x-VW/2;cam.y=u.y-VH/2;clampCam();menu=null;lastCmdKey='';refreshPanel();}return;}
  if(/^[1-5]$/.test(e.key)){if(e.shiftKey||e.ctrlKey){groups[e.key]=sel.filter(s=>!s.w&&!s.res&&s.team===0);msg('Group '+e.key+' set');}else{const g=(groups[e.key]||[]).filter(u=>!u.dead);if(g.length){sel=g;menu=null;}}e.preventDefault();return;}
  if(e.ctrlKey||e.altKey||e.metaKey)return;
  const k=e.key.toUpperCase();const c=currentCmds.find(c=>c.hot===k);if(c){c.action();lastCmdKey='';refreshPanel();e.preventDefault();}
});
addEventListener('keyup',e=>keys[e.key]=false);

// ---- start screen
const setup={civ:'alliance',ai:0.85,size:72,theme:'desert',opps:1,pers:'random',mode:'skirmish',mapType:'open'};
function pickPers(){const k=Object.keys(AI_TYPES);return setup.pers==='random'?k[Math.random()*k.length|0]:setup.pers;}
function buildMissionList(){
  const box=document.getElementById('missions');box.innerHTML='';
  const done=campaignDone();
  MISSIONS.forEach((m,i)=>{
    const ok=missionUnlocked(i),fin=done.includes(m.id);
    const d=document.createElement('div');
    d.className='mrow'+(ok?'':' lock');
    d.innerHTML='<i>'+(fin?'✔':ok?'▶':'🔒')+'</i><div><b>'+m.name+'</b><span>'+m.blurb+'</span></div>';
    if(ok)d.onclick=()=>{startMission(m);ac();};
    box.appendChild(d);
  });
}
(function(){
  const cv=document.getElementById('civs');
  for(const k in CIVS){
    const b=document.createElement('button');b.textContent=CIVS[k].name;b.dataset.c=k;
    if(k===setup.civ)b.className='sel';
    b.onclick=()=>{setup.civ=k;cv.querySelectorAll('button').forEach(x=>x.className='');b.className='sel';document.getElementById('civdesc').textContent=CIVS[k].desc;};
    cv.appendChild(b);
  }
  document.getElementById('civdesc').textContent=CIVS[setup.civ].desc;
  const pick=(sel,key,fn)=>document.querySelectorAll(sel+' button').forEach(b=>b.onclick=()=>{
    setup[key]=fn(b);document.querySelectorAll(sel+' button').forEach(x=>x.className='');b.className='sel';
    if(key==='pers')document.getElementById('civdesc').textContent=setup.pers==='random'?'A random AI style for each opponent.':AI_TYPES[setup.pers].name+' — '+AI_TYPES[setup.pers].desc;
  });
  pick('#diffs','ai',b=>parseFloat(b.dataset.m));
  pick('#themes','theme',b=>b.dataset.t);
  pick('#sizes','size',b=>parseInt(b.dataset.s));
  pick('#maps','mapType',b=>b.dataset.mt);
  pick('#opps','opps',b=>parseInt(b.dataset.o));
  pick('#pers','pers',b=>b.dataset.p);
  document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{
    setup.mode=b.dataset.mode;
    document.querySelectorAll('#modes button').forEach(x=>x.className='');b.className='sel';
    const camp=setup.mode==='campaign';
    document.querySelectorAll('.skirm').forEach(x=>x.classList.toggle('hidden',camp));
    document.getElementById('campaignbox').classList.toggle('hidden',!camp);
    document.getElementById('startrow').classList.toggle('hidden',camp);
    document.getElementById('civdesc').classList.toggle('hidden',camp);
    if(camp)buildMissionList();
  });
  document.getElementById('startbtn').onclick=()=>{
    const others=Object.keys(CIVS).filter(k=>k!==setup.civ);
    const opponents=[];
    for(let i=0;i<setup.opps;i++)opponents.push({civ:others[(Math.random()*others.length)|0],pers:pickPers()});
    newGame({civ:setup.civ,opponents,ai:setup.ai,size:setup.size,theme:setup.theme,mapType:setup.mapType});
    ac();
  };
  document.getElementById('loadbtn').onclick=()=>loadGame();
})();

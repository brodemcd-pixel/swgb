// ---------------------------------------------------------------------------
// The bottom command panel, tooltips, selection grid, objectives and the guide.
// ---------------------------------------------------------------------------
function idleProd(team){return buildings.filter(b=>b.team===team&&!b.dead&&b.done&&(BLD[b.type].trains||BLD[b.type].research)&&!b.queue.length);}
function teamTag(t){return t===GAIA?' (Wild)':t===0?'':foe(t,0)?' ('+TEAMNAME[t]+')':' (Ally)';}
function refreshTop(){
  RES.forEach((k,i)=>document.getElementById('r'+i).textContent=res[0][k]|0);
  document.getElementById('pop').textContent=popUsed(0)+'/'+popCap(0);document.getElementById('tl').textContent=techLevel(0);
  const s=tick/60|0;document.getElementById('time').textContent=(s/60|0)+':'+String(s%60).padStart(2,'0');
  const idle=units.filter(u=>u.team===0&&u.type==='worker'&&u.state==='idle').length;
  const ib=idleProd(0).length;
  document.getElementById('idle').textContent=(idle?'Idle Engineers: '+idle+' (.)  ':'')+(ib?'Idle buildings: '+ib+' (/)':'');
  document.getElementById('spd').textContent=speed!==1?speed+'x speed':'';
}
function cmdBuild(t){const d=BLD[t],c=costOf(0,d),tl=techLevel(0);const off=!canAfford(0,c)||tl<d.tech;return{label:d.name,hot:d.hot,cost:c,off,tip:d.desc+(tl<d.tech?' (Requires Tech Level '+d.tech+')':''),action:()=>{if(tl<d.tech){msg(d.name+' requires Tech Level '+d.tech);return;}if(canAfford(0,c)){placing=t;pending=null;menu=null;wallStart=null;}else msg('Not enough resources for '+d.name+' ('+costStr(c)+')');}}}
function getCmds(){
  const c=[];if(gameOver)return c;
  const own=sel.filter(e=>e.team===0&&!e.dead);
  const us=own.filter(e=>!e.w&&!e.res),bs=own.filter(e=>e.w);
  if(us.length){
    const hasW=us.some(u=>u.type==='worker'),hasM=us.some(u=>u.type!=='worker');
    if(hasW&&menu==='eco'){for(const t of['shelter','depot','farm','core','wall','gate','sentry'])c.push(cmdBuild(t));c.push({label:'Back',hot:'ESC',back:true,action:()=>menu=null});return c;}
    if(hasW&&menu==='mil'){for(const t of['troop','mech','air','research','turret','heavy','temple','shieldgen','fort','hq'])c.push(cmdBuild(t));c.push({label:'Back',hot:'ESC',back:true,action:()=>menu=null});return c;}
    if(hasW){c.push({label:'Build: Economy',hot:'B',tip:'Shelters, Depots, Farms, Power Cores, Walls, Sentry Posts',action:()=>menu='eco'});c.push({label:'Build: Military',hot:'V',tip:'Production, research and defensive buildings',action:()=>menu='mil'});}
    if(hasM){
      c.push({label:'Attack-move',hot:'A',tip:'Move and engage anything on the way',action:()=>{pending='amove';placing=null;}});
      c.push({label:'Patrol',hot:'Z',tip:'March back and forth between here and the point you click, engaging on the way',action:()=>{pending='patrol';placing=null;}});
    }
    c.push({label:'Stop',hot:'S',tip:'Cancel all orders and hold here',action:()=>us.forEach(orderStop)});
    const carriers=us.filter(u=>u.gar&&u.gar.length);
    if(carriers.length)c.push({label:'Unload ('+carriers.reduce((a,u)=>a+u.gar.length,0)+')',hot:'X',tip:'Set down everyone aboard',action:()=>{carriers.forEach(u=>{const out=ungarrison(u);sel=sel.concat(out);});lastCmdKey='';}});
    const cur=us.every(u=>u.stance===us[0].stance)?us[0].stance:null;
    for(const st of STANCES)c.push({label:STANCE_NAME[st],hot:STANCE_HOT[st],on:cur===st,tip:STANCE_DESC[st],action:()=>{us.forEach(u=>{u.stance=st;setPost(u);if(st==='passive'&&u.auto){u.target=null;u.auto=false;if(u.state==='attack')u.state='idle';}});lastCmdKey='';}});
  }else if(bs.length===1){
    const b=bs[0],d=BLD[b.type];if(!b.done)return c;
    if(b.gar&&b.gar.length)c.push({label:'Unload ('+b.gar.length+')',hot:'X',tip:'Send the garrison back outside',action:()=>{ungarrison(b);lastCmdKey='';}});
    if(d.trains)for(const t of d.trains){if(!unitAvailable(0,t))continue;const ud=UNITS[t],cost=costOf(0,ud),tl=techLevel(0);c.push({label:ud.name,hot:ud.hot,cost,off:!canAfford(0,cost)||tl<ud.tech,tip:ud.desc+' — HP '+ud.hp+', Dmg '+ud.dmg+', Range '+ud.range+(tl<ud.tech?' (Requires Tech Level '+ud.tech+')':''),action:()=>{const e=tryTrain(b,t);if(e)msg(e);else sfx('click');}});}
    if(d.research)for(const r of d.research){
      let id=r;if(LINES[r]){id=nextInLine(0,r);if(!id)continue;}
      if(r.startsWith('tech')){const tl=techLevel(0);if(tl>=4)continue;id='tech'+(tl+1);if(r!==id)continue;}
      if(hasTech(0,id))continue;const t=TECHS[id];if(t.req&&!hasTech(0,t.req)&&!r.startsWith('tech'))continue;
      const tl=techLevel(0);c.push({label:t.name,hot:t.hot,cost:t.cost,off:!canAfford(0,t.cost)||tl<t.tech,tip:t.desc+(tl<t.tech?' (Requires Tech Level '+t.tech+')':''),action:()=>{const e=tryResearch(b,id);if(e)msg(e);else sfx('click');}});
    }
  }
  return c;
}
function showTip(el,c){const t=document.getElementById('tip');if(!c.tip&&!c.cost)return;t.innerHTML='<b>'+c.label+'</b>'+(c.hot&&c.hot!=='ESC'?' <span class="hint">['+c.hot+']</span>':'')+(c.cost?'<div>'+costStr(c.cost)+'</div>':'')+(c.tip?'<div class="hint">'+c.tip+'</div>':'');t.classList.remove('hidden');const r=el.getBoundingClientRect();t.style.left=Math.max(4,Math.min(innerWidth-270,r.left-60))+'px';t.style.top=(r.top-t.offsetHeight-6)+'px';}
function hideTip(){document.getElementById('tip').classList.add('hidden');}
function refreshObjectives(){
  const el=document.getElementById('obj');
  if(!mission||gameOver){el.classList.add('hidden');return;}
  el.classList.remove('hidden');
  let h='<h4>'+mission.name.replace(/^Mission \d+ — /,'')+'</h4>';
  for(const o of objectives){
    const t=typeof o.text==='function'?o.text():o.text;
    h+='<div class="'+(o.state==='done'?'ok':o.state==='failed'?'no':'')+'">'+(o.state==='done'?'✔ ':o.state==='failed'?'✘ ':'▫ ')+t+'</div>';
  }
  el.innerHTML=h;
}
function refreshPanel(){
  currentCmds=getCmds();
  const key=currentCmds.map(c=>c.label+(c.off?'0':'1')+(c.on?'*':'')).join('|');
  if(key!==lastCmdKey){lastCmdKey=key;hideTip();const el=document.getElementById('cmds');el.innerHTML='';
    for(const c of currentCmds){const d=document.createElement('div');d.className='cmd'+(c.off?' off':'')+(c.back?' back':'')+(c.on?' on':'');d.innerHTML='<span class="k">'+c.hot+'</span><span>'+c.label+'</span>'+(c.cost?'<span class="c">'+costStr(c.cost)+'</span>':'');d.addEventListener('mousedown',e=>{e.preventDefault();c.action();});d.addEventListener('mouseenter',()=>showTip(d,c));d.addEventListener('mouseleave',hideTip);el.appendChild(d);}}
  const info=document.getElementById('info');let h='';
  if(sel.length===1){const e=sel[0];
    if(e.res)h='<h3>'+(e.carcass?'Carcass':RESNAME[e.res])+'</h3>Remaining: '+e.amount+(e.carcass?' (decays over time)':'');
    else if(e.w){const d=BLD[e.type];h='<h3>'+d.name+teamTag(e.team)+'</h3>HP '+(e.hp|0)+'/'+e.maxHp+'<div class="bar"><div style="width:'+(100*e.hp/e.maxHp)+'%;background:#4fe07a"></div></div>';
      if(!e.done)h+='Under construction '+(100*e.prog/d.time|0)+'%<div class="bar"><div style="width:'+(100*e.prog/d.time)+'%;background:#ffe81f"></div></div>';
      else if(e.team===0){
        if(d.power&&!e.powered)h+='<span style="color:#ff6b6b">⚡ UNPOWERED — working at half speed. Build a Power Core within 8 tiles.</span><br>';
        if(e.queue.length){const q=e.queue[0];const t=q[0]==='#'?TECHS[q.slice(1)].time:UNITS[q].time;h+='<div class="bar"><div style="width:'+(100*Math.min(1,e.qprog/t))+'%"></div></div>';h+=e.queue.map((q,i)=>'<span class="q" data-i="'+i+'" title="Click to cancel">'+(q[0]==='#'?TECHS[q.slice(1)].name:UNITS[q].name)+' ✕</span>').join('');}
        else if(d.trains||d.research)h+='<span style="color:#8fa4c4">Idle — use the buttons on the right. Right-click the map to set a rally point.</span>';
        if(e.gar)h+='<div style="color:#ffd866">Garrison: '+e.gar.length+'/'+capOf(e)+(e.gar.length?' — '+e.gar.map(g=>UNITS[g.type].name).join(', '):' (right-click this building with troops selected to garrison)')+'</div>';
        if(e.farm)h+='<div>Food remaining: '+e.amount+'</div>';
        if(d.pop)h+='<div style="color:#8fa4c4">Provides '+d.pop+' population</div>';
        if(d.core)h+='<div style="color:#8fa4c4">Powers '+buildings.filter(b=>b.team===0&&b.done&&BLD[b.type].power&&Math.hypot(cx(b)-cx(e),cy(b)-cy(e))<=d.radius*TILE).length+' buildings</div>';
      }
      h+='<div style="color:#8fa4c4;font-size:11px">'+d.desc+'</div>';}
    else{const d=UNITS[e.type];h='<canvas id="portrait" width="56" height="56"></canvas><h3>'+d.name+teamTag(e.team)+'</h3>HP '+(e.hp|0)+'/'+e.maxHp+(e.maxSh?' · Shield '+(e.sh|0)+'/'+e.maxSh:'')+'<div class="bar"><div style="width:'+(100*e.hp/e.maxHp)+'%;background:#4fe07a"></div></div>'+(d.dmg?'Damage '+calcDmg(e,{w:false,type:'trooper',team:e.team===0?1:0})+' · Range '+d.range+' · Armor '+d.armor+' · ':'')+(d.fly?'Air':d.cls)+'<br><span style="color:#8fa4c4">'+e.state+(e.carry?' · carrying '+e.carry+' '+e.ctype:'')+(e.team===0&&UNITS[e.type].cls!=='animal'?' · <b style="color:#ffd866">'+STANCE_NAME[e.stance]+'</b>':'')+'</span>'+(e.gar?'<div style="color:#ffd866">Carrying '+e.gar.length+'/'+capOf(e)+(e.gar.length?' &mdash; '+e.gar.map(g=>UNITS[g.type].name).join(', '):'')+'</div>':'')+'<div style="color:#8fa4c4;font-size:11px">'+d.desc+'</div>';}
  }else if(sel.length>1){
    const cnt={};for(const e of sel)cnt[UNITS[e.type].name]=(cnt[UNITS[e.type].name]||0)+1;
    const stset=new Set(sel.map(u=>u.stance));
    h='<h3>'+sel.length+' units selected<span class="hint" style="font-weight:normal"> — '+(stset.size===1?STANCE_NAME[sel[0].stance]:'mixed stances')+'</span></h3>'
      +'<canvas id="selcv" height="62"></canvas><div class="hint">'+Object.entries(cnt).map(([k,v])=>v+'× '+k).join(', ')+' — click an icon to single it out, shift-click to drop it</div>';
  }
  else h='<h3>'+CIVS[civs[0]].name+' — Tech Level '+techLevel(0)+'</h3><span style="color:#8fa4c4">'+CIVS[civs[0]].desc+'</span><br><span style="color:#8fa4c4">Select units or buildings. Right-click to order. Press F1 for the guide.</span>';
  info.innerHTML=h;
  const sc=document.getElementById('selcv');
  if(sc){
    const n=Math.min(sel.length,32),cols=Math.min(16,Math.max(8,Math.ceil(n/2))),cw=30;
    sc.width=cols*cw;sc.height=Math.ceil(n/cols)*31;
    const sx=sc.getContext('2d');ctx=sx;ctx.clearRect(0,0,sc.width,sc.height);
    for(let i=0;i<n;i++){
      const u=sel[i],col=i%cols,row=(i/cols)|0,ox=col*cw,oy=row*31;
      ctx.fillStyle='#121c2e';ctx.fillRect(ox+1,oy+1,cw-2,29);
      ctx.strokeStyle=u.hp<u.maxHp*0.4?'#ff6b6b':'#31425e';ctx.lineWidth=1;ctx.strokeRect(ox+1.5,oy+1.5,cw-3,28);
      ctx.save();ctx.translate(ox+cw/2,oy+19);ctx.scale(0.72,0.72);
      const f=u.face;u.face=0.3;try{drawUnitBody(u,UNITS[u.type],TEAMC[u.team],true);}catch(err){}u.face=f;
      ctx.restore();
      ctx.fillStyle='#000';ctx.fillRect(ox+4,oy+25,cw-8,3);
      const fr=u.hp/u.maxHp;ctx.fillStyle=fr>.6?'#4fe07a':fr>.3?'#ffd23f':'#ff4d4d';ctx.fillRect(ox+4,oy+25,(cw-8)*fr,3);
    }
    ctx=mainCtx;
    sc.onmousedown=e=>{
      const r=sc.getBoundingClientRect(),col=Math.floor((e.clientX-r.left)/cw),row=Math.floor((e.clientY-r.top)/31),i=row*cols+col;
      if(i<0||i>=sel.length)return;
      if(e.shiftKey){if(sel.length>1)sel.splice(i,1);}else sel=[sel[i]];
      lastCmdKey='';refreshPanel();
    };
  }
  const pc=document.getElementById('portrait');if(pc&&sel[0]&&!sel[0].w){const pctx=pc.getContext('2d');ctx=pctx;ctx.clearRect(0,0,56,56);ctx.save();ctx.translate(28,32);ctx.scale(1.7,1.7);const u=sel[0];const face=u.face;u.face=0.3;drawUnitBody(u,UNITS[u.type],TEAMC[u.team],true);u.face=face;ctx.restore();ctx=mainCtx;}
  info.querySelectorAll('.q').forEach(q=>q.addEventListener('mousedown',()=>{const b=sel[0];if(b&&b.w)cancelQueue(b,+q.dataset.i);}));
}
function buildGuide(){
  const g=document.getElementById('guide');let h='<button style="float:right" onclick="toggleGuide()">Close</button><h2>How to play</h2><p>Engineers gather Food (shrubs, hunting, Farms), Carbon (groves), Ore (deposits) and Nova (crystals). Build Prefab Shelters for population and a <b>Power Core</b> near production buildings — unpowered buildings work at half speed. Research Tech Levels at the Command Center to unlock more. Win by destroying every enemy Command Center and military building.</p><p><b>Counters:</b> Anti-Air Troopers beat aircraft · Strike Mechs and Grenadiers beat troops · Mech Destroyers beat mechs · Mounted Troopers beat Engineers and Artillery · Artillery and Bombers beat buildings · Mystics convert enemies.</p>';
  h+='<h2>Stances and orders</h2><p>Every unit has a stance, set with the buttons on the right when it is selected. <b>Aggressive</b> chases anything it spots. <b>Defensive</b> fights what comes close, then walks back to where you left it. <b>Hold Position</b> never moves on its own — the one you want for Artillery and for a defensive line that should not chase. <b>Passive</b> never attacks by itself. Engineers and Mystics start Passive, Artillery starts Defensive, everything else starts Aggressive.</p><p><b>Patrol</b> (Z) marches a unit back and forth between where it stands and the point you click, engaging anything on the way — good for screening your Carbon line. <b>Attack-move</b> (A) advances once and fights through whatever it meets. <b>Shift + right-click</b> queues orders one after another.</p>'
  +'<h2>Units</h2><table><tr><th>Unit</th><th>From</th><th>Tech</th><th>Cost</th><th>HP</th><th>Dmg</th><th>Range</th><th>Notes</th></tr>';
  for(const k in UNITS){const u=UNITS[k];if(u.cls==='animal')continue;h+='<tr><td>'+u.name+(u.civ?' <i>('+CIVS[u.civ].name+')</i>':'')+'</td><td>'+BLD[u.from].name+'</td><td>'+u.tech+'</td><td>'+costStr(u.cost)+'</td><td>'+u.hp+'</td><td>'+u.dmg+'</td><td>'+u.range+'</td><td>'+u.desc+'</td></tr>';}
  h+='</table><h2>Buildings</h2><table><tr><th>Building</th><th>Tech</th><th>Cost</th><th>HP</th><th>Notes</th></tr>';
  for(const k in BLD){const b=BLD[k];h+='<tr><td>'+b.name+'</td><td>'+b.tech+'</td><td>'+costStr(b.cost)+'</td><td>'+b.hp+'</td><td>'+b.desc+(b.power?' <i>Needs power.</i>':'')+'</td></tr>';}
  h+='</table><h2>Research</h2><table>';
  for(const k in TECHS){const t=TECHS[k];h+='<tr><td>'+t.name+'</td><td>Tech '+t.tech+'</td><td>'+costStr(t.cost)+'</td><td>'+t.desc+'</td></tr>';}
  h+='</table><h2>Custom sprites</h2><p>Want your own art? Select a unit, then drag an image file onto the map — that image becomes the sprite for every unit of that type, and it is remembered between sessions. From the browser console you can also call <b>setSprite(\'heavy\',\'walker.png\',{mode:\'rotate\',scale:1.2})</b> (mode <b>rotate</b> spins the image toward its target, <b>flip</b> mirrors it left/right), or <b>clearSprites()</b> to go back to the built-in art. Unit type ids: '+Object.keys(UNITS).join(', ')+'.</p><h2>High ground, garrisons and transports</h2><p>On Plateaus, Chokepoints and Highlands maps the terrain has two levels. Ground units can only change level on a <b>ramp</b> (the striped slopes), so cliffs are walls you have to walk around. Shooting <b>downhill does 25% more damage</b>, shooting uphill does 20% less, and units on high ground see one tile farther — holding a plateau above a ramp is a real position. Aircraft ignore all of it.</p><p>Command Centers, Fortresses, Turrets, Sentry Posts and Prefab Shelters can be <b>garrisoned</b>: select troops and right-click the building. Ranged units inside shoot out, everyone inside is safe and heals slowly, and if the building falls they are thrown clear at half health. The <b>Unload</b> button (X) sends them back out.</p><p>The <b>Dropship</b>, built at the Airbase from Tech Level 2, carries six ground units over cliffs and rock. Select troops and right-click the Dropship to load, fly it where you need them, then press Unload.</p><h2>Campaign and opponents</h2><p>The <b>Campaign</b> tab on the title screen runs six missions with their own objectives, scripted events and win conditions. Each unlocks when you finish the one before it, and progress is remembered in this browser. Objectives appear in the panel on the right and tick off as you complete them; campaign missions cannot be saved mid-game, so a mission is one sitting.</p><p>Skirmish lets you face up to three opponents, who ally against you. Each has an AI style:</p><table>'+Object.keys(AI_TYPES).map(k=>'<tr><td>'+AI_TYPES[k].name+'</td><td>'+AI_TYPES[k].desc+'</td></tr>').join('')+'</table><h2>Civilizations</h2><table>';for(const k in CIVS)h+='<tr><td>'+CIVS[k].name+'</td><td>'+CIVS[k].desc+'</td></tr>';
  g.innerHTML=h+'</table>';
}
function toggleGuide(){const g=document.getElementById('guide');if(g.classList.contains('hidden')){buildGuide();g.classList.remove('hidden');if(started)paused=true;}else{g.classList.add('hidden');}}
function togglePause(){if(started&&!gameOver)paused=!paused;}
function setSpeed(s){speed=s;refreshTop();}
function toggleMute(){muted=!muted;document.getElementById('mute').textContent='Sound: '+(muted?'off':'on');}

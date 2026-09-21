// ---------------------------------------------------------------------------
// All drawing: terrain, buildings, units, effects, fog and the minimap.
// ---------------------------------------------------------------------------
function draw(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  if(!started)return;
  const shx=shake?(Math.random()-.5)*shake:0,shy=shake?(Math.random()-.5)*shake:0;
  ctx.setTransform(zoom,0,0,zoom,shx,shy);
  ctx.drawImage(terrain,-cam.x,-cam.y);
  for(const r of resources)if(explored[idx(r.tx,r.ty)])drawRes(r);
  for(const b of buildings)if(visibleE(b))drawBuilding(b);
  for(const g of memBld.values()){
    if(buildings.some(b=>b.id===g.id&&!b.dead&&visibleE(b)))continue;
    drawGhost(g);
  }
  for(const w of wrecks)if(explored[idx(clamp(Math.floor(w.x/TILE),0,MW-1),clamp(Math.floor(w.y/TILE),0,MH-1))])drawWreck(w);
  for(const p of dust){
    const life=p.life||26,k=1-p.age/life;if(k<=0)continue;
    const px=p.x-cam.x,py=p.y-cam.y;
    if(p.spark){ctx.globalAlpha=k;ctx.fillStyle=p.c;ctx.fillRect(px-p.r/2,py-p.r/2,p.r,p.r);ctx.globalAlpha=1;}
    else if(p.deb){ctx.globalAlpha=k;ctx.fillStyle=p.c;ctx.fillRect(px-1.2,py-1.2,2.4,2.4);ctx.globalAlpha=1;}
    else{ctx.fillStyle=p.c+(k*(p.smoke?0.5:0.35)).toFixed(3)+')';ctx.beginPath();ctx.ellipse(px,py,p.r,p.r*(p.smoke?0.8:0.55),0,0,7);ctx.fill();}
  }
  for(const u of units)if(!UNITS[u.type].fly&&visibleE(u))drawUnit(u);
  for(const s of fx){ // blast rings and Mystic beams
    if(s.blast){ctx.strokeStyle=s.c;ctx.globalAlpha=1-s.age/18;ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x-cam.x,s.y-cam.y,s.r*(0.3+s.age/18),0,7);ctx.stroke();ctx.fillStyle='#fff';ctx.globalAlpha=Math.max(0,0.7-s.age/8);ctx.beginPath();ctx.arc(s.x-cam.x,s.y-cam.y,8,0,7);ctx.fill();}
    else{ctx.strokeStyle=s.c;ctx.globalAlpha=1-s.age/10;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x1-cam.x,s.y1-cam.y);ctx.lineTo(s.x2-cam.x,s.y2-cam.y);ctx.stroke();}
  }
  ctx.globalAlpha=1;
  for(const u of units)if(UNITS[u.type].fly&&visibleE(u))drawUnit(u);
  for(const p of projectiles){
    if(!vis[idx(clamp(Math.floor(p.x/TILE),0,MW-1),clamp(Math.floor(p.y/TILE),0,MH-1))])continue;
    const px=p.x-cam.x,py=p.y-cam.y;
    if(p.shell){
      ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(px,py,4,2,0,0,7);ctx.fill();
      ctx.fillStyle=p.def.splash>=1.5?'#d05cff':'#4a4a52';ctx.strokeStyle='#11161f';ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(px,py-p.h,3.6,2.6,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,200,120,.5)';ctx.beginPath();ctx.arc(px,py-p.h,1.6,0,7);ctx.fill();
    }else{
      ctx.save();ctx.translate(px,py);ctx.rotate(p.face);
      ctx.strokeStyle=LASERC[p.team];ctx.lineWidth=2.2;ctx.lineCap='round';ctx.globalAlpha=0.95;
      ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(3,0);ctx.stroke();
      ctx.globalAlpha=0.35;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(2,0);ctx.stroke();
      ctx.globalAlpha=1;ctx.restore();
    }
  }
  // power / shield radii for selected
  for(const b of sel)if(b.w&&b.team===0&&(b.type==='core'||b.type==='shieldgen')&&b.done){ctx.strokeStyle=b.type==='core'?'rgba(255,232,31,.5)':'rgba(120,200,255,.5)';ctx.setLineDash([6,6]);ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx(b)-cam.x,cy(b)-cam.y,BLD[b.type].radius*TILE,0,7);ctx.stroke();ctx.setLineDash([]);}
  // fog
  ctx.imageSmoothingEnabled=true;ctx.drawImage(fogCv,0,0,MW,MH,-cam.x,-cam.y,MW*TILE,MH*TILE);
  if(mission&&mission.zone){const z=mission.zone,zx=z.x*TILE+HALF-cam.x,zy=z.y*TILE+HALF-cam.y;
    ctx.strokeStyle='#ffe81f';ctx.globalAlpha=0.45+0.25*Math.sin(tick/18);ctx.lineWidth=2;ctx.setLineDash([9,7]);
    ctx.beginPath();ctx.arc(zx,zy,z.r*TILE,0,7);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
  if(pulse){ctx.strokeStyle=pulse.c;ctx.globalAlpha=1-pulse.age/25;ctx.lineWidth=2;ctx.beginPath();ctx.arc(pulse.x-cam.x,pulse.y-cam.y,4+pulse.age*0.6,0,7);ctx.stroke();ctx.globalAlpha=1;}
  for(const b of sel)if(b.w&&b.team===0&&b.rally){const rx=b.rally.e?cx(b.rally.e):b.rally.x*TILE+HALF,ry=b.rally.e?cy(b.rally.e):b.rally.y*TILE+HALF;ctx.strokeStyle='#ffe81f';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(cx(b)-cam.x,cy(b)-cam.y);ctx.lineTo(rx-cam.x,ry-cam.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#ffe81f';ctx.fillRect(rx-cam.x-1,ry-cam.y-14,2,14);ctx.fillRect(rx-cam.x,ry-cam.y-14,9,6);}
  if(placing){
    const d=BLD[placing];
    if(wallStart){const[mx,my]=ghostPos(placing);for(const[tx,ty]of lineTiles(wallStart,[mx,my])){const ok=placeValid(placing,tx,ty);ctx.fillStyle=ok?'rgba(80,255,120,.35)':'rgba(255,60,60,.4)';ctx.fillRect(tx*TILE-cam.x,ty*TILE-cam.y,TILE,TILE);}}
    else{const[tx,ty]=ghostPos(placing),ok=placeValid(placing,tx,ty);ctx.fillStyle=ok?'rgba(80,255,120,.35)':'rgba(255,60,60,.4)';ctx.fillRect(tx*TILE-cam.x,ty*TILE-cam.y,d.w*TILE,d.h*TILE);ctx.strokeStyle=ok?'#7cff8a':'#ff5555';ctx.lineWidth=2;ctx.strokeRect(tx*TILE-cam.x,ty*TILE-cam.y,d.w*TILE,d.h*TILE);
      if(d.radius){ctx.setLineDash([6,6]);ctx.lineWidth=1;ctx.beginPath();ctx.arc((tx+d.w/2)*TILE-cam.x,(ty+d.h/2)*TILE-cam.y,d.radius*TILE,0,7);ctx.stroke();ctx.setLineDash([]);}
      ctx.fillStyle='#fff';ctx.font='12px sans-serif';ctx.fillText(d.name+((d.wall||d.gate)?' (drag to draw)':''),tx*TILE-cam.x,ty*TILE-cam.y-6);}
  }
  ctx.setTransform(1,0,0,1,0,0);
  if(pending==='amove'){ctx.fillStyle='#ff6b6b';ctx.font='bold 13px sans-serif';ctx.fillText('ATTACK-MOVE: click a target location',mouse.x+14,mouse.y-8);}
  if(pending==='patrol'){ctx.fillStyle='#ffe81f';ctx.font='bold 13px sans-serif';ctx.fillText('PATROL: click the far end of the route',mouse.x+14,mouse.y-8);}
  if(mouse.down&&!placing&&(Math.abs(mouse.x-mouse.sx)>4||Math.abs(mouse.y-mouse.sy)>4)){ctx.strokeStyle='#7cff8a';ctx.lineWidth=1;ctx.strokeRect(mouse.sx,mouse.sy,mouse.x-mouse.sx,mouse.y-mouse.sy);ctx.fillStyle='rgba(124,255,138,.12)';ctx.fillRect(mouse.sx,mouse.sy,mouse.x-mouse.sx,mouse.y-mouse.sy);}
  ctx.font='13px sans-serif';
  msgs.forEach((m,i)=>{ctx.globalAlpha=m.age>360?1-(m.age-360)/120:1;ctx.fillStyle='rgba(0,0,0,.55)';const w=ctx.measureText(m.t).width;ctx.fillRect(10,36+i*20,w+12,18);ctx.fillStyle='#ffe98a';ctx.fillText(m.t,16,49+i*20);});
  ctx.globalAlpha=1;
  if(paused){ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 36px sans-serif';ctx.textAlign='center';ctx.fillText('PAUSED',W/2,H/2);ctx.textAlign='left';}
}
function hpBar(x,y,w,e){ctx.fillStyle='#000';ctx.fillRect(x-1,y-1,w+2,5);const f=e.hp/e.maxHp;ctx.fillStyle=f>.6?'#4fe07a':f>.3?'#ffd23f':'#ff4d4d';ctx.fillRect(x,y,w*f,3);
  if(e.maxSh){ctx.fillStyle='#000';ctx.fillRect(x-1,y-5,w+2,4);ctx.fillStyle='#6fd0ff';ctx.fillRect(x,y-4,w*e.sh/e.maxSh,2);}}
function drawRes(r){
  const x=r.tx*TILE-cam.x,y=r.ty*TILE-cam.y;if(x<-TILE||y<-TILE||x>VW||y>VH)return;
  const s=0.55+0.45*(r.amount/r.max),c=RESC[r.res];
  ctx.save();ctx.translate(x+HALF,y+HALF);ctx.scale(s,s);
  if(r.res==='carbon'){ctx.fillStyle='#1f6b34';for(let i=0;i<3;i++){const a=r.seed*6+i*2.1;ctx.beginPath();ctx.arc(Math.cos(a)*6,Math.sin(a)*6,9,0,7);ctx.fill();}ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-2,8,0,7);ctx.fill();ctx.fillStyle='#8be89a';ctx.beginPath();ctx.arc(-2,-4,3,0,7);ctx.fill();}
  else if(r.res==='ore'){ctx.fillStyle='#6f7684';ctx.beginPath();ctx.moveTo(-13,8);ctx.lineTo(-8,-6);ctx.lineTo(2,-12);ctx.lineTo(12,-2);ctx.lineTo(13,9);ctx.closePath();ctx.fill();ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-6,6);ctx.lineTo(-3,-4);ctx.lineTo(6,-7);ctx.lineTo(9,4);ctx.closePath();ctx.fill();ctx.fillStyle='#e6ebf5';ctx.fillRect(-1,-3,3,3);}
  else if(r.res==='nova'){ctx.shadowColor=c;ctx.shadowBlur=10;ctx.fillStyle=c;for(let i=0;i<3;i++){const ox=(i-1)*8,h=10+((r.seed*10+i*3)%6);ctx.beginPath();ctx.moveTo(ox-5,9);ctx.lineTo(ox,-h);ctx.lineTo(ox+5,9);ctx.closePath();ctx.fill();}ctx.shadowBlur=0;ctx.fillStyle='#f3c9ff';ctx.beginPath();ctx.moveTo(-2,6);ctx.lineTo(0,-9);ctx.lineTo(2,6);ctx.closePath();ctx.fill();}
  else if(r.carcass){ctx.fillStyle='#8a5a3a';ctx.beginPath();ctx.ellipse(0,2,12,7,0.3,0,7);ctx.fill();ctx.fillStyle='#e8d5c0';ctx.fillRect(-8,-2,4,2);ctx.fillRect(2,-4,5,2);}
  else{ctx.fillStyle='#2f7a3a';ctx.beginPath();ctx.arc(0,2,11,0,7);ctx.fill();ctx.fillStyle='#4fa35a';ctx.beginPath();ctx.arc(-3,-2,7,0,7);ctx.fill();ctx.fillStyle=c;for(let i=0;i<5;i++){const a=r.seed*7+i*1.3;ctx.beginPath();ctx.arc(Math.cos(a)*6,Math.sin(a)*5,2.2,0,7);ctx.fill();}}
  ctx.restore();
  if(sel.includes(r)){ctx.strokeStyle='#ffe81f';ctx.lineWidth=1.5;ctx.strokeRect(x+2,y+2,TILE-4,TILE-4);}
}
function drawBuilding(b){
  const x=b.tx*TILE-cam.x,y=b.ty*TILE-cam.y,w=b.w*TILE,h=b.h*TILE;if(x+w<0||y+h<0||x>VW||y>VH)return;
  const c=TEAMC[b.team],d=BLD[b.type];
  if(sel.includes(b)){ctx.strokeStyle=b.team===0?'#7cff8a':'#ff5555';ctx.lineWidth=2;ctx.strokeRect(x-2,y-2,w+4,h+4);}
  ctx.globalAlpha=b.done?1:0.5;
  const mx=x+w/2,my=y+h/2;
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(x+4,y+4,w,h); // drop shadow
  if(b.type==='wall'){ctx.fillStyle='#57657c';ctx.fillRect(x+1,y+1,w-2,h-2);ctx.fillStyle='#7c8ca6';ctx.fillRect(x+3,y+3,w-6,h-10);ctx.fillStyle='#3e4a5c';ctx.fillRect(x+3,y+h-8,w-6,5);ctx.strokeStyle=c;ctx.lineWidth=1;ctx.strokeRect(x+1.5,y+1.5,w-3,h-3);}
  else if(b.type==='gate'){ctx.fillStyle='#57657c';ctx.fillRect(x+1,y+1,w-2,h-2);ctx.fillStyle='#2a3446';ctx.fillRect(x+6,y+3,w-12,h-6);ctx.fillStyle=c;ctx.globalAlpha*=0.5+0.3*Math.sin(tick/10);ctx.fillRect(x+7,y+4,w-14,h-8);ctx.globalAlpha=b.done?1:0.5;ctx.fillStyle='#7c8ca6';ctx.fillRect(x+2,y+2,4,h-4);ctx.fillRect(x+w-6,y+2,4,h-4);ctx.strokeStyle=c;ctx.lineWidth=1;ctx.strokeRect(x+1.5,y+1.5,w-3,h-3);}
  else if(b.type==='farm'){ctx.fillStyle='#5a4a2a';ctx.fillRect(x+1,y+1,w-2,h-2);const f=b.amount/d.amount;for(let i=0;i<4;i++){ctx.fillStyle=f>0.05?'#7fb84a':'#8a7a5a';ctx.fillRect(x+4,y+6+i*14,w-8,5);if(f>0.05){ctx.fillStyle='#ffb15c';for(let k=0;k<6;k++)if(k/6<f)ctx.fillRect(x+7+k*9,y+4+i*14,3,3);}}ctx.strokeStyle=c;ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,w-4,h-4);}
  else{
    ctx.fillStyle='#2b3547';ctx.fillRect(x+2,y+2,w-4,h-4);ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(x+2,y+2,w-4,4);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(x+2,y+h-8,w-4,6);ctx.strokeStyle=c;ctx.lineWidth=2;ctx.strokeRect(x+3,y+3,w-6,h-6);
    if(b.done&&b.team===0&&(BLD[b.type].trains||BLD[b.type].research)&&b.queue.length){ctx.fillStyle='#ffe81f';ctx.globalAlpha*=0.6+0.4*Math.sin(tick/6);ctx.fillRect(x+6,y+h-14,4,4);ctx.globalAlpha=b.done?1:0.5;}
    switch(b.type){
      case'hq':ctx.fillStyle='#3d4a63';ctx.fillRect(x+12,y+12,w-24,h-24);ctx.fillStyle='#5a6d8f';ctx.beginPath();ctx.arc(mx,my,24,0,7);ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(mx,my,24,0,7);ctx.stroke();ctx.fillStyle='#1b2333';ctx.beginPath();ctx.arc(mx,my,12,0,7);ctx.fill();ctx.strokeStyle='#cfd8e6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w-18,y+18);ctx.lineTo(x+w-10,y+8);ctx.stroke();ctx.fillStyle='#ffe81f';ctx.beginPath();ctx.arc(x+w-10,y+8,3,0,7);ctx.fill();ctx.fillStyle=c;ctx.fillRect(x+8,y+h-14,w-16,5);break;
      case'shelter':ctx.fillStyle='#3d4a63';ctx.fillRect(x+6,y+10,w-12,h-16);ctx.fillStyle='#55688a';ctx.beginPath();ctx.moveTo(x+4,y+12);ctx.lineTo(mx,y+3);ctx.lineTo(x+w-4,y+12);ctx.closePath();ctx.fill();ctx.fillStyle='#ffe81f';ctx.fillRect(mx-3,y+h-16,6,8);break;
      case'core':ctx.strokeStyle='#9fe1ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(mx,my,18,0,7);ctx.stroke();ctx.fillStyle='#ffe81f';ctx.globalAlpha*=0.7+0.3*Math.sin(tick/8);ctx.beginPath();ctx.arc(mx,my,8,0,7);ctx.fill();ctx.globalAlpha=b.done?1:0.5;ctx.strokeStyle=c;ctx.lineWidth=2;for(let i=0;i<4;i++){const a=i*Math.PI/2+tick/60;ctx.beginPath();ctx.moveTo(mx+Math.cos(a)*10,my+Math.sin(a)*10);ctx.lineTo(mx+Math.cos(a)*18,my+Math.sin(a)*18);ctx.stroke();}break;
      case'depot':ctx.fillStyle='#3d4a63';ctx.fillRect(x+6,y+6,w-12,h-12);for(const k of RES){const i=RES.indexOf(k);ctx.fillStyle=RESC[k];ctx.fillRect(x+9+(i%2)*24,y+9+((i/2)|0)*24,18,18);}break;
      case'sentry':ctx.fillStyle='#3d4a63';ctx.fillRect(x+6,y+4,w-12,h-6);ctx.fillStyle='#1b2333';ctx.fillRect(x+9,y+7,w-18,8);ctx.fillStyle=c;ctx.fillRect(x+11,y+9,w-22,4);ctx.strokeStyle='#cfd8e6';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(mx,y+4);ctx.lineTo(mx,y-4);ctx.stroke();break;
      case'troop':ctx.fillStyle='#3d4a63';ctx.fillRect(x+8,y+8,w-16,h-34);ctx.fillStyle=c;ctx.fillRect(x+8,y+8,w-16,6);ctx.fillStyle='#0b1320';ctx.fillRect(mx-12,y+h-26,24,18);ctx.fillStyle='#8899bb';for(let i=0;i<3;i++)ctx.fillRect(x+14+i*22,y+20,10,8);break;
      case'mech':ctx.fillStyle='#3d4a63';ctx.fillRect(x+8,y+8,w-16,h-16);ctx.fillStyle='#0b1320';ctx.fillRect(x+12,y+h-30,w-24,20);ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+12,y+14);ctx.lineTo(x+w-12,y+14);ctx.moveTo(x+12,y+24);ctx.lineTo(x+w-12,y+24);ctx.stroke();ctx.fillStyle='#ffe81f';ctx.fillRect(mx-4,y+h-24,8,8);break;
      case'air':ctx.fillStyle='#3d4a63';ctx.fillRect(x+8,y+8,w-16,h-16);ctx.fillStyle='#0b1320';ctx.beginPath();ctx.arc(mx,y+h-8,26,Math.PI,0);ctx.fill();ctx.fillStyle=c;ctx.fillRect(x+8,y+8,w-16,5);ctx.strokeStyle='#8899bb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+14,y+22);ctx.lineTo(x+w-14,y+22);ctx.stroke();break;
      case'heavy':ctx.fillStyle='#3d4a63';ctx.fillRect(x+8,y+8,w-16,h-16);ctx.fillStyle='#0b1320';ctx.fillRect(x+14,y+14,w-28,h-28);ctx.strokeStyle=c;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(mx-14,my+10);ctx.lineTo(mx+16,my-14);ctx.stroke();ctx.fillStyle='#8899bb';ctx.beginPath();ctx.arc(mx-14,my+10,7,0,7);ctx.fill();break;
      case'research':ctx.fillStyle='#3d4a63';ctx.fillRect(x+8,y+8,w-16,h-16);ctx.strokeStyle='#9fe1ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(mx,my,16,0,7);ctx.stroke();ctx.beginPath();ctx.ellipse(mx,my,22,8,tick/90,0,7);ctx.stroke();ctx.fillStyle='#ffe81f';ctx.beginPath();ctx.arc(mx,my,4,0,7);ctx.fill();break;
      case'temple':ctx.fillStyle='#3d4a63';ctx.beginPath();ctx.moveTo(x+8,y+h-8);ctx.lineTo(mx,y+6);ctx.lineTo(x+w-8,y+h-8);ctx.closePath();ctx.fill();ctx.fillStyle='#ffe81f';ctx.globalAlpha*=0.6+0.4*Math.sin(tick/12);ctx.beginPath();ctx.arc(mx,my+8,7,0,7);ctx.fill();ctx.globalAlpha=b.done?1:0.5;break;
      case'turret':ctx.fillStyle='#3d4a63';ctx.beginPath();ctx.arc(mx,my,15,0,7);ctx.fill();ctx.save();ctx.translate(mx,my);ctx.rotate(b.face);ctx.fillStyle=c;ctx.fillRect(-4,-5,28,10);ctx.fillStyle='#0b1320';ctx.fillRect(18,-2,10,4);ctx.restore();ctx.fillStyle='#1b2333';ctx.beginPath();ctx.arc(mx,my,6,0,7);ctx.fill();break;
      case'shieldgen':ctx.fillStyle='#3d4a63';ctx.fillRect(x+8,y+16,w-16,h-20);ctx.strokeStyle='#6fd0ff';ctx.lineWidth=2;ctx.globalAlpha*=0.6+0.4*Math.sin(tick/10);ctx.beginPath();ctx.arc(mx,y+18,14,Math.PI,0);ctx.stroke();ctx.globalAlpha=b.done?1:0.5;ctx.fillStyle='#6fd0ff';ctx.beginPath();ctx.arc(mx,y+18,4,0,7);ctx.fill();break;
      case'fort':ctx.fillStyle='#3d4a63';ctx.fillRect(x+10,y+10,w-20,h-20);for(const[ox,oy]of[[10,10],[w-24,10],[10,h-24],[w-24,h-24]]){ctx.fillStyle='#55688a';ctx.fillRect(x+ox,y+oy,14,14);}ctx.save();ctx.translate(mx,my);ctx.rotate(b.face);ctx.fillStyle=c;ctx.fillRect(-6,-6,36,12);ctx.fillStyle='#0b1320';ctx.fillRect(24,-3,12,6);ctx.restore();ctx.fillStyle='#1b2333';ctx.beginPath();ctx.arc(mx,my,9,0,7);ctx.fill();break;
    }
  }
  ctx.globalAlpha=1;
  if(!b.done){ctx.setLineDash([6,4]);ctx.strokeStyle='#ffe81f';ctx.lineWidth=1.5;ctx.strokeRect(x+1,y+1,w-2,h-2);ctx.setLineDash([]);if(b.type!=='wall'){ctx.fillStyle='#000';ctx.fillRect(x+4,y+h-10,w-8,6);ctx.fillStyle='#ffe81f';ctx.fillRect(x+5,y+h-9,(w-10)*b.prog/d.time,4);}}
  else{
    if(b.queue.length&&b.team===0){const q=b.queue[0];const t=q[0]==='#'?TECHS[q.slice(1)].time:UNITS[q].time;ctx.fillStyle='#000';ctx.fillRect(x+4,y+h-10,w-8,6);ctx.fillStyle='#4fa3ff';ctx.fillRect(x+5,y+h-9,(w-10)*Math.min(1,b.qprog/t),4);}
    if(d.power&&!b.powered&&b.team===0){ctx.fillStyle='#ff4d4d';ctx.font='bold 14px sans-serif';ctx.fillText('⚡',x+w-16,y+16);}
    if(b.gar&&b.gar.length){ctx.fillStyle='rgba(6,10,20,.8)';ctx.fillRect(x+3,y+3,17,12);ctx.fillStyle='#ffd866';ctx.font='bold 10px sans-serif';ctx.fillText('▲'+b.gar.length,x+4,y+12);}
  }
  if(b.hp<b.maxHp||sel.includes(b))hpBar(x+4,y-8,w-8,b);
}
function drawWreck(w){
  const x=w.x-cam.x,y=w.y-cam.y;
  if(x<-60||y<-60||x>VW+60||y>VH+60)return;
  const life=w.building?3200:1100,k=w.age>life-260?(life-w.age)/260:1;
  ctx.globalAlpha=Math.max(0,k)*0.9;
  if(w.building){
    const bw=w.bw,bh=w.bh;
    ctx.fillStyle='#231d18';ctx.fillRect(x-bw/2+3,y-bh/2+3,bw-6,bh-6);
    ctx.fillStyle='#2e2721';
    for(let i=0;i<7;i++){const a=w.seed*17+i*2.3,rx=Math.cos(a)*bw*0.3,ry=Math.sin(a)*bh*0.3,sz=5+((i*7+w.seed*40)%9);
      ctx.fillRect(x+rx-sz/2,y+ry-sz/2,sz,sz*0.8);}
    ctx.strokeStyle='#4a4238';ctx.lineWidth=2;
    for(let i=0;i<3;i++){const a=w.seed*11+i*2;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*bw*0.22,y+Math.sin(a)*bh*0.22);ctx.lineTo(x+Math.cos(a+0.6)*bw*0.42,y+Math.sin(a+0.6)*bh*0.42);ctx.stroke();}
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,y,bw*0.46,bh*0.42,0,0,7);ctx.fill();
  }else{
    const r=w.r||9;
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+3,r*1.1,r*0.5,0,0,7);ctx.fill();
    ctx.save();ctx.translate(x,y);ctx.rotate(w.face+(w.seed-0.5)*1.2);
    if(w.cls==='mech'||w.cls==='artillery'||w.cls==='air'){
      ctx.fillStyle='#241f1b';ctx.strokeStyle='#15110e';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(-r,-r*0.55);ctx.lineTo(r*0.8,-r*0.7);ctx.lineTo(r,r*0.5);ctx.lineTo(-r*0.9,r*0.6);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle='#38302a';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-r*0.4,0);ctx.lineTo(-r*1.5,r*0.9);ctx.moveTo(r*0.4,0);ctx.lineTo(r*1.3,r*0.8);ctx.stroke();
      ctx.fillStyle='#1a1512';ctx.fillRect(-r*0.3,-r*0.3,r*0.7,r*0.6);
    }else{
      ctx.fillStyle='#241f1b';ctx.beginPath();ctx.ellipse(0,0,r*0.85,r*0.5,0.3,0,7);ctx.fill();
      ctx.fillStyle='#181310';ctx.beginPath();ctx.ellipse(r*0.3,-1,r*0.3,r*0.25,0,0,7);ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;
}
// What you remember of an enemy building: outline only, no health, no activity.
function drawGhost(g){
  const x=g.tx*TILE-cam.x,y=g.ty*TILE-cam.y,w=g.w*TILE,h=g.h*TILE;
  if(x+w<0||y+h<0||x>VW||y>VH)return;
  ctx.globalAlpha=0.5;
  ctx.fillStyle='rgba(20,26,38,.75)';ctx.fillRect(x+2,y+2,w-4,h-4);
  ctx.strokeStyle=TEAMC[g.team];ctx.setLineDash([5,4]);ctx.lineWidth=1.5;
  ctx.strokeRect(x+3,y+3,w-6,h-6);ctx.setLineDash([]);
  ctx.fillStyle=TEAMC[g.team];ctx.globalAlpha=0.28;
  ctx.fillRect(x+w/2-5,y+h/2-5,10,10);
  ctx.globalAlpha=1;
}
function drawUnit(u){
  const d=UNITS[u.type],x=u.x-cam.x,y=u.y-cam.y,c=TEAMC[u.team],art=ART[u.type]||1,rr=d.r*art;
  if(x<-48||y<-48||x>VW+48||y>VH+48)return;
  if(sel.includes(u)){ctx.strokeStyle=u.team===0?'#7cff8a':foe(u.team,0)?'#ff5555':'#ffe81f';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y+(d.fly?14:7*art),rr+4,(rr+4)*0.5,0,0,7);ctx.stroke();}
  ctx.save();ctx.translate(x,y);drawUnitBody(u,d,c,false);ctx.restore();
  if(u.state==='convert'&&u.conv>0){ctx.fillStyle='#000';ctx.fillRect(x-12,y-rr-16,24,4);ctx.fillStyle='#ffe81f';ctx.fillRect(x-11,y-rr-15,22*u.conv/300,2);}
  if(u.hp<u.maxHp||sel.includes(u)||(u.maxSh&&u.sh<u.maxSh))hpBar(x-10,y-rr-(d.fly?16:9),20,u);
}
const FIG=['worker','trooper','darktrooper','mounted','aa','grenadier','mystic'];
function drawUnitBody(u,d,c,portrait){
  const dark='#08101c',art=ART[u.type]||1;
  if(d.fly){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(6,16,10,5,0,0,7);ctx.fill();ctx.translate(0,-6);}
  ctx.scale(art,art);
  if(u.sh>0&&!portrait){ctx.strokeStyle='rgba(120,200,255,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,d.r+3,0,7);ctx.stroke();}
  // ---- custom sprite override -------------------------------------------
  const im=spriteFor(u.type);
  if(im){
    const cfg=SPRITES[u.type]||{},w=d.r*3.4*(cfg.scale||1),h=w*(im.height/im.width||1);
    ctx.save();
    if((cfg.mode||'rotate')==='rotate')ctx.rotate(u.face);else if(Math.cos(u.face)<0)ctx.scale(-1,1);
    ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();return;
  }
  if(FIG.includes(u.type)){drawFigure(u,d,c);return;}
  const moving=u.path.length>0,ph=tick/5+u.id,walk=moving?Math.sin(ph)*4:0,walk2=moving?Math.sin(ph+Math.PI)*4:0,left=Math.cos(u.face)<0;
  const bob=moving?Math.abs(Math.cos(ph))*0.8:0;
  const rec=(u.cd>0&&d.cd)?Math.max(0,(u.cd-(d.cd-10))/10)*4:0;
  ctx.strokeStyle=dark;ctx.lineWidth=1.3;ctx.lineJoin='round';ctx.lineCap='round';
  // digitigrade leg: hip -> knee -> ankle -> foot pad
  const leg=(hx,hy,sw,col,sc)=>{
    sc=sc||1;ctx.strokeStyle=col;ctx.lineWidth=3.4*sc;
    const kx=hx+sw*0.55,ky=hy+6*sc,ax=hx+sw*0.9,ay=hy+11*sc,fy=hy+14*sc;
    ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(kx,ky);ctx.lineTo(ax,ay);ctx.stroke();
    ctx.fillStyle='#1b2333';ctx.fillRect(ax-4.5*sc,fy-2.5*sc,9*sc,2.8*sc);
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(ax-4.5*sc,fy-2.5*sc,9*sc,1*sc);
  };
  const plate=(px,py,pw,pyh,col)=>{ctx.fillStyle=col;ctx.fillRect(px,py,pw,pyh);ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(px,py,pw,1.5);ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(px,py+pyh-1.5,pw,1.5);};
  switch(u.type){
    case'smech':case'destroyer':{
      const big=u.type==='destroyer';
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,13,11,4,0,0,7);ctx.fill();
      ctx.save();if(left)ctx.scale(-1,1);ctx.translate(0,-bob);
      leg(-3,0,walk2,'#1c2331');            // far leg
      // hull
      ctx.fillStyle=c;ctx.strokeStyle=dark;ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(-9,-7);ctx.lineTo(5,-8);ctx.lineTo(10,-3);ctx.lineTo(10,2);ctx.lineTo(-10,3);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.2)';ctx.beginPath();ctx.moveTo(-9,-7);ctx.lineTo(5,-8);ctx.lineTo(6,-5);ctx.lineTo(-9,-4);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(-10,1,20,2);
      ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-2,-7.5);ctx.lineTo(-2,2.5);ctx.stroke();  // panel line
      ctx.fillStyle='#0b1320';ctx.fillRect(3,-6,6,4);ctx.fillStyle='#9fe1ff';ctx.fillRect(4,-5.2,3.5,2);   // canopy
      ctx.fillStyle='#1b2333';for(let i=0;i<3;i++)ctx.fillRect(-8+i*3,-2,2,3);                              // vents
      if(big){plate(-11,-12,9,5,c);ctx.strokeRect(-11,-12,9,5);}                                            // shoulder armor
      leg(4,0,walk,'#2a3446');              // near leg
      ctx.restore();
      gun(u,big?2:1,-3-bob,big?20:17);break;}
    case'roller':{
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,11,11,4,0,0,7);ctx.fill();
      ctx.save();const rot=moving?(left?-tick/3:tick/3):0;ctx.rotate(rot);
      ctx.fillStyle='#232b3a';ctx.beginPath();ctx.arc(0,0,10.5,0,7);ctx.fill();
      ctx.strokeStyle=c;ctx.lineWidth=2.6;for(let i=0;i<5;i++){const ang=i*Math.PI*2/5;ctx.beginPath();ctx.moveTo(Math.cos(ang)*3.5,Math.sin(ang)*3.5);ctx.lineTo(Math.cos(ang)*9.5,Math.sin(ang)*9.5);ctx.stroke();}
      ctx.strokeStyle='#4a586e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,10.5,0,7);ctx.stroke();ctx.restore();
      ctx.strokeStyle=dark;ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(0,0,10.5,0,7);ctx.stroke();
      ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,4.5,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle='#9fe1ff';ctx.beginPath();ctx.arc(0,0,2,0,7);ctx.fill();
      gun(u,1,0,14);break;}
    case'heavy':{
      const sc=1;ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();ctx.ellipse(0,20,20,6,0,0,7);ctx.fill();
      ctx.save();if(left)ctx.scale(-1,1);ctx.translate(0,-bob*1.5);
      leg(-10,2,walk2,'#171d29');leg(7,2,walk,'#171d29');      // far pair
      // main hull: slab body with armor skirt
      ctx.fillStyle=c;ctx.strokeStyle=dark;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(-16,-10);ctx.lineTo(11,-11);ctx.lineTo(16,-4);ctx.lineTo(16,3);ctx.lineTo(-17,4);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.moveTo(-16,-10);ctx.lineTo(11,-11);ctx.lineTo(12,-7);ctx.lineTo(-16,-6);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(0,0,0,.32)';ctx.fillRect(-17,1,33,3);
      ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=0.9;                                   // panel lines
      for(const px of[-8,0,8]){ctx.beginPath();ctx.moveTo(px,-10.5);ctx.lineTo(px,3.5);ctx.stroke();}
      ctx.fillStyle='#1b2333';for(let i=0;i<4;i++)ctx.fillRect(-14+i*4,-3,2.5,4);            // side vents
      plate(-19,-6,4,9,'#2a3446');ctx.strokeStyle=dark;ctx.lineWidth=1.2;ctx.strokeRect(-19,-6,4,9);   // rear block
      // cabling between body and neck
      ctx.strokeStyle='#39424f';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(12,-9);ctx.quadraticCurveTo(16,-11,18,-14);ctx.moveTo(13,-7);ctx.quadraticCurveTo(17,-9,19,-12);ctx.stroke();
      // neck + head module
      ctx.strokeStyle='#2a3446';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(12,-9);ctx.lineTo(19,-15);ctx.stroke();
      ctx.fillStyle=c;ctx.strokeStyle=dark;ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(14,-22);ctx.lineTo(25,-21);ctx.lineTo(26,-14);ctx.lineTo(15,-13);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(14.5,-21.5,11,2);
      ctx.fillStyle='#0b1320';ctx.fillRect(20,-20,5.5,3.5);ctx.fillStyle='#9fe1ff';ctx.fillRect(20.6,-19.4,4,2);   // viewport
      ctx.strokeStyle='#222a38';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(24,-13.5);ctx.lineTo(29,-13);ctx.moveTo(22,-13.5);ctx.lineTo(27,-13);ctx.stroke(); // chin guns
      ctx.strokeStyle='#8fa4c4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(16,-22);ctx.lineTo(14,-29);ctx.stroke();ctx.fillStyle='#ffe81f';ctx.beginPath();ctx.arc(14,-29,1.6,0,7);ctx.fill(); // antenna
      leg(-6,2,walk,'#2a3446');leg(11,2,walk2,'#2a3446');      // near pair
      ctx.restore();
      gun(u,2,-7-bob,22);break;}
    case'artillery':case'boomer':{
      const bo=u.type==='boomer';
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,12,14,4.5,0,0,7);ctx.fill();
      ctx.save();if(left)ctx.scale(-1,1);
      const rot=moving?tick/4:0;
      for(const wx of[-9,0,9]){ctx.save();ctx.translate(wx,7);ctx.rotate(rot);ctx.fillStyle='#1e2634';ctx.beginPath();ctx.arc(0,0,5,0,7);ctx.fill();ctx.strokeStyle='#5b6a80';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-3.4,0);ctx.lineTo(3.4,0);ctx.moveTo(0,-3.4);ctx.lineTo(0,3.4);ctx.stroke();ctx.fillStyle='#39424f';ctx.beginPath();ctx.arc(0,0,1.6,0,7);ctx.fill();ctx.restore();}
      ctx.fillStyle=c;ctx.strokeStyle=dark;ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(-13,-4);ctx.lineTo(11,-5);ctx.lineTo(14,1);ctx.lineTo(-14,2);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(-12.5,-4,24,1.8);
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(-14,0,28,2);
      ctx.strokeStyle='#39424f';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-19,6);ctx.stroke();  // rear spade
      ctx.fillStyle='#1b2333';ctx.fillRect(-20,5,5,3);
      ctx.restore();
      // turret + barrel with recoil
      ctx.save();ctx.translate(0,-6);ctx.rotate(u.face);
      ctx.fillStyle='#39424f';ctx.strokeStyle=dark;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,5.5,0,7);ctx.fill();ctx.stroke();
      ctx.translate(-rec,0);
      ctx.strokeStyle='#222a38';ctx.lineWidth=bo?7:5;ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(bo?17:25,0);ctx.stroke();
      ctx.strokeStyle='#5b6a80';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(bo?17:25,0);ctx.stroke();
      ctx.fillStyle='#2a3446';ctx.fillRect(bo?14:21,-4,4,8);
      if(bo){ctx.fillStyle='#d05cff';ctx.shadowColor='#d05cff';ctx.shadowBlur=9;ctx.beginPath();ctx.arc(18,0,4.5,0,7);ctx.fill();ctx.shadowBlur=0;}
      ctx.restore();break;}
    case'fighter':case'airspeeder':{
      const sp=u.type==='airspeeder';
      ctx.save();ctx.rotate(u.face);
      if(moving){ctx.fillStyle='rgba(159,225,255,.35)';ctx.beginPath();ctx.moveTo(-9,-4);ctx.lineTo(-20-Math.random()*5,0);ctx.lineTo(-9,4);ctx.closePath();ctx.fill();}
      ctx.fillStyle=c;ctx.strokeStyle=dark;ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(2,-4);ctx.lineTo(-9,-11);ctx.lineTo(-11,-4);ctx.lineTo(-6,0);ctx.lineTo(-11,4);ctx.lineTo(-9,11);ctx.lineTo(2,4);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.moveTo(15,-0.6);ctx.lineTo(2,-3.4);ctx.lineTo(-8,-9.5);ctx.lineTo(-9,-5);ctx.closePath();ctx.fill();
      ctx.fillStyle='#0b1320';ctx.beginPath();ctx.ellipse(4,0,4,2.6,0,0,7);ctx.fill();
      ctx.fillStyle='#9fe1ff';ctx.beginPath();ctx.ellipse(4.6,0,2.4,1.5,0,0,7);ctx.fill();
      ctx.fillStyle='#ffd866';ctx.beginPath();ctx.arc(-9.5,-5.5,1.6,0,7);ctx.arc(-9.5,5.5,1.6,0,7);ctx.fill();
      if(sp){ctx.strokeStyle=c;ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-2,-12.5);ctx.lineTo(9,-12.5);ctx.moveTo(-2,12.5);ctx.lineTo(9,12.5);ctx.stroke();ctx.strokeStyle='#222a38';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(6,-12.5);ctx.lineTo(14,-12.5);ctx.moveTo(6,12.5);ctx.lineTo(14,12.5);ctx.stroke();}
      ctx.restore();break;}
    case'dropship':{
      ctx.save();ctx.rotate(u.face);
      if(moving){ctx.fillStyle='rgba(159,225,255,.25)';ctx.beginPath();ctx.moveTo(-11,-5);ctx.lineTo(-20,0);ctx.lineTo(-11,5);ctx.closePath();ctx.fill();}
      ctx.fillStyle='#39424f';ctx.strokeStyle=dark;ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(-9,-11);ctx.lineTo(9,-11);ctx.lineTo(9,11);ctx.lineTo(-9,11);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle=c;ctx.fillRect(-8,-10,16,4);ctx.fillRect(-8,6,16,4);
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(-8,-10,16,2);
      ctx.fillStyle='#1b2333';ctx.fillRect(-6,-4,12,8);
      ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(9,-8);ctx.lineTo(16,-4);ctx.lineTo(16,4);ctx.lineTo(9,8);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#9fe1ff';ctx.fillRect(12,-2.5,3,5);
      ctx.fillStyle='#2a3446';ctx.fillRect(-13,-8,5,6);ctx.fillRect(-13,2,5,6);
      ctx.fillStyle='#ffd866';ctx.beginPath();ctx.arc(-11,-5,1.6,0,7);ctx.arc(-11,5,1.6,0,7);ctx.fill();
      if(u.gar&&u.gar.length){ctx.fillStyle='#ffd866';ctx.font='bold 9px sans-serif';ctx.fillText(''+u.gar.length,-3,3);}
      ctx.restore();break;}
    case'bomber':{
      ctx.save();ctx.rotate(u.face);
      if(moving){ctx.fillStyle='rgba(159,225,255,.28)';ctx.beginPath();ctx.moveTo(-10,-5);ctx.lineTo(-22,0);ctx.lineTo(-10,5);ctx.closePath();ctx.fill();}
      ctx.fillStyle=c;ctx.strokeStyle=dark;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(4,-5);ctx.lineTo(-2,-15);ctx.lineTo(-12,-11);ctx.lineTo(-9,-3);ctx.lineTo(-9,3);ctx.lineTo(-12,11);ctx.lineTo(-2,15);ctx.lineTo(4,5);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.2)';ctx.beginPath();ctx.moveTo(14,-0.8);ctx.lineTo(4,-4.4);ctx.lineTo(-1,-13.5);ctx.lineTo(-10,-10);ctx.closePath();ctx.fill();
      ctx.fillStyle='#0b1320';ctx.fillRect(-2,-4,11,8);ctx.fillStyle='#9fe1ff';ctx.fillRect(4,-2.4,3.5,4.8);
      ctx.fillStyle='#2a3446';ctx.fillRect(-7,-12,5,6);ctx.fillRect(-7,6,5,6);
      ctx.fillStyle='#ffd866';ctx.beginPath();ctx.arc(-7,-9,1.6,0,7);ctx.arc(-7,9,1.6,0,7);ctx.fill();
      ctx.restore();break;}
    case'grazer':{
      ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,11,12,4,0,0,7);ctx.fill();
      ctx.save();if(left)ctx.scale(-1,1);ctx.translate(0,-bob);
      ctx.strokeStyle='#5a4028';ctx.lineWidth=2.6;ctx.beginPath();
      for(const[lx,p2]of[[-7,0],[-4,Math.PI],[4,0],[7,Math.PI]]){const sw=moving?Math.sin(ph+p2)*3:0;ctx.moveTo(lx,3);ctx.lineTo(lx+sw*0.6,7);ctx.lineTo(lx+sw,11);}ctx.stroke();
      ctx.fillStyle='#8a6a48';ctx.strokeStyle=dark;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,0,12,7,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.ellipse(-1,-2.5,9,3,0,0,7);ctx.fill();
      ctx.fillStyle='#6b4f36';ctx.beginPath();ctx.ellipse(11,-4,5,4,0.4,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=dark;ctx.beginPath();ctx.arc(13,-5,1,0,7);ctx.fill();
      ctx.strokeStyle='#e8d5c0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(10,-8);ctx.lineTo(13,-13);ctx.moveTo(7,-8);ctx.lineTo(6,-13);ctx.stroke();
      ctx.restore();break;}
  }
}
function gun(u,n,oy,len){
  ctx.save();ctx.translate(0,oy);ctx.rotate(u.face);ctx.lineCap='round';
  ctx.strokeStyle='#222a38';ctx.lineWidth=3.2;ctx.beginPath();
  if(n===1){ctx.moveTo(2,0);ctx.lineTo(len,0);}else{ctx.moveTo(2,-3);ctx.lineTo(len,-3);ctx.moveTo(2,3);ctx.lineTo(len,3);}
  ctx.stroke();
  ctx.strokeStyle='#5b6a80';ctx.lineWidth=1.1;ctx.beginPath();
  if(n===1){ctx.moveTo(len-7,0);ctx.lineTo(len,0);}else{ctx.moveTo(len-7,-3);ctx.lineTo(len,-3);ctx.moveTo(len-7,3);ctx.lineTo(len,3);}
  ctx.stroke();ctx.restore();
}
// small 3/4-view humanoid figures (not rotated; flipped by facing, weapon aims at target)
function drawFigure(u,d,c){
  const moving=u.path.length>0,ph=tick/4+u.id;
  const swing=moving?Math.sin(ph)*4:0,bob=moving?Math.abs(Math.cos(ph))*1.2:0;
  const left=Math.cos(u.face)<0;
  const dark='#0b1320',skin='#e8c9a8';
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,11,8,3.5,0,0,7);ctx.fill();
  if(u.type==='mounted'){ // beast + rider
    ctx.save();if(left)ctx.scale(-1,1);
    ctx.strokeStyle='#4a3524';ctx.lineWidth=2.5;ctx.beginPath();for(const lx of[-7,-3,3,7]){const sw=moving?Math.sin(ph+lx)*3:0;ctx.moveTo(lx,3);ctx.lineTo(lx+sw,11);}ctx.stroke();
    ctx.fillStyle='#7a5a3a';ctx.strokeStyle=dark;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,1,12,6,0,0,7);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(11,-3,5,3.5,0.3,0,7);ctx.fill();ctx.stroke();ctx.fillStyle=dark;ctx.beginPath();ctx.arc(13,-4,1,0,7);ctx.fill();
    ctx.restore();
    ctx.save();ctx.translate(-2,-9);ctx.scale(0.8,0.8);figureBody(u,c,left,0,0,dark,skin);ctx.restore();
    weapon(u,'rifle');return;
  }
  ctx.save();ctx.translate(0,-bob);
  // legs
  const legC=u.type==='mystic'?'#5a4a6a':u.type==='darktrooper'?'#111':u.type==='worker'?'#3b4a63':'#2a3446';
  ctx.strokeStyle=legC;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-3,2);ctx.lineTo(-3+swing,10);ctx.moveTo(3,2);ctx.lineTo(3-swing,10);ctx.stroke();
  ctx.fillStyle=dark;ctx.fillRect(-5+swing,9,4,2.5);ctx.fillRect(1-swing,9,4,2.5);
  if(u.type==='mystic'){ctx.fillStyle='#d9cfb5';ctx.strokeStyle=dark;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-5,-6);ctx.lineTo(5,-6);ctx.lineTo(8,10);ctx.lineTo(-8,10);ctx.closePath();ctx.fill();ctx.stroke();}
  figureBody(u,c,left,0,0,dark,skin);
  ctx.restore();
  weapon(u,u.type==='worker'?'tool':u.type==='aa'?'launcher':u.type==='grenadier'?'grenade':u.type==='mystic'?'staff':'rifle');
  if(u.type==='worker'&&u.carry>0){ctx.fillStyle=RESC[u.ctype];ctx.strokeStyle=dark;ctx.lineWidth=1;const bx=left?4:-9;ctx.fillRect(bx,-6,5,7);ctx.strokeRect(bx,-6,5,7);}
}
function figureBody(u,c,left,ox,oy,dark,skin){
  ctx.save();ctx.translate(ox,oy);if(left)ctx.scale(-1,1);
  const dt=u.type==='darktrooper',my=u.type==='mystic',wk=u.type==='worker';
  // torso
  ctx.fillStyle=dt?'#1a1a22':my?'#d9cfb5':c;ctx.strokeStyle=dark;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(-5.5,-6);ctx.lineTo(5.5,-6);ctx.lineTo(4.5,3);ctx.lineTo(-4.5,3);ctx.closePath();ctx.fill();ctx.stroke();
  if(dt){ctx.fillStyle=c;ctx.fillRect(-3,-4,6,2);}
  else if(!my){ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(-4,-5,8,2);} // chest plate highlight
  ctx.fillStyle=dark;ctx.fillRect(-4.5,1,9,1.5); // belt
  // arms
  ctx.strokeStyle=dt?'#1a1a22':my?'#d9cfb5':c;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-5,-4);ctx.lineTo(-6,2);ctx.moveTo(5,-4);ctx.lineTo(7,1);ctx.stroke();
  // head
  const hc=wk?'#ffd866':dt?'#111':my?'#d9cfb5':'#e6ecf5';
  ctx.fillStyle=hc;ctx.strokeStyle=dark;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,-11,4.6,0,7);ctx.fill();ctx.stroke();
  if(my){ctx.fillStyle=skin;ctx.beginPath();ctx.arc(1,-10.5,2.6,0,7);ctx.fill();} // hood + face
  else if(wk){ctx.fillStyle=skin;ctx.fillRect(-1,-10,5,4);ctx.fillStyle='#ffd866';ctx.fillRect(-5,-11,10,2);} // hard hat brim
  else{ctx.fillStyle=dt?'#ff4d4d':c;ctx.fillRect(0.5,-12,4,2.2);ctx.fillStyle=dark;ctx.fillRect(0.5,-9.3,4,1);} // visor
  ctx.restore();
}
function weapon(u,kind){
  const dark='#08101c';ctx.save();ctx.translate(0,-3);ctx.rotate(u.face);ctx.lineCap='round';
  if(kind==='rifle'){ctx.strokeStyle='#222a38';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-2,2);ctx.lineTo(13,2);ctx.stroke();ctx.strokeStyle='#8fa4c4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(8,2);ctx.lineTo(13,2);ctx.stroke();}
  else if(kind==='launcher'){ctx.strokeStyle='#222a38';ctx.lineWidth=4.5;ctx.beginPath();ctx.moveTo(-6,3);ctx.lineTo(12,-1);ctx.stroke();ctx.fillStyle='#ffe81f';ctx.beginPath();ctx.arc(12,-1,2.5,0,7);ctx.fill();}
  else if(kind==='grenade'){ctx.strokeStyle='#222a38';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-2,2);ctx.lineTo(9,2);ctx.stroke();ctx.fillStyle='#3fbf5f';ctx.strokeStyle=dark;ctx.lineWidth=1;ctx.beginPath();ctx.arc(11,2,3,0,7);ctx.fill();ctx.stroke();}
  else if(kind==='tool'){ctx.strokeStyle='#8a6a3a';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(11,2);ctx.stroke();ctx.fillStyle='#b8c4d6';ctx.strokeStyle=dark;ctx.lineWidth=1;ctx.fillRect(9,-2,5,8);ctx.strokeRect(9,-2,5,8);}
  else if(kind==='staff'){ctx.strokeStyle='#8a6a3a';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-4,4);ctx.lineTo(12,-2);ctx.stroke();ctx.fillStyle='#ffe81f';ctx.beginPath();ctx.arc(12,-2,2.5,0,7);ctx.fill();}
  ctx.restore();
}
function drawMinimap(){
  const s=138/MW;
  mctx.drawImage(terrain,0,0,138,138);
  for(const r of resources)if(explored[idx(r.tx,r.ty)]){mctx.fillStyle=RESC[r.res];mctx.fillRect(r.tx*s,r.ty*s,s,s);}
  for(const g of memBld.values()){mctx.globalAlpha=0.5;mctx.fillStyle=TEAMC[g.team];mctx.fillRect(g.tx*s,g.ty*s,g.w*s,g.h*s);mctx.globalAlpha=1;}
  for(const b of buildings)if(visibleE(b)){mctx.fillStyle=TEAMC[b.team];mctx.fillRect(b.tx*s,b.ty*s,b.w*s,b.h*s);}
  for(const u of units)if(u.team!==GAIA&&visibleE(u)){mctx.fillStyle=TEAMC[u.team];mctx.fillRect(u.x/TILE*s-1,u.y/TILE*s-1,2.5,2.5);}
  mctx.globalAlpha=1;mctx.drawImage(fogCv,0,0,138,138);
  for(const a of alerts){mctx.strokeStyle='#ff4d4d';mctx.lineWidth=1.5;mctx.globalAlpha=0.5+0.5*Math.sin(a.age/6);mctx.beginPath();mctx.arc(a.x/TILE*s,a.y/TILE*s,5+(a.age%40)/8,0,7);mctx.stroke();}mctx.globalAlpha=1;
  mctx.strokeStyle='#fff';mctx.lineWidth=1;mctx.strokeRect(cam.x/TILE*s,cam.y/TILE*s,VW/TILE*s,VH/TILE*s);
}

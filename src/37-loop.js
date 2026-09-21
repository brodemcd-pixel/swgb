// ---------------------------------------------------------------------------
// The animation loop and the debug handle exposed on window.
// ---------------------------------------------------------------------------
let last=performance.now(),acc=0;
function loop(now){
  acc+=Math.min(100,now-last)*speed;last=now;let n=0;
  while(acc>=1000/60&&n<6){if(started&&!gameOver&&!paused)update();acc-=1000/60;n++;}
  scroll();draw();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__gb={step:n=>{for(let i=0;i<n;i++)update();},get units(){return units},get buildings(){return buildings},get res(){return res},newGame};

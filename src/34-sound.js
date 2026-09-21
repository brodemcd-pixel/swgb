// ---------------------------------------------------------------------------
// Procedurally synthesised sound effects (no audio files).
// ---------------------------------------------------------------------------
let AC=null;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function sfx(kind){
  if(muted)return;const a=ac();if(!a)return;const t=a.currentTime,g=a.createGain();g.connect(a.destination);
  const osc=(type,f0,f1,dur,vol)=>{const o=a.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(g);o.start(t);o.stop(t+dur);};
  switch(kind){
    case'laser':osc('square',900,250,0.09,0.035);break;
    case'boom':{const n=a.createBufferSource(),buf=a.createBuffer(1,a.sampleRate*0.35,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);n.buffer=buf;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=500;n.connect(f);f.connect(g);g.gain.setValueAtTime(0.25,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.35);n.start(t);break;}
    case'click':osc('sine',700,500,0.05,0.04);break;
    case'done':osc('sine',520,780,0.18,0.06);break;
    case'alert':osc('sawtooth',300,200,0.25,0.05);break;
    case'die':osc('triangle',300,80,0.15,0.05);break;
    case'convert':osc('sine',400,1200,0.5,0.06);break;
    case'win':osc('sine',400,900,1.0,0.1);break;
    case'lose':osc('sawtooth',300,60,1.2,0.1);break;
  }
}

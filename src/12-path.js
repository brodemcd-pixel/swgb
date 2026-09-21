// ---------------------------------------------------------------------------
// A* pathfinding over the tile grid, including the elevation rules that make
// cliffs walls and ramps doors.
// ---------------------------------------------------------------------------
function hpush(h,f,i){h.push([f,i]);let k=h.length-1;while(k>0){const p=(k-1)>>1;if(h[p][0]<=h[k][0])break;const tmp=h[p];h[p]=h[k];h[k]=tmp;k=p;}}
function hpop(h){const top=h[0],last=h.pop();if(h.length){h[0]=last;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<h.length&&h[l][0]<h[m][0])m=l;if(r<h.length&&h[r][0]<h[m][0])m=r;if(m===k)break;const tmp=h[m];h[m]=h[k];h[k]=tmp;k=m;}}return top;}
function nearestFree(tx,ty,fx=tx,fy=ty,maxR=8){
  if(!blockedT(tx,ty))return[tx,ty];
  for(let r=1;r<=maxR;r++){let best=null,bd=1e9;
    for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
      if(Math.max(Math.abs(x),Math.abs(y))!==r)continue;
      const nx=tx+x,ny=ty+y;if(blockedT(nx,ny))continue;
      const d=Math.hypot(nx-fx,ny-fy);if(d<bd){bd=d;best=[nx,ny];}
    }
    if(best)return best;
  }
  return null;
}
function findPath(sx,sy,tx,ty,team){
  if(sx===tx&&sy===ty)return[];
  if(blockedT(tx,ty,team)){const n=nearestFree(tx,ty,sx,sy);if(!n)return null;tx=n[0];ty=n[1];}
  const N=MW*MH,g=new Float32Array(N).fill(1e9),par=new Int32Array(N).fill(-1),closed=new Uint8Array(N);
  const h=(x,y)=>{const dx=Math.abs(x-tx),dy=Math.abs(y-ty);return Math.max(dx,dy)+0.414*Math.min(dx,dy)};
  const s=idx(sx,sy),tI=idx(tx,ty),heap=[];g[s]=0;hpush(heap,h(sx,sy),s);
  let best=s,bestH=h(sx,sy),iter=0;
  while(heap.length&&iter++<9000){
    const [,i]=hpop(heap);if(closed[i])continue;closed[i]=1;
    if(i===tI){best=i;break}
    const x=i%MW,y=(i/MW)|0,hh=h(x,y);if(hh<bestH){bestH=hh;best=i}
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(blockedT(nx,ny,team))continue;
      if(!canStep(x,y,nx,ny))continue;
      if(dx&&dy&&(blockedT(x+dx,y,team)||blockedT(x,y+dy,team)||!canStep(x,y,x+dx,y)||!canStep(x,y,x,y+dy)))continue;
      const n=idx(nx,ny),ng=g[i]+(dx&&dy?1.414:1);
      if(ng<g[n]){g[n]=ng;par[n]=i;hpush(heap,ng+h(nx,ny),n);}
    }
  }
  const path=[];let i=best;while(i!==s&&i!==-1){path.push([i%MW,(i/MW)|0]);i=par[i];}
  return path.reverse();
}
function approachTile(u,e){
  const[ux,uy]=ut(u);if(!e.w)return ut(e);
  for(let m=1;m<=3;m++){let best=null,bd=1e9;
    for(let y=e.ty-m;y<e.ty+e.h+m;y++)for(let x=e.tx-m;x<e.tx+e.w+m;x++){
      if(x>e.tx-m&&x<e.tx+e.w+m-1&&y>e.ty-m&&y<e.ty+e.h+m-1)continue;
      if(blockedT(x,y,u.team))continue;const d=Math.hypot(x-ux,y-uy);if(d<bd){bd=d;best=[x,y];}
    }
    if(best)return best;
  }
  return[ux,uy];
}

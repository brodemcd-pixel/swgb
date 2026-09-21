// ---------------------------------------------------------------------------
// Static game data: civilisations, unit and building tables, research,
// terrain themes and AI personalities. Pure tables — no behaviour lives here.
// ---------------------------------------------------------------------------
// ================= CONSTANTS & DATA =================
const TILE=32,HALF=16;let MW=72,MH=72;
const cvs=document.getElementById('game');let ctx=cvs.getContext('2d');const mainCtx=ctx;
const mm=document.getElementById('minimap'),mctx=mm.getContext('2d');
let W=0,H=0,VW=0,VH=0,zoom=1;
function resize(){W=cvs.width=innerWidth;H=cvs.height=innerHeight-150;VW=W/zoom;VH=H/zoom;}
addEventListener('resize',()=>{resize();if(started)clampCam();});resize();
// ---- CUSTOM SPRITES ----------------------------------------------------------
// Drop your own art in here, e.g.  heavy:{url:'walker.png',mode:'rotate',scale:1.2}
// mode 'rotate' spins the image to face its target; 'flip' mirrors it left/right.
// You can also select a unit in-game and drag an image file onto the map, or call
// setSprite('heavy','some.png') from the console. Cleared with clearSprites().
const SPRITES={};
const SPRITE_IMG={};
const ART={dropship:1.35,worker:1.1,trooper:1.1,darktrooper:1.15,mounted:1.1,aa:1.1,grenadier:1.1,mystic:1.1,
  smech:1.25,destroyer:1.35,roller:1.2,heavy:1.7,artillery:1.3,boomer:1.3,fighter:1.15,airspeeder:1.15,bomber:1.3,grazer:1.15};

const GAIA=9;
const TEAMC=['#4fa3ff','#ff4d4d','#ffc63d','#a95cff'];TEAMC[GAIA]='#c8b48a';
const LASERC=['#5cff7a','#ff3b3b','#ffe066','#d08cff'];LASERC[GAIA]='#fff';
const TEAMNAME=['Blue','Red','Gold','Violet'];TEAMNAME[GAIA]='Wildlife';
const AI_TYPES={
  balanced:{name:'Balanced',desc:'Builds a rounded economy and attacks on a steady rhythm.',workers:1,tech:[2.5,6.5,12],wave:1,firstAttack:5,turrets:1,mix:null},
  rusher:{name:'Rusher',desc:'Rushes early infantry and keeps the pressure on. Light economy, late tech.',workers:0.8,tech:[4.5,10,16],wave:0.5,firstAttack:2.6,turrets:0.4,mix:'troop'},
  turtle:{name:'Turtle',desc:'Hides behind massed turrets and saves up a huge late army.',workers:1.1,tech:[2.2,5.5,10],wave:1.8,firstAttack:8,turrets:3,mix:null},
  economist:{name:'Economist',desc:'Over-invests in workers and tech, then rolls out heavy units.',workers:1.5,tech:[2,5,9.5],wave:1.35,firstAttack:6.5,turrets:1.3,mix:'heavy'},
};
const RES=['food','carbon','ore','nova'];
const RESC={food:'#ffb15c',carbon:'#3fbf5f',ore:'#a9b0bd',nova:'#d05cff'};
const RESNAME={food:'Fruit Shrub',carbon:'Carbon Grove',ore:'Ore Deposit',nova:'Nova Crystals'};

const CIVS={
  alliance:{name:'Alliance',desc:'Aircraft cost 15% less. All units see 1 tile farther. Unique unit: Airspeeder (fast air, hunts mechs).',unique:'airspeeder'},
  dominion:{name:'Dominion',desc:'Mechs have +15% HP. Troop Center trains 20% faster. Unique unit: Dark Trooper (elite heavy infantry).',unique:'darktrooper'},
  swamp:{name:'Swamp Clans',desc:'Shields regenerate twice as fast. Farms cost half. Unique unit: Boomer (energy catapult with big splash).',unique:'boomer'},
  cartel:{name:'Trade Cartel',desc:'Troops cost 15% less. Engineers gather 10% faster. Unique unit: Roller Droid (fast shielded mech).',unique:'roller'},
};
// cls: worker troop mech air artillery hero animal. bonus: damage multiplier vs target class.
const UNITS={
  worker:{name:'Engineer',cls:'worker',cost:{food:50},hp:45,armor:0,speed:2.2,dmg:3,range:1,cd:40,r:8,time:420,pop:1,los:5,hot:'Q',tech:1,from:'hq',bonus:{animal:5},desc:'Gathers resources, hunts, builds and repairs.'},
  trooper:{name:'Trooper',cls:'troop',cost:{food:40,carbon:25},hp:60,armor:0,speed:2.0,dmg:8,range:5,cd:32,r:8,time:480,pop:1,los:6,hot:'Q',tech:1,from:'troop',desc:'Basic ranged infantry. Cheap and versatile.'},
  mounted:{name:'Mounted Trooper',cls:'troop',cost:{food:60,nova:40},hp:95,armor:1,speed:3.4,dmg:11,range:1.5,cd:30,r:10,time:540,pop:1,los:7,hot:'W',tech:2,from:'troop',bonus:{worker:2,artillery:3},noAir:true,desc:'Fast raider. Strong vs Engineers and Artillery. Cannot hit aircraft.'},
  aa:{name:'Anti-Air Trooper',cls:'troop',cost:{food:45,carbon:35},hp:55,armor:0,speed:2.0,dmg:9,range:6,cd:30,r:8,time:480,pop:1,los:7,hot:'E',tech:2,from:'troop',bonus:{air:4,troop:.6,mech:.5,building:.3},desc:'Shreds aircraft. Weak against ground targets.'},
  grenadier:{name:'Grenadier',cls:'troop',cost:{food:50,nova:50},hp:70,armor:1,speed:1.9,dmg:14,range:4,cd:50,r:8,time:600,pop:1,los:6,hot:'R',tech:3,from:'troop',bonus:{troop:1.5,building:1.5},splash:1,noAir:true,blast:true,desc:'Lobs grenades with splash damage. Good vs troops and buildings.'},
  smech:{name:'Strike Mech',cls:'mech',cost:{ore:80,nova:40},hp:140,armor:2,speed:2.6,dmg:12,range:4,cd:30,r:11,time:660,pop:2,los:6,hot:'Q',tech:2,from:'mech',bonus:{troop:1.5},desc:'Fast light mech. Good vs troops.'},
  destroyer:{name:'Mech Destroyer',cls:'mech',cost:{ore:100,nova:80},hp:180,armor:2,speed:1.8,dmg:22,range:5,cd:45,r:12,time:780,pop:2,los:6,hot:'W',tech:3,from:'mech',bonus:{mech:2.5},desc:'Anti-mech specialist.'},
  heavy:{name:'Assault Walker',cls:'mech',cost:{ore:200,nova:120},hp:420,armor:4,speed:1.2,dmg:35,range:5,cd:60,r:15,time:1200,pop:3,los:7,hot:'E',tech:4,from:'mech',bonus:{building:2},noAir:true,desc:'Heavy siege walker. Slow, armored, wrecks buildings. Cannot hit aircraft.'},
  artillery:{name:'Artillery',cls:'artillery',cost:{carbon:120,nova:100},hp:80,armor:0,speed:1.1,dmg:40,range:9,minRange:2,cd:120,r:11,time:900,pop:2,los:8,hot:'Q',tech:3,from:'heavy',bonus:{building:5,troop:1.5},splash:1,noAir:true,blast:true,desc:'Long-range siege. Devastating vs buildings. Cannot fire at adjacent targets or aircraft.'},
  dropship:{name:'Dropship',cls:'air',cost:{carbon:90,ore:60},hp:180,armor:2,speed:3.2,dmg:0,range:1,cd:0,r:12,time:700,pop:2,los:7,hot:'E',tech:2,from:'air',fly:true,cap:6,desc:'Unarmed transport. Carries 6 ground units over cliffs and rough ground. Select troops and right-click the Dropship to load.'},
  fighter:{name:'Starfighter',cls:'air',cost:{ore:70,nova:70},hp:85,armor:1,speed:4.2,dmg:12,range:5,cd:26,r:10,time:720,pop:2,los:8,hot:'Q',tech:2,from:'air',fly:true,bonus:{air:1.5,artillery:2},desc:'Fast aircraft. Hits air and ground. Vulnerable to Anti-Air Troopers.'},
  bomber:{name:'Bomber',cls:'air',cost:{carbon:120,nova:120},hp:140,armor:2,speed:2.6,dmg:45,range:2,cd:110,r:12,time:960,pop:2,los:7,hot:'W',tech:3,from:'air',fly:true,bonus:{building:4,mech:1.5},splash:1,noAir:true,blast:true,desc:'Heavy bomber. Splash damage, crushes buildings and mechs. Cannot hit aircraft.'},
  mystic:{name:'Mystic',cls:'troop',cost:{nova:100},hp:50,armor:0,speed:1.8,dmg:0,range:5,cd:0,r:8,time:900,pop:1,los:7,hot:'Q',tech:3,from:'temple',convert:true,desc:'Converts enemy units to your side (right-click an enemy). Heals nearby allies when idle.'},
  airspeeder:{name:'Airspeeder',cls:'air',civ:'alliance',cost:{ore:80,nova:90},hp:110,armor:1,speed:4.6,dmg:16,range:3,cd:24,r:10,time:780,pop:2,los:8,hot:'Q',tech:3,from:'fort',fly:true,bonus:{mech:2.2},desc:'Alliance unique. Very fast, tows down mechs.'},
  darktrooper:{name:'Dark Trooper',cls:'troop',civ:'dominion',cost:{food:70,nova:80},hp:160,armor:3,speed:2.0,dmg:18,range:4,cd:34,r:9,time:840,pop:2,los:6,hot:'Q',tech:3,from:'fort',desc:'Dominion unique. Elite armored infantry.'},
  boomer:{name:'Boomer',cls:'artillery',civ:'swamp',cost:{carbon:150,nova:120},hp:120,armor:1,speed:1.3,dmg:35,range:7,minRange:2,cd:100,r:12,time:960,pop:2,los:8,hot:'Q',tech:3,from:'fort',bonus:{building:3,troop:2},splash:1.6,noAir:true,blast:true,desc:'Swamp Clans unique. Energy catapult with large splash.'},
  roller:{name:'Roller Droid',cls:'mech',civ:'cartel',cost:{ore:110,nova:90},hp:130,armor:2,speed:3.4,dmg:20,range:3,cd:22,r:10,time:780,pop:2,los:6,hot:'Q',tech:3,from:'fort',bonus:{troop:1.5},shield:60,desc:'Trade Cartel unique. Fast mech with a built-in shield.'},
  grazer:{name:'Grazer',cls:'animal',cost:{},hp:70,armor:0,speed:1.0,dmg:0,range:1,cd:60,r:9,time:0,pop:0,los:0,tech:0,desc:'Wild animal. Hunt it with Engineers for 120 food.'},
};
// menu: eco|mil. power: needs a Power Core nearby to run at full speed.
const BLD={
  hq:{name:'Command Center',w:4,h:4,hp:1800,armor:3,cost:{carbon:400,ore:200},time:2400,garrison:10,trains:['worker'],research:['tech2','tech3','tech4','harvest1','harvest2'],drop:true,pop:10,los:7,hot:'C',tech:3,menu:'mil',desc:'Trains Engineers, researches Tech Levels. Resource drop-off. Self-powered.'},
  shelter:{name:'Prefab Shelter',w:2,h:2,hp:250,armor:1,cost:{carbon:30},time:420,garrison:5,pop:8,los:3,hot:'E',tech:1,menu:'eco',desc:'+8 population.'},
  core:{name:'Power Core',w:2,h:2,hp:400,armor:2,cost:{carbon:100,ore:60},time:720,core:true,radius:8,los:5,hot:'P',tech:1,menu:'eco',desc:'Powers buildings within 8 tiles. Unpowered production buildings and turrets work at half speed.'},
  depot:{name:'Depot',w:2,h:2,hp:350,armor:2,cost:{carbon:70},time:540,drop:true,los:4,hot:'D',tech:1,menu:'eco',desc:'Resource drop-off point. Build near distant resources.'},
  farm:{name:'Farm',w:2,h:2,hp:150,armor:0,cost:{carbon:60},time:480,farm:true,amount:250,los:2,hot:'F',tech:1,menu:'eco',desc:'Produces 250 food (Engineers gather from it). Auto-reseeds while you can afford it.'},
  gate:{name:'Gate',w:1,h:1,hp:500,armor:6,cost:{ore:20},time:240,los:2,hot:'G',tech:1,menu:'eco',gate:true,desc:'Wall segment that only your own units can pass through. Drag to place like a wall.'},
  wall:{name:'Wall',w:1,h:1,hp:450,armor:6,cost:{ore:5},time:120,los:2,hot:'W',tech:1,menu:'eco',wall:true,desc:'Cheap barrier. Click and drag to place a line.'},
  sentry:{name:'Sentry Post',w:1,h:1,hp:300,armor:2,cost:{carbon:40,ore:50},time:600,garrison:3,dmg:7,range:7,cd:36,los:9,hot:'S',tech:1,menu:'eco',desc:'Light tower with long sight range. Needs no power.'},
  troop:{name:'Troop Center',w:3,h:3,hp:800,armor:2,cost:{carbon:120},time:1200,trains:['trooper','mounted','aa','grenadier','darktrooper'],power:true,los:5,hot:'T',tech:1,menu:'mil',desc:'Trains infantry.'},
  mech:{name:'Mech Factory',w:3,h:3,hp:900,armor:2,cost:{carbon:150,ore:60},time:1400,trains:['smech','destroyer','heavy','roller'],power:true,los:5,hot:'M',tech:2,menu:'mil',desc:'Builds mechs.'},
  air:{name:'Airbase',w:3,h:3,hp:750,armor:2,cost:{carbon:150,ore:100},time:1400,trains:['fighter','bomber','airspeeder'],power:true,los:5,hot:'A',tech:2,menu:'mil',desc:'Builds aircraft.'},
  heavy:{name:'Heavy Weapons Factory',w:3,h:3,hp:900,armor:2,cost:{carbon:150,ore:150},time:1500,trains:['artillery','boomer'],power:true,los:5,hot:'H',tech:3,menu:'mil',desc:'Builds artillery.'},
  research:{name:'Research Center',w:3,h:3,hp:700,armor:2,cost:{carbon:130,ore:60},time:1200,research:['troopAtk','troopArm','mechAtk','mechArm','airAtk','airArm','shields'],power:true,los:5,hot:'R',tech:2,menu:'mil',desc:'Researches attack, armor and shield upgrades.'},
  temple:{name:'Temple',w:3,h:3,hp:700,armor:2,cost:{carbon:150,nova:100},time:1400,trains:['mystic'],power:true,los:6,hot:'J',tech:3,menu:'mil',desc:'Trains Mystics.'},
  turret:{name:'Laser Turret',w:2,h:2,hp:450,armor:3,cost:{ore:110,nova:40},time:800,garrison:5,dmg:18,range:7,cd:36,power:true,los:8,hot:'U',tech:2,menu:'mil',desc:'Strong defensive turret. Fires at half rate without power.'},
  shieldgen:{name:'Shield Generator',w:2,h:2,hp:400,armor:2,cost:{ore:100,nova:100},time:900,shield:true,radius:7,power:true,los:5,hot:'G',tech:3,menu:'mil',desc:'Units within 7 tiles regenerate shields 4x faster (requires Shields research).'},
  fort:{name:'Fortress',w:4,h:4,hp:2200,armor:4,cost:{ore:350,nova:150},time:2400,garrison:15,trains:['airspeeder','darktrooper','boomer','roller'],dmg:24,range:8,cd:30,power:true,los:9,hot:'F',tech:3,menu:'mil',desc:'Massive stronghold. Trains your civilization\'s unique unit. Heavy cannon.'},
};
const TECHS={
  tech2:{name:'Tech Level 2',cost:{food:400,nova:150},time:3000,hot:'T',tech:1,desc:'Unlocks Mech Factory, Airbase, Research Center, Turrets, Mounted and Anti-Air Troopers.'},
  tech3:{name:'Tech Level 3',cost:{food:700,ore:150,nova:300},time:4200,hot:'T',tech:2,req:'tech2',desc:'Unlocks Heavy Weapons, Temple, Fortress, Shield Generator, Grenadiers, Destroyers, Bombers, Artillery.'},
  tech4:{name:'Tech Level 4',cost:{food:1000,ore:300,nova:600},time:5400,hot:'T',tech:3,req:'tech3',desc:'Unlocks Assault Walkers and level 3 upgrades.'},
  harvest1:{name:'Efficient Harvesting',cost:{food:100,carbon:100},time:1800,hot:'H',tech:2,desc:'Engineers gather 20% faster.'},
  harvest2:{name:'Advanced Harvesting',cost:{food:200,carbon:200},time:2400,hot:'H',tech:3,req:'harvest1',desc:'Engineers gather another 20% faster.'},
  shields:{name:'Shields',cost:{ore:200,nova:200},time:2400,hot:'G',tech:3,desc:'All units gain a regenerating shield worth 30% of their HP.'},
};
const LINES={troopAtk:['Troop Attack','troop','Q',2],troopArm:['Troop Armor','troop','W',1],mechAtk:['Mech Attack','mech','E',3],mechArm:['Mech Armor','mech','R',1],airAtk:['Air Attack','air','A',3],airArm:['Air Armor','air','S',1]};
for(const k in LINES){const[nm,cls,hot,per]=LINES[k];for(let l=1;l<=3;l++)TECHS[k+l]={name:nm+' '+['I','II','III'][l-1],line:k,cls,per,cost:{ore:80*l+40,nova:70*l+30},time:1500+600*l,hot,tech:l+1,req:l>1?k+(l-1):null,desc:'+'+per+(k.endsWith('Atk')?' attack':' armor')+' for '+cls+' units.'};}
const THEMES={desert:{name:'Desert',h:36,s:32,l:52,rock:['#4a3d33','#5f4f42','#75634f'],decor:'rgba(60,90,40,.35)',speck:'rgba(90,60,30,.18)'},forest:{name:'Forest',h:95,s:28,l:36,rock:['#3a3a34','#4f4f46','#66665a'],decor:'rgba(40,110,40,.5)',speck:'rgba(20,50,20,.25)'},ice:{name:'Ice',h:205,s:22,l:74,rock:['#55606e','#707c8a','#95a1ad'],decor:'rgba(120,150,180,.4)',speck:'rgba(150,180,210,.3)'}};
const OFFS=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1],[2,0],[-2,0],[0,2],[0,-2],[2,1],[-2,-1],[1,2],[-1,-2],[2,-1],[-2,1],[1,-2],[-1,2],[2,2],[-2,-2],[2,-2],[-2,2],[3,0],[-3,0],[0,3],[0,-3],[3,1],[-3,-1],[1,3],[-1,-3],[3,-1],[-3,1],[-1,3],[1,-3],[3,2],[-3,-2],[2,3],[-2,-3]];
const MILITARY_BLD=['hq','troop','mech','air','heavy','temple','fort','research'];

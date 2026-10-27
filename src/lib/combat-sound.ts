import type {BattleEvent} from './game';

// Procedural, local audio: no downloads, audio stream or extra realtime messages.
export function combatSound(ctx:AudioContext,events:BattleEvent[]):()=>void{
 const nodes:AudioScheduledSourceNode[]=[];const master=ctx.createGain();master.gain.value=.065;master.connect(ctx.destination);const start=ctx.currentTime+.015;
 function tone(hz:number,end:number,duration:number,delay=0,type:OscillatorType='sine',level=.5){const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(hz,start+delay);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,end),start+delay+duration);gain.gain.setValueAtTime(0,start+delay);gain.gain.linearRampToValueAtTime(level,start+delay+.01);gain.gain.exponentialRampToValueAtTime(.001,start+delay+duration);oscillator.connect(gain);gain.connect(master);oscillator.start(start+delay);oscillator.stop(start+delay+duration+.03);nodes.push(oscillator);}
 function noise(duration:number,frequency:number,delay=0,level=.4){const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.value=level;source.connect(filter);filter.connect(gain);gain.connect(master);source.start(start+delay);source.stop(start+delay+duration);nodes.push(source);}
 if(events.some(e=>e.fieldBattle)){for(let i=0;i<3;i++){tone(90,45,.16,i*.2,'sine',.8);tone(i===2?294:196,i===2?294:196,.35,i*.16,'triangle',.25);}noise(.2,600,.05,.25);}
 const unique=[...new Map(events.map(e=>[e.kind,e])).values()].slice(0,3);
 for(const event of unique){
  if(event.kind==='caravan'){noise(.1,650,0,.2);tone(110,70,.12,0,'triangle',.15);}
  if(event.kind==='raid'){noise(.15,1800,0,.25);tone(160,70,.15,0,'triangle',.25);}
  if(event.kind==='rally'){tone(262,262,.25,0,'triangle',.24);tone(392,392,.35,.12,'triangle',.24);tone(524,524,.35,.25,'triangle',.17);}
  if(event.kind==='commander'){tone(220,220,.3,0,'triangle',.3);tone(330,330,.4,.15,'triangle',.2);}
  if(event.kind==='trade'){tone(620,620,.12,0,'sine',.2);tone(830,830,.15,.12,'sine',.2);}
  if(event.kind==='move'){const heavy=event.army?.kusatma||event.army?.sahi;for(let i=0;i<3;i++){noise(.07,heavy?450:900,i*.18,.25);tone(heavy?100:150,60,.07,i*.18,'triangle',.2);}}
  if(event.kind==='arrow'){tone(750,260,.09,0,'triangle',.35);noise(.18,6500,.04,.25);tone(180,60,.08,.5,'triangle',.25);}
  if(event.kind==='stone'){tone(150,300,.25,0,'sawtooth',.15);noise(.22,800,0,.2);tone(100,35,.3,.55,'sine',.8);noise(.25,800,.55,.35);}
  if(event.kind==='cannon'){noise(.45,800,0,.7);tone(100,25,.6,0,'sine',1);noise(.25,500,.65,.35);}
  if(event.kind==='melee'){for(let i=0;i<3;i++){tone(500+i*100,190,.09,i*.16,'triangle',.3);tone(820,600,.08,i*.16,'square',.08);noise(.07,2200,i*.16,.15);}}
  if(event.kind==='capture'){tone(294,294,.18,0,'triangle',.25);tone(392,392,.25,.16,'triangle',.25);}
  if(event.kind==='heal'||event.kind==='repair'||event.kind==='recruit'){tone(523,523,.18,0,'sine',.2);tone(659,659,.25,.15,'sine',.15);}
  if(event.kind==='breach'){noise(.5,600,0,.5);tone(95,30,.4,0,'sine',.5);}
 }
 return()=>{for(const node of nodes)try{node.stop();}catch{}master.disconnect();};
}

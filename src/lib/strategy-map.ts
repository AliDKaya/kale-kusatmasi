export const STRATEGY_REGIONS=[
 {id:'A',name:'Batı Kalesi',x:12,y:14,kind:'castle'},
 {id:'B',name:'Batı Ormanı',x:34,y:12,kind:'forest'},
 {id:'C',name:'Batı Taş Ocağı',x:12,y:38,kind:'mine'},
 {id:'D',name:'Merkez Tahıl Köyü',x:50,y:58,kind:'village'},
 {id:'E',name:'Doğu Taş Ocağı',x:88,y:60,kind:'mine'},
 {id:'F',name:'Doğu Ormanı',x:50,y:86,kind:'forest'},
 {id:'G',name:'Doğu Kalesi',x:88,y:88,kind:'castle'},
 {id:'H',name:'Batı Tahıl Köyü',x:34,y:34,kind:'village'},
 {id:'I',name:'Kuzey Taş Ocağı',x:62,y:13,kind:'mine'},
 {id:'J',name:'Güney Ormanı',x:16,y:78,kind:'forest'},
 {id:'K',name:'Batı Gözetleme Köyü',x:48,y:35,kind:'village'},
 {id:'L',name:'Doğu Gözetleme Köyü',x:65,y:58,kind:'village'},
 {id:'M',name:'Doğu Tahıl Köyü',x:69,y:78,kind:'village'},
] as const;
export type StrategyRegionId=typeof STRATEGY_REGIONS[number]['id'];
export const STRATEGY_EDGES:[StrategyRegionId,StrategyRegionId][]=[['A','B'],['A','C'],['A','H'],['B','H'],['C','H'],['H','K'],['B','I'],['C','J'],['I','K'],['J','K'],['K','D'],['K','L'],['D','L'],['I','L'],['J','L'],['L','M'],['M','E'],['M','F'],['M','G'],['E','G'],['F','G'],['E','I'],['F','J']];

// Small clipped Voronoi islands distinguish playable land from decorative terrain.
export function regionContour(id:StrategyRegionId):string{
 const c=STRATEGY_REGIONS.find(r=>r.id===id)!;
 let polygon=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return{x:Math.max(1,Math.min(99,c.x+Math.cos(a)*10)),y:Math.max(1,Math.min(99,c.y+Math.sin(a)*14))};});
 for(const other of STRATEGY_REGIONS){if(other.id===id)continue;const a=2*(other.x-c.x)*2.25,b=2*(other.y-c.y),limit=(other.x*other.x-c.x*c.x)*2.25+other.y*other.y-c.y*c.y;const output:typeof polygon=[];
  for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length];const fp=a*p.x+b*p.y-limit,fq=a*q.x+b*q.y-limit;if(fp<=0)output.push(p);if((fp<=0)!==(fq<=0)){const t=fp/(fp-fq);output.push({x:p.x+t*(q.x-p.x),y:p.y+t*(q.y-p.y)});}}
  polygon=output;
 }
 return polygon.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

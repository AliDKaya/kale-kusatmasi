// Shared artwork centers for roads, city buttons, caravans and combat animation.
export const STRATEGY_REGIONS=[
 {id:'A',name:'Batı Kalesi',x:10.3,y:11.5,kind:'castle'},
 {id:'B',name:'Batı Ormanı',x:34,y:13,kind:'forest'},
 {id:'C',name:'Batı Taş Ocağı',x:12,y:38,kind:'mine'},
 {id:'D',name:'Merkez Tahıl Köyü',x:50.2,y:52,kind:'village'},
 {id:'E',name:'Doğu Taş Ocağı',x:88.6,y:56.1,kind:'mine'},
 {id:'F',name:'Doğu Ormanı',x:47.4,y:81,kind:'forest'},
 {id:'G',name:'Doğu Kalesi',x:91,y:82.4,kind:'castle'},
 {id:'H',name:'Batı Tahıl Köyü',x:34.6,y:30.4,kind:'village'},
 {id:'I',name:'Kuzey Taş Ocağı',x:62.8,y:15.5,kind:'mine'},
 {id:'J',name:'Güney Ormanı',x:11.9,y:70.8,kind:'forest'},
 {id:'K',name:'Batı Gözetleme Köyü',x:52.2,y:33.5,kind:'village'},
 {id:'L',name:'Doğu Gözetleme Köyü',x:68.5,y:52,kind:'village'},
 {id:'M',name:'Doğu Tahıl Köyü',x:67.8,y:70.4,kind:'village'},
] as const;
export type StrategyRegionId=typeof STRATEGY_REGIONS[number]['id'];
export const STRATEGY_EDGES:[StrategyRegionId,StrategyRegionId][]=[['A','B'],['A','C'],['A','H'],['B','H'],['C','H'],['H','K'],['B','I'],['C','J'],['I','K'],['J','K'],['K','D'],['K','L'],['D','L'],['I','L'],['J','L'],['L','M'],['M','E'],['M','F'],['M','G'],['E','G'],['F','G'],['E','I'],['F','J']];

// Artwork-fitted footprints. These are visual hit areas, not movement/economy rules.
const SETTLEMENT_FOOTPRINTS:Record<StrategyRegionId,string>={
 A:'5.6,5.2 8.5,3 11,2.5 14.8,6.5 15.5,11.7 14.1,17.7 10.2,20.4 6.1,17.8 4.7,12.1',
 B:'29.5,11 31.7,8.5 34.3,8.2 37.7,11 38.2,14.2 36,17.2 32,17.3 29.5,14',
 C:'4.1,35.5 7.6,32.1 12.2,30.3 17,32.4 20.6,37.4 19.2,41.7 14.4,44.8 7.5,44.4 3.6,40.8',
 D:'46.3,49 48.3,48.2 49.7,44.6 51.4,48.2 54.9,49.9 56.5,53.3 54.3,56.2 49.8,57.2 45.7,55.1 43.9,52.3',
 E:'82.5,54.2 85.3,50.6 89.4,48.6 93,50.7 95,54.4 94.4,59.4 90.3,63.2 85.6,62.1 81.4,58.5',
 F:'43.2,78.2 45.7,76.2 48.9,76.8 51.1,79.2 52.4,82.2 49.9,85.2 46.3,85 42.4,82.9',
 G:'86.3,76.5 88.7,75 91.4,71.4 94,74 96.7,77.1 97.1,83.2 95.1,88.9 91.8,91.7 87.7,90.3 84.8,85.1',
 H:'30.8,28 33.3,26.6 34.1,24.1 35.4,26.2 36,28 38.8,29.7 40,32.4 38.3,35 34.8,35.3 30.8,33.5 28.6,31.3',
 I:'56.4,12.4 58.4,9.4 62,7.9 65.1,8.8 68.3,11 70.1,16.4 67.5,20.6 62.8,21.4 58.7,19.8 55.7,16.3',
 J:'6.8,68.2 9.3,66 11.4,65.2 13.9,67 16.5,68.3 18.1,71.7 17,74.5 13.7,76.2 9.1,75.8 5.7,72.5',
 K:'47.1,31.9 49.1,30.8 50.4,29.5 52.4,30.5 54.5,29.2 56.2,31.4 57.9,32.8 57.4,35.3 55.1,36.6 51.2,37 48.5,35.8 46.7,34.6',
 L:'63.4,50.3 65.3,49 66.2,47.6 68,48.6 69,47.4 71.2,48.1 72.8,50.2 74,52.5 72.9,55.1 69.5,56.5 65.5,55.9 63,53.6',
 M:'63.8,68.3 66,66.5 67,63.4 68.2,63 68.5,66.4 71.2,67.8 73.2,69.8 73.4,73.8 70.6,75.5 66,74 62,71',
};
export function regionContour(id:StrategyRegionId):string{return SETTLEMENT_FOOTPRINTS[id];}

export type Resources={gold:number;wood:number;stone:number;grain:number};
export type ResourceKind=keyof Resources;
export const RESOURCE_KEYS=['gold','wood','stone','grain'] as const;
export const RESOURCE_NAMES={gold:'altın',wood:'odun',stone:'taş',grain:'tahıl'};
export const zeroResources=():Resources=>({gold:0,wood:0,stone:0,grain:0});
export const resourceText=(r:Resources)=>RESOURCE_KEYS.filter(k=>r[k]).map(k=>`${r[k]} ${RESOURCE_NAMES[k]}`).join(' · ')||'yok';
export const resourceTotal=(r:Resources)=>RESOURCE_KEYS.reduce((n,k)=>n+r[k],0);

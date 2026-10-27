import type {RegionId,Side} from './game';
const CLASSIC_MIRROR:Partial<Record<RegionId,RegionId>>={A:'G',B:'F',C:'E',D:'D',E:'C',F:'B',G:'A'};
const STRATEGY_MIRROR:Record<RegionId,RegionId>={...CLASSIC_MIRROR,A:'G',B:'F',C:'E',D:'D',E:'C',F:'B',G:'A',H:'M',I:'J',J:'I',K:'L',L:'K',M:'H'};
/** Stable tie ordering from the player's own home, not the global alphabet. */
export function perspectiveRegion(id:RegionId,side:Side,advanced=true):RegionId{return side===0?id:(advanced?STRATEGY_MIRROR[id]:CLASSIC_MIRROR[id])??id;}

export const REPLAY_PHASES=[['prepare','Hazırlık ve onarım',900],['fast','Okçu atışları · öncelik 3',1100],['march','Ordular ilerliyor',1300],['melee','Yakın dövüş · öncelik 2',1600],['heavy','Ağır silahlar · öncelik 1',1900],['aftermath','Kayıplar, gedikler ve tedavi',1500]] as const;
export const projectileArrivalMs=(duration:number)=>100+duration*.65;
export function phaseArrivalMs(phase:string){return projectileArrivalMs(REPLAY_PHASES.find(p=>p[0]===phase)?.[2]??1000);}

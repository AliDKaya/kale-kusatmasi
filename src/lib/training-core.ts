/** Server-authoritative training reducer. No database or network; human rankings are never touched. */
import {initialGame,initialClassicGame,beginRound,resolveTurn,validateOrders,finish,finishByLimit,score,type Game,type Order} from './game';
import {planBot,type BotLevel} from './bot-planner';
import type {Action} from './schema';
export type TrainingState={revision:1;mode:'classic'|'strategy';difficulty:BotLevel;game:Game;draft:Order[];operations:string[];version:number};
export function initialTraining(mode:TrainingState['mode'],difficulty:BotLevel,now=Date.now()):TrainingState{return{revision:1,mode,difficulty,game:mode==='classic'?initialClassicGame(now,true):initialGame(now,true,true,true),draft:[],operations:[],version:1};}
function resolve(state:TrainingState,now:number){const bot=planBot(state.game,1,state.difficulty);state.game=resolveTurn(state.game,[state.draft,bot],now);state.draft=[];}
export function advanceTraining(original:TrainingState,now:number):TrainingState{
 const s=structuredClone(original),g=s.game;if(g.phase==='finished')return s;
 if(g.matchDeadline&&now>=new Date(g.matchDeadline).getTime()){s.game=finishByLimit(g,'match-time');s.version++;}
 else if(g.phase==='playing'&&now>=new Date(g.deadline).getTime()){resolve(s,now);s.version++;}return s;
}
export function actTraining(original:TrainingState,action:Action,now:number):TrainingState{
 if(original.operations.includes(action.operationId))return structuredClone(original);
 const s=advanceTraining(original,now),g=s.game;
 if(action.action==='resolve'&&s.version!==original.version){s.operations=[...s.operations,action.operationId].slice(-32);return s;}
 if(g.phase==='finished')throw new Error('Antrenman bitti. Yeni maç başlat.');
 if('turn' in action&&action.turn!==g.turn)throw new Error('Eski tur emri. Güncel durumu yenile.');
 if(action.action==='continue'){s.game=beginRound(g,now);s.draft=[];}
 else if(action.action==='orders'){validateOrders(g,0,action.orders);s.draft=structuredClone(action.orders);if(action.ready)resolve(s,now);}
 else if(action.action==='surrender'||action.action==='close'){finish(g,1,'surrender');s.draft=[];}
 else throw new Error('Tur süresi henüz bitmedi veya sonuç onayı gerekiyor.');
 s.operations=[...s.operations,action.operationId].slice(-32);s.version++;return s;
}
export function trainingResult(s:TrainingState){if(s.game.phase!=='finished')return null;return{mode:s.mode,difficulty:s.difficulty,score:score(s.game,0),winner:s.game.winner,turns:s.game.turn};}

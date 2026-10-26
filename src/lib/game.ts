export const REGIONS = [
  { id: 'A', name: 'Batı Kalesi', x: 10, y: 50, kind: 'castle' },
  { id: 'B', name: 'Kuzey Ormanı', x: 32, y: 24, kind: 'forest' },
  { id: 'C', name: 'Güney Madeni', x: 32, y: 76, kind: 'mine' },
  { id: 'D', name: 'Merkez Köy', x: 50, y: 50, kind: 'village' },
  { id: 'E', name: 'Kuzey Madeni', x: 68, y: 24, kind: 'mine' },
  { id: 'F', name: 'Güney Ormanı', x: 68, y: 76, kind: 'forest' },
  { id: 'G', name: 'Doğu Kalesi', x: 90, y: 50, kind: 'castle' },
] as const;
export type RegionId = typeof REGIONS[number]['id'];
export type Side = 0 | 1;
export type Unit = 'piyade' | 'okcu' | 'kusatma';
export type Army = Record<Unit, number>;
export const UNITS: Record<Unit, { name: string; gold: number; wood: number; power: number; damage: number }> = {
  piyade: { name: 'Piyade', gold: 3, wood: 1, power: 3, damage: 1 },
  okcu: { name: 'Okçu', gold: 4, wood: 2, power: 4, damage: 1 },
  kusatma: { name: 'Kuşatma', gold: 6, wood: 4, power: 2, damage: 6 },
};
export const UNIT_KEYS = Object.keys(UNITS) as Unit[];
export const ECONOMY={startGold:8,startWood:5,baseGold:1,baseWood:1,mineGold:3,forestWood:2} as const;
export const EDGES: [RegionId, RegionId][] = [['A','B'],['A','C'],['B','D'],['C','D'],['D','E'],['D','F'],['E','G'],['F','G'],['B','E'],['C','F']];
export type Order = { type: 'recruit'; at: RegionId; unit: Unit } | { type: 'move'; from: RegionId; to: RegionId; army: Army } | { type: 'defend'; at: RegionId };
export type Territory = { owner: Side | null; army: Army };
export type Game = {
  closed?: boolean;
  turn: number; deadline: string; phase: 'waiting' | 'playing' | 'review' | 'finished'; winner: Side | 'draw' | null;
  players: [{ gold: number; wood: number; hp: number }, { gold: number; wood: number; hp: number }];
  regions: Record<RegionId, Territory>; log: string[];
  lastMoves?: {side:Side;from:RegionId;to:RegionId;army:Army}[];
  lastTimedOut?: Side[];
  finishReason?: 'castle' | 'elimination' | 'turn-limit' | 'match-time' | 'surrender';
  matchDeadline?: string; reviewUntil?: string; transitionReady?: [boolean,boolean];
  history?: {turn:number;lines:string[]}[];
};
export const emptyArmy = (): Army => ({ piyade: 0, okcu: 0, kusatma: 0 });
export const count = (a: Army) => UNIT_KEYS.reduce((n, u) => n + a[u], 0);
export const power = (a: Army) => UNIT_KEYS.reduce((n, u) => n + a[u] * UNITS[u].power, 0);
export const neighbors = (a: RegionId, b: RegionId) => EDGES.some(([x,y]) => (x === a && y === b) || (x === b && y === a));
const add = (a: Army, b: Army) => { for (const u of UNIT_KEYS) a[u] += b[u]; };
const name = (id: RegionId) => REGIONS.find(r => r.id === id)!.name;
const sideName = (s: Side) => s === 0 ? 'Batı' : 'Doğu';

export function initialGame(now = Date.now(), waiting = false): Game {
  const regions = Object.fromEntries(REGIONS.map(r => [r.id, { owner: null, army: emptyArmy() }])) as Game['regions'];
  regions.A = { owner: 0, army: { piyade: 3, okcu: 1, kusatma: 0 } };
  regions.G = { owner: 1, army: { piyade: 3, okcu: 1, kusatma: 0 } };
  return { turn: 1, deadline: new Date(now + 15_000).toISOString(), phase: waiting?'waiting':'playing', winner: null,
    matchDeadline:waiting?undefined:new Date(now+180_000).toISOString(),transitionReady:[false,false],
    players: [{ gold: ECONOMY.startGold, wood: ECONOMY.startWood, hp: 20 }, { gold: ECONOMY.startGold, wood: ECONOMY.startWood, hp: 20 }], regions,history:[],
    log: [waiting?'İki sancak yerini aldı. İkiniz de Maça hazırım deyince süre başlar.':'Sancaklar açıldı. İki emir seç, sonra hazır olduğunu bildir.'] };
}

export function recruitCost(o: Extract<Order, {type:'recruit'}>) {
  return { gold: Math.max(1, UNITS[o.unit].gold - (o.at === 'D' ? 1 : 0)), wood: UNITS[o.unit].wood };
}

export function validateOrders(g: Game, side: Side, orders: Order[]): void {
  if (g.phase !== 'playing') throw new Error('Bu maç tamamlandı.');
  if (orders.length > 2) throw new Error('Bir turda en fazla iki emir verebilirsin.');
  let gold = 0, wood = 0;
  const used: Partial<Record<RegionId, Army>> = {};
  const defense = new Set<RegionId>();
  for (const o of orders) {
    const at = o.type === 'move' ? o.from : o.at;
    if (!g.regions[at] || g.regions[at].owner !== side) throw new Error('Yalnızca kendi bölgenden emir verebilirsin.');
    if (o.type === 'recruit') {
      const cost = recruitCost(o); gold += cost.gold; wood += cost.wood;
    } else if (o.type === 'defend') {
      if (defense.has(at)) throw new Error('Aynı bölgeye iki savunma emri verilemez.');
      defense.add(at);
      if (!count(g.regions[at].army)) throw new Error('Savunma için bölgede bir birlik gerekli.');
    } else {
      if (!neighbors(o.from, o.to)) throw new Error('Yalnızca çizili bağlantıdaki komşu bölgeye gidilebilir.');
      if (!count(o.army)) throw new Error('Taşımak için en az bir birlik seç.');
      used[at] ??= emptyArmy();
      for (const u of UNIT_KEYS) {
        if (!Number.isInteger(o.army[u]) || o.army[u] < 0) throw new Error('Birlik adedi geçersiz.');
        used[at]![u] += o.army[u];
        if (used[at]![u] > g.regions[at].army[u]) throw new Error('Aynı birlik iki kez kullanılamaz; yeni birlikler sonraki tur hareket eder.');
      }
    }
  }
  if (gold > g.players[side].gold || wood > g.players[side].wood) throw new Error('Bu emirler için yeterli altın veya odun yok.');
}

export function battle(a: Army, b: Army, bonusA = 0, bonusB = 0): { armies: [Army, Army]; winner: Side | 'draw'; text: string } {
  const pa = power(a) + (count(a) ? bonusA : 0), pb = power(b) + (count(b) ? bonusB : 0);
  if (pa === pb) return { armies: [emptyArmy(), emptyArmy()], winner: 'draw', text: `${pa}–${pb}: eşit güç, iki ordu da dağıldı.` };
  const winner: Side = pa > pb ? 0 : 1;
  const ratio = Math.min(pa, pb) / Math.max(pa, pb);
  const source = winner === 0 ? a : b;
  const survivors = Object.fromEntries(UNIT_KEYS.map(u => [u, source[u] - Math.floor(source[u] * ratio)])) as Army;
  return { armies: winner === 0 ? [survivors, emptyArmy()] : [emptyArmy(), survivors], winner,
    text: `${pa}–${pb}: ${sideName(winner)} kazandı; ${count(source) - count(survivors)} birlik kaybetti.` };
}

export function finish(g: Game, winner: Game['winner'], reason?:Game['finishReason']): Game { g.phase = 'finished'; g.winner = winner; if(reason)g.finishReason=reason; return g; }
export function beginRound(original:Game,now=Date.now()):Game {
  const g=structuredClone(original);
  if(g.phase!=='waiting'&&g.phase!=='review')throw new Error('Bu aşamada yeni tur başlatılamaz.');
  if(g.phase==='review'&&g.reviewUntil&&now<new Date(g.reviewUntil).getTime())throw new Error('Sonuç animasyonu tamamlanmalı.');
  if(g.phase==='waiting')g.log=['1. tur başladı. İki emrini seçip Emirlerim hazır düğmesine bas.'];
  g.matchDeadline??=new Date(now+180_000).toISOString();g.phase='playing';g.deadline=new Date(now+15_000).toISOString();g.transitionReady=[false,false];g.lastMoves=[];delete g.reviewUntil;return g;
}
export function finishByLimit(original:Game,reason:Game['finishReason']='match-time'):Game {
  const g=structuredClone(original);const diff=g.players[0].hp-g.players[1].hp||REGIONS.filter(r=>g.regions[r.id].owner===0).length-REGIONS.filter(r=>g.regions[r.id].owner===1).length;
  g.log.push(reason==='match-time'?'Toplam 3 dakikalık maç süresi doldu. Kale dayanıklılığı ve bölge sayısıyla sonuç belirlendi.':'10 tur tamamlandı.');
  return finish(g,diff===0?'draw':diff>0?0:1,reason);
}
export function score(g: Game, side: Side): number {
  if (g.phase !== 'finished') throw new Error('Tamamlanmayan maçtan skor üretilemez.');
  return g.players[side].hp * 10 + REGIONS.filter(r => g.regions[r.id].owner === side).length * 20 + (g.winner === side ? 200 : g.winner === 'draw' ? 100 : 0);
}

export function resolveTurn(original: Game, orders: [Order[], Order[]], now = Date.now()): Game {
  const g: Game = structuredClone(original);
  if(g.matchDeadline&&now>=new Date(g.matchDeadline).getTime())return finishByLimit(g);
  const record=(result:Game)=>{result.history=[...(original.history??[]).filter(h=>h.turn!==original.turn),{turn:original.turn,lines:[...result.log]}].slice(-10);return result;};
  for (const side of [0,1] as Side[]) validateOrders(g, side, orders[side]);
  const log: string[] = [`${g.turn}. tur sonuçları`];
  const defenses: Set<RegionId>[] = [new Set(),new Set()];
  const moves: { side: Side; from: RegionId; to: RegionId; army: Army }[] = [];
  const recruits: { side: Side; order: Extract<Order,{type:'recruit'}> }[] = [];
  for (const side of [0,1] as Side[]) {
    if (!orders[side].length) log.push(`${sideName(side)} bu tur pas geçti.`);
    for (const o of orders[side]) {
      if (o.type === 'recruit') {
        const c = recruitCost(o); g.players[side].gold -= c.gold; g.players[side].wood -= c.wood;
        recruits.push({ side, order: o });
      } else if (o.type === 'defend') { defenses[side].add(o.at); log.push(`${sideName(side)}: ${name(o.at)} için savunma (+2).`); }
      else {
        for (const u of UNIT_KEYS) g.regions[o.from].army[u] -= o.army[u];
        moves.push({ side, from: o.from, to: o.to, army: structuredClone(o.army) });
        log.push(`${sideName(side)}: ${name(o.from)} → ${name(o.to)}, ${count(o.army)} birlik.`);
      }
    }
  }
  g.lastMoves = structuredClone(moves);
  // Combine identical routes before resolving crossing armies; order submission order cannot change combat.
  const grouped = new Map<string, typeof moves[number]>();
  for (const m of moves) {
    const key = `${m.side}:${m.from}:${m.to}`;
    const prev = grouped.get(key); if (prev) add(prev.army, m.army); else grouped.set(key, m);
  }
  const routes = [...grouped.values()];
  for (const [from,to] of EDGES) {
    const m0 = routes.find(m => m.from === from && m.to === to);
    const m1 = routes.find(m => m.from === to && m.to === from);
    if (m0 && m1 && m0.side !== m1.side) {
      const west = m0.side === 0 ? m0 : m1, east = m0.side === 1 ? m0 : m1;
      const result = battle(west.army, east.army); west.army = result.armies[0]; east.army = result.armies[1];
      log.push(`${from}–${to} yol savaşı: ${result.text}`);
    }
  }
  for (const r of REGIONS) {
    const t = g.regions[r.id]; const armies: [Army, Army] = [emptyArmy(),emptyArmy()];
    const stayed = t.owner !== null && count(t.army) > 0;
    if (t.owner !== null) add(armies[t.owner], t.army);
    for (const m of routes.filter(m => m.to === r.id)) add(armies[m.side], m.army);
    if (count(armies[0]) && count(armies[1])) {
      const b = battle(armies[0],armies[1], stayed && t.owner === 0 && defenses[0].has(r.id) ? 2 : 0, stayed && t.owner === 1 && defenses[1].has(r.id) ? 2 : 0);
      log.push(`${r.name}: ${b.text}`);
      if (b.winner === 'draw') t.army = emptyArmy();
      else { t.owner = b.winner; t.army = b.armies[b.winner]; }
    } else if (count(armies[0]) || count(armies[1])) {
      const owner: Side = count(armies[0]) ? 0 : 1;
      if (t.owner !== owner) log.push(`${r.name}, ${sideName(owner)} tarafından ele geçirildi.`);
      t.owner = owner; t.army = armies[owner];
    } else t.army = emptyArmy();
  }
  for (const [castle,owner] of [['A',0],['G',1]] as const) {
    const t = g.regions[castle];
    if (t.owner !== null && t.owner !== owner && count(t.army)) {
      const damage = UNIT_KEYS.reduce((n,u) => n + t.army[u] * UNITS[u].damage,0);
      g.players[owner].hp = Math.max(0,g.players[owner].hp - damage);
      log.push(`${name(castle)} ${damage} hasar aldı; dayanıklılık ${g.players[owner].hp}/20.`);
    }
  }
  for (const {side,order:o} of recruits) {
    if (g.regions[o.at].owner === side) { g.regions[o.at].army[o.unit]++; log.push(`${sideName(side)}: ${name(o.at)} bölgesine bir ${UNITS[o.unit].name} katıldı (sonraki tur hazır).`); }
    else { const c = recruitCost(o); g.players[side].gold += c.gold; g.players[side].wood += c.wood; log.push(`${name(o.at)} kaybedildi; ${UNITS[o.unit].name} üretimi iptal, bedeli iade.`); }
  }
  g.log = log;
  const [p0,p1] = g.players;
  const eliminated=([0,1] as Side[]).map(side=>REGIONS.every(r=>g.regions[r.id].owner!==side));
  const lost=[!p0.hp||eliminated[0],!p1.hp||eliminated[1]];
  if(lost[0]||lost[1]) {
    const winner=lost[0]&&lost[1]?'draw':lost[0]?1:0;
    for(const side of [0,1] as Side[]) if(eliminated[side]) log.push(`${sideName(side)} sancağının hiçbir bölgesi ve birliği kalmadı; maç sona erdi.`);
    return record(finish(g,winner,eliminated.some(Boolean)?'elimination':'castle'));
  }
  if (g.turn >= 10) {
    return record(finishByLimit(g,'turn-limit'));
  }
  for (const side of [0,1] as Side[]) {
    let gold:number = ECONOMY.baseGold, wood:number = ECONOMY.baseWood;
    for (const r of REGIONS) if (g.regions[r.id].owner === side) { if (r.kind === 'mine') gold += ECONOMY.mineGold; if (r.kind === 'forest') wood += ECONOMY.forestWood; }
    g.players[side].gold += gold; g.players[side].wood += wood;
    log.push(`${sideName(side)} geliri: ${gold} altın, ${wood} odun.`);
  }
  g.turn++;g.phase='review';g.reviewUntil=new Date(now+2500).toISOString();g.transitionReady=[false,false];g.deadline=new Date(now).toISOString();
  return record(g);
}

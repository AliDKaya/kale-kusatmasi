import 'server-only';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomInt } from 'node:crypto';
import { Game, Order, Side, finish, initialGame, initialClassicGame, resolveTurn, score, rules, validateOrders, beginRound, finishByLimit } from './game';
import type { Action } from './schema';

type DB = ReturnType<typeof postgres>;
let connection: DB | undefined;
export class ApiError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function configured() { return !!(process.env.DATABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
function db() {
  if (!configured()) throw new ApiError('Sunucu kurulumu tamamlanmadı. Supabase bağlantısı ve ortam değişkenleri gerekli.', 503);
  return connection ??= postgres(process.env.DATABASE_URL!, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10, ssl: 'require' });
}
export async function identity(request: Request): Promise<string> {
  if (!configured()) throw new ApiError('Supabase kurulumu henüz tamamlanmadı.', 503);
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ApiError('Anonim oturum gerekli. Sayfayı yeniden aç.', 401);
  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) throw new ApiError('Oturum doğrulanamadı. Yeniden bağlanmayı dene.', 401);
  return data.user.id;
}
type Room = { id: string; code: string; state: Game | null; version: number; mode: 'classic'|'strategy'; finished_at: string | null };
const isClosed = (room: Room) => !!room.finished_at && (!room.state || room.state.phase !== 'finished' || !!room.state.closed);
type Member = { player_id: string; nickname: string; side: Side };
async function transaction<T>(callback: (tx: DB) => Promise<T>): Promise<T> {
  // Only the query callable is used; no connection methods are called inside a transaction.
  return db().begin(async tx => callback(tx as unknown as DB)) as Promise<T>;
}
function roomCode() { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join(''); }
async function guardMutation(tx: DB, user: string) {
  const [p] = await tx`select last_mutation_at from public.players where id = ${user} for update`;
  if (p?.last_mutation_at && Date.now() - new Date(p.last_mutation_at).getTime() < 1000) throw new ApiError('Bir saniye bekleyip tekrar dene.', 429);
  await tx`update public.players set last_mutation_at = now() where id = ${user}`;
}
export async function createRoom(user: string, nickname: string, mode: 'classic'|'strategy'='classic') {
  return transaction(async tx => {
    await tx`insert into public.players (id,nickname) values (${user},${nickname}) on conflict (id) do nothing`;
    await guardMutation(tx,user);
    const [existing] = await tx`select r.code from public.rooms r join public.room_players p on p.room_id=r.id where p.player_id=${user} and r.finished_at is null and r.created_at > now() - interval '1 hour' limit 1`;
    if (existing) throw new ApiError(`Devam eden odan var: ${existing.code}. Koda katılarak dönebilirsin.`,409);
    const [r] = await tx`insert into public.rooms (code,mode) values (${roomCode()},${mode}) returning id,code`;
    await tx`insert into public.room_players (room_id,player_id,side,nickname) values (${r.id},${user},0,${nickname})`;
    return { code: r.code };
  });
}
export async function joinRoom(user: string, code: string, nickname: string) {
  return transaction(async tx => {
    await tx`insert into public.players (id,nickname) values (${user},${nickname}) on conflict (id) do nothing`;
    const [r] = await tx<Room[]>`select id,code,state,version,finished_at,mode from public.rooms where code=${code} for update`;
    if (!r) throw new ApiError('Bu kodla bir oda bulunamadı.',404);
    if (isClosed(r)) throw new ApiError('Bu oda sahibi tarafından kapatıldı. Yeni bir odaya katıl.',410);
    const members = await tx<Member[]>`select player_id,nickname,side from public.room_players where room_id=${r.id} order by side`;
    if (members.some(m => m.player_id === user)) return { code };
    await guardMutation(tx,user);
    if (members.length >= 2 || r.state) throw new ApiError('Bu oda dolu. Tam olarak iki oyuncu katılabilir.',409);
    await tx`insert into public.room_players (room_id,player_id,side,nickname) values (${r.id},${user},1,${nickname})`;
    await tx`update public.rooms set state=${tx.json(r.mode==='strategy'?initialGame(Date.now(),true,true,true):initialClassicGame(Date.now(),true))},version=version+1 where id=${r.id}`;
    return { code };
  });
}
async function saveScores(tx: DB, room: Room, members: Member[]) {
  if (room.state?.phase !== 'finished') return;
  // Stable player lock order also protects the five-second cooldown across different rooms.
  const players = await tx`select id,last_score_at from public.players where id in ${tx(members.map(m => m.player_id))} order by id for update`;
  for (const p of players) if (p.last_score_at && Date.now() - new Date(p.last_score_at).getTime() < 5000) throw new ApiError('Aynı oyuncunun ikinci skoru için beş saniye beklenmeli.',429);
  for (const m of members) {
    await tx`insert into public.scores (room_id,player_id,nickname,score) values (${room.id},${m.player_id},${m.nickname},${score(room.state,m.side)})`;
    await tx`update public.players set last_score_at=now() where id=${m.player_id}`;
  }
}
export async function roomState(user: string, code: string, action?: Action) {
  return transaction(async tx => {
    const [r] = await tx<Room[]>`select id,code,state,version,finished_at,mode from public.rooms where code=${code} for update`;
    if (!r) throw new ApiError('Oda bulunamadı.',404);
    const members = await tx<Member[]>`select player_id,nickname,side from public.room_players where room_id=${r.id} order by side`;
    const me = members.find(m => m.player_id === user);
    if (!me) throw new ApiError('Bu odaya erişim yetkin yok.',403);
    let changed = false;
    let fingerprint = '';
    if(action){
      fingerprint=createHash('sha256').update(JSON.stringify({code,...action})).digest('hex');
      const [operation]=await tx`select fingerprint from public.operations where player_id=${user} and operation_id=${action.operationId}`;
      if(operation){if(operation.fingerprint!==fingerprint)throw new ApiError('İşlem kimliği farklı bir istek için kullanılmış.',409);return snapshot(tx,r,members,me);}
    }
    if (isClosed(r)) {
      if (action && !(action.action === 'close' && me.side === 0)) throw new ApiError('Bu oda kapatıldı.',410);
      return snapshot(tx,r,members,me);
    }
    if (action?.action === 'close') {
      if (me.side !== 0) throw new ApiError('Odayı yalnızca açan oyuncu kapatabilir.',403);
      await guardMutation(tx,user);
      if (r.state && r.state.phase !== 'waiting' && r.state.phase !== 'finished') {
        if (r.state.matchDeadline && Date.now() >= new Date(r.state.matchDeadline).getTime()) r.state = finishByLimit(r.state);
        else { finish(r.state,1,'surrender'); r.state.log = [`${me.nickname} odayı kapatarak teslim oldu.`]; }
        await saveScores(tx,r,members);
      }
      if (r.state) r.state.closed = true;
      await tx`insert into public.operations (player_id,operation_id,room_id,fingerprint) values (${user},${action.operationId},${r.id},${fingerprint})`;
      const [updated] = await tx`update public.rooms set state=${r.state ? tx.json(r.state) : null},finished_at=now(),version=version+1 where id=${r.id} returning version,finished_at`;
      r.version=updated.version;r.finished_at=updated.finished_at;
      return snapshot(tx,r,members,me);
    }
    // Existing matches from the previous release receive a total clock once, without restarting their turn.
    if(r.state?.phase==='playing'&&!r.state.matchDeadline){r.state.matchDeadline=new Date(Date.now()+rules(r.state).matchSeconds*1000).toISOString();changed=true;}
    if(r.state?.phase!=='finished'&&r.state?.matchDeadline&&Date.now()>=new Date(r.state.matchDeadline).getTime()){
      r.state=finishByLimit(r.state);changed=true;
    }
    if(action){
      if(!r.state)throw new ApiError('İkinci oyuncu bekleniyor.',409);
      if(r.state.phase==='finished'&&!changed){if(action.action==='resolve')return snapshot(tx,r,members,me);throw new ApiError('Maç zaten tamamlandı.',409);}
      if(r.state.phase!=='finished'){
        if(action.turn!==r.state.turn){if(action.action==='resolve')return snapshot(tx,r,members,me);throw new ApiError('Tur değişti. Güncel durumu alıp yeniden dene.',409);}
        if(action.action==='continue'){
          if(r.state.phase!=='waiting'&&r.state.phase!=='review')throw new ApiError('Tur zaten başladı.',409);
          if(r.state.phase==='review'&&r.state.reviewUntil&&Date.now()<new Date(r.state.reviewUntil).getTime())throw new ApiError('Sonuç animasyonunu incelemek için kısa bir an bekle.',409);
          await guardMutation(tx,user);r.state.transitionReady??=[false,false];r.state.transitionReady[me.side]=true;changed=true;
          if(r.state.transitionReady.every(Boolean))r.state=beginRound(r.state);
        }else if(action.action==='orders'){
          if(r.state.phase!=='playing')throw new ApiError('Önce iki oyuncu da tura hazır olmalı.',409);
          if(Date.now()>=new Date(r.state.deadline).getTime())throw new ApiError('Tur süresi doldu; sonuç bekleniyor.',409);
          await guardMutation(tx,user);
          const [old]=await tx`select ready from public.orders where room_id=${r.id} and player_id=${user} and turn=${r.state.turn}`;
          if(old?.ready)throw new ApiError('Emirlerin kilitlendi. Rakibin hazır olması bekleniyor.',409);
          try{validateOrders(r.state,me.side,action.orders);}catch(e){throw new ApiError(e instanceof Error?e.message:'Geçersiz emir.');}
          await tx`insert into public.orders (room_id,player_id,turn,payload,ready) values (${r.id},${user},${r.state.turn},${tx.json(action.orders)},${action.ready}) on conflict (room_id,player_id,turn) do update set payload=excluded.payload,ready=excluded.ready`;
          changed=true;
        }else if(action.action==='surrender'){
          if(r.state.phase==='waiting')throw new ApiError('Maç henüz başlamadı.',409);
          await guardMutation(tx,user);finish(r.state,me.side===0?1:0,'surrender');r.state.log=[`${me.nickname} teslim oldu.`];changed=true;
        }
        await tx`insert into public.operations (player_id,operation_id,room_id,fingerprint) values (${user},${action.operationId},${r.id},${fingerprint})`;
        if(r.state.phase==='playing'){
          const accepted=await tx`select player_id,payload,ready from public.orders where room_id=${r.id} and turn=${r.state.turn}`;
          const bothReady=members.length===2&&members.every(m=>accepted.some(o=>o.player_id===m.player_id&&o.ready));
          if(bothReady||Date.now()>=new Date(r.state.deadline).getTime()){
            const orders=members.map(m=>accepted.find(o=>o.player_id===m.player_id)?.payload??[]) as [Order[],Order[]];
            r.state=resolveTurn(r.state,orders);r.state.lastTimedOut=members.filter(m=>!accepted.some(o=>o.player_id===m.player_id&&o.ready)).map(m=>m.side);changed=true;
          }
        }
      }
    }
    if(changed&&r.state){
      if(r.state.phase==='finished')await saveScores(tx,r,members);
      const [updated]=await tx`update public.rooms set state=${tx.json(r.state)},version=version+1,finished_at=${r.state.phase==='finished'?new Date():null} where id=${r.id} returning version`;
      r.version=updated.version;
    }
    return snapshot(tx,r,members,me);
  });
}
async function snapshot(tx: DB, room: Room, members: Member[], me: Member) {
  const orders = room.state ? await tx`select player_id,payload,ready from public.orders where room_id=${room.id} and turn=${room.state.turn}` : [];
  return { id: room.id, code: room.code, version: room.version, closed: isClosed(room), mode:room.mode, game: isClosed(room) ? null : room.state, side: me.side, serverTime: new Date().toISOString(),
    players: members.map(m => ({ id: m.player_id, nickname: m.nickname, side: m.side, ready: room.state?.phase==='waiting'||room.state?.phase==='review'?!!room.state.transitionReady?.[m.side]:!!orders.find(o => o.player_id === m.player_id)?.ready })),
    ownOrders: room.state?.phase==='playing'?(orders.find(o => o.player_id === me.player_id)?.payload ?? []):[] };
}
export async function leaderboard(today: boolean, user?: string, mode:'all'|'classic'|'strategy'='all') {
  const rows = await db()`with ranked as (
    select s.player_id,s.nickname,s.score,s.created_at,s.id,row_number() over (order by s.score desc,s.created_at asc,s.id asc)::int as position
    from public.scores s join public.rooms r on r.id=s.room_id where (${mode}='all' or r.mode=${mode}) and (not ${today} or s.created_at >= date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul')
  ) select * from ranked where position <= 10 or player_id=${user ?? null}::uuid order by position`;
  const mapped = (r: typeof rows[number]) => ({ sira: r.position, ad: r.nickname, skor: r.score, zaman: new Date(r.created_at).toISOString().replace('.000Z','Z') });
  return { skorlar: rows.filter(r => r.position <= 10).map(mapped), own: rows.filter(r => r.player_id === user).map(mapped) };
}

import { z } from 'zod';
const region = z.enum(['A','B','C','D','E','F','G','H','I','J','K','L','M']);
const army = z.object({ piyade: z.number().int().min(0).max(100), okcu: z.number().int().min(0).max(100), kusatma: z.number().int().min(0).max(100), sahi:z.number().int().min(0).max(100).optional() }).strict();
export const nicknameSchema = z.string().trim().min(2, 'Takma ad en az 2 karakter olmalı.').max(20, 'Takma ad en fazla 20 karakter olabilir.').regex(/^[\p{L}\p{N} _-]+$/u, 'Takma adda yalnızca harf, sayı, boşluk, tire kullan.');
export const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/, 'Oda kodu 6 harf veya rakam olmalı.');
export const orderSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('recruit'), at: region, unit: z.enum(['piyade','okcu','kusatma','sahi']), quantity:z.number().int().min(1).max(4).optional() }).strict(),
  z.object({ type: z.literal('move'), from: region, to: region, army }).strict(),
  z.object({ type: z.literal('defend'), at: region }).strict(),
  z.object({ type: z.literal('fire'), from:region, to:region, unit:z.enum(['okcu','kusatma']) }).strict(),
  z.object({ type: z.literal('siege'), from:region, to:region }).strict(),
  z.object({ type: z.literal('cannon'), from:region, to:region }).strict(),
  z.object({ type: z.literal('cancel'), at:region }).strict(),
  z.object({ type: z.literal('upgrade'), at:region }).strict(),
  z.object({ type: z.literal('repair'), at:region }).strict(),
  z.object({ type: z.literal('rally'), at:region }).strict(),
  z.object({ type:z.literal('raid'),from:region,caravanId:z.string().regex(/^[01]:[1-9]\d{0,3}$/) }).strict(),
  z.object({ type:z.literal('trade'),from:region,caravanId:z.string().regex(/^[01]:[1-9]\d{0,3}$/),give:z.enum(['gold','wood','stone','grain']),take:z.enum(['gold','wood','stone','grain']),amount:z.number().int().min(1).max(2) }).strict(),
]);
export const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('close'), operationId: z.uuid() }).strict(),
  z.object({ action: z.literal('continue'), operationId: z.uuid(), turn: z.number().int().min(1).max(16) }).strict(),
  z.object({ action: z.literal('orders'), operationId: z.uuid(), turn: z.number().int().min(1).max(16), orders: z.array(orderSchema).max(4), ready: z.boolean() }).strict(),
  z.object({ action: z.literal('resolve'), operationId: z.uuid(), turn: z.number().int().min(1).max(16) }).strict(),
  z.object({ action: z.literal('surrender'), operationId: z.uuid(), turn: z.number().int().min(1).max(16) }).strict(),
]);
export type Action = z.infer<typeof actionSchema>;

import { z } from 'zod';
const region = z.enum(['A','B','C','D','E','F','G']);
const army = z.object({ piyade: z.number().int().min(0).max(100), okcu: z.number().int().min(0).max(100), kusatma: z.number().int().min(0).max(100) }).strict();
export const nicknameSchema = z.string().trim().min(2, 'Takma ad en az 2 karakter olmalı.').max(20, 'Takma ad en fazla 20 karakter olabilir.').regex(/^[\p{L}\p{N} _-]+$/u, 'Takma adda yalnızca harf, sayı, boşluk, tire kullan.');
export const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/, 'Oda kodu 6 harf veya rakam olmalı.');
export const orderSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('recruit'), at: region, unit: z.enum(['piyade','okcu','kusatma']) }).strict(),
  z.object({ type: z.literal('move'), from: region, to: region, army }).strict(),
  z.object({ type: z.literal('defend'), at: region }).strict(),
]);
export const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('close'), operationId: z.uuid() }).strict(),
  z.object({ action: z.literal('continue'), operationId: z.uuid(), turn: z.number().int().min(1).max(10) }).strict(),
  z.object({ action: z.literal('orders'), operationId: z.uuid(), turn: z.number().int().min(1).max(10), orders: z.array(orderSchema).max(2), ready: z.boolean() }).strict(),
  z.object({ action: z.literal('resolve'), operationId: z.uuid(), turn: z.number().int().min(1).max(10) }).strict(),
  z.object({ action: z.literal('surrender'), operationId: z.uuid(), turn: z.number().int().min(1).max(10) }).strict(),
]);
export type Action = z.infer<typeof actionSchema>;

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // Nota: Ya incluye 'FONDO' de nuestras actualizaciones anteriores
  type: text('type', { enum: ['EFECTIVO', 'INVERSION', 'DEUDA', 'FONDO'] }).notNull(),
  balance: real('balance').notNull().default(0),
  creditLimit: real('credit_limit'),
});

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  //accountId: text('account_id').references(() => accounts.id).notNull(),
  ticker: text('ticker').notNull(),
  category: text('category', { enum: ['CRIPTO', 'GBM'] }).notNull(),
  totalTitles: real('total_titles').notNull().default(0),
  averageCost: real('average_cost').notNull().default(0),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['DEPOSITO', 'RETIRO', 'TRANSFERENCIA', 'COMPRA', 'VENTA'] }).notNull(),
  originAccountId: text('origin_account_id'),
  destinationAccountId: text('destination_account_id'),
  assetId: text('asset_id'),
  quantity: real('quantity').notNull(),
  executionPrice: real('execution_price').notNull().default(1),
  commission: real('commission').notNull().default(0),
  timestamp: integer('timestamp').notNull(),
  
  // --- NUEVAS COLUMNAS: MOTOR DE AUDITORÍA E IA ---
  // El texto libre que tú escribes (ej. "tacos y refresco")
  concept: text('concept'), 
  
  // La etiqueta estandarizada (ej. "Alimentación")
  category: text('category'),
});
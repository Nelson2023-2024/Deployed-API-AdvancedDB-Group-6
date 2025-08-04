// drizzle/schema/salesData.js or salesData.ts (for TypeScript)

import { pgTable, varchar, integer, timestamp, numeric } from 'drizzle-orm/pg-core';

export const salesData = pgTable('sales_data', {
    invoiceNo: varchar('invoice_no', { length: 20 }).notNull(),
    stockCode: varchar('stock_code', { length: 20 }).notNull(),
    description: varchar('description', { length: 255 }),
    quantity: integer('quantity').notNull(),
    invoiceDate: timestamp('invoice_date', { withTimezone: false }).notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    customerId: integer('customer_id'), // Nullable by default
    country: varchar('country', { length: 100 }).notNull(),
});

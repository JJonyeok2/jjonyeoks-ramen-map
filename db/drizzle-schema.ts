import { pgTable, uuid, varchar, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum('status', ['PENDING', 'APPROVED', 'REJECTED']);

export const ramenShops = pgTable('ramen_shops', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 255 }),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  menu_type: varchar('menu_type', { length: 100 }),
  broth_style: varchar('broth_style', { length: 100 }),
  price: integer('price'),
  status: statusEnum('status').default('PENDING'),
  created_at: timestamp('created_at').defaultNow(),
});

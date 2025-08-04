    // import { drizzle } from 'drizzle-orm/node-postgres';

    import {neon } from "@neondatabase/serverless"
    import { drizzle } from 'drizzle-orm/neon-http';
    // import { Client } from 'pg';
    import * as schema from '../DB/schema.js'; // Assuming your schema is in schema.ts
    import 'dotenv/config';

    // const client = new Client({
    //     connectionString: process.env.DATABASE_URL,
    // });
    // client.connect()

    const sql = neon(process.env.DATABASE_URL)

    // export const db = drizzle(client, { schema, logger: true });
    export const db = drizzle(sql, { schema, logger: true });
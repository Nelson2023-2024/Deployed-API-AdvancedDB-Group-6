    import { defineConfig } from "drizzle-kit";
    export default defineConfig({
      schema: "./DB/schema.js", // Path to your schema file(s)
      out: "./DB/migrations", // Directory for migrations
      dialect: "postgresql",
      dbCredentials: {
        url: process.env.DATABASE_URL,
      },
    });
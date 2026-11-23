import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL environment variable");

const g = globalThis;

export const sql =
  g.__sahalakSql ||
  postgres(url, {
    ssl: "require",
    prepare: false,
    max: 5,
    transform: postgres.camel,
  });

if (process.env.NODE_ENV !== "production") g.__sahalakSql = sql;
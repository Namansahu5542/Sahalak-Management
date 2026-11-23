import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

const [info] = await sql`select now() as now, current_database() as db`;
console.log("Connected:", info);

const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name`;
console.log("Tables:", tables.map((t) => t.table_name));

await sql.end();
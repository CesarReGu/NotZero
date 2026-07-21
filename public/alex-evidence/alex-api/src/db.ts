import { Pool } from "pg";
import { config } from "./config";

// One shared connection pool for the whole API, sized for the class demo.
// The connection string comes from .env (see README, "Run locally").
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

// The pg docs recommend handling idle-client errors; without this the
// process can crash silently when PostgreSQL restarts on the faculty server.
pool.on("error", (error) => {
  console.error("Unexpected error on idle database client", error);
  process.exit(1);
});

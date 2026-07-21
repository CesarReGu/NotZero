const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // The README explains how to create .env by hand before starting.
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

export const config = {
  port,
  databaseUrl,
};

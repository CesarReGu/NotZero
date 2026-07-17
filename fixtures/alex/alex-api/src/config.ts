export type RuntimeConfig = {
  databaseUrl: string;
  port: number;
};

export function readConfig(environment: Record<string, string | undefined>): RuntimeConfig {
  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  return {
    databaseUrl,
    port: Number(environment.PORT ?? "3000"),
  };
}

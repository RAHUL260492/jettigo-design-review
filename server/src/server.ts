import { buildApp } from "./app.js";
import { openDatabase } from "./db/client.js";
import { seedDemo, seedReference } from "./db/seed.js";
import { loadConfig } from "./env.js";

const cfg = loadConfig();
const database = await openDatabase(cfg);
await seedReference(database.db);
if (cfg.seedDemo) await seedDemo(database.db);

const app = await buildApp(cfg, database);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await database.close();
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ port: cfg.port, host: cfg.host });

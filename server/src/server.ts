import { buildApp } from "./app.js";
import { openDatabase } from "./db/client.js";
import { seedDemo, seedReference } from "./db/seed.js";
import { loadConfig } from "./env.js";
import { shutdownOnce } from "./lib/shutdown.js";

const cfg = loadConfig();
const database = await openDatabase(cfg);
try {
  await seedReference(database.db);
  if (cfg.seedDemo) await seedDemo(database.db);
  const app = await buildApp(cfg, database);
  const close = shutdownOnce(app, database);
  let stopping = false;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    app.log.info({ signal }, "shutting down");
    const deadline = setTimeout(() => process.exit(1), 15_000);
    deadline.unref();
    void close().then(() => { clearTimeout(deadline); process.exitCode = 0; }, () => {
      app.log.error("Shutdown failed");
      process.exitCode = 1;
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  try { await app.listen({ port: cfg.port, host: cfg.host }); } catch {
    await close();
    console.error("Jettigo listener failed to start");
    process.exitCode = 1;
  }
} catch {
  await database.close();
  console.error("Jettigo startup failed; verify database connectivity and configuration");
  process.exitCode = 1;
}

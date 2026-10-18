import { loadConfig } from "../env.js";
import { openDatabase } from "./client.js";
import { seedDemo, seedReference } from "./seed.js";

const cfg = loadConfig();
const database = await openDatabase(cfg);
await seedReference(database.db);
const seeded = await seedDemo(database.db);
console.log(seeded ? "Demo data loaded" : "Demo data already present");
await database.close();

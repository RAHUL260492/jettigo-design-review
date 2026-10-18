/** Close HTTP before the database; repeated signals share one cleanup attempt. */
export function shutdownOnce(app: { close(): Promise<unknown> }, database: { close(): Promise<void> }) {
  let closing: Promise<void> | undefined;
  return () => closing ??= (async () => {
    try { await app.close(); } finally { await database.close(); }
  })();
}

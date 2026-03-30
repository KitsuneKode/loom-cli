import { run } from "../cli.ts";

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`loom: ${message}\n`);
  process.exit(1);
});

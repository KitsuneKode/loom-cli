import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import type { TrackMode } from "./types.ts";

export async function promptTrackMode(target: string): Promise<TrackMode | "skip"> {
  const rl = createInterface({ input, output });

  try {
    output.write(`Select tracking mode for ${target}\n`);
    output.write("  1. plain\n");
    output.write("  2. template\n");
    output.write("  3. encrypt\n");
    output.write("  4. exact\n");
    output.write("  5. follow\n");
    output.write("  6. skip\n");

    const answer = (await rl.question("Choice [1-6]: ")).trim();
    switch (answer) {
      case "1":
        return "plain";
      case "2":
        return "template";
      case "3":
        return "encrypt";
      case "4":
        return "exact";
      case "5":
        return "follow";
      case "6":
      case "":
        return "skip";
      default:
        throw new Error(`Unknown choice: ${answer}`);
    }
  } finally {
    rl.close();
  }
}

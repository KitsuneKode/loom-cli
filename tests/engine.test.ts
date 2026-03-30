import { expect, test } from "bun:test";

import { parseStatusLine } from "../src/engine/chezmoi.ts";

test("parseStatusLine parses managed drift output", () => {
  expect(parseStatusLine("MM /tmp/example")).toEqual({
    actualDiff: "M",
    targetDiff: "M",
    path: "/tmp/example",
  });
});

test("parseStatusLine ignores invalid lines", () => {
  expect(parseStatusLine("")).toBeNull();
});

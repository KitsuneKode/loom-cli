export function consumeBooleanFlag(args: string[], flag: string): boolean {
  const index = args.indexOf(flag);
  if (index === -1) {
    return false;
  }

  args.splice(index, 1);
  return true;
}

export function consumeStringFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }

  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`${flag} requires a value.`);
  }

  args.splice(index, 2);
  return value;
}

export function assertNoUnexpectedFlags(args: string[]): void {
  const unexpected = args.filter((arg) => arg.startsWith("-"));
  if (unexpected.length > 0) {
    throw new Error(`Unknown flag(s): ${unexpected.join(", ")}`);
  }
}

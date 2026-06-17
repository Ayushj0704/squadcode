import { randomInt } from "node:crypto";

export function randomToken(prefix: string, length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return `${prefix}-${out}`;
}

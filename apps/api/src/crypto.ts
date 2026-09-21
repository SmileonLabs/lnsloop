import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
export const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export function vault(encodedKey: string) {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32)
    throw new Error("DATA_KEY must be a base64 encoded 32-byte key");
  return {
    seal(value: unknown) {
      const iv = randomBytes(12),
        c = createCipheriv("aes-256-gcm", key, iv);
      const data = Buffer.concat([
        c.update(JSON.stringify(value), "utf8"),
        c.final(),
      ]);
      return [iv, c.getAuthTag(), data]
        .map((b) => b.toString("base64"))
        .join(".");
    },
    open(value: string) {
      const [iv, tag, data] = value
        .split(".")
        .map((x) => Buffer.from(x, "base64"));
      const c = createDecipheriv("aes-256-gcm", key, iv);
      c.setAuthTag(tag);
      return JSON.parse(
        Buffer.concat([c.update(data), c.final()]).toString("utf8"),
      );
    },
  };
}

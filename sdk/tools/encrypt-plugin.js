#!/usr/bin/env node
// turns a plain .solixplugin (zip) into an encrypted "SLXE" pack the client still loads:
//   "SLXE" | 0x01 | iv[12] | AES-256-GCM(zip, aad = 5-byte header) | tag[16]
// usage: node tools/encrypt-plugin.js <in.solixplugin> [out.solixplugin]   (out defaults to in, overwritten)
//        node tools/encrypt-plugin.js --decrypt <in> <out>                  (to inspect a pack)
// Honest note: obfuscation only. The key ships inside the client (PackCrypto.java), so this stops casual copying,
// not a determined reverse engineer.
const fs = require("fs"), crypto = require("crypto");
const P = Buffer.from("ec6f912f9f2d1a7b61ba281b5d8cac668b056378eee941e2ea5f6a95ae4223d5", "hex"), M = Buffer.from("fd9daa3822355ddeabb60939787d64d5b036ace30562e386d1b59c860ec5258a", "hex");
const KEY = crypto.createHash("sha256").update(Buffer.from(P.map((b, i) => b ^ M[i]))).update("solix/slxe/1").digest();
const HDR = Buffer.from([0x53, 0x4c, 0x58, 0x45, 0x01]);
const isEncrypted = d => d.length > 33 && d.subarray(0, 4).toString("latin1") === "SLXE";
// the IV is derived from the zip itself, so rebuilding an unchanged pack gives identical bytes (no git churn);
// the only thing that leaks is "these two packs are the same"
function encrypt(zip) {
  const iv = crypto.createHash("sha256").update(zip).digest().subarray(0, 12), c = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  c.setAAD(HDR);
  const ct = Buffer.concat([c.update(zip), c.final()]);
  return Buffer.concat([HDR, iv, ct, c.getAuthTag()]);
}
function decrypt(d) {
  if (!isEncrypted(d) || d[4] !== 1) throw new Error("not an SLXE v1 pack");
  const c = crypto.createDecipheriv("aes-256-gcm", KEY, d.subarray(5, 17));
  c.setAAD(HDR); c.setAuthTag(d.subarray(d.length - 16));
  return Buffer.concat([c.update(d.subarray(17, d.length - 16)), c.final()]);
}
module.exports = { encrypt, decrypt, isEncrypted };
if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === "--decrypt") { fs.writeFileSync(a[2], decrypt(fs.readFileSync(a[1]))); process.exit(0); }
  if (!a[0]) { console.error("usage: encrypt-plugin.js <in.solixplugin> [out]"); process.exit(2); }
  const src = fs.readFileSync(a[0]);
  if (isEncrypted(src)) { console.log("already encrypted: " + a[0]); process.exit(0); }
  if (src[0] !== 0x50 || src[1] !== 0x4b) { console.error("not a zip pack: " + a[0]); process.exit(1); }
  const out = encrypt(src);
  if (!decrypt(out).equals(src)) throw new Error("round trip failed");
  fs.writeFileSync(a[1] || a[0], out);
  console.log("encrypted " + (a[1] || a[0]) + " (" + out.length + " bytes)");
}

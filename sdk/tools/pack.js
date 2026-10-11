#!/usr/bin/env node
// Packs a plugin folder into a .solixplugin (zip, no deps; stored entries).
//   node tools/pack.js <plugin-dir> [out.solixplugin] [--encrypt]
// --encrypt runs encrypt-plugin.js on the result (obfuscation only, see that file).
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const args = process.argv.slice(2), enc = args.includes("--encrypt"), pos = args.filter(a => a !== "--encrypt");
const dir = pos[0]; if (!dir) { console.error("usage: node tools/pack.js <plugin-dir> [out] [--encrypt]"); process.exit(1); }
const man = JSON.parse(fs.readFileSync(path.join(dir, "plugin.json"), "utf8"));
if (!/^[a-z0-9._-]{1,40}$/.test(man.id || "")) throw new Error("plugin.json id must be a-z 0-9 . _ - (max 40)");
const out = pos[1] || man.id + ".solixplugin";
const KEEP = /\.(js|json|png|jpe?g|webp|txt|md)$/i, files = [];
(function walk(d, rel) { for (const n of fs.readdirSync(d).sort()) { const p = path.join(d, n), r = rel ? rel + "/" + n : n;
  if (fs.statSync(p).isDirectory()) walk(p, r); else if (KEEP.test(n)) files.push([r, fs.readFileSync(p)]); } })(dir, "");
if (files.length > 64) throw new Error("max 64 files");
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const local = [], central = []; let off = 0;
for (const [name, data] of files) {
  const nb = Buffer.from(name), def = zlib.deflateRawSync(data), useDef = def.length < data.length, body = useDef ? def : data, c = crc(data);
  const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(useDef ? 8 : 0, 8); h.writeUInt16LE(0x21, 12);
  h.writeUInt32LE(c, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nb.length, 26);
  local.push(h, nb, body);
  const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(useDef ? 8 : 0, 10); ch.writeUInt16LE(0x21, 14);
  ch.writeUInt32LE(c, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
  central.push(ch, nb); off += 30 + nb.length + body.length;
}
const cd = Buffer.concat(central), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
const zip = Buffer.concat([...local, cd, end]);
if (zip.length > 4 * 1024 * 1024) throw new Error("pack over 4 MB");
fs.writeFileSync(out, zip);
if (enc) require("child_process").execFileSync(process.execPath, [path.join(__dirname, "encrypt-plugin.js"), out], { stdio: "inherit" });
console.log("packed " + files.length + " files -> " + out + (enc ? " (encrypted)" : ""));

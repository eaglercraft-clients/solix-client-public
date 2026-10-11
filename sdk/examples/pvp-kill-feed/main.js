// Kill Feed: built only from chat death messages. Entries fade out after a while; lines involving you are highlighted.

var maxRows = solix.settings.slider("rows", "Entries", 2, 8, 1, 3);
var life = solix.settings.slider("life", "Show each entry for (seconds)", 5, 30, 1, 10);
var mobs = solix.settings.bool("mobs", "Include deaths to mobs", false);
var bg = solix.settings.bool("bg", "Background", true);

// ---- chat death-message parser: an optional custom format first, then vanilla English and "A killed B" ----
// Custom format (API 1.1 text setting): write the message with {killer} and {victim} where the names go and * for
// anything else, e.g. "{victim} was eliminated by {killer}" or "* {killer} > {victim}". Separate several with " || ".
var NAME = "([A-Za-z0-9_]{2,16})";
var KILL_RES = [
  { re: new RegExp("^" + NAME + " (?:was|got) ([a-z][a-z ]{1,40}?) by " + NAME + "(?:\\b|$)"), v: 1, k: 3 },
  { re: new RegExp("^" + NAME + " [a-z][a-z ]{1,50}? (?:whilst|while) (?:trying to escape|fighting) " + NAME + "(?:\\b|$)"), v: 1, k: 2 },
  { re: new RegExp("^" + NAME + " (?:has )?(?:killed|eliminated|slew) " + NAME + "(?:\\b|$)"), v: 2, k: 1 }
];
var NOT_NAMES = /^(a|an|the|magic|lightning|fire|lava|anvil|cactus|void)$/i;
var customFmt = (solix.apiMinor || 0) >= 1 && solix.settings.text
  ? solix.settings.text("killFormat", "Custom kill message format", "", "Optional. Use {killer}, {victim} and * e.g. {victim} was eliminated by {killer}")
  : null;
var customSrc = null, customRes = [];
function compileCustom() {
  var src = customFmt ? String(customFmt.get() || "") : "";
  if (src === customSrc) return;
  customSrc = src; customRes = [];
  var fmts = src.split("||");
  for (var i = 0; i < fmts.length; i++) {
    var f = fmts[i].trim();
    if (f.indexOf("{killer}") < 0 || f.indexOf("{victim}") < 0) continue;
    var order = [], body = "";
    var parts = f.split(/(\{killer\}|\{victim\}|\*)/);
    for (var j = 0; j < parts.length; j++) {
      var s = parts[j];
      if (s === "{killer}" || s === "{victim}") { order.push(s); body += NAME; }
      else if (s === "*") body += ".*?";
      else body += s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    }
    try { customRes.push({ re: new RegExp(body, "i"), k: order.indexOf("{killer}") + 1, v: order.indexOf("{victim}") + 1 }); } catch (e) { solix.log("bad kill format: " + f); }
  }
}
function parseKill(line) {
  var raw = String(line).replace(/\u00a7./g, "").trim(), i, m;
  compileCustom();
  for (i = 0; i < customRes.length; i++) {
    m = customRes[i].re.exec(raw);
    if (m) return { victim: m[customRes[i].v], killer: m[customRes[i].k] };
  }
  var clean = raw.replace(/^[^A-Za-z0-9_]+/, "");
  for (i = 0; i < KILL_RES.length; i++) {
    m = KILL_RES[i].re.exec(clean);
    if (m && !NOT_NAMES.test(m[KILL_RES[i].k])) return { victim: m[KILL_RES[i].v], killer: m[KILL_RES[i].k] };
  }
  return null;
}
// ---- end parser ----

// ---- solix hud kit: shared layout and style (the same copy is in every pvp pack) ----
// Panels sit inside a 4-unit transparent gutter, so elements never touch the screen edge or each other.
// Text y is the vertical centre of the capitals (the client draws HUD text centred on y).
// Every element keeps a fixed footprint, so the stacks in each column stay lined up; when there is nothing to
// show it draws nothing (or a one-line pill) instead of an empty box.
var KIT = { gut: 4, pad: 8, head: 16, row: 12, pill: 24, r: 4 };
function kA(c, a) {
  a = Math.max(0, Math.min(1, a));
  if (solix.util && solix.util.withAlpha) return solix.util.withAlpha(c, a);
  var s = typeof c === "number" ? ("00000" + (c & 0xFFFFFF).toString(16)).slice(-6) : String(c || "#FFFFFF").replace("#", "").slice(-6);
  var A = Math.round(a * 255).toString(16);
  return "#" + (A.length < 2 ? "0" + A : A) + s;
}
// secondary text: halfway between the theme's muted and main text colours, so labels stay readable on bright sky
var kSubC = null;
function kSub(t) {
  if (kSubC && kSubC.m === t.textMuted && kSubC.t === t.text) return kSubC.c;
  function rgb(c) { var s = typeof c === "number" ? ("00000" + (c & 0xFFFFFF).toString(16)).slice(-6) : String(c || "#FFFFFF").replace("#", "").slice(-6); return [0, 2, 4].map(function (i) { return parseInt(s.substr(i, 2), 16) || 0; }); }
  var a = rgb(t.textMuted), b = rgb(t.text), out = "#";
  for (var i = 0; i < 3; i++) { var v = Math.round(a[i] * 0.45 + b[i] * 0.55).toString(16); out += v.length < 2 ? "0" + v : v; }
  kSubC = { m: t.textMuted, t: t.text, c: out };
  return out;
}
function kBox(w, h) { return { width: w + 2 * KIT.gut, height: h + 2 * KIT.gut }; }
function kCardH(rows) { return 2 * KIT.pad + KIT.head + rows * KIT.row; }
function kPanel(g, x, y, w, h, accent, alpha) {
  var o = { radius: KIT.r, accent: !!accent };
  if (alpha !== undefined && alpha < 1) o.alpha = alpha;
  g.panel(KIT.gut + x, KIT.gut + y, w, h, o);
}
function kRect(g, x, y, w, h, c) { g.rect(KIT.gut + x, KIT.gut + y, w, h, c); }
function kBar(g, x, cy, w, f, col) {
  g.roundRect(KIT.gut + x, KIT.gut + cy - 2, w, 4, 2, "#66000000");
  if (f > 0) g.roundRect(KIT.gut + x, KIT.gut + cy - 2, Math.max(3, w * Math.min(1, f)), 4, 2, col);
}
function kText(g, s, x, cy, size, font, col, align) { g.text(s, KIT.gut + x, KIT.gut + cy, { size: size, font: font || "medium", color: col, align: align || "left" }); }
function kIcon(g, name, x, cy, size, col) { g.icon(name, KIT.gut + x, KIT.gut + cy - size / 2, size, col); }
function kItem(g, slot, x, cy) { g.item(slot, KIT.gut + x, KIT.gut + cy - 7, 14); }
function kW(g, s, size, font) { return g.textWidth(String(s), size, font || "medium"); }
function kFit(g, s, maxW, size, font) {
  s = String(s);
  if (kW(g, s, size, font) <= maxW) return s;
  while (s.length > 1 && kW(g, s + "...", size, font) > maxW) s = s.slice(0, -1);
  return s + "...";
}
// card header: icon, small-caps title in the accent colour, optional muted value on the right, faint divider
function kHeader(g, x, y, w, icon, title, value, t) {
  var cy = y + KIT.pad + 5;
  if (icon) kIcon(g, icon, x + KIT.pad, cy, 10, t.accent);
  kText(g, title, x + KIT.pad + (icon ? 14 : 0), cy, 8, "semibold", t.accent);
  if (value !== undefined && value !== null && value !== "") kText(g, value, x + w - KIT.pad, cy, 8, "medium", kSub(t), "right");
  kRect(g, x + KIT.pad, y + KIT.pad + 12, w - 2 * KIT.pad, 1, kA(t.text, 0.08));
  return y + KIT.pad + KIT.head;
}
// label on the left, value on the right, centred in a 12-unit row starting at y
function kRow(g, x, y, w, label, value, t, vcol) {
  var cy = y + KIT.row / 2;
  kText(g, label, x + KIT.pad, cy, 8.5, "medium", kSub(t));
  kText(g, value, x + w - KIT.pad, cy, 9, "semibold", vcol || t.text, "right");
}
// one-line pill (24 high): icon, main text, optional right-aligned muted text
function kPill(g, x, y, w, o, t) {
  kPanel(g, x, y, w, KIT.pill, o.accent, o.alpha);
  var cy = y + KIT.pill / 2, tx = x + KIT.pad;
  if (o.icon) { kIcon(g, o.icon, tx, cy, 10, o.iconColor || t.accent); tx += 14; }
  if (o.label) { kText(g, o.label, tx, cy, 8, "semibold", o.labelColor || t.accent); tx += kW(g, o.label, 8, "semibold") + 5; }
  if (o.text !== undefined) kText(g, o.text, tx, cy, o.size || 9, "semibold", o.color || t.text);
  if (o.right) kText(g, o.right, x + w - KIT.pad, cy, 8, "medium", o.rightColor || kSub(t), "right");
}
// ---- end kit ----

var MOBS = /^(Zombie|Skeleton|Creeper|Spider|Enderman|Witch|Blaze|Ghast|Slime|Phantom|Drowned|Husk|Stray|Pillager|Vindicator|Evoker|Ravager|Guardian|Shulker|Wither|Piglin|Hoglin|Zoglin|Bee|Wolf|Iron_Golem|Silverfish|Endermite|Vex|Magma|Cave|Polar|Llama|Dolphin|Panda|Fox|Goat|Warden|Breeze|Bogged)$/i;
var feed = [];

solix.on("chat", function (line) {
  var k = parseKill(line);
  if (!k || (!mobs.get() && MOBS.test(k.killer))) return;
  feed.push({ killer: k.killer, victim: k.victim, at: Date.now() });
  while (feed.length > 8) feed.shift();
});

// rows are separate pills, right-aligned, newest at the bottom; the footprint is fixed by the Entries setting
var W = 180, RH = 18, RG = 4;
function row(g, e, y, me, t, a) {
  var nmax = (W - 2 * KIT.pad - 18) / 2, kn = kFit(g, e.killer, nmax, 9, "semibold"), vn = kFit(g, e.victim, nmax, 9, "semibold");
  var kw = kW(g, kn, 9, "semibold"), vw = kW(g, vn, 9, "semibold"), rw = kw + vw + 2 * KIT.pad + 18, x = W - rw, cy = y + RH / 2;
  var mine = e.killer === me || e.victim === me;
  if (bg.get()) g.panel(KIT.gut + x, KIT.gut + y, rw, RH, { radius: KIT.r, accent: mine, alpha: a });
  kText(g, kn, x + KIT.pad, cy, 9, "semibold", kA(e.killer === me ? t.accentBright : t.text, a));
  kIcon(g, "sword", x + KIT.pad + kw + 4, cy, 10, kA(t.accent, a));
  kText(g, vn, W - KIT.pad, cy, 9, "semibold", kA(e.victim === me ? "#F2665E" : kSub(t), a), "right");
}

solix.hud.register({
  id: "feed", name: "Kill Feed", width: W + 8, height: 70, x: 1, y: 0.1592,
  render: function (g, ctx) {
    var t = solix.theme, now = Date.now(), me = solix.player ? solix.player.name : "", ttl = life.get() * 1000, n = maxRows.get();
    var FH = n * (RH + RG) - RG;
    while (feed.length && now - feed[0].at > ttl) feed.shift();
    var rows = feed.slice(-n);
    if (!rows.length && ctx.editing) rows = [{ killer: "Kill feed", victim: "from chat", at: now, sample: true }];
    for (var i = 0; i < rows.length; i++) {
      var e = rows[i], fade = Math.min(1, (ttl - (now - e.at)) / 600);
      row(g, e, i * (RH + RG), me, t, e.sample ? 0.6 : Math.max(0.05, fade));
    }
    return kBox(W, FH);
  }
});

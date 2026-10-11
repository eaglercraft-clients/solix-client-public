// PvP Session Stats: kills come from chat death messages that name you as the killer; deaths come from your own health
// reaching zero (more reliable than chat). Nothing else is guessed.

var resetOnJoin = solix.settings.bool("reset", "Reset when joining a server", true);
var resetKey = solix.settings.keybind("resetKey", "Reset stats key", "NONE");
var compact = solix.settings.bool("compact", "Compact (one line)", false);
var toast = solix.settings.bool("toast", "Toast on kill streaks (3, 5, 10...)", true);

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

var kills = 0, deaths = 0, streak = 0, bestStreak = 0, alive = true, lastKillAt = 0;
function reset() { kills = deaths = streak = bestStreak = 0; }

solix.on("chat", function (line) {
  var p = solix.player, k = parseKill(line);
  if (!p || !k || k.killer !== p.name || k.victim === p.name) return;
  kills++; streak++; lastKillAt = Date.now();
  if (streak > bestStreak) bestStreak = streak;
  if (toast.get() && (streak === 3 || streak === 5 || streak % 10 === 0)) solix.notify(streak + " kill streak!");
});
solix.on("tick", function (state) {
  var p = state.player;
  if (!p) return;
  if (alive && p.health <= 0) { alive = false; deaths++; streak = 0; }
  else if (!alive && p.health > 0) alive = true;
});
solix.on("serverJoin", function () { if (resetOnJoin.get()) reset(); alive = true; });
solix.on("keybind", function (id) { if (id === "resetKey") { reset(); solix.notify("Session stats reset"); } });

function kd() { return deaths === 0 ? String(kills) : (Math.round(kills / deaths * 100) / 100).toFixed(2); }

var W = 130;
solix.hud.register({
  id: "stats", name: "Session Stats", width: W + 8, height: 76, x: 1, y: 0.3384,
  render: function (g, ctx) {
    var t = solix.theme, glow = Date.now() - lastKillAt < 600;
    if (compact.get()) {
      kPill(g, 0, 0, W, { icon: "sword", text: kills + " / " + deaths, right: "K/D " + kd(), accent: glow }, t);
      return kBox(W, KIT.pill);
    }
    var h = kCardH(3);
    kPanel(g, 0, 0, W, h, glow);
    var y = kHeader(g, 0, 0, W, "sword", "SESSION", "K/D " + kd(), t);
    kRow(g, 0, y, W, "Kills", String(kills), t);
    kRow(g, 0, y + KIT.row, W, "Deaths", String(deaths), t);
    kRow(g, 0, y + 2 * KIT.row, W, "Streak", streak + " (best " + bestStreak + ")", t, streak ? t.accentBright : t.text);
    return kBox(W, h);
  }
});

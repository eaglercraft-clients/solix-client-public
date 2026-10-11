// Low Health Warning: driven only by your own health. On API 1.1 it draws a full-screen red vignette (hud.overlay) that
// pulses faster as your health falls, and flashes the screen edges when you take damage (the "damage" event).
// On older clients it falls back to the badge.

var v11 = (solix.apiMinor || 0) >= 1 && !!solix.hud.overlay;
var hearts = solix.settings.slider("hearts", "Warn at or below (hearts)", 1, 10, 0.5, 3);
var style = solix.settings.choice("style", "Style", ["Vignette + badge", "Vignette only", "Badge", "Big text", "Heart only"], 0,
  v11 ? undefined : "The vignette needs a newer client; this one shows the badge");
var strength = solix.settings.slider("strength", "Vignette strength", 0.2, 1, 0.05, 0.6);
var hitFlash = solix.settings.bool("flash", "Flash the edges when you take damage", true);
var toast = solix.settings.bool("toast", "Toast when you drop below", false);
var colour = solix.settings.color("color", "Warning colour", "#F2665E");

var wasLow = false, hitAt = 0, hitSize = 0;
solix.on("tick", function (state) {
  var p = state.player, low = !!p && p.health > 0 && p.health <= hearts.get() * 2;
  if (low && !wasLow && toast.get()) solix.notify("Low health: " + heartsTxt(p.health));
  wasLow = low;
});
solix.on("damage", function (amount) { hitAt = Date.now(); hitSize = Math.min(1, 0.35 + amount / 8); });

// transparent colours: solix.util.withAlpha (1.1) returns "#AARRGGBB"; a number with alpha 0 would draw opaque
function argbA(c, a) {
  if (solix.util.withAlpha) return solix.util.withAlpha(c, Math.max(0, Math.min(1, a)));
  var A = Math.round(Math.max(0, Math.min(1, a)) * 255), rgb = (c & 0xFFFFFF) >>> 0;
  return "#" + (A < 16 ? "0" : "") + A.toString(16) + ("00000" + rgb.toString(16)).slice(-6);
}
function heartsTxt(hp) { var h = Math.round(hp * 5) / 10; return h + (h === 1 ? " heart" : " hearts"); }
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

function lowInfo() {
  var p = solix.player, limit = hearts.get() * 2, hp = p ? p.health : 0;
  var low = !!p && hp > 0 && hp <= limit;
  var sev = low ? 1 - Math.max(0, hp - 1) / Math.max(1, limit) : 0, period = 900 - 550 * sev;
  return { low: low, hp: hp, limit: limit, sev: sev, pulse: 0.5 + 0.5 * Math.sin(Date.now() / period * Math.PI * 2) };
}

// edge vignette: vertical gradients top and bottom, stepped strips left and right (the API has no horizontal gradient)
function vignette(g, W, H, c, a) {
  if (a <= 0.01) return;
  var d = Math.round(Math.min(W, H) * 0.22), sw = 2, n = Math.ceil(d / sw);
  g.gradient(0, 0, W, d, argbA(c, a), argbA(c, 0));
  g.gradient(0, H - d, W, d, argbA(c, 0), argbA(c, a));
  // left/right edges: adjacent 2-unit strips, none overlapping, alpha falling off towards the middle
  for (var i = 0; i < n; i++) {
    var k = a * Math.pow(1 - (i + 0.5) / n, 1.8);
    g.rect(i * sw, 0, sw, H, argbA(c, k));
    g.rect(W - (i + 1) * sw, 0, sw, H, argbA(c, k));
  }
}

if (v11) {
  solix.hud.overlay(function (g, ctx) {
    var s = style.get(), c = colour.get(), info = lowInfo(), a = 0;
    if (info.low && s <= 1) a = strength.get() * (0.45 + 0.35 * info.sev + 0.2 * info.pulse);
    if (hitFlash.get()) a = Math.max(a, hitSize * strength.get() * Math.max(0, 1 - (Date.now() - hitAt) / 350));
    vignette(g, ctx.width, ctx.height, c, a);
  });
}

var W = 160;
solix.hud.register({
  id: "lowhp", name: "Low Health Warning", width: W + 8, height: 32, x: 0.5, y: 0.682,
  render: function (g, ctx) {
    var info = lowInfo(), s = style.get(), t = solix.theme, H = s === 3 ? 32 : KIT.pill;
    if (v11 && s === 1 && !ctx.editing) return kBox(W, H);
    if (!v11 && s <= 1) s = 2;
    if (!info.low && !ctx.editing) return kBox(W, H);
    var c = colour.get(), hp = info.low ? info.hp : info.limit, pulse = info.pulse;
    var txt = heartsTxt(hp);
    if (s === 4) {
      var r = 14 + 4 * pulse;
      kIcon(g, "heart", W / 2 - r / 2, KIT.pill / 2, r, kA(c, 0.6 + 0.4 * pulse));
      return kBox(W, H);
    }
    if (s === 3) {
      kText(g, "LOW HEALTH", W / 2, 9, 15, "display", kA(c, 0.55 + 0.45 * pulse), "center");
      kText(g, txt, W / 2, 26, 9, "semibold", kA(c, 0.9), "center");
      return kBox(W, H);
    }
    g.roundRect(KIT.gut - 2, KIT.gut - 2, W + 4, KIT.pill + 4, KIT.r + 2, kA(c, 0.15 + 0.4 * pulse));
    kPill(g, 0, 0, W, { icon: "heart", iconColor: kA(c, 0.6 + 0.4 * pulse), label: "LOW HEALTH", labelColor: c, right: txt, rightColor: t.text }, t);
    return kBox(W, H);
  }
});

// Fight Timer: a fight starts with your first left click and ends after a few seconds without one.
// It also shows how much of your own health you lost during it (start health minus lowest health).

var quiet = solix.settings.slider("quiet", "Fight ends after (seconds without clicking)", 3, 15, 1, 6);
var keep = solix.settings.slider("keep", "Show the last fight for (seconds)", 0, 30, 1, 8);
var bg = solix.settings.bool("bg", "Background", true);

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

var start = 0, lastClick = 0, startHp = 0, minHp = 0, ended = null, clicksIn = 0;
solix.on("mouse", function (b, down) {
  if (b !== 0 || !down) return;
  var now = Date.now(), p = solix.player;
  if (!start || now - lastClick > quiet.get() * 1000) { start = now; clicksIn = 0; startHp = minHp = p ? p.health : 0; ended = null; }
  lastClick = now; clicksIn++;
});

function clock(ms) { var s = ms / 1000, m = Math.floor(s / 60); s -= m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1); }

var W = 160;
solix.hud.register({
  id: "timer", name: "Fight Timer", width: W + 8, height: 32, x: 0.5, y: 0.127,
  render: function (g, ctx) {
    var t = solix.theme, now = Date.now(), p = solix.player, active = start && now - lastClick <= quiet.get() * 1000;
    if (active && p) minHp = Math.min(minHp, p.health);
    if (start && !active && !ended) { ended = { dur: lastClick - start, lost: Math.max(0, startHp - minHp), clicks: clicksIn, at: now }; start = 0; }
    var show = active ? { dur: now - start, lost: Math.max(0, startHp - minHp), clicks: clicksIn } : (ended && now - ended.at < keep.get() * 1000 ? ended : null);
    if (!show) {
      if (!ctx.editing) return kBox(W, KIT.pill);
      show = { dur: 0, lost: 0, clicks: 0 };
    }
    var main = clock(show.dur), mw = kW(g, main, 10, "semibold");
    var lh = Math.round(show.lost * 5) / 10, ht = "-" + lh + (lh === 1 ? " heart" : " hearts");
    var sub = ht + "  " + show.clicks + (show.clicks === 1 ? " click" : " clicks");
    if (kW(g, sub, 8) > W - 2 * KIT.pad - 14 - mw - 8) sub = ht;
    var col = active ? t.text : kSub(t);
    if (bg.get()) kPill(g, 0, 0, W, { icon: active ? "sword" : "hourglass", iconColor: active ? t.accentBright : kSub(t), text: main, size: 10, color: col, right: sub, accent: !!active }, t);
    else { kText(g, main, W / 2, 8, 10, "semibold", col, "center"); kText(g, sub, W / 2, 19, 8, "medium", kSub(t), "center"); }
    return kBox(W, KIT.pill);
  }
});

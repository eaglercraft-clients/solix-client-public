// Damage Taken: watches your own health each tick. A drop becomes a floating red number, a rise a green one.
// It's your health only; there's no data about who or what hit you. On API 1.1 hits come from the client's own
// "damage" event (exact per-hit amounts); the tick watcher then only handles healing and respawns.
var v11 = (solix.apiMinor || 0) >= 1;

var units = solix.settings.choice("units", "Units", ["Hearts", "HP"], 0);
var heals = solix.settings.bool("heals", "Show healing too", true);
var showTotals = solix.settings.bool("totals", "Show last hit and total this life", false);
var minChange = solix.settings.slider("min", "Ignore changes smaller than (HP)", 0, 2, 0.5, 0.5);

var lastHp = -1, pops = [], lastHit = 0, total = 0;
function hit(amount) { lastHit = amount; total += amount; pops.push({ v: -amount, at: Date.now() }); while (pops.length > 8) pops.shift(); }
solix.on("damage", function (amount, newHealth) {
  if (amount >= Math.max(0.01, minChange.get())) hit(amount);
  lastHp = newHealth;
});
solix.on("tick", function (state) {
  var p = state.player;
  if (!p) { lastHp = -1; return; }
  if (lastHp < 0) { lastHp = p.health; return; }
  var d = p.health - lastHp;
  if (lastHp <= 0 && p.health > 0) { lastHp = p.health; total = 0; return; } // respawn, not a heal
  if (d < 0 && v11) { lastHp = p.health; return; } // the damage event already counted it
  if (Math.abs(d) >= Math.max(0.01, minChange.get())) {
    if (d < 0) hit(-d);
    else if (heals.get()) { pops.push({ v: d, at: Date.now() }); while (pops.length > 8) pops.shift(); }
    lastHp = p.health;
  }
  // a change below the threshold leaves lastHp alone, so slow regen still adds up and shows once it crosses it
});
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

function fmt(hp) { var v = units.get() === 0 ? hp / 2 : hp; return String(Math.round(v * 10) / 10); }


// centred just under the crosshair: numbers pop at the bottom of the box and rise, with the optional totals pill below
var W = 160, NH = 40, HOLD = 2000; // numbers hold full strength for 1.3s, then fade out by 2s
solix.hud.register({
  id: "dmg", name: "Damage Taken", width: W + 8, height: NH + 8, x: 0.5, y: 0.594,
  render: function (g, ctx) {
    var t = solix.theme, now = Date.now(), tot = showTotals.get(), H = NH + (tot ? KIT.pill + 4 : 0);
    while (pops.length && now - pops[0].at > HOLD) pops.shift();
    if (ctx.editing && !pops.length) {
      g.panel(KIT.gut, KIT.gut, W, NH, { radius: KIT.r, alpha: 0.45 });
      kText(g, "-1.5", W / 2, NH / 2, 16, "semibold", "#F2665E", "center");
    }
    for (var i = 0; i < pops.length; i++) {
      var e = pops[i], k = (now - e.at) / HOLD, dx = [0, -24, 24][i % 3];
      var col = kA(e.v < 0 ? "#F2665E" : "#7CE38B", k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35);
      g.text((e.v < 0 ? "-" : "+") + fmt(Math.abs(e.v)), KIT.gut + W / 2 + dx, KIT.gut + NH - 10 - k * 20, { size: e.v < 0 ? 16 : 12, font: "semibold", color: col, align: "center", shadow: true });
    }
    if (tot) {
      var u = units.get() === 0 ? " hearts" : " HP";
      kPill(g, 0, NH + 4, W, { icon: "heart", iconColor: "#F2665E", label: "LAST", text: fmt(lastHit), right: "life " + fmt(total) + u }, t);
    }
    return kBox(W, H);
  }
});

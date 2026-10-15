/// <reference path="../../types/solix.d.ts" />
// Combat Observer: an API 1.18 observer pattern for attack and damage.
//
// - Observers register at LOW priority (-100), so any handler in this pack that might act on the event runs first.
// - Observers never cancel and never `return false`. Other packs keep seeing every swing and hit.
// - A handler only runs while the event is live, so token.cancelled is always false when it starts. To learn whether
//   a handler that ran AFTER this one (a pack loaded later) cancelled the event, keep the token and check
//   token.cancelled on the next tick.
// - If a pack loaded before this one cancels, these observers simply don't run for that event. Nothing here can see
//   it. On older clients there are no tokens, so the "consumed later" counter stays at 0.
var V18 = (solix.apiMinor || 0) >= 18;
function tokenOf(args) { var t = args.length ? args[args.length - 1] : null; return t && typeof t === "object" && typeof t.cancel === "function" ? t : null; }

var showLater = solix.settings.bool("later", "Show events consumed by later packs", true, "API 1.18+");

var swings = 0, hits = 0, taken = 0, lastHit = 0, consumedLater = 0, pending = [];

solix.on("attack", function (hit) {
  swings++; if (hit) hits++;
  var t = tokenOf(arguments); if (t) pending.push(t);
}, { priority: -100 });

solix.on("damage", function (amount) {
  taken += +amount || 0; lastHit = +amount || 0;
  var t = tokenOf(arguments); if (t) pending.push(t);
}, { priority: -100 });

solix.on("tick", function () {
  if (!pending.length) return;
  for (var i = 0; i < pending.length; i++) if (pending[i].cancelled) consumedLater++;
  pending.length = 0;
});

solix.on("enable", function () { swings = hits = taken = lastHit = consumedLater = 0; pending.length = 0; });

function r1(v) { return Math.round(v * 10) / 10; }
solix.hud.register({
  id: "combat", name: "Combat Observer", width: 168, height: 32, x: 1, y: 0.4,
  render: function (g, ctx) {
    var t = solix.theme;
    var acc = swings ? Math.round(hits / swings * 100) + "%" : "-";
    var s = "Hits " + hits + "/" + swings + " (" + acc + ")  Taken " + r1(taken) + (lastHit ? " (-" + r1(lastHit) + ")" : "");
    if (V18 && showLater.get() && consumedLater) s += "  *" + consumedLater;
    g.panel(4, 4, 160, 24, { radius: 4 });
    g.text(s, 12, 16, { size: 8, color: t.text || "#F2F2F7" });
    return { width: 168, height: 32 };
  }
});

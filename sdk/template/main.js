/// <reference path="../types/solix.d.ts" />
// Minimal SolixClient plugin: one draggable HUD element showing FPS, styled with the active theme.
// Layout follows ../docs/hud-layout.md: a fixed 120x24 pill inside a 4-unit gutter (128x32 footprint), on the left
// column below the vanilla FPS/coords text (top-left, down to ~50 units). It never resizes, so neighbours stay aligned.
var showPing = solix.settings.bool("ping", "Show ping", true, "Append your ping on servers");

var GUT = 4, W = 120, H = 24;

solix.hud.register({
  // y: 4 + 0.12 * (480 - 8 - 32) = ~57 units on an 853x480 HUD, just under the vanilla text
  id: "readout", name: "Readout", width: W + GUT * 2, height: H + GUT * 2, x: 0, y: 0.12,
  render: function (g, ctx) {
    var c = solix.client, t = solix.theme;
    var s = c.fps + " FPS" + (showPing.get() && c.ping >= 0 ? "  " + c.ping + " ms" : "");
    g.panel(GUT, GUT, W, H, { radius: 4 });
    g.text(s, GUT + 8, GUT + H / 2, { size: 10, color: t.accent || "#D2AE62" });
    return { width: W + GUT * 2, height: H + GUT * 2 }; // fixed size, always
  }
});

solix.on("enable", function () { solix.log("enabled"); });

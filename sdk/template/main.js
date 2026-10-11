/// <reference path="../types/solix.d.ts" />
// Minimal SolixClient plugin: one draggable HUD element showing FPS, styled with the active theme.
var showPing = solix.settings.bool("ping", "Show ping", true, "Append your ping on servers");

solix.hud.register({
  id: "readout", name: "Readout", width: 70, height: 18, x: 0.02, y: 0.02,
  render: function (g, ctx) {
    var c = solix.client, t = solix.theme;
    var s = c.fps + " FPS" + (showPing.get() && c.ping >= 0 ? "  " + c.ping + " ms" : "");
    var w = g.textWidth(s, 10) + 12;
    g.panel(0, 0, w, ctx.height, { radius: 4 });
    g.text(s, 6, ctx.height / 2, { size: 10, color: t.accent || "#D2AE62" });
    return { width: w };
  }
});

solix.on("enable", function () { solix.log("enabled"); });

// ==SolixPlugin==
// @id          toggle-sprint
// @name        Toggle Sprint
// @version     1.0.1
// @author      Solix
// @description Tap your sprint key once to keep sprinting, tap again to stop. Works like the vanilla accessibility toggle. Shows a small indicator.
// @api         1
// @hooks       sprint, hud
// ==/SolixPlugin==
//
// A single-file plugin: no zip needed, the metadata lives in the header above.
// It only flips the client's own toggle-sprint option (solix.options.setToggleSprint); it never moves the player.

var indicator = solix.settings.bool("indicator", "Show indicator", true);
var label = solix.settings.choice("label", "Indicator text", ["[Sprinting (Toggled)]", "Sprint: ON", "Icon only"], 0);

solix.on("enable", function () { solix.options.setToggleSprint(true); });
solix.on("disable", function () { solix.options.setToggleSprint(false); });

solix.hud.register({
  id: "status", name: "Sprint indicator", width: 120, height: 14, x: 0.0, y: 0.0,
  render: function (g, ctx) {
    var input = (ctx.state && ctx.state.input) || {};
    if (!indicator.get() || (!input.sprint && !ctx.editing)) return { width: 1, height: 1 };
    var l = label.get();
    if (l === 2) { g.icon("bolt", 0, 0, 14, solix.theme.accent); return { width: 14, height: 14 }; }
    var t = l === 0 ? "[Sprinting (Toggled)]" : "Sprint: ON";
    g.text(t, 0, 1, { size: 11, color: solix.theme.text, shadow: true });
    return { width: g.textWidth(t, 11) + 2, height: 14 };
  }
});

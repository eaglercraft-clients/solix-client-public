/// <reference path="../../types/solix.d.ts" />
// Screen Guard: an API 1.18 screenOpen guard.
//
// Many packs treat any screenOpen as "the player opened a menu" and pause or hide something. Opening chat
// (ChatScreen, then "none" when it closes) makes those packs flicker. This guard runs at priority 100, records the
// screen for this pack first, then:
// - by default it never cancels. It only uses a plain variable to keep the pack's own lower-priority handler away
//   from chat-screen changes. Cancelling just to gate your own handlers would also hide the event from every pack
//   loaded after this one.
// - with "Swallow chat-screen events" on (the player asked for it, so this pack owns the decision) it cancels
//   ChatScreen and the "none" that closes it, and packs loaded after this one don't see them.
// Cancelling never stops the screen from opening or closing.
var V18 = (solix.apiMinor || 0) >= 18;
function tokenOf(args) { var t = args.length ? args[args.length - 1] : null; return t && typeof t === "object" && typeof t.cancel === "function" ? t : null; }

var swallow = solix.settings.bool("swallow", "Swallow chat-screen events", false, "API 1.18+: packs loaded after this one won't see chat opening and closing as a screen change");
var show = solix.settings.bool("show", "Show the last menu on the HUD", true);

var inChat = false, skip = false, lastMenu = "none", menus = 0, swallowed = 0;
function isChat(name) { return /ChatScreen$/.test(name); }

// guard: priority 100, runs before this pack's other screenOpen handlers
solix.on("screenOpen", function (name) {
  name = String(name || "none");
  var chatChange = isChat(name) || (name === "none" && inChat);
  inChat = isChat(name);
  skip = chatChange;                                  // own gating: a variable, not a cancel
  if (chatChange && swallow.get()) {
    var t = tokenOf(arguments);
    if (t) { t.cancel(); swallowed++; }
  }
}, { priority: 100 });

// normal handler: priority 0. It ignores chat-screen changes on every client because of `skip`.
solix.on("screenOpen", function (name) {
  if (skip) return;
  name = String(name || "none");
  if (name !== "none") { lastMenu = name; menus++; }
}, 0);

solix.hud.register({
  id: "screen", name: "Screen Guard", width: 168, height: 32, x: 0, y: 0.3,
  render: function (g, ctx) {
    var t = solix.theme;
    if (!show.get() && !ctx.editing) return { width: 168, height: 32 };
    var label = ctx.editing && menus === 0 ? "Last menu: InventoryScreen" : "Last menu: " + lastMenu.replace(/Screen$/, "") + " (" + menus + ")";
    if (V18 && swallow.get()) label += "  -" + swallowed;
    g.panel(4, 4, 160, 24, { radius: 4 });
    g.text(label, 12, 16, { size: 9, color: t.text || "#F2F2F7" });
    return { width: 168, height: 32 };
  }
});
solix.on("enable", function () { inChat = false; skip = false; });

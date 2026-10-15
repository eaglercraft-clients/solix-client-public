/// <reference path="../../types/solix.d.ts" />
// Chat Filter: an API 1.18 example of a high-priority chat handler that cancels the lines it filters.
//
// - Hiding a line from the chat screen is solix.chat.pipeline({hide}) (API 1.11). Cancelling the "chat" event does
//   NOT hide anything. It only stops plugin handlers that would run after this one.
// - On 1.18 the filter cancels matching lines, so this pack's own lower-priority handler and every pack loaded
//   after this one (auto-gg, kill feeds, session stats...) never react to spam such as a fake "won the game!" ad.
//   The player installed this pack to filter these lines, so this pack owns the decision. That's why it may cancel.
// - On older clients nothing is cancelled. The low-priority handler checks `filtered` itself, so this pack still
//   behaves the same; other packs just keep seeing the lines.
var V18 = (solix.apiMinor || 0) >= 18;
var hasPipe = !!(solix.chat && typeof solix.chat.pipeline === "function");

var patterns = solix.settings.text("patterns", "Patterns", "^\\[AD\\]|discord\\.gg/", "Regexes separated by ;; (case-insensitive)", { maxLength: 200 });
var hide = solix.settings.bool("hide", "Hide matching lines from chat", true, "Uses the chat pipeline (API 1.11+)");
var block = solix.settings.bool("block", "Stop other packs reacting to them", true, "API 1.18+: cancels the chat event for packs loaded after this one");

var cache = { src: null, list: [] };
function regs() {
  var src = String(patterns.get() || "");
  if (src === cache.src) return cache.list;
  var list = [];
  src.split(";;").forEach(function (s) { s = s.trim(); if (!s) return; try { list.push(new RegExp(s, "i")); } catch (e) { solix.log("bad pattern: " + s); } });
  cache = { src: src, list: list };
  return list;
}
function matches(text) { var l = regs(); for (var i = 0; i < l.length; i++) if (l[i].test(text)) return true; return false; }
function tokenOf(args) { var t = args.length ? args[args.length - 1] : null; return t && typeof t === "object" && typeof t.cancel === "function" ? t : null; }

function applyPipe() {
  if (!hasPipe) return;
  var src = regs().map(function (r) { return "(?i)" + r.source; }); // the client matches with Java regex: (?i) = case-insensitive
  solix.chat.pipeline(hide.get() && src.length ? { hide: src } : {});
}

var filtered = null, nFiltered = 0, nClean = 0;

// priority 100: runs before this pack's other chat handlers (other packs still run in load order)
solix.on("chat", function (text) {
  text = String(text || "");
  filtered = null;
  if (!matches(text)) return;           // return nothing, never `false`, for lines we let through
  filtered = text; nFiltered++;
  var token = tokenOf(arguments);
  if (token && block.get()) token.cancel();
}, { priority: 100 });

// priority 0: the pack's normal chat logic. On 1.18 it never sees filtered lines; on older clients it checks.
solix.on("chat", function (text) {
  if (filtered !== null && filtered === String(text || "")) return;
  nClean++;
}, 0);

if (solix.settings.button) solix.settings.button("stats", "Session counts", function () {
  solix.notify(nFiltered + " filtered, " + nClean + " passed" + (V18 ? "" : " (client < 1.18: not cancelled for other packs)"));
}, "Lines filtered and let through since the pack was enabled", { text: "Show" });

// settingChange (1.18: also cancelable, but only within this pack). `apply` returns nothing, so it never cancels.
solix.on("settingChange", function (id) { if (id === "patterns" || id === "hide") applyPipe(); });
solix.on("enable", function () { filtered = null; nFiltered = nClean = 0; applyPipe(); if (!V18) solix.log("client API < 1.18: filtering without cancellation"); });
solix.on("disable", function () { if (hasPipe) solix.chat.pipeline({}); });

/// <reference path="../../types/solix.d.ts" />
// Keybind Consume: two API 1.18 patterns for keys.
//
// 1. keybind (always safe to cancel). Keybind events are per pack, so a cancel only skips THIS pack's later keybind
//    handlers. The high-priority handler owns the "mark" key and consumes it. A low-priority fallback toasts every
//    other keybind of this pack.
// 2. key capture (shared event, so be careful). After you press "Capture next key", the next real key press belongs
//    to this pack. It's recorded and cancelled, so packs loaded after this one don't also treat it as their shortcut.
//    Every other key press is left alone. Cancelling never stops Minecraft from seeing the key.
//
// Older clients: no tokens and no priorities, so handlers are registered high-priority first (same order) and the
// fallback checks `consumed` itself.
var V18 = (solix.apiMinor || 0) >= 18;
function tokenOf(args) { var t = args.length ? args[args.length - 1] : null; return t && typeof t === "object" && typeof t.cancel === "function" ? t : null; }

solix.settings.keybind("mark", "Mark position", "M", "Consumed by the high-priority handler");
solix.settings.keybind("capture", "Capture next key", "K", "The next key you press is recorded and not passed to later packs");
solix.settings.keybind("other", "Other action", "NONE", "Falls through to the low-priority fallback");

var consumed = null, capturing = false, captured = null, marks = 0;

// --- 1. keybind: the high-priority owner -------------------------------------------------------------------------
solix.on("keybind", function (id) {
  consumed = null;
  if (id === "mark") {
    marks++;
    var p = solix.player;
    solix.notify("Mark " + marks + (p ? " at " + Math.round(p.x) + " " + Math.round(p.y) + " " + Math.round(p.z) : ""));
    consumed = id;
    var t = tokenOf(arguments); if (t) t.cancel();   // per-pack: only skips the fallback below
    return;
  }
  if (id === "capture") {
    capturing = true; consumed = id;
    solix.notify("Press a key to capture it");
    return false;                                     // same as token.cancel(); ignored on older clients
  }
}, { priority: 100 });

// --- 1b. keybind: low-priority fallback for whatever wasn't consumed ---------------------------------------------
solix.on("keybind", function (id) {
  if (consumed === id) return;                        // older clients: the cancel didn't happen, so check
  solix.notify("Keybind " + id + " (not consumed)");
}, { priority: -100 });

// --- 2. key: cancel only the key this pack owns ------------------------------------------------------------------
// key arguments: code, name, repeat (1.12+), token (1.18+). The capture keybind fires after the shared key event for
// the same press, so the K that started capturing is never captured itself.
solix.on("key", function (code, name, repeat) {
  if (!capturing || repeat === true) return;          // not ours: return nothing so it keeps going
  capturing = false; captured = name;
  solix.notify("Captured " + name + (V18 ? " (hidden from later packs)" : ""));
  var t = tokenOf(arguments); if (t) t.cancel();
}, { priority: 100 });

solix.on("enable", function () { consumed = null; capturing = false; });
solix.on("disable", function () { capturing = false; });

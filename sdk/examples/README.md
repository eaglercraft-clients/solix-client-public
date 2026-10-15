# Examples

Working packs you can install as they are, or copy and change. Each one is a single `main.js` with the HUD kit pasted
in at the top, so it has no dependencies.

| Pack | Shows how to |
| --- | --- |
| [`starter-hud-kit`](starter-hud-kit/) | Build a one-line pill with the HUD kit and a setting. Start here. |
| [`pvp-fight-timer`](pvp-fight-timer/) | Track state from `tick` and `input`, and fit text to a width. |
| [`pvp-session-stats`](pvp-session-stats/) | Lay out a card with a header and rows. |
| [`pvp-low-health`](pvp-low-health/) | Draw a full-screen overlay (vignette) plus a pulsing pill. |
| [`pvp-damage-taken`](pvp-damage-taken/) | Use the API 1.1 `damage` event with a fallback for older clients, and (1.18) for hits another pack cancelled. |
| [`pvp-kill-feed`](pvp-kill-feed/) | Parse chat, including a custom message format setting. |

API 1.18 event priority and cancellation (see [the guide](../docs/events.md)). These use plain `g.panel`/`g.text`
instead of the HUD kit. Each feature-tests `(solix.apiMinor || 0) >= 18` and works the same way on older clients,
just without cancelling:

| Pack | Shows how to |
| --- | --- |
| [`chat-filter`](chat-filter/) | Cancel matching `chat` lines at priority 100 so packs loaded later ignore them, and hide them with `chat.pipeline`. |
| [`keybind-consume`](keybind-consume/) | Consume a `keybind` at high priority before a low-priority fallback, and cancel a shared `key` only when the pack captured it. |
| [`screen-guard`](screen-guard/) | A `screenOpen` guard: do your own work first, gate your own handlers with a variable, cancel only when the player opted in. |
| [`combat-observer`](combat-observer/) | Observe `attack`/`damage` at priority -100 without cancelling, and check `token.cancelled` on the next tick. |

The HUD packs follow the [HUD layout guide](../docs/hud-layout.md).

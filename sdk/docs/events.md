# Event priority and cancellation (API 1.18)

Client 0.4.8beta (plugin API **1.18**) adds two things to `solix.on`: a **priority** for each handler and a
**cancel token** on cancelable events. Both are backward compatible: `solix.on(event, fn)` still works exactly as
before (priority `0`, nothing cancelled).

```js
var V18 = (solix.apiMinor || 0) >= 18;

solix.on("chat", function (text, token) { /* ... */ }, { priority: 100 }); // object form
solix.on("chat", function (text, token) { /* ... */ }, -100);              // bare number, same thing
```

## Priority

- `opts` is `{ priority: n }` or a bare number `n`. Default `0`. Values are clamped to `-1000..1000`; anything that
  isn't a finite number becomes `0`.
- **Higher runs first.** Equal priorities run in registration order.
- **Priority orders handlers inside your own pack only.** Across packs the client still goes pack by pack in load
  order (the order packs were loaded/enabled; a reloaded pack moves to the end). A priority of `1000` does **not** make
  your handler run before another pack's handlers. It makes it run before your *own* lower-priority handlers.

For one `chat` line with packs A, B and C loaded in that order:

```
A: prio 50  ->  A: prio 0  ->  B: prio 10  ->  B: prio 0  ->  C: prio 0
```

Older clients ignore the third argument and run handlers in registration order. If you register your handlers
highest-priority first, the order is the same on every client.

## Cancelable events

| Event | Arguments (1.18) | Who the cancel reaches |
| --- | --- | --- |
| `chat` | `text, token` | your later handlers + **every pack loaded after you** |
| `key` | `code, name, repeat, token` | your later handlers + later packs (real presses). Auto-repeat presses (`repeat = true`) are sent to each pack separately, so there it only reaches your own handlers |
| `mouse` | `button, down, token` | your later handlers + later packs |
| `attack` | `hit, targetName, token` | your later handlers + later packs |
| `damage` | `amount, newHealth, token` | your later handlers + later packs |
| `projectileHit` | `info, token` | your later handlers + later packs |
| `screenOpen` | `name, token` | your later handlers + later packs |
| `serverJoin` | `address, token` | your later handlers + later packs. The `serverJoin` your pack gets when it is enabled while already in a world goes only to you |
| `keybind` | `settingId, repeat, token` | **your own pack only.** Keybind settings belong to one pack, so each pack gets its own token |
| `settingChange` | `id, value, token` | **your own pack only.** It is about your own settings |

Every other event keeps its old arguments and gets **no** token: `enable`, `disable`, `tick`, `keybindRelease`,
`serverLeave`, `pluginstate`, `settingchange` (the lower-case, cross-pack export event), `clientdetect`,
`shaderError`, `shaderSlow`, the `solix.social` events and so on. Note the two setting events: `settingChange`
(camelCase, your own settings) is cancelable, while `settingchange` (lower case, another pack's exported setting) is
not.

## The token

The token is the **last** argument: `{ cancelled: boolean, cancel() }`. One emit uses one token, and every handler
that runs for that emit gets the same object.

There are two ways to cancel, and they do the same thing:

```js
solix.on("chat", function (text, token) {
  if (/^\[AD\]/.test(text)) token.cancel();   // explicit
}, 100);

solix.on("chat", function (text) {
  if (/^\[AD\]/.test(text)) return false;     // shorthand: exactly false, not just falsy
}, 100);
```

When the event is cancelled:

1. The rest of **your** handlers for that event don't run.
2. For shared events (see the table) **no pack loaded after yours** gets it either.
3. Handlers that already ran (higher priority in your pack, earlier packs) are not undone.
4. **The game is not affected.** Cancelling only stops other plugin handlers. A cancelled `chat` line is still shown
   in chat, a cancelled `key` still reaches Minecraft, a cancelled `screenOpen` doesn't close the screen, a cancelled
   `damage` still hurts. To hide chat lines from the screen, use `solix.chat.pipeline({ hide: [...] })` (API 1.11,
   `chat` hook).

`return false` counts only on cancelable events. Returning `false` from a `tick` or `enable` handler does nothing.

### `token.cancelled`

A handler only runs while the event is still live, so `token.cancelled` is always `false` when your handler starts.
It becomes `true` only after something calls `cancel()`: your own code, or a handler that runs **after** you. You
can't receive cancelled events (there's no "receive cancelled" option like Forge has), so a low-priority observer
just doesn't run for an event that an earlier handler cancelled.

To find out whether something after you cancelled the event, keep the token and look at it later, for example on the
next `tick`:

```js
var pending = [];
solix.on("damage", function (amount, hp, token) { if (token) pending.push(token); }, -100);
solix.on("tick", function () {
  for (var i = 0; i < pending.length; i++) if (pending[i].cancelled) solix.log("a later handler consumed a hit");
  pending.length = 0;
});
```

The token can't be extended, and `cancel` can't be replaced. Don't keep tokens around longer than a tick or two.

### Finding the token robustly

The number of arguments has changed over time (`key` gained `repeat` in 1.12, `keybind` gets `repeat` on
repeat-enabled keybinds). Don't assume the token's position. Take the last argument and check it:

```js
function tokenOf(args) {
  var t = args.length ? args[args.length - 1] : null;
  return t && typeof t === "object" && typeof t.cancel === "function" ? t : null;
}
solix.on("key", function (code, name) {
  var token = tokenOf(arguments);   // null on clients older than 1.18
});
```

## Feature-testing

```js
var V18 = (solix.apiMinor || 0) >= 18;
```

On older clients:

- the third argument to `solix.on` is ignored, so handlers run in registration order;
- no token is passed and `return false` does nothing, so all of your handlers and all later packs still run.

So when one of your handlers "handles" something and cancels it, also remember that in your own state (for example
`lastHandled = text`), and have your lower-priority handlers check that state. Then the pack behaves the same with
or without 1.18. Every example in [`../examples/`](../examples/) does this.

## Pitfalls

- **Cancelling `chat`, `key`, `mouse`, `screenOpen` and the other shared events changes what other packs see.** If you
  cancel a chat line, Auto GG, kill feeds and session stats loaded after you never see it. If you cancel a key, other
  packs' key shortcuts don't fire. Only cancel when **you own the action**: you are the one acting on this input, and
  another pack reacting to it as well would be wrong (a key you captured for your own text entry, a spam line the
  player asked you to filter). If you only want to read an event, never cancel it.
- **Don't cancel to gate your own handlers.** "Stop my lower-priority handler from running" also stops every later
  pack. For logic inside your own pack, use a plain variable or `return` (anything except `false`).
- **`return false` by accident.** A handler like `function (t) { return isSpam(t) && count(); }` cancels whenever the
  expression is `false`. On cancelable events, return nothing unless you mean to cancel. Also watch reused helpers:
  `solix.on("settingChange", apply)` cancels your other `settingChange` handlers if `apply` returns `false`.
- **Priority doesn't win against other packs.** It only orders your own handlers. Your filter only protects the packs
  loaded after it, and the player decides the load order.
- **Cancelling doesn't stop the game.** See above. Use `solix.chat.pipeline` to hide chat lines. There is no API to
  block keys or screens.
- **`keybind` is per pack.** It's safe to cancel: it only skips your own later `keybind` handlers. It also doesn't
  affect the shared `key` event for the same press, which is sent separately (and before the keybind).
- **Errors don't cancel.** A handler that throws is counted as an error (enough of them disable the pack) and the
  next handler still runs.
- **Hooks.** Keep declaring the hook each event needs (`chat`, `input`, `combat`, `screen`, `server`, `world`). The
  test tools check for them, and players see the list when they install your pack.

## Examples

| Pack | Shows |
| --- | --- |
| [`chat-filter`](../examples/chat-filter/) | High-priority `chat` filter that cancels matching lines for later packs and hides them with `chat.pipeline` |
| [`keybind-consume`](../examples/keybind-consume/) | A high-priority `keybind` that consumes its own key before a low-priority fallback, plus a `key` capture that cancels only the key it owns |
| [`screen-guard`](../examples/screen-guard/) | A `screenOpen` guard that does its own work first and cancels only when the player turned that on |
| [`combat-observer`](../examples/combat-observer/) | Low-priority `attack`/`damage` observers that never cancel and check `token.cancelled` on the next tick |

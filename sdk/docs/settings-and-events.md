# Settings and events

## Settings

Declare settings when your pack loads. They appear in your plugin's panel automatically and are saved per plugin.

```js
var rows = solix.settings.slider("rows", "Entries", 2, 8, 1, 3);
var sound = solix.settings.bool("sound", "Play a sound", false);
var style = solix.settings.choice("style", "Style", ["Pill", "Card"], 0);   // value is the index
var key = solix.settings.keybind("toggle", "Toggle key", "V");              // fires "keybind" events
var name = solix.settings.text("name", "Your tag", "");                      // API 1.1
rows.get(); // read the current value at any time
```

Tips:

- Read settings with `.get()` each time you need them rather than caching, so changes apply straight away.
- If you change what a setting means, give it a new `id`. Old saved values are keyed by `id` and would otherwise carry
  over with the wrong meaning.
- Listen to `settingChange` (`id, value`) if you need to react immediately. On API 1.18 it also gets a cancel token
  (only your own pack sees it), so a handler you pass straight in, like `solix.on("settingChange", apply)`, must not
  return `false`.

## Events

Subscribe with `solix.on(name, fn)`. Each event needs its hook in `plugin.json`, except `enable`, `disable`, `keybind`,
`keybindRelease` and `settingChange`.

| Event | Arguments | Hook | Cancelable (1.18) |
| --- | --- | --- | --- |
| `enable` / `disable` | none | none | no |
| `tick` | `state` (`{client, player, theme}`) | `tick` | no |
| `key` | `code, name, repeat` | `input` | yes, shared |
| `mouse` | `button, down` | `input` | yes, shared |
| `keybind` / `keybindRelease` | `settingId` | none | `keybind` yes, your pack only / no |
| `settingChange` | `id, value` | none | yes, your pack only |
| `chat` | `text` | `chat` | yes, shared |
| `damage` (1.1) | `amount, newHealth` | `combat` or `tick` | yes, shared |
| `attack` (1.3) | `hit, targetName` | `combat` | yes, shared |
| `projectileHit` (1.11) | `info` | `world` | yes, shared |
| `screenOpen` | `name` | `screen` | yes, shared |
| `serverJoin` / `serverLeave` | `address` / none | `server` | `serverJoin` yes, shared / no |

Undo anything you changed (zoom, hidden crosshair, toggle sprint) in `disable`. The client also resets those for you if
your plugin errors out.

### Priority and cancelling (API 1.18)

`solix.on(name, fn, { priority })` (or a bare number) orders **your own** handlers: higher runs first, default `0`,
clamped to `-1000..1000`. Packs still run one after another in load order. On cancelable events the handler gets a
token as its **last** argument, `{ cancelled, cancel() }`. `token.cancel()` or `return false` stops your later
handlers and, for "shared" events, every pack loaded after yours. It never stops the game itself: the chat line still
shows and the key still works.

```js
if ((solix.apiMinor || 0) >= 18) {
  solix.on("chat", function (text, token) { if (/^\[AD\]/.test(text)) token.cancel(); }, { priority: 100 });
}
```

Only cancel when your pack owns the action. Read [Event priority and cancellation](events.md) before you cancel
`chat`, `key`, `mouse` or `screenOpen`: it covers the full rules, the feature-test pattern and the pitfalls.

## Reading chat

Chat lines arrive as plain text. Servers word death and kill messages differently, so if you parse them, also offer a
text setting for a custom format. The kill feed example in `examples/pvp-kill-feed` shows a parser that accepts
`{killer}`, `{victim}` and `*` patterns.

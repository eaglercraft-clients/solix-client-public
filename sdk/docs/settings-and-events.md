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
- Listen to `settingChange` (`id, value`) if you need to react immediately.

## Events

Subscribe with `solix.on(name, fn)`. Each event needs its hook in `plugin.json`, except `enable`, `disable`, `keybind`,
`keybindRelease` and `settingChange`.

| Event | Arguments | Hook |
| --- | --- | --- |
| `enable` / `disable` | none | none |
| `tick` | `state` (`{client, player, theme}`) | `tick` |
| `key` / `mouse` | `code, name` / `button, down` | `input` |
| `chat` | `text` | `chat` |
| `damage` (1.1) | `amount, newHealth` | `combat` or `tick` |
| `screenOpen` | `name` | `screen` |
| `serverJoin` / `serverLeave` | `address` / none | `server` |

Undo anything you changed (zoom, hidden crosshair, toggle sprint) in `disable`. The client also resets those for you if
your plugin errors out.

## Reading chat

Chat lines arrive as plain text. Servers word death and kill messages differently, so if you parse them, also offer a
text setting for a custom format. The kill feed example in `examples/pvp-kill-feed` shows a parser that accepts
`{killer}`, `{victim}` and `*` patterns.

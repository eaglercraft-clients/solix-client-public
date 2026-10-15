# Getting started

A Solix plugin is a small JavaScript pack that the client loads at runtime. It gets one object, `solix`, which can draw
HUD elements, declare settings, listen to events and ship themes. Plugins can't send packets, move or aim the player, or
read other entities.

## 1. Copy a starter

Copy [`../template/`](../template/) (the smallest possible pack) or
[`../examples/starter-hud-kit/`](../examples/starter-hud-kit/) (the same idea built on the HUD kit, which handles
spacing and styling for you) to a new folder. Two files matter:

- `plugin.json`, the manifest. Change `id` (lowercase, `a-z 0-9 . _ -`, max 40 characters), `name`, `author` and
  `description`.
- `main.js`, the code. Add `/// <reference path="../types/solix.d.ts" />` at the top for autocomplete.

## 2. Declare your hooks

Every capability you use must be listed in `hooks` in `plugin.json`, or the call is refused and logged. The player sees
the list in plain English when they install your pack, so ask only for what you need. The common ones are `hud`
(draw on the HUD), `tick` (run 20 times a second), `chat` (read chat lines) and `input` (see key presses while playing).

## 3. Try it in the client

1. Zip the folder's contents (not the folder itself) and rename the zip to `my-plugin.solixplugin`. A single `.js` file
   also works for quick tests.
   Or run `node tools/pack.js <folder>` from the SDK.
2. In the client, open **Plugins**, click **Install File** and pick your pack.
3. Open **HUD Layout** to see your element in the editor. `ctx.editing` is true there, so draw sample content instead
   of nothing.
4. After changing code, reinstall the pack (same `id` replaces it) and press **Reload**.

Errors show up on your plugin's detail page and in the browser console, tagged with your plugin id. `solix.log(...)`
writes there too.

## 4. Check the version you need

`solix.apiVersion` is `1`. Newer additions are minor versions: check `(solix.apiMinor || 0) >= 1` before using 1.1
features, `>= 2` for 1.2 and so on. Packs that feature-test keep working on older clients.

```js
var V18 = (solix.apiMinor || 0) >= 18;   // client 0.4.8beta+: event priorities + cancel tokens
```

On API 1.18, `solix.on` takes an optional priority (`solix.on("chat", fn, { priority: 100 })`, higher runs first
within your pack), and cancelable events such as `chat`, `key` and `screenOpen` pass a cancel token as the last
argument. You don't need any of this for a first pack. Older two-argument handlers work unchanged. Just don't
`return false` from a `chat`/`key`/`mouse`/... handler unless you mean to stop the packs after yours from seeing that
event. See [Event priority and cancellation](events.md).

## Next

- [API reference](../api/), generated from the client.

- [HUD layout](hud-layout.md) explains how to make elements that line up with everything else.
- [Settings and events](settings-and-events.md)
- [Event priority and cancellation](events.md) (API 1.18)
- [Themes](themes.md)
- [Performance and safety](performance.md)
- [Publishing](publishing.md)

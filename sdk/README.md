# SolixClient plugin dev kit

Everything you need to write plugins and themes for [SolixClient](../README.md), the Eaglercraft 1.14.4 browser client.
Plugins are JavaScript packs (`.solixplugin` zips) that get a sandboxed `solix` API object: HUD elements, settings,
menu buttons, themes, events. No client source lives here.

| Folder | What |
| --- | --- |
| [`api/`](api/) | Full API reference, generated from the client's plugin host (API 1.2) |
| [`types/solix.d.ts`](types/solix.d.ts) | TypeScript definitions for editor autocomplete |
| [`template/`](template/) | Minimal starter pack: `plugin.json` + `main.js` |
| [`tools/`](tools/) | `pack.js` (folder → `.solixplugin`, no deps) and `encrypt-plugin.js` (optional obfuscation) |
| [`themes/`](themes/) | Theme format, `extends` inheritance, and a sample theme |
| [`docs/`](docs/), [`examples/`](examples/) | Guides and example packs (maintained by the solix-plugins agent) |
| [`CHANGELOG.md`](CHANGELOG.md) | SDK / API changes |

## Quick start

```sh
cp -r sdk/template my-plugin          # edit plugin.json (id!) and main.js
node sdk/tools/pack.js my-plugin      # -> my-plugin.solixplugin
```

Then in SolixClient: **Settings > Plugins > Install**, pick the file, review the hooks, enable. Node 16+ is the only
requirement for the tools. Add `/// <reference path="…/types/solix.d.ts" />` to get autocomplete in VS Code.

# SDK changelog

## 2026-10-11: SDK 1.1 (plugin API 1.3, client 0.3.2beta)
- API 1.3: `view.setFovClamp(min, max)`, `view.dynamicFovScale`, `render.fireScale(s)`, `render.offhandScale(s)`,
  `player.lookingAt`, `player.lookingAtEntity`, `player.attackCooldown`, `player.reach`, `combat.lastTarget`,
  the `attack` event `(hit, targetName)` and `world.predictBreak({crystals, anchors})` (anchors is a no-op on 1.14.4).
- Also: `player.inventory`, `player.countItem(id)`, `solix.stats` {fps, ping, tps, cps, memory}, `view.hurtCamScale(s)`,
  `view.freelook(active)`, `render.hitColor(argb)`, `render.hitboxes({enabled, color, players, mobs, items})` (visible entities only).
- New hooks: `fov`, `visuals`, `predict`, `freelook`; `combat` now also covers `attack` and `lastTarget`.
- Guides (`docs/`) and example packs (`examples/`) from solix-plugins.
- `template/`: fixed 128x32 footprint below the vanilla FPS text (`x: 0, y: 0.12`) instead of resizing at the top-left.

## 2026-10-11: SDK 1.0 (plugin API 1.2, client 0.3.1beta)
- First public dev kit: generated API reference (`api/`) and TypeScript types (`types/solix.d.ts`).
- Starter pack (`template/`), `tools/pack.js` packer and `tools/encrypt-plugin.js`.
- Theme format doc + sample theme (`themes/`).
- New in client 0.3.1beta: theme inheritance, `extends` in `solix.themes.register`.

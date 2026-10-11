# Themes

A theme changes the accent colour, the glass tint and the menu background. Packs register themes with the `themes`
hook, and they show up in **Settings > Appearance** while the pack is enabled.

## Extending the default theme

> `extends` needs client 0.3.1beta or newer. On older clients, set every field yourself.

Most custom themes only change a few things. Instead of copying every value, extend the default:

```js
solix.themes.register({
  id: "midnight-gold", name: "Midnight Gold",
  extends: "solix-default",
  accent: "#E8B44C",
  description: "The default theme with a warmer gold"
});
```

Any field you leave out follows `solix-default`. When the default theme is updated, your theme picks up those changes
automatically, and only your overrides stay fixed. In Appearance, each overridden value gets a reset button that puts it
back to the default.

## Fields

| Field | Notes |
| --- | --- |
| `id`, `name` | Required. |
| `extends` | Optional. `"solix-default"` or another theme's id. |
| `accent` | Drives every gold or accent colour in the UI. |
| `glassTint`, `glassStrength` | The colour behind glass panels and how strongly it shows (0 to 1). |
| `background` | An image file inside your pack (jpg, png or webp), shown behind the menus. |
| `description` | Shown in Appearance. |

## Making HUD packs follow themes

HUD elements should read colours from `solix.theme` every frame instead of hardcoding them. Then a player's theme
change applies to your pack straight away.

See [`../themes/sample-midnight-gold/`](../themes/sample-midnight-gold/) for a complete pack, and the theme format in [`../themes/`](../themes/).

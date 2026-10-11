# Themes

A SolixClient theme sets the accent palette, the glass tint and the menu background. Themes ship inside a plugin
pack that declares the `themes` hook and calls `solix.themes.register(...)` from its entry script. They show up in
**Settings > Appearance** while the pack is enabled; if the pack goes away the client falls back to the default.

## Format

```js
solix.themes.register({
  id: "vaporwave",            // unique within your pack (the client stores it as "<pack-id>:<id>")
  name: "Vaporwave",          // shown on the theme card
  extends: "solix-default",   // optional, see below
  accent: "#FF4FB8",          // drives every accent colour; bright/dim/deep variants are derived
  glassTint: "#3A1460",       // RGB tint mixed into glass panels
  glassStrength: 0.6,         // 0..1, how far glass is tinted toward glassTint
  background: "bg.jpg",       // image inside the pack (jpg/png/webp), shown behind the menus
  description: "Neon grid, striped sun"
})
```

| Key | Type | Without `extends` | With `extends` |
| --- | --- | --- | --- |
| `id`, `name` | string | required | required |
| `accent` | colour | default `#D2AE62` | parent's accent + palette |
| `glassTint` | colour | neutral graphite | parent's |
| `glassStrength` | number | `0.5` | parent's |
| `background` | file in pack | vanilla panorama | parent's art + animated overlay |
| `description` | string | empty | parent's |

## Inheritance (`extends`)

Set `extends` to a built-in theme id and override only the keys you care about. Every key you leave out (or set to
`""` / `null`) **falls through to the parent at runtime**. The client re-resolves the chain every time it applies a
theme, so when a client update changes the parent (new art, tweaked accent), your theme picks that up with no pack
update.

Built-in ids: `solix-default` (alias of `solix_gold`, the default), `solix_gold`, `hero`, `tokyo_night`, `sunset`,
`anime_girl`, `midnight`, `aurora`, `sakura`, `ember`, `ocean`, `minecraft_classic`. `-` and `_` are interchangeable
(`tokyo-night` works). You can also extend another pack theme by its full id (`<pack-id>:<id>`). Chains can be up
to 4 deep; an unknown parent just means no inheritance.

If you override `accent`, the bright/dim/deep variants are derived from your accent rather than copied from the parent.

The player's own tweaks in Appearance (custom accent hex, glass opacity, blur, text size, menu background source)
sit on top of any theme, and each has its own **reset to default** button.

Sample: [`sample-midnight-gold/`](sample-midnight-gold/) (pack it with `node ../tools/pack.js sample-midnight-gold`).

## Importing a theme file

There is no standalone theme-file import in the client yet: themes install as plugin packs (Settings > Plugins >
install a `.solixplugin`). A future standalone `.solixtheme` file is planned to be the same object as above stored as
JSON (`{"id", "name", "extends", "accent", "glassTint", "glassStrength", "description"}`, background as a sibling image
in a zip). Until then, wrap it in a pack like the sample.

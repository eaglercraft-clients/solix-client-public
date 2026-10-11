# HUD layout

These rules keep every pack looking like one HUD. The official pvp packs follow them, and the HUD kit in
[`../examples/starter-hud-kit/hud-kit.js`](../examples/starter-hud-kit/hud-kit.js) does most of the work.

## Units and screen sizes

You draw in HUD units. At common window sizes the HUD is roughly 853×480 to 1024×576 units. Design for 853×480 first:
if it fits there, it fits everywhere, because the space between elements only grows on bigger screens.

## Footprint and position

`solix.hud.register({ width, height, x, y, render })` sets the default size and position. `x` and `y` are fractions of
the free space: the element's left edge lands at `4 + round(x * (screenWidth - 8 - width))`, and the same for `y`.
So `x: 0` hugs the left edge, `x: 1` the right, and `x: 0.5` centres it. Once the player drags it, their position wins.

`render` returns `{width, height}`, which becomes the element's size. **Keep that size fixed.** If an element changes
size when it has nothing to show, its neighbours in the editor stop lining up. When idle, draw nothing (or a one-line
pill) but still return the same size.

## Grid, gutters and padding

- Each element has a transparent 4-unit gutter on every side, so two stacked elements leave 8 units between panels and
  nothing touches the screen edge. `kBox(w, h)` adds it for you.
- Inside a panel, use 8 units of padding, a 16-unit header and 12-unit rows. `kCardH(rows)` gives a card's height.
- One-line pills are 24 units high.
- Standard column widths are 120 units on the left side of the screen, 130 on the right and 160 in the centre.

## Text is centred on y

`g.text(str, x, y, opts)` puts the **vertical centre of the capital letters** on `y`, not the top. To centre a line in a
box, pass `y = top + height / 2`. On API 1.2, `g.font.height(size, font)` gives the cap height if you need the exact top
or bottom, for example for an underline. `g.textWidth(str, size, font)` measures width on every version.

## What's already on screen

Leave room for the vanilla HUD:

- FPS and coordinates text in the top-left, down to about 50 units.
- Toasts (the tutorial tip, advancements) in the top-right, 320 wide and 64 high each.
- Hearts, food and armour above the hotbar at the bottom centre.
- Chat in the bottom-left, up to about 640 units wide when open.
- The crosshair in the middle. Put centre-column items above or below it, not beside it.

## Colours

Use `solix.theme` (`accent`, `accentBright`, `text`, `textMuted`) so your element follows the player's theme. For
transparency, use strings: `solix.util.withAlpha(color, 0.5)` or `"#80RRGGBB"`. A plain number from `0` to `0xFFFFFF`
is always drawn opaque, so `0x00FF0000` is solid red, not invisible.

## The HUD kit

| Helper | What it does |
| --- | --- |
| `KIT` | The spacing constants: gutter 4, padding 8, header 16, row 12, pill 24, radius 4. |
| `kBox(w, h)` | The size to return from `render`, gutter included. |
| `kPanel`, `kRect`, `kText`, `kIcon`, `kItem` | Draw calls that apply the gutter offset for you. |
| `kHeader(g, x, y, w, icon, title, value, t)` | A card header with an accent title and a divider. Returns where the body starts. |
| `kRow(g, x, y, w, label, value, t)` | A label on the left and a value on the right. |
| `kPill(g, x, y, w, opts, t)` | A one-line pill with an optional icon, label, main text and right-hand text. |
| `kFit(g, s, maxW, size, font)` | Shortens text with "..." to fit a width. |
| `kA(color, alpha)`, `kSub(t)` | A colour with alpha, and the lighter secondary-text grey that stays readable on bright sky. |

/// <reference path="../../types/solix.d.ts" />
// Only the keys listed here are overridden; background art, description and everything else
// fall through to "solix-default" (Solix Gold) at runtime, so client updates to it show up here too.
solix.themes.register({
  id: "midnight-gold",
  name: "Midnight Gold",
  extends: "solix-default",
  accent: "#E8C46A",
  glassTint: "#0C1428",
  glassStrength: 0.55
});

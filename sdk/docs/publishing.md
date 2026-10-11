# Publishing

1. Bump `version` in `plugin.json` (semantic versioning: patch for fixes, minor for new features).
2. Zip the pack's contents and rename the zip to `.solixplugin`. Limits are 4 MB packed, 8 MB unpacked, 64 files and
   1 MB of JavaScript.
3. Optionally encrypt it with the SDK's packing tool so the source isn't readable.
4. Share the file. Players install it with **Plugins > Install File**. Installing a pack with the same `id` replaces the
   old version.

Before you publish, check your pack in the HUD editor at the smallest window size, with **Reset All**, so you see your
default positions rather than saved ones.

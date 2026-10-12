# SolixClient plugins

Hosted pack catalog for SolixClient. The client fetches [`index.json`](./index.json) (CORS-friendly via raw.githubusercontent.com) and downloads `.solixplugin` files on install, verifying SHA-256.

Edit memberships in the private repo at `plugins/sets.json`, then run `tools/publish-plugins.sh`.

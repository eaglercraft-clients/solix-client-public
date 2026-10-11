# Performance and safety

## Frame budget

All plugins share the frame. Keep each pack's `render` plus `tick` under about 4 ms per frame, and ideally well under
1 ms. In practice:

- Don't allocate big arrays or strings every frame. Build them in `tick` or when data changes.
- Measure text once per change, not every frame, when you can.
- Trim history buffers (graphs, feeds) to a fixed length.

## Safety

Plugins only see your own player, the client state and chat. There's no API for other players, mobs, nearby blocks or
packets, and that's deliberate. Packs that try to get around it are refused. Calls you didn't declare a hook for are
blocked and logged.

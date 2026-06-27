# DesktopRef

DesktopRef is an early Windows-first reference board application prototype built with Tauri and a dependency-free browser frontend.

## Current MVP scope

- Create and switch between boards.
- Import image files with the file picker or drag and drop.
- Paste images from the clipboard with `Ctrl+V`.
- Display imported images in an asset list.
- Place imported images on the active board.
- Move board objects by dragging them.
- Resize board objects by dragging their four corner handles.
- Persist boards and pasted/imported image data in browser local storage for the first prototype.
- Toggle always-on-top when running inside Tauri; browser preview keeps the visual pinned state only.

## Deferred scope

Video and GIF-specific playback controls are intentionally deferred until after the image board workflow is stable.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
# after installing the Tauri CLI and Rust dependencies
# cargo tauri build
```

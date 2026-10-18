# Building in this project

This app was made from `veryrobert/starter`. Keep to its stack and style.

## Stack
- React + TypeScript + Vite. Static build to `dist/`, deployed to GitHub Pages on push to `main`.
- Tailwind v4. Theme lives in `src/index.css` (`:root` tokens). Don't hardcode colours; use the tokens (`bg-background`, `text-muted-foreground`, `border-border`, `bg-panel`, …).
- shadcn/ui (Radix, `radix-nova`) for anything interactive. Add with `npx shadcn@latest add <name>`. Don't hand-build what shadcn already has.
- Lucide icons only, `strokeWidth={1.5}`, `size-5` (20px) in toolbars, `size-4` inline. Same in loom.
- Set the subdomain in `public/CNAME`.

## Style
- Dark only. True black page (`#000`); panels, sheets and fields are barely-off blacks, separated by hairline borders rather than fill. One warm off-white (`foreground`), one muted grey (`muted-foreground`). No other colours unless the app's content needs them.
- Minimal, refined typography: Geist (shadcn's typeface, bundled via `@fontsource-variable/geist`), Helvetica Neue as fallback; Geist Mono for code and figures. Never the system font first. 14px base, `text-xs`/`text-sm` for UI, `font-medium` at most. No bold headings, no uppercase labels, no letter-spaced eyebrows.
- Icons over text. Actions are icon buttons (`ToolButton`) with a required `label`, which becomes the tooltip and accessible name. Use text buttons only where an icon would be ambiguous.
- The content is the page. Layout: full-bleed stage, `PanelRail` top right (a column on desktop, a row on phones), settings in a `PanelSheet` (right on desktop, bottom half on phones), a few primary actions in a `Toolbar` inside an `ActionDock` along the bottom.
- Top right is places, the bottom is actions. Every `PanelRail` button opens a panel and changes nothing itself; every `Toolbar` button acts at once and never just opens a panel. Export is the last panel; downloading lives there, not in the toolbar. The stage keeps clear of whatever is open (see `layout.ts`). Floating UI uses the `panel` utility (frosted, hairline border, rounded-full for bars).
- Selected states invert (`bg-primary text-primary-foreground`), as in `Segmented`.
- App names are lowercase everywhere: `<title>`, README heading, the index (e.g. `cards`, `loom`).
- Short labels: one or two words. No helper paragraphs, no explainer copy, no emoji.
- No gradients, drop shadows, cards inside cards, coloured accent buttons or default shadcn demo looks.
- Respect `prefers-reduced-motion`; motion is short (150–250ms) and functional.

## Panels, icons and order (the same in every app)
- Panel order: what you make first (its own icon), then **Colour** (`Palette`), **Canvas** (`Frame`: Format and how the artboard shows), the app's own panels, **Library** (`Library`: saved work and past downloads), **Settings** (`SlidersHorizontal`), **Export** (`Download`) last.
- **Format** is the artboard's shape, always 1:1, 4:5, 9:16, 16:9, A4 in that order, from `shell/formats.ts`. Every app starts on **4:5** (apps that start from a photo or video start on Original). Apps that start from a photo or video put "Original" first. A file type is called **File** (MP4, GIF), never Format.
- One meaning per icon:
  - `SlidersHorizontal` Settings only. `Frame` Canvas. `Palette` Colour. `Library` Library. `Download` Export or save a file.
  - `Shuffle` randomise or new random (layout, order, image). `Undo2` undo. `RotateCcw` reset.
  - `Copy` copy to the clipboard. `CopyPlus` duplicate. `Trash2` delete or remove. `Plus` add. `Upload` your own file.
  - `Play`/`Pause` playback. `Bookmark` add to Library.
- Toolbar order: the main action first (shuffle, play), then the rest, then `Undo2`, then add-to-library or duplicate/delete for a selection.

## Shell components (`src/components/shell`)
- `PanelRail`, `PanelSheet`, `ActionDock`, `layout.ts` (`usePhone`, sizes, safe area): the responsive shell. On phones the panel buttons are a row top right and the actions a row along the bottom, both just icons.
- `ToolButton`: round icon button + tooltip.
- `Toolbar`, `ToolbarSeparator`: frosted pill bar.
- `Segmented`, `OnOff`: single-choice control; options can show an icon instead of text.
- `Swatches`: colour circles plus a custom picker.
- `FilePick`: load one file, show its name, clear it.
- `Field`, `FieldGroup`: labelled rows inside a sheet.
- `formats.ts`: the shared Format list (`FORMATS`, `formatTall`).
- `Splash`: the load screen. Each app has its own small mark, 3 to 8 stroke paths on a 32×32 grid (`pathLength={1}`), drawn in order with loom's timing, then faded.

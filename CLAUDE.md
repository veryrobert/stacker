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
- The content is the page. Layout: full-bleed stage, `PanelRail` (top right on desktop, a bottom pill on phones), settings in a `PanelSheet` (right on desktop, bottom half on phones), a few primary actions in a `Toolbar` inside an `ActionDock`. The stage keeps clear of whatever is open (see `layout.ts`). Floating UI uses the `panel` utility (frosted, hairline border, rounded-full for bars).
- Selected states invert (`bg-primary text-primary-foreground`), as in `Segmented`.
- App names are lowercase everywhere: `<title>`, README heading, the index (e.g. `cards`, `loom`).
- Short labels: one or two words. No helper paragraphs, no explainer copy, no emoji.
- No gradients, drop shadows, cards inside cards, coloured accent buttons or default shadcn demo looks.
- Respect `prefers-reduced-motion`; motion is short (150–250ms) and functional.

## Shell components (`src/components/shell`)
- `PanelRail`, `PanelSheet`, `ActionDock`, `layout.ts` (`usePhone`, sizes, safe area): the responsive shell. Phones get the controls at the bottom, within thumb reach.
- `ToolButton`: round icon button + tooltip.
- `Toolbar`, `ToolbarSeparator`: frosted pill bar.
- `Segmented`, `OnOff`: single-choice control; options can show an icon instead of text.
- `Swatches`: colour circles plus a custom picker.
- `FilePick`: load one file, show its name, clear it.
- `Field`, `FieldGroup`: labelled rows inside a sheet.
- `Splash`: the load screen. Each app has its own small mark, 3 to 8 stroke paths on a 32×32 grid (`pathLength={1}`), drawn in order with loom's timing, then faded.

# Branding & app logo

Reference for Kept's visual identity — the app icon concept, the generation
prompts used to produce it, and how the icon is wired into the app. Keep this in
sync with `apps/mobile/app.json` and `apps/mobile/assets/images/`.

---

## Identity in one line

**Kept** — a private, local-first personal expense **ledger with spending stats**.
The icon should say *personal ledger + insight*, calmly and at a glance. It must
read as a trustworthy finance tool, not a flashy one.

## Logo concept

The chosen direction merges the two things the app is into a **single mark**: a
short stack of **ledger rows that step upward like a bar chart**. The record and
the stats are the same shape — no separate arrow, no padlock, no coin.

Rejected earlier directions and why:

- **Padlock + coin** — too literal about "private" + "money"; generic.
- **Open ledger + separate bar chart + up-arrow** — too busy for an icon, thin
  outlines read weak at small sizes, and the "expenses going up" arrow is an off
  signal for a savings-minded tracker. (This was the first candidate,
  `kept-logo.png`; kept only as a reference of what to simplify away from.)

### Design rules

- **One idea, bold and filled** — solid geometric forms with heavy weight, not
  fine line-art. Must survive down to **48×48 px** (launcher / notification).
- **Fill the canvas** — the mark occupies ~80–85% of the frame with tight, even
  padding. No small logo floating in a large empty area.
- **Two-tone, flat** — no gradients, shadows, or text in the mark.
- **Trend neutral-to-flat**, not a steep climb, to avoid reading as "spending is
  rising."

### Color

| Token            | Value      | Use                                  |
| ---------------- | ---------- | ------------------------------------ |
| Money green      | `#0E7C66`  | Proposed mark color                  |
| Off-white        | `#F4F2ED`  | Proposed background                  |
| Current icon bg  | `#208AEF`  | **Shipping today** (blue) — see note |

> **Open decision — brand color.** The app currently ships a **blue**
> (`#208AEF`) adaptive-icon background and splash (`apps/mobile/app.json`),
> whereas the logo direction above is **teal-green**. Pick one before the next
> store release so the icon, splash, and in-app theme agree. This doc assumes the
> green direction; if we keep blue, update the palette here and regenerate the
> mark in blue.

---

## Generation prompts

### Primary — ledger-rows-as-bars (bold, filled, edge-to-edge)

> A bold, minimalist app icon for "Kept," a private personal-finance ledger with
> spending stats. **Single unified mark:** a set of 4–5 horizontal ledger rows
> that step upward in length like a bar chart — the record and the stats are the
> *same* shape. Solid, filled geometric forms with heavy, confident weight (not
> thin outlines). Flat vector, no gradients, no text, no drop shadows. Two-tone:
> deep teal-green (#0E7C66) mark on a soft off-white (#F4F2ED) background. Clean,
> calm, organized, trustworthy.
>
> **Composition is critical: the mark must FILL the square canvas edge-to-edge
> with only minimal, even padding — NOT a small logo floating in a large
> white/empty area.** The ledger-bars should occupy roughly 80–85% of the frame,
> centered, with tight balanced margins. Square 1:1 aspect ratio, 1024×1024,
> rounded-square icon silhouette. Legible and strong at small sizes down to
> 48×48 px.

### Alternates (same fill / bold / no-padding rules)

1. **Letter "K" from bars** — the "K" built from solid vertical bars of varying
   heights.
2. **Ledger page + filled trend area** — a solid book/page silhouette with a bold
   filled area-chart across the lower half.

### Notes for whatever generator you use

- Generators love to shrink the mark and pad it — if that happens, add
  *"tightly cropped to the mark, minimal margin"* or just crop the export.
- Ask for **flat vector, transparent background**, **1024×1024 PNG or SVG**, and
  keep important elements centered (adaptive icons keep content within the safe
  ~66% center zone).
- Generate 3–4 concepts and compare at small size before locking one.

---

## Wiring the icon into the app

Assets live in `apps/mobile/assets/images/` and are referenced from
`apps/mobile/app.json`:

| File                            | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `icon.png`                      | iOS / base app icon (1024×1024)                |
| `android-icon-foreground.png`   | Android adaptive icon — foreground (the mark)  |
| `android-icon-background.png`   | Android adaptive icon — background layer       |
| `android-icon-monochrome.png`  | Android themed-icon (monochrome) layer         |
| `splash-icon.png`               | Splash screen mark                             |
| `favicon.png`                   | Web favicon                                    |

Store-listing art lives in `store-assets/` (`play-icon-512.png`,
`play-feature-graphic-1024x500.png`).

**Android adaptive-icon rule:** the foreground mark must sit inside the central
safe zone (~66% of the frame) — the outer ring can be masked to any shape by the
launcher. The solid background color is set by `android.adaptiveIcon.backgroundColor`
in `app.json` (currently `#208AEF`; change alongside the color decision above).

After replacing any asset, regenerate/rebuild the icon and verify at small sizes
on a real launcher before release. See `RELEASING.md` for the release flow.

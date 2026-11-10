# Post Spinner

*A closet full of clothes. Nothing to wear.*
*A head full of ideas. Nothing to post.*

A spinning wheel for a fashion content creator. It answers "What should I post today?" with a format, a topic and a hook line, then tells the story of why below it.

The idea treats a post like an outfit: format is the cut, topic is the fabric, hook is the statement piece. Locking a ring is keeping the jacket and changing the shoes.

Plain HTML, CSS and JavaScript. No build step and no libraries.

## How to run it

Double-click `index.html`. It opens in your browser and works from there.

Or serve it locally, then open http://localhost:8000:

```bash
python3 -m http.server 8000
```

The fonts (Archivo and Instrument Sans) load from Google Fonts. Offline, the page falls back to system fonts and everything still works.

## How to edit the ideas

Open `data.js` in any text editor, change it, save, and refresh the page.

| To change | Edit | Example |
|---|---|---|
| Formats | `formats` | `"Reel", "Carousel", "Podcast clip"` |
| Topics | `topics` | `{ name: "Capsule wardrobe", niches: ["Outfits", "Educational"] },` |
| Hooks | a group inside `hooks` | `"Nobody tells you this about denim.",` |
| Filter chips | `niches` | Add the name here, then add it to topics and to `hooks` |

The wheel redraws itself from this file, so new items appear on the rings automatically.

- Every line needs its quotes and a comma at the end.
- A topic's `niches` decide which filter chips show it.
- Hooks are grouped by niche, so a hook suits the topic it lands on. A topic pulls from its own niches plus the `Any` group.
- If a quote or comma goes missing, the page shows a message saying so instead of failing silently.

## HCI principles applied

| Principle | Where it shows | Why it is defensible |
|---|---|---|
| Simplicity | The first screen does one job. No sign-up, no menus, no settings page. | Everything on it serves the question "What should I post today?". |
| Hick's law | Spin is the one big round button, alone at the centre of the wheel. Everything else is a plain outline. | With one clear primary action, she doesn't have to choose between options before starting. |
| Fitts's law | The hub is the largest control on the page, at least 112px across. On phones it sits low on the screen, in thumb reach. | A large, close target takes less time to hit. Toasts appear at the top, so they never cover it. |
| Feedback | Rings tick past the pointer, and the words change as they turn. Each ring lands with a thud, its wedge turns orange, and its text stamps in. Every action shows a toast, such as "Saved to favorites". | The system status is always visible, through sight, sound and touch. Nothing happens silently. |
| User control and freedom | Lock holds a ring still. Undo turns the wheel back. The last 5 spins can be restored. Stop ends a spin early. Removing a favorite offers Undo. Sound can be turned off. | Each action can be reversed, so trying things out carries no risk. Restoring swaps spins, so the current idea is never lost. |
| Recognition over recall | The whole set of options is visible on the wheel. Filters are chips, and the topics they exclude fade on the wheel. The last 5 spins and favorites stay listed. | She picks from what she can see instead of remembering earlier ideas. |
| Mapping | One ring per slot, and locking a ring stops that ring. | The control and what it affects look connected, so it needs no explaining. |
| Mental model | A physical prize wheel, and the outfit story in the copy. | She already knows how a wheel behaves and how getting dressed works, so nothing has to be learned. |
| Error prevention | Save skips duplicates. Spinning with all three locked explains why nothing moved. Save, Copy and Lock explain themselves before the first spin. | Dead ends get a plain next step instead of no response. |
| Consistency | One button style, one corner radius, and fixed colour meanings: orange is the action and its result, dark fill means "this is on". | Learning one control teaches the rest. |
| Visibility of state | A locked ring dims around the kept piece, and its button fills. Save changes to Saved. Undo looks unavailable when there is nothing to undo. | State is never shown by colour alone. |
| Accessibility: keyboard | Space or Enter spins while the wheel is on screen. Further down, Space scrolls as normal. Arrow keys move between filters. All controls are reachable by Tab with a visible focus ring. | A focused button keeps its own Space and Enter, as users of assistive technology expect. |
| Accessibility: screen readers | A live region reads each result, for example "Reel, Thrift haul, Hook: ...". The wheel itself is hidden from screen readers because the result text repeats it. Locks use `aria-pressed`, and filters are real radio buttons. | The spin is an animation, so its result also has to exist as text. |
| Accessibility: motion | With `prefers-reduced-motion`, the wheel jumps to the result, and the story and ticker stay still. | Motion is delight here, so removing it loses no function. |
| Accessibility: vision and touch | Text meets WCAG AA in both themes. A high-contrast toggle is remembered between visits. All targets are at least 44px. | Burnt orange is 3.6:1 on the off-white, which fails AA for small text, so it only appears as a fill with near-black text on it. |

## Design decisions

- **Palette:** warm off-white `#F4F1EA`, charcoal `#1B1B1B`, and one burnt orange `#D9531E`. Orange always means the action or its result.
- **The wheel rises from the bottom of the screen.** It's far bigger than the phone, so its text stays readable, and the hub lands under her thumb.
- **Type:** Archivo in heavy, condensed weights for the poster feel, and Instrument Sans for body text.
- **Story:** each scroll beat has its own layout, so it reads like a magazine feature and not a template.
- **Sound:** short synthesized ticks made in the browser, with no audio files. It can be switched off, and the choice is remembered.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `styles.css` | Look, layout and themes, mobile first |
| `app.js` | Wheel drawing, spin, lock, undo, favorites, keyboard and feedback |
| `data.js` | All the ideas. This is the file to edit. |

Favorites are stored in this browser's localStorage. Spin history lasts until the page is closed.

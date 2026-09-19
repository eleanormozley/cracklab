# CrackLab

An interactive, **educational** password-cracking visualiser for the Cyber Security Society
freshers' stall. Type a (fake, public) password, hit **CRACK IT**, and watch an attacker
take it apart in slow motion — sweeping leaked-password lists, latching onto dictionary
words, bolting on the obvious numbers/years, and brute-forcing whatever's left.

> It's a **dramatised simulation**. Real cracking of a password you can see is instant — the
> animation is deliberately slowed so a crowd can follow the method. No real hashing, no
> network, nothing leaves the page.

## Run it (zero install)

Just open **`index.html`** in Firefox or Chrome — double-click it, or drag it into a browser
tab. That's the whole deal. Perfect for a laptop at a stall; no server, no build, no internet.

### Optional: live-reload while editing

If you're tweaking it and want auto-refresh:

```bash
npm start        # runs: npx live-server on http://localhost:8080
```

(Requires Node; `npm start` uses `npx` so nothing is installed into the project.)

## Kiosk mode (the default) & controls

It's built to run unattended at a stall — keyboard only, no mouse:

- **Just start typing.** Any key focuses the box and begins a fresh password; there's a pulsing
  "start typing" prompt when idle.
- **Enter** cracks it. The view auto-scrolls: top while idle → centre while cracking → bottom
  for the verdict.
- **Type again to reset.** Once a crack finishes (or mid-run), pressing any letter wipes
  everything and starts the next person's password. **Space** or **Enter** on their own just
  reset to a clean, ready state. **Esc** also resets.
- The **cursor and scrollbar are hidden**, free scrolling is locked to those three positions,
  and it **requests fullscreen on the first keypress** — so it behaves like a retail kiosk.

**Dev mode:** open **`index.html?dev`** to switch all of that off — visible cursor, normal
scrolling, no forced fullscreen — while you're working on it.

> Tip for the day: launch the browser already in fullscreen/kiosk (`Chrome --kiosk`, or F11) and
> the fullscreen request becomes a no-op. On a shared laptop, `?dev` is your escape hatch.

## What it shows

The engine analyses whatever you type and stages a realistic attack chain, only including the
steps that apply:

| Stage                  | What it demonstrates                                           |
| ---------------------- | -------------------------------------------------------------- |
| **Dictionary sweep**   | Common passwords (`password`, `123456`, …) fall instantly.     |
| **Base-word match**    | Finds a real word hiding inside, e.g. `hunter` in `hunter22`.  |
| **l33t reversal**      | Undoes `a→4`, `e→3`, `o→0` etc. before guessing (`P@ssw0rd1`). |
| **Case rule**          | Tries capitalisation variants (`Summer…`).                     |
| **Mask / rule attack** | Appends common endings — `1`, `!`, `2024`, `22`.               |
| **Brute force**        | Odometer reels grind the keyspace for the truly random tail.   |

Then a **verdict card** contrasts the slowed on-screen time with a *realistic* estimate for an
offline GPU rig, plus a one-line takeaway.

### Try these at the stall
`password` · `hunter22` · `Summer2024!` · `P@ssw0rd1` · `Tr0ub4dor&3` · `correcthorsebatterystaple`

(There are one-tap chips for these in the UI. Use the **speed slider** to slow the reveal for
a crowd or speed through a demo.)

## Project layout

```
index.html        # single page, loads everything via relative paths
styles.css        # neon-cyberpunk theme, pure CSS (no external assets)
src/wordlist.js   # bundled attack data: common passwords, base words, suffixes, leet map
src/cracker.js    # the "brain": decomposes a password → a staged attack plan + time model
src/animator.js   # plays a plan back as the slowed, animated visualisation
src/app.js        # wires input / presets / slider / strength meter / verdict card
```

`cracker.js` (logic) and `animator.js` (visuals) are deliberately separate so you can tune the
"what it does" and the "how it looks" independently.

## Tweaking it

- **Add words / passwords:** edit the arrays in `src/wordlist.js`.
- **Add a preset chip:** add to the `PRESETS` array in `src/app.js`.
- **Change the "attacker speed" used for the realistic estimate:** `GUESSES_PER_SEC` in
  `src/cracker.js` (default `1e10` — a single high-end GPU vs a fast/unsalted hash).
- **Retheme:** the palette is CSS custom properties at the top of `styles.css`.

## Honesty / ethics note

This is a defensive teaching tool: it illustrates *why* weak passwords fall and *how* attackers
think, so people pick better ones. It performs no real cracking, stores nothing, and makes no
network requests. Times shown are illustrative.

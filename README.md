# Shiny Hunt Baseline App

A shiny hunting tracker inspired by shinyhunt.com, with dashboard tracking and a Pokédex-style shiny methods browser.

## Features

- Dashboard-style dark theme with navigation for **Dashboard** and **Pokédex** views.
- Create hunts with Pokémon, game, and method using game-scoped method options (including older games like GSC/HGSS with era-appropriate methods).
- Pokémon selector opens a large shiny-image grid and filters live as you type.
- Automatic per-encounter odds and a separate **"Seen shiny by now"** cumulative chance.
- Running stopwatch per hunt with one-click reset logging.
- Chain auto-adjusts with encounter increments/decrements and can be reset to zero.
- Pokédex page for clicking/searching Pokémon and viewing supported-game availability from encounter + species game data, then listing methods for each available game group.
- Pokémon artwork uses shiny sprites/artwork by default.
- Local persistence via browser `localStorage`.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

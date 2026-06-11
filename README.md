# BG Fight Calculator

A simple HTML app for calculating combat stats in **Baldur's Gate** games (AD&D 2e rules).

## Running

Open `index.html` in a browser — no install or build step required.

## Features

- Two teams of 1–6 characters (team lead = first character in the column)
- All enemy team members attack the opposing team's lead
- Per-character stats: hit chance, average damage per round, team damage share %
- Lead character also shows damage taken per round
- Weapon damage as **AdB + C + D** (D is not doubled on crit)
- Helmet on the defender blocks bonus critical damage
- Comparison mode — set alternate stats per character and see % change
- Monster presets — load Wolf, Gibberling, Dread Wolf, or Ghoul stats from BG

## Combat formulas

- **Hit:** roll ≥ THAC0 − AC (natural 1 = miss, natural 20 = hit)
- **Crit (5%):** doubles AdB + C; D stays the same
- **Per round:** APR × hit chance × average damage per hit

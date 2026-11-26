# Flightgame hub

Status page for the Flightgame apps (web game, Fly, Rust app). GitHub Pages serves index.html + app.js,
which read board.json. There is no build step.

When an agent working on any Flightgame repo starts or finishes a feature:
- edit `board.json` here (one feature per line; states done | doing | no | na | unknown; optional `who`, `note`),
- check it: `python3 -m json.tool board.json >/dev/null`,
- commit and push (`git pull --rebase` first: people and agents edit this file at the same time).

Keep feature names short and plain, as a player would say them. No commit hashes, file paths or
private details: the page is public, and the Rust repo is private.

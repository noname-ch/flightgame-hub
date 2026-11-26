# Flightgame hub

One page that shows which Flightgame app has which feature:
**https://noname-ch.github.io/flightgame-hub/**

| App | Repo |
|---|---|
| Web game | [noname-ch/flightgame](https://github.com/noname-ch/flightgame) |
| Fly (fly it yourself) | [noname-ch/flightgame-fly](https://github.com/noname-ch/flightgame-fly) |
| Rust app | [lianhirter-arch/flightgame-rust](https://github.com/lianhirter-arch/flightgame-rust) |

Green ✓ = done, yellow = being worked on, — = not there yet, n/a = not needed in that app, ? = not checked.
Click a column header to sort (missing and in-progress features come first).

## Asking for something

Click any cell (for example **A340-300 · Working buttons and systems** under **Rust app**), choose what should happen,
write a line and press **Send request**. That opens a filled-in GitHub issue here (press *Create*); the cell gets a 💬
and the request shows at the top of the page. Agents list them with `tools/board.py requests` and work through them
(see [CLAUDE.md](CLAUDE.md)). **Copy for an agent** copies the same text to paste straight into a Claude session.

## Updating the list

Everything is in [`board.json`](board.json), one row per line: the game's features, then every aircraft by category.
Easiest with the helper:

```sh
tools/board.py find a340 buttons
tools/board.py set "A340-300 · Working buttons and systems" rust doing --who Lian
git commit -am "Board: A340-300 buttons in Rust" && git push
```

States: `done` (green), `doing` (yellow), `no`, `na` (not needed in that app), `unknown`.

Look at it locally: `python3 -m http.server` and open http://localhost:8000.

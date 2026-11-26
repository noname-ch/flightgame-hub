# Flightgame hub

Public status page for the Flightgame apps: web game (noname-ch/flightgame), Fly (noname-ch/flightgame-fly),
Rust app (lianhirter-arch/flightgame-rust). GitHub Pages serves index.html + app.js, which read board.json.
No build step. Page: https://noname-ch.github.io/flightgame-hub/

## Requests (people ask on the page, agents do them)

Clicking a cell on the page makes a GitHub issue in noname-ch/flightgame-hub labelled `request`. Its body ends
with a machine-readable block:

    ---
    feature: A340-300 · Working buttons and systems
    app: rust            (web | fly | rust)
    ask: add             (add | fix | doing | done | other)
    state-now: no

List them: `tools/board.py requests`.
- `ask: done` / `ask: doing`: just set the cell (`tools/board.py set …`), push, close the issue.
- `ask: add` / `fix` / `other`: the work happens in that app's repo. Comment on the issue that you are on it and set
  the cell to `doing`; when it is pushed set it to `done` (or what is true), push the board, close the issue with a
  short comment saying what changed.
- Only take requests for the repo you are working in, unless the user says otherwise.

## Keeping the board true

When you start or finish a feature in any Flightgame repo, update its row:

    git pull --rebase
    tools/board.py find a340 buttons                     # exact row names
    tools/board.py set "A340-300 · Working buttons and systems" rust doing --who Lian
    tools/board.py add "Airbus A320 family" "Realistic 3D cockpit" --plane A321XLR --section Aircraft --fly no --rust done --web na
    git commit -am "Board: …" && git push

States: done (green), doing (yellow), no, na (not needed in that app), unknown. Every aircraft is its own group
(section Aircraft, with a `family` such as "Airbus A330 / A340"); its rows are named "<plane> · <feature>". Keep names short and plain, as a player would say
them. No commit hashes, file paths or private details: the page is public, and the Rust repo is private.

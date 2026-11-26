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

## Updating the list

Everything is in [`board.json`](board.json), one feature per line:

```json
{"name": "Volumetric clouds, weather systems, lightning", "web": "no", "fly": "doing", "rust": "done", "who": {"fly": "Eric"}, "note": "…"}
```

- States: `done`, `doing`, `no`, `na`, `unknown`.
- `who` and `note` are optional.
- When you **start** a feature in an app, set that app to `doing`. When it is pushed, set it to `done`.
- A new feature goes into the matching group (or a new group).

Check it is still valid JSON, then commit and push:

```sh
python3 -m json.tool board.json >/dev/null && git commit -am "Board: …" && git push
```

Look at it locally: `python3 -m http.server` and open http://localhost:8000.

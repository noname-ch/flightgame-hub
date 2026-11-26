#!/usr/bin/env python3
"""The hub's board for agents and people.

  tools/board.py requests                     open requests from the page (GitHub issues labelled 'request')
  tools/board.py find a340 buttons            rows whose name matches all the words
  tools/board.py set "A340-300 · Working buttons and systems" rust doing [--who Lian]
  tools/board.py set "Multiplayer rooms" fly na
  tools/board.py add "Airline game" "Loans" --web no --fly na --rust no [--plane X] [--note "…"]

`set` and `add` rewrite board.json in its one-feature-per-line layout; commit and push yourself.
A feature is named as the page shows it: "<plane> · <name>" for aircraft rows, "<name>" otherwise.
"""
import argparse, json, subprocess, sys
from pathlib import Path

BOARD = Path(__file__).resolve().parent.parent / "board.json"
REPO = "noname-ch/flightgame-hub"
STATES = ["done", "doing", "no", "na", "unknown"]


def load():
    return json.loads(BOARD.read_text())


def save(b):
    d = lambda o: json.dumps(o, ensure_ascii=False)
    out = ["{", f'  "_help": {d(b["_help"])},', '  "apps": [']
    out += ["    " + d(a) + ("," if i < len(b["apps"]) - 1 else "") for i, a in enumerate(b["apps"])]
    out += ["  ],", '  "groups": [']
    for gi, g in enumerate(b["groups"]):
        out += ["    {", f'      "name": {d(g["name"])},', f'      "section": {d(g.get("section", "Game"))},', '      "features": [']
        out += ["        " + d(f) + ("," if i < len(g["features"]) - 1 else "") for i, f in enumerate(g["features"])]
        out += ["      ]", "    }" + ("," if gi < len(b["groups"]) - 1 else "")]
    out += ["  ]", "}"]
    BOARD.write_text("\n".join(out) + "\n")
    json.loads(BOARD.read_text())  # still valid


def full(f):
    return (f["plane"] + " · " if f.get("plane") else "") + f["name"]


def rows(b):
    for g in b["groups"]:
        for f in g["features"]:
            yield g, f


def cmd_requests(_):
    out = subprocess.run(["gh", "issue", "list", "-R", REPO, "--label", "request", "--state", "open",
                          "--json", "number,title,body,author,url"], capture_output=True, text=True)
    if out.returncode:
        sys.exit(out.stderr)
    items = json.loads(out.stdout)
    if not items:
        print("No open requests.")
    for i in items:
        meta = dict(l.split(":", 1) for l in i["body"].split("\n---\n")[-1].splitlines() if ":" in l)
        meta = {k.strip(): v.strip() for k, v in meta.items()}
        text = i["body"].split("\n---\n")[0].strip()
        print(f"#{i['number']} [{meta.get('app', '?')}] {meta.get('feature', i['title'])}  (ask: {meta.get('ask', '?')}, "
              f"now: {meta.get('state-now', '?')}, by {i['author']['login']})\n    {text}\n    {i['url']}")


def cmd_find(a):
    words = [w.lower() for w in a.words]
    b = load()
    for g, f in rows(b):
        hay = (full(f) + " " + g["name"] + " " + f.get("note", "")).lower()
        if all(w in hay for w in words):
            print(f'{full(f)!r:60}  ' + "  ".join(f'{x["key"]}={f.get(x["key"], "unknown")}' for x in b["apps"]) + f"   [{g['name']}]")


def cmd_set(a):
    b = load()
    keys = [x["key"] for x in b["apps"]]
    if a.app not in keys:
        sys.exit(f"app must be one of {keys}")
    hits = [f for _, f in rows(b) if full(f).lower() == a.feature.lower()]
    if len(hits) != 1:
        sys.exit(f"{len(hits)} rows named {a.feature!r}; use `find` to get the exact name")
    f = hits[0]
    f[a.app] = a.state
    if a.who is not None:
        f.setdefault("who", {})[a.app] = a.who
        if not a.who:
            f["who"].pop(a.app)
    if a.note is not None:
        f["note"] = a.note
    if f.get("who") == {}:
        f.pop("who")
    save(b)
    print(f"{full(f)}: {a.app} = {a.state}")


def cmd_add(a):
    b = load()
    g = next((g for g in b["groups"] if g["name"].lower() == a.group.lower()), None)
    if not g:
        g = {"name": a.group, "section": a.section, "features": []}
        b["groups"].append(g)
    f = ({"plane": a.plane} if a.plane else {}) | {"name": a.name}
    for x in b["apps"]:
        f[x["key"]] = getattr(a, x["key"]) or "no"
    if a.note:
        f["note"] = a.note
    g["features"].append(f)
    save(b)
    print(f"Added {full(f)} to {g['name']}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest="cmd", required=True)
    s.add_parser("requests").set_defaults(fn=cmd_requests)
    f = s.add_parser("find"); f.add_argument("words", nargs="*"); f.set_defaults(fn=cmd_find)
    t = s.add_parser("set"); t.add_argument("feature"); t.add_argument("app"); t.add_argument("state", choices=STATES)
    t.add_argument("--who"); t.add_argument("--note"); t.set_defaults(fn=cmd_set)
    d = s.add_parser("add"); d.add_argument("group"); d.add_argument("name"); d.add_argument("--plane")
    d.add_argument("--section", default="Game", choices=["Game", "Aircraft"]); d.add_argument("--note")
    for k in ("web", "fly", "rust"):
        d.add_argument("--" + k, choices=STATES)
    d.set_defaults(fn=cmd_add)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()

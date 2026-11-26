// Draws board.json: app cards, open requests and the feature list (sortable, foldable, click a cell to ask for something).
const REPO = "noname-ch/flightgame-hub";
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const LABEL = { done: "✓", doing: "<span>working</span>", no: "—", na: "n/a", unknown: "?" };
const TITLE = { done: "done", doing: "being worked on", no: "not there yet", na: "not needed there", unknown: "not checked yet" };
const RANK = { doing: 0, no: 1, unknown: 2, done: 3, na: 4 }; // sort: what needs attention first
const ASKS = [
  ["add", "Add it / make it work"],
  ["fix", "Something is wrong"],
  ["doing", "I'm working on it (yellow)"],
  ["done", "It's done (green)"],
  ["other", "Something else"],
];
const fullName = f => (f.plane ? f.plane + " · " : "") + f.name;

Promise.all([
  fetch("board.json", { cache: "no-cache" }).then(r => r.json()),
  fetch(`https://api.github.com/repos/${REPO}/issues?labels=request&state=open&per_page=100`)
    .then(r => r.ok ? r.json() : []).catch(() => []),
]).then(([B, issues]) => start(B, issues)).catch(e => {
  $("matrix").innerHTML = `<tr><td class="empty">Could not load board.json (${esc(e.message)}).
    Opened as a file? Run <code>python3 -m http.server</code> in the repo and open http://localhost:8000.</td></tr>`;
});

// A request issue ends with "feature: …" and "app: …" lines (written by the dialog below).
function parseRequest(i) {
  const get = k => ((i.body || "").match(new RegExp(`^${k}:\\s*(.+)$`, "mi")) || [])[1]?.trim();
  return { n: i.number, url: i.html_url, title: i.title, by: i.user?.login, feature: get("feature"), app: get("app"), ask: get("ask"),
    text: (i.body || "").split(/\n---\n/)[0].trim() };
}

function start(B, issues) {
  const apps = B.apps;
  const appOf = Object.fromEntries(apps.map(a => [a.key, a]));
  const color = k => `var(--${k})`;
  const feats = B.groups.flatMap((g, gi) => g.features.map((f, i) => ({ ...f, group: g.name, section: g.section || "Game", order: gi * 1000 + i })));
  const reqs = (Array.isArray(issues) ? issues : []).filter(i => !i.pull_request).map(parseRequest);
  const reqsFor = (f, a) => reqs.filter(r => r.feature === fullName(f) && r.app === a.key);
  const open = new Set(B.groups.filter(g => (g.section || "Game") === "Game").map(g => g.name)); // Aircraft folded at first

  // App cards
  $("apps").innerHTML = apps.map(a => {
    const line = sec => {
      const cells = feats.filter(f => f.section === sec).map(f => f[a.key]).filter(s => s && s !== "na");
      const n = s => cells.filter(x => x === s).length;
      return { cells, n, text: `${sec}: ${n("done")}/${cells.length}${n("doing") ? ` · ${n("doing")} working` : ""}` };
    };
    const all = feats.map(f => f[a.key]).filter(s => s && s !== "na");
    const pct = s => (100 * all.filter(x => x === s).length / (all.length || 1)).toFixed(1) + "%";
    const r = reqs.filter(x => x.app === a.key).length;
    return `<div class="app" style="--c:${color(a.key)}">
      <h2>${esc(a.name)}${r ? ` <small>💬 ${r} request${r > 1 ? "s" : ""}</small>` : ""}</h2>
      <div class="meta">${line("Game").text} · ${line("Aircraft").text}</div>
      <div class="bar"><i style="width:${pct("done")};background:var(--done)"></i><i style="width:${pct("doing")};background:var(--doing)"></i></div>
      <div class="links">${a.live ? `<a href="${esc(a.live)}">▶ Play</a>` : ""}<a href="https://github.com/${esc(a.repo)}">GitHub</a></div></div>`;
  }).join("");

  // Open requests
  $("reqs").hidden = !reqs.length;
  $("reqList").innerHTML = reqs.map(r => `<div class="row" style="--c:${color(r.app)}">
      <span class="tag">${esc(appOf[r.app]?.name || r.app || "?")}</span>
      <span class="msg"><a href="${esc(r.url)}">#${r.n} ${esc(r.feature || r.title)}</a>${r.text ? ` <span class="muted">· ${esc(r.text.slice(0, 140))}</span>` : ""}</span>
      <span class="when">${esc(r.by || "")}</span></div>`).join("");

  // Filters, search, sorting, folding
  const missing = s => ["no", "unknown", "doing"].includes(s);
  const FILTERS = [
    ["all", "All", () => true],
    ["doing", "Being worked on", f => apps.some(a => f[a.key] === "doing")],
    ["req", "Has requests", f => apps.some(a => reqsFor(f, a).length)],
    ["gap", "Missing somewhere", f => apps.some(a => missing(f[a.key]))],
    ...apps.map(a => ["no-" + a.key, "Missing in " + a.name, f => missing(f[a.key])]),
  ];
  let filter = "all", query = [], sort = { key: null, dir: 1 };
  $("filters").innerHTML = FILTERS.map(([k, l]) => `<button class="chip" data-f="${k}" aria-pressed="${k === filter}">${l}</button>`).join("")
    + `<input type="search" id="q" placeholder="Search: a340 buttons, 737, rust…">`
    + `<button class="chip" id="openAll">Open all</button><button class="chip" id="closeAll">Close all</button>`;
  $("filters").addEventListener("click", e => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    filter = b.dataset.f;
    $("filters").querySelectorAll("[data-f]").forEach(x => x.setAttribute("aria-pressed", x.dataset.f === filter));
    draw();
  });
  $("q").addEventListener("input", e => { query = e.target.value.toLowerCase().split(/\s+/).filter(Boolean); draw(); });
  $("openAll").onclick = () => { B.groups.forEach(g => open.add(g.name)); draw(); };
  $("closeAll").onclick = () => { open.clear(); draw(); };
  $("matrix").addEventListener("click", e => {
    const th = e.target.closest("th[data-sort]");
    if (th) {
      const k = th.dataset.sort;
      if (sort.key !== k) sort = { key: k, dir: 1 }; else if (sort.dir === 1) sort.dir = -1; else sort = { key: null, dir: 1 };
      return draw();
    }
    const g = e.target.closest("tr[data-group]");
    if (g) { open.has(g.dataset.group) ? open.delete(g.dataset.group) : open.add(g.dataset.group); return draw(); }
    const c = e.target.closest("td[data-i]");
    if (c) ask(feats[+c.dataset.i], appOf[c.dataset.app]);
  });

  function cell(f, a) {
    const s = f[a.key] || "unknown";
    const who = f.who?.[a.key];
    const r = reqsFor(f, a).length;
    const tip = `${a.name}: ${TITLE[s] || s}${who ? " (" + who + ")" : ""}${r ? ` · ${r} open request${r > 1 ? "s" : ""}` : ""} · click to ask for something`;
    return `<td class="c ask" data-i="${feats.indexOf(f)}" data-app="${a.key}"><b class="s ${esc(s)}" title="${esc(tip)}">${LABEL[s] || "?"}</b>${r ? `<i class="req">💬${r > 1 ? r : ""}</i>` : ""}</td>`;
  }
  // A folded group's row still shows how far each app is.
  function summary(rows, a) {
    const cells = rows.map(f => f[a.key]).filter(s => s && s !== "na");
    if (!cells.length) return `<td class="c"><span class="sum na">n/a</span></td>`;
    const done = cells.filter(s => s === "done").length, doing = cells.filter(s => s === "doing").length;
    const k = done === cells.length ? "done" : doing ? "doing" : done ? "part" : "no";
    const r = rows.reduce((n, f) => n + reqsFor(f, a).length, 0);
    return `<td class="c"><span class="sum ${k}">${done}/${cells.length}</span>${r ? `<i class="req">💬${r > 1 ? r : ""}</i>` : ""}</td>`;
  }
  const arrow = k => sort.key === k ? `<span class="arrow">${sort.dir === 1 ? "▲" : "▼"}</span>` : "";
  const label = (f, grp) => `<td>${grp ? `<span class="grp">${esc(f.group)}</span>` : ""}${f.plane ? `<b>${esc(f.plane)}</b> · ` : ""}${esc(f.name)}${f.note ? `<span class="note">${esc(f.note)}</span>` : ""}</td>`;

  function draw() {
    const keep = FILTERS.find(x => x[0] === filter)[2];
    const hay = f => (fullName(f) + " " + (f.note || "") + " " + f.group + " " + f.section).toLowerCase();
    const rows = feats.filter(f => keep(f) && query.every(w => hay(f).includes(w)));
    const narrowed = filter !== "all" || query.length;
    const head = `<thead><tr><th data-sort="name">Feature ${arrow("name")}</th>${apps.map(a => {
      const cells = feats.map(f => f[a.key]).filter(s => s && s !== "na");
      return `<th class="c" data-sort="${a.key}" style="--c:${color(a.key)}">${esc(a.name)} ${arrow(a.key)}<small>${cells.filter(s => s === "done").length}/${cells.length}</small></th>`;
    }).join("")}</tr></thead>`;
    const span = apps.length + 1;
    let body = "";
    if (sort.key) {
      const val = f => sort.key === "name" ? fullName(f).toLowerCase() : (RANK[f[sort.key]] ?? 2);
      body = rows.slice().sort((x, y) => (val(x) < val(y) ? -1 : val(x) > val(y) ? 1 : x.order - y.order) * sort.dir)
        .map(f => `<tr>${label(f, true)}${apps.map(a => cell(f, a)).join("")}</tr>`).join("");
    } else {
      let section = "";
      for (const g of B.groups) {
        const rs = rows.filter(f => f.group === g.name);
        if (!rs.length) continue;
        if ((g.section || "Game") !== section) {
          section = g.section || "Game";
          body += `<tr class="section"><td colspan="${span}">${esc(section)}</td></tr>`;
        }
        const isOpen = narrowed || open.has(g.name);
        const planes = new Set(rs.map(f => f.plane).filter(Boolean)).size;
        body += `<tr class="group" data-group="${esc(g.name)}"><td><span class="fold">${isOpen ? "▾" : "▸"}</span> ${esc(g.name)}
          <span class="cnt">${planes ? planes + " aircraft" : rs.length + " features"}</span></td>${apps.map(a => summary(rs, a)).join("")}</tr>`;
        if (isOpen) body += rs.map(f => `<tr>${label(f, false)}${apps.map(a => cell(f, a)).join("")}</tr>`).join("");
      }
    }
    $("matrix").innerHTML = head + `<tbody>${body || `<tr><td class="empty" colspan="${span}">Nothing matches.</td></tr>`}</tbody>`;
  }
  draw();

  // Click a cell: say what should happen → a GitHub issue labelled "request" that agents read.
  const dlg = $("ask");
  function ask(f, a) {
    const s = f[a.key] || "unknown";
    const name = fullName(f);
    const existing = reqsFor(f, a);
    const pre = s === "done" ? "fix" : s === "doing" ? "other" : "add";
    dlg.innerHTML = `<form method="dialog">
      <h3><span class="tag" style="--c:${color(a.key)}">${esc(a.name)}</span> ${esc(name)}</h3>
      <p class="muted">Now: <b class="s ${esc(s)}">${LABEL[s] || "?"}</b> ${TITLE[s] || s}${f.who?.[a.key] ? " · " + esc(f.who[a.key]) : ""}${f.note ? "<br>" + esc(f.note) : ""}</p>
      ${existing.length ? `<p class="muted">Open requests: ${existing.map(r => `<a href="${esc(r.url)}" target="_blank">#${r.n}</a>`).join(", ")}</p>` : ""}
      <div class="asks">${ASKS.map(([k, l]) => `<label><input type="radio" name="ask" value="${k}" ${k === pre ? "checked" : ""}> ${l}</label>`).join("")}</div>
      <textarea name="text" rows="4" placeholder="What should happen? e.g. the fuel pumps on the overhead don't do anything"></textarea>
      <div class="btns">
        <button value="cancel" class="chip">Cancel</button>
        <button type="button" class="chip" id="copyAsk" title="Copy the request to paste into a Claude session">Copy for an agent</button>
        <button type="button" class="chip primary" id="sendAsk">Send request (GitHub)</button>
      </div>
      <p class="muted small">Sending opens a GitHub issue in ${REPO}, already filled in: press "Create" there. Agents work through these.</p>
    </form>`;
    const build = () => {
      const fd = new FormData(dlg.querySelector("form"));
      const k = fd.get("ask"), text = (fd.get("text") || "").trim();
      const what = ASKS.find(x => x[0] === k)[1].replace(/ \(.*\)$/, "");
      const title = `[${a.name}] ${name}: ${text ? text.split("\n")[0].slice(0, 70) : what.toLowerCase()}`;
      const body = `${text || what}\n\n---\nfeature: ${name}\napp: ${a.key}\nask: ${k}\nstate-now: ${s}\n`;
      return { title, body };
    };
    dlg.querySelector("#sendAsk").onclick = () => {
      const { title, body } = build();
      const url = `https://github.com/${REPO}/issues/new?` + new URLSearchParams({ title, body, labels: "request" });
      window.open(url, "_blank", "noopener");
      dlg.close();
    };
    dlg.querySelector("#copyAsk").onclick = async e => {
      const { title, body } = build();
      try {
        await navigator.clipboard.writeText(`Flightgame request (${REPO}): ${title}\n\n${body}`);
        e.target.textContent = "Copied ✓";
      } catch { e.target.textContent = "Copy failed"; }
    };
    dlg.showModal();
    dlg.querySelector("textarea").focus();
  }
}

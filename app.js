// Draws board.json: app cards + the sortable feature list.
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const LABEL = { done: "✓", doing: "<span>working</span>", no: "—", na: "n/a", unknown: "?" };
const TITLE = { done: "done", doing: "being worked on", no: "not there yet", na: "not needed there", unknown: "not checked yet" };
// Sort order for a status column: what needs attention first.
const RANK = { doing: 0, no: 1, unknown: 2, done: 3, na: 4 };

fetch("board.json", { cache: "no-cache" })
  .then(r => r.json())
  .then(start)
  .catch(e => {
    $("matrix").innerHTML = `<tr><td class="empty">Could not load board.json (${esc(e.message)}).
      Opened as a file? Run <code>python3 -m http.server</code> in the repo and open http://localhost:8000.</td></tr>`;
  });

function start(B) {
  const apps = B.apps;
  const color = k => `var(--${k})`;
  const feats = B.groups.flatMap((g, gi) => g.features.map((f, i) => ({ ...f, group: g.name, order: gi * 1000 + i })));

  // App cards
  $("apps").innerHTML = apps.map(a => {
    const cells = feats.map(f => f[a.key]).filter(s => s && s !== "na");
    const n = s => cells.filter(x => x === s).length;
    const pct = s => (100 * n(s) / (cells.length || 1)).toFixed(1) + "%";
    return `<div class="app" style="--c:${color(a.key)}">
      <h2>${esc(a.name)}</h2>
      <div class="meta">${n("done")} of ${cells.length} features done · ${n("doing")} being worked on · ${n("no")} missing</div>
      <div class="bar"><i style="width:${pct("done")};background:var(--done)"></i><i style="width:${pct("doing")};background:var(--doing)"></i></div>
      <div class="links">
        ${a.live ? `<a href="${esc(a.live)}">▶ Play</a>` : ""}
        <a href="https://github.com/${esc(a.repo)}">GitHub</a>
      </div></div>`;
  }).join("");

  // Filters
  const FILTERS = [
    ["all", "All", () => true],
    ["doing", "Being worked on", f => apps.some(a => f[a.key] === "doing")],
    ["gap", "Missing somewhere", f => apps.some(a => ["no", "unknown", "doing"].includes(f[a.key]))],
    ...apps.map(a => ["no-" + a.key, "Missing in " + a.name, f => ["no", "unknown", "doing"].includes(f[a.key])]),
  ];
  let filter = "all", query = "", sort = { key: null, dir: 1 };
  $("filters").innerHTML = FILTERS.map(([k, l]) => `<button class="chip" data-f="${k}" aria-pressed="${k === filter}">${l}</button>`).join("")
    + `<input type="search" id="q" placeholder="Search features…">`;
  $("filters").addEventListener("click", e => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    filter = b.dataset.f;
    $("filters").querySelectorAll("[data-f]").forEach(x => x.setAttribute("aria-pressed", x.dataset.f === filter));
    draw();
  });
  $("q").addEventListener("input", e => { query = e.target.value.toLowerCase(); draw(); });

  // Sorting: click a header; click again to flip; a third time goes back to the groups.
  $("matrix").addEventListener("click", e => {
    const th = e.target.closest("th[data-sort]"); if (!th) return;
    const k = th.dataset.sort;
    if (sort.key !== k) sort = { key: k, dir: 1 };
    else if (sort.dir === 1) sort.dir = -1;
    else sort = { key: null, dir: 1 };
    draw();
  });

  function cell(f, a) {
    const s = f[a.key] || "unknown";
    const who = f.who?.[a.key];
    const tip = `${a.name}: ${TITLE[s] || s}${who ? " (" + who + ")" : ""}`;
    return `<td class="c"><b class="s ${esc(s)}" title="${esc(tip)}">${LABEL[s] || "?"}</b></td>`;
  }
  const arrow = k => sort.key === k ? `<span class="arrow">${sort.dir === 1 ? "▲" : "▼"}</span>` : "";

  function draw() {
    const keep = FILTERS.find(x => x[0] === filter)[2];
    let rows = feats.filter(f => keep(f) && (!query || (f.name + " " + (f.note || "") + " " + f.group).toLowerCase().includes(query)));
    const head = `<thead><tr><th data-sort="name">Feature ${arrow("name")}</th>${apps.map(a => {
      const cells = feats.map(f => f[a.key]).filter(s => s && s !== "na");
      return `<th class="c" data-sort="${a.key}" style="--c:${color(a.key)}">${esc(a.name)} ${arrow(a.key)}<small>${cells.filter(s => s === "done").length}/${cells.length}</small></th>`;
    }).join("")}</tr></thead>`;
    const row = (f, grp) => `<tr><td>${grp ? `<span class="grp">${esc(f.group)}</span>` : ""}${esc(f.name)}${f.note ? `<span class="note">${esc(f.note)}</span>` : ""}</td>${apps.map(a => cell(f, a)).join("")}</tr>`;
    let body = "";
    if (sort.key) {
      const val = f => sort.key === "name" ? f.name.toLowerCase() : (RANK[f[sort.key]] ?? 2);
      rows = rows.slice().sort((x, y) => (val(x) < val(y) ? -1 : val(x) > val(y) ? 1 : x.order - y.order) * sort.dir);
      body = rows.map(f => row(f, true)).join("");
    } else {
      for (const g of B.groups) {
        const rs = rows.filter(f => f.group === g.name);
        if (!rs.length) continue;
        body += `<tr class="group"><td colspan="${apps.length + 1}">${esc(g.name)}</td></tr>` + rs.map(f => row(f, false)).join("");
      }
    }
    $("matrix").innerHTML = head + `<tbody>${body || `<tr><td class="empty" colspan="${apps.length + 1}">Nothing matches.</td></tr>`}</tbody>`;
  }
  draw();
}

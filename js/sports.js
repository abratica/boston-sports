/* Boston Sports layout: scoreboard green. Renders an issue and the archive as HTML strings. */
(() => {
  const TEAMS = {
    patriots: { color: "#1D4F8C" },
    celtics:  { color: "#007A33" },
    bruins:   { color: "#E0A31A" },
    redsox:   { color: "#BD3039" },
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const teamVar = (key) => `--team:${(TEAMS[key] || {}).color || "var(--muted)"}`;
  const longDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US",
    { weekday: "long", month: "long", day: "numeric" });
  const shortDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US",
    { weekday: "short", month: "short", day: "numeric" });
  const chevron = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function masthead(name, sub, ctx) {
    return `<header class="masthead${ctx.backHref ? "" : " no-back"}">
      ${ctx.backHref ? `<a class="back" href="${ctx.backHref}" aria-label="${esc(ctx.backLabel)}">‹</a>` : ""}
      <h1 class="wordmark">${esc(name).replace(/ (\S+)$/, " <span>$1</span>")}</h1>
      <p class="dateline">${esc(sub)}</p>
      ${window.themeButton ? window.themeButton() : ""}
    </header>`;
  }

  // ESPN's public scoreboard feed, used for live scores in Today's games.
  const SPORT_PATH = { nba: "basketball/nba", nhl: "hockey/nhl", nfl: "football/nfl", mlb: "baseball/mlb" };
  const ESPN_ABBR = { patriots: "NE", celtics: "BOS", bruins: "BOS", redsox: "BOS" };

  function board(today, date, off) {
    const ymd = String(date || "").replace(/-/g, "");
    const rows = (today || []).map((g) => {
      const league = SPORT_PATH[g.league] ? g.league : "";
      const href = league ? `https://www.espn.com/${league}/scoreboard/_/date/${ymd}` : "";
      const attrs = league ? ` href="${href}" target="_blank" rel="noopener" data-league="${league}" data-abbr="${ESPN_ABBR[g.teamKey] || ""}"` : "";
      const tag = league ? "a" : "div";
      return `<${tag} class="board-row"${attrs}>
        <div class="board-team"><span class="chip" style="${teamVar(g.teamKey)}"></span>${esc(g.team)}${
          g.record ? ` <span class="board-rec">${esc(g.record)}</span>` : ""}</div>
        <div class="board-time">${esc(g.time)}</div>
        <div class="board-detail">${esc(g.matchup)}${g.oppRecord ? ` (${esc(g.oppRecord)})` : ""}</div>
        <div class="board-venue">${esc(g.venue || "")}</div>
        ${g.tv ? `<div class="board-tv"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${esc(g.tv)}</div>` : ""}
      </${tag}>`;
    }).join("");
    const next = (off || []).map((o) => `<div class="board-next">
        <span class="chip" style="${teamVar(o.teamKey)}"></span><b>${esc(o.team)}</b>
        <span>${esc(String(o.text || "").replace(/^Next:\s*/, ""))}</span></div>`).join("");
    return `<section class="board" aria-label="Today's games">
      <h2>Today's games</h2>
      ${rows || `<div class="board-empty">No Boston games today.</div>`}
      ${next ? `<div class="board-upnext"><h3>Upcoming games</h3>${next}</div>` : ""}
    </section>`;
  }

  /* ── Highlight videos (official YouTube uploads) ──
     Shows a thumbnail; the YouTube player only loads when tapped. */
  const ytId = (id) => String(id || "").replace(/[^A-Za-z0-9_-]/g, "");
  function player(v) {
    const id = ytId(v.id);
    return `<button class="yt" type="button" data-yt="${id}" aria-label="Play: ${esc(v.title)}">
      <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
      <span class="yt-play" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
    </button>`;
  }
  function videos(list) {
    const vids = (list || []).filter((v) => ytId(v.id));
    if (!vids.length) return "";
    const [main, ...more] = vids;
    return `<div class="vids">
      <div class="yt-slot">${player(main)}</div>
      <p class="yt-cap"><span class="yt-title">${esc(main.title)}</span> <span class="yt-ch">${esc(main.channel || "")}</span></p>
      ${more.length ? `<ul class="yt-more">${more.map((v) => `<li><button type="button" class="yt-swap" data-yt="${ytId(v.id)}" data-title="${esc(v.title)}" data-ch="${esc(v.channel || "")}">
          <img src="https://i.ytimg.com/vi/${ytId(v.id)}/mqdefault.jpg" alt="" loading="lazy">
          <span><span class="yt-title">${esc(v.title)}</span><span class="yt-ch">${esc(v.channel || "")}</span></span>
        </button></li>`).join("")}</ul>` : ""}
    </div>`;
  }
  function embed(id) {
    return `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0" title="Highlights" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  }
  document.addEventListener("click", (e) => {
    const play = e.target.closest(".yt[data-yt]");
    if (play) { play.outerHTML = embed(ytId(play.dataset.yt)); return; }
    const swap = e.target.closest(".yt-swap");
    if (swap) {
      const box = swap.closest(".vids");
      box.querySelector(".yt-slot").innerHTML = embed(ytId(swap.dataset.yt));
      box.querySelector(".yt-cap").innerHTML = `<span class="yt-title">${esc(swap.dataset.title)}</span> <span class="yt-ch">${esc(swap.dataset.ch)}</span>`;
    }
  });
  // Collapsing a game card stops its video.
  document.addEventListener("toggle", (e) => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || d.open || !d.classList.contains("game")) return;
    d.querySelectorAll(".yt-slot iframe").forEach((f) => {
      const id = (f.src.match(/embed\/([A-Za-z0-9_-]+)/) || [])[1];
      if (id) f.outerHTML = player({ id, title: "Highlights" });
    });
  }, true);



  /* ── Game story: line score + quarter by quarter (always shown) ── */
  function story(g) {
    const r = g.report;
    if (!r || !(r.sections || []).length) {
      return (Array.isArray(g.recap) ? g.recap : [g.recap]).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join("");
    }
    const per = r.periods || [];
    const line = per.length ? `<table class="line">
        <thead><tr><th></th>${per.map((x) => `<th>${esc(x)}</th>`).join("")}<th>T</th></tr></thead>
        <tbody>
          <tr class="bos"><td>${esc(g.boston.abbr)}</td>${(r.boston || []).map((v) => `<td>${esc(v)}</td>`).join("")}<td>${esc(g.boston.score)}</td></tr>
          <tr><td>${esc(g.opp.abbr)}</td>${(r.opp || []).map((v) => `<td>${esc(v)}</td>`).join("")}<td>${esc(g.opp.score)}</td></tr>
        </tbody></table>` : "";
    return `<div class="story">${line}
      ${r.sections.map((x) => `<div class="rp">
        <div class="rp-head"><span class="rp-label">${esc(x.label)}</span>${x.score ? `<span class="rp-score">${esc(x.score)}</span>` : ""}</div>
        <p>${esc(x.text)}</p></div>`).join("")}
      ${(r.sources || []).length ? `<p class="rp-src">Sources: ${r.sources.map((x) => x.url
        ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name)).join(", ")}</p>` : ""}
    </div>`;
  }

  /* ── Full box score (collapsible, team tabs) ── */
  function boxGroup(gr) {
    const cols = gr.columns || [];
    const n = gr.starters || 0;
    // Bold the group's headline stat: points, yards, saves; hits for batters, strikeouts for pitchers.
    const want = { Batting: "H", Pitching: "K" }[gr.label];
    const key = want ? cols.indexOf(want) : cols.findIndex((c) => ["PTS", "YDS", "SV"].includes(c));
    const rows = (gr.rows || []).map((r, i) => `<tr class="${n && i === n - 1 ? "last-starter" : ""}">
      <th scope="row">${esc(r.name)}</th>${cols.map((c, j) => `<td${j === key ? ' class="key"' : ""}>${esc((r.values || [])[j] ?? "")}</td>`).join("")}</tr>`).join("");
    const tot = gr.totals ? `<tr class="tot"><th scope="row">Team</th>${cols.map((c, j) => `<td>${esc(gr.totals[j] ?? "")}</td>`).join("")}</tr>` : "";
    return `${gr.label ? `<h5 class="bx-group">${esc(gr.label)}</h5>` : ""}
      <div class="bx-scroll"><table class="bx"><thead><tr><th scope="col">${esc(gr.label || "Player")}</th>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${rows}${tot}</tbody></table></div>`;
  }
  function box(g) {
    const b = g.box;
    if (!b || !b.boston || !b.opp) return "";
    return `<details class="report boxscore">
      <summary>Full box score ${chevron(14)}</summary>
      <div class="report-body">
        <div class="bx-tabs" role="tablist">
          <button type="button" class="bx-tab on" data-bx="0">${esc(b.boston.name)}</button>
          <button type="button" class="bx-tab" data-bx="1">${esc(b.opp.name)}</button>
        </div>
        <div class="bx-pane">${(b.boston.groups || []).map(boxGroup).join("")}</div>
        <div class="bx-pane" hidden>${(b.opp.groups || []).map(boxGroup).join("")}</div>
        ${b.source ? `<p class="rp-src">Box score: <a href="${esc(b.source.url)}" target="_blank" rel="noopener">${esc(b.source.name)}</a></p>` : ""}
      </div>
    </details>`;
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest(".bx-tab");
    if (!t) return;
    const wrap = t.closest(".report-body");
    wrap.querySelectorAll(".bx-tab").forEach((x) => x.classList.toggle("on", x === t));
    wrap.querySelectorAll(".bx-pane").forEach((x, i) => { x.hidden = String(i) !== t.dataset.bx; });
  });

  function game(g, open) {
    const pli = (p) => `
      <li><span class="p-name">${esc(p.name)}</span>
        <span class="p-line">${esc(p.line)}</span>
        ${p.note ? `<span class="p-note">${esc(p.note)}</span>` : ""}</li>`;
    const P = (g.performers || []).slice(0, 3);
    const sep = g.home === false ? "at" : "vs";
    return `<details class="game" style="${teamVar(g.teamKey)}"${open ? " open" : ""}>
      <summary>
        <h3 class="headline">${esc(g.headline)}</h3>
        <div class="scoreline">
          <span>${esc(g.boston.abbr)} <span class="num">${esc(g.boston.score)}</span></span>
          <span class="sep">${sep}</span>
          <span>${esc(g.opp.abbr)} <span class="num">${esc(g.opp.score)}</span></span>
          <span class="result ${esc(g.result)}">${esc(g.result)}</span>
          <span class="record">${esc(g.record)}</span>
        </div>
        <span class="toggle">${chevron(16)}</span>
        ${g.takeaway ? `<p class="sum-take">${esc(g.takeaway)}</p>` : ""}
      </summary>
      <div class="game-body">
        ${videos(g.videos)}
        ${story(g)}
        ${P.length ? `<h4 class="sub">Top player stats</h4><ul class="performers">${P.map(pli).join("")}</ul>` : ""}
        ${g.oppLine ? `<p class="opp-line"><b>${esc(g.opp.name || g.opp.abbr)}:</b> ${esc(g.oppLine)}</p>` : ""}
        ${box(g)}
        ${g.takeaway ? `<p class="takeaway"><strong>What it means.</strong> ${esc(g.takeaway)}</p>` : ""}
      </div>
    </details>`;
  }

  function table(t, ranked) {
    const cuts = new Set(t.cutAfter || []);
    return `<table class="${ranked ? "ranked" : ""}">
      <thead><tr>${t.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${t.rows.map((r, i) => `<tr class="${[r.boston ? "bos" : "", cuts.has(i + 1) ? "cut" : ""].join(" ").trim()}">${
        r.cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  }
  const ord = (n) => n + (["th","st","nd","rd"][((n % 100) - 20) % 10] || ["th","st","nd","rd"][n % 100] || "th");
  function standLine(t) {
    const i = t.rows.findIndex((r) => r.boston);
    if (i < 0) return { team: t.title, meta: "" };
    const r = t.rows[i].cells;
    const div = t.title.replace(/ Division$/, "");
    const last = t.columns[t.columns.length - 1];
    const tail = last === "PTS" ? `${r[r.length - 1]} pts` : (r[r.length - 1] === "—" ? "leads" : `${r[r.length - 1]} GB`);
    return { team: r[0], meta: `${r[1]} · ${ord(i + 1)} in ${div} · ${tail}` };
  }


  /* ── Teams tab ── */
  const TEAM_ORDER = ["celtics", "bruins", "patriots", "redsox"];
  const TEAM_NAME = { celtics: "Celtics", bruins: "Bruins", patriots: "Patriots", redsox: "Red Sox" };
  const TEAM_LEAGUE = { celtics: "nba", bruins: "nhl", patriots: "nfl", redsox: "mlb" };
  let ALL = null;   // standings for the open issue, used by the standings sheet

  let OLD = [];   // older issues: division tables only
  function placeLine(k) {
    const S = ALL && ALL[TEAM_LEAGUE[k]];
    if (!S) {
      const t = OLD.find((x) => x.teamKey === k);
      return t ? standLine(t).meta : "Offseason";
    }
    const div = S.conferences[0].divisions[0];
    const i = div.rows.findIndex((r) => r.boston);
    const r = div.rows[i];
    const tail = r.pts != null ? `${r.pts} pts` : (r.gb === "—" ? "leads" : `${r.gb} GB`);
    return `${r.rec} · ${ord(i + 1)} in ${div.name} · ${tail}`;
  }

  function teamsPanel(data) {
    ALL = data.standingsAll || null;
    OLD = data.standings || [];
    const news = data.teamNews || {};
    return TEAM_ORDER.filter((k) => (ALL && ALL[TEAM_LEAGUE[k]]) || (news[k] || []).length
        || OLD.some((x) => x.teamKey === k)).map((k) => {
      const lg = TEAM_LEAGUE[k];
      const has = ALL && ALL[lg];
      const today = (data.today || []).find((g) => g.teamKey === k);
      const off = (data.off || []).find((o) => o.teamKey === k);
      const next = today ? `Today · ${today.time} ${today.matchup}` : off ? String(off.text || "").replace(/^Next:\s*/, "Next · ") : "";
      const items = (news[k] || []).map((n) => `<details class="tn-item">
          <summary><span class="tn-h">${esc(n.headline)}</span>${chevron(14)}</summary>
          <div class="tn-body"><p>${esc(n.summary)}</p>
            <p class="rp-src">${esc(n.dateLabel || "")}${n.url ? ` · <a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.source || "Source")}</a>` : ""}</p></div>
        </details>`).join("");
      return `<section class="team" style="${teamVar(k)}">
        <header class="team-head">
          <div class="team-id"><span class="chip"></span><h2>${esc(TEAM_NAME[k])}</h2></div>
          ${has ? `<button type="button" class="st-btn" data-team="${k}">Standings</button>` : ""}
          <span class="team-meta">${esc(placeLine(k))}</span>
        </header>
        ${next ? `<p class="team-next">${esc(next)}</p>` : ""}
        ${items || `<p class="tn-empty">No new team news today.</p>`}
      </section>`;
    }).join("");
  }

  /* ── Standings sheet: Division | Conference ── */
  function stTable(S, rows, ranked, cut) {
    const cuts = new Set(cut || []);
    return `<table class="st-table${ranked ? " ranked" : ""}"><thead><tr>${ranked ? "<th>#</th>" : ""}<th>Team</th>${S.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${[r.boston ? "bos" : "", cuts.has(i + 1) ? "cut" : ""].join(" ").trim()}">
        ${ranked ? `<td class="n">${r.rank}</td>` : ""}<td class="t">${esc(r.team)}</td><td>${esc(r.rec)}</td><td>${esc(r.pts != null ? r.pts : r.gb)}</td></tr>`).join("")}</tbody></table>`;
  }
  function sheetBody(S, mode) {
    return S.conferences.map((c, ci) => {
      const head = `<h3 class="st-conf">${esc(S.confLabel[c.name] || c.name)}</h3>`;
      if (mode === "conference") {
        return head + stTable(S, c.ranked, true, S.cut) + (S.cutNote && ci === 0 ? `<p class="cut-note">${esc(S.cutNote)}</p>` : "");
      }
      return head + c.divisions.map((d) => `<h4 class="st-div">${esc(d.name)}</h4>${stTable(S, d.rows, false)}`).join("");
    }).join("");
  }
  function openSheet(k) {
    const S = ALL && ALL[TEAM_LEAGUE[k]];
    if (!S) return;
    const el = document.createElement("div");
    el.className = "st-sheet";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", `${TEAM_NAME[k]} standings`);
    el.style.cssText = teamVar(k);
    el.innerHTML = `<div class="st-panel">
      <header class="st-head"><h2>Standings</h2><span class="st-lg">${esc(S.league.toUpperCase())}</span>
        <button type="button" class="st-close" aria-label="Close">✕</button></header>
      <div class="st-seg" role="tablist">
        <button type="button" data-mode="division" aria-selected="true">Division</button>
        <button type="button" data-mode="conference" aria-selected="false">Conference</button>
      </div>
      <div class="st-body">${sheetBody(S, "division")}</div>
    </div>`;
    document.body.appendChild(el);
    document.body.style.overflow = "hidden";
    // The phone's back gesture closes the sheet instead of leaving the page.
    history.pushState({ stSheet: true }, "");
    let closed = false;
    const remove = () => {
      if (closed) return;
      closed = true;
      el.remove();
      document.body.style.overflow = "";
      window.removeEventListener("popstate", onPop);
    };
    const onPop = () => remove();
    window.addEventListener("popstate", onPop);
    const close = () => { if (history.state && history.state.stSheet) history.back(); else remove(); };
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest(".st-close")) return close();
      const b = e.target.closest(".st-seg button");
      if (!b) return;
      el.querySelectorAll(".st-seg button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      el.querySelector(".st-body").innerHTML = sheetBody(S, b.dataset.mode);
      el.querySelector(".st-body").scrollTop = 0;
    });
    el.querySelector(".st-close").focus();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".st-btn");
    if (b) openSheet(b.dataset.team);
  });
  document.addEventListener("click", (e) => {
    const t = e.target.closest(".tabs button");
    if (!t) return;
    document.querySelectorAll(".tabs button").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    document.querySelectorAll(".tab-panel").forEach((x) => { x.hidden = x.dataset.tab !== t.dataset.tab; });
    try { sessionStorage.setItem("bs-tab", t.dataset.tab); } catch { /* ignore */ }
    window.scrollTo(0, 0);
  });

  function issue(data, ctx) {
    const results = data.results || [];
    let tab = "games";
    try { tab = sessionStorage.getItem("bs-tab") || "games"; } catch { /* ignore */ }
    return `${masthead(ctx.name, longDate(data.date), ctx)}
      <nav class="tabs" role="tablist">
        <button type="button" role="tab" data-tab="games" aria-selected="${tab === "games"}">Games</button>
        <button type="button" role="tab" data-tab="teams" aria-selected="${tab === "teams"}">Teams</button>
      </nav>
      <main class="sports-main">
        <div class="tab-panel" data-tab="games"${tab === "games" ? "" : " hidden"}>
          ${board(data.today, data.date, data.off)}
          ${results.length ? `<h2 class="section-title">Last night</h2>${results.map((g) => game(g)).join("")}` : ""}
          <a class="archive-link" href="${ctx.archiveHref}">Past games <span aria-hidden="true">›</span></a>
        </div>
        <div class="tab-panel" data-tab="teams"${tab === "teams" ? "" : " hidden"}>
          ${teamsPanel(data)}
        </div>
      </main>`;
  }

  function archive(list, ctx) {
    return `${masthead(ctx.name, "Past issues", ctx)}
      <main class="sports-main"><ul class="issues">${list.map((i) => `
        <li><a href="${ctx.issueHref(i.date)}">
          <span class="issue-date">${esc(shortDate(i.date))}</span>
          ${ctx.isRead(i.date) ? "" : `<span class="dot" aria-label="Unread"></span>`}
          <span class="issue-head">${esc(i.headline || "")}</span>
        </a></li>`).join("")}</ul></main>`;
  }

  /* ── Live scores ─────────────────────────
     While today's issue is open, poll ESPN every 30s for each game in Today's games.
     If the feed can't be reached, rows stay as they are and still open ESPN when tapped. */
  let timer = null;
  function stopLive() {
    if (timer) clearInterval(timer);
    timer = null;
    document.removeEventListener("visibilitychange", onVisible);
  }
  let tick = null;
  function onVisible() { if (!document.hidden && tick) tick(); }

  function showGame(row, ev) {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) return;
    const us = comp.competitors.find((c) => c.team && c.team.abbreviation === row.dataset.abbr);
    const them = comp.competitors.find((c) => c !== us);
    if (!us || !them) return;
    const link = (ev.links || []).find((l) => (l.rel || []).includes("summary")) || (ev.links || [])[0];
    if (link && link.href) row.href = link.href;
    const state = ev.status && ev.status.type && ev.status.type.state;
    const detail = (ev.status && ev.status.type && ev.status.type.shortDetail) || "";
    if (state === "pre") return;
    const timeEl = row.querySelector(".board-time");
    const venueEl = row.querySelector(".board-venue");
    timeEl.innerHTML = `<span class="live-score">${esc(us.score)}<span class="dash">–</span>${esc(them.score)}</span>`;
    row.classList.toggle("is-live", state === "in");
    row.classList.toggle("is-final", state === "post");
    venueEl.innerHTML = state === "in"
      ? `<span class="live-dot" aria-hidden="true"></span>${esc(detail)}`
      : `${us.winner ? "W" : them.winner ? "L" : ""} ${esc(detail)}`.trim();
    // Once final, show both teams' updated records from the feed.
    if (state === "post") {
      const rec = (c) => {
        const r = (c.records || []).find((x) => x.type === "total" || x.name === "overall") || (c.records || [])[0];
        return r && r.summary ? String(r.summary).replace(/-/g, "–") : "";
      };
      const ours = rec(us), theirs = rec(them);
      const recEl = row.querySelector(".board-rec");
      if (ours && recEl) recEl.textContent = ours;
      const det = row.querySelector(".board-detail");
      if (theirs && det) det.textContent = det.textContent.replace(/\s*\([^)]*\)\s*$/, "") + ` (${theirs})`;
    }
  }

  function mount(root, data) {
    stopLive();
    const rows = [...root.querySelectorAll(".board-row[data-league]")];
    const todayET = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
    if (!rows.length || data.date !== todayET) return;
    const ymd = data.date.replace(/-/g, "");
    tick = async () => {
      if (document.hidden) return;
      let allDone = true;
      for (const league of [...new Set(rows.map((r) => r.dataset.league))]) {
        try {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${SPORT_PATH[league]}/scoreboard?dates=${ymd}`, { cache: "no-store" });
          const json = await res.json();
          rows.filter((r) => r.dataset.league === league).forEach((r) => {
            const ev = (json.events || []).find((e) => e.competitions && e.competitions[0] &&
              e.competitions[0].competitors.some((c) => c.team && c.team.abbreviation === r.dataset.abbr));
            if (!ev) { allDone = false; return; }
            showGame(r, ev);
            if (!(ev.status && ev.status.type && ev.status.type.state === "post")) allDone = false;
          });
        } catch { allDone = false; }
      }
      if (allDone) stopLive();
    };
    tick();
    timer = setInterval(tick, 30000);
    document.addEventListener("visibilitychange", onVisible);
  }
  window.addEventListener("hashchange", stopLive);

  window.Layouts = window.Layouts || {};
  /* ── Past games (PS Sports) ───────────── */
  const gameDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const scoreText = (g) => `${g.result || ""} ${g.bos}–${g.oppScore}${g.ot ? " OT" : ""}`.trim();

  function pastTeams(list, ctx) {
    const rows = TEAM_ORDER.map((k) => {
      const mine = list.filter((g) => g.team === k);
      const rec = mine[0] && mine[0].record;
      const inner = `<span class="pg-bar" aria-hidden="true"></span>
        <span class="pg-main"><span class="pg-team">${esc(TEAM_NAME[k])}</span>
          <span class="pg-sub">${mine.length ? `${mine.length} game${mine.length === 1 ? "" : "s"}${rec ? ` · ${esc(rec)}` : ""}` : "No games yet"}</span></span>
        ${mine.length ? `<span class="pg-go" aria-hidden="true">›</span>` : ""}`;
      return `<li style="${teamVar(k)}">${mine.length ? `<a class="pg-row" href="#/games/${k}">${inner}</a>` : `<div class="pg-row off">${inner}</div>`}</li>`;
    }).join("");
    return `${masthead(ctx.name, "Past games", ctx)}<main class="sports-main"><ul class="pg-list">${rows}</ul></main>`;
  }

  function pastTeamGames(team, list, ctx) {
    const mine = list.filter((g) => g.team === team);
    const rows = mine.map((g) => `<li style="${teamVar(team)}"><a class="pg-row" href="#/games/${team}/${esc(g.id)}">
        <span class="pg-bar" aria-hidden="true"></span>
        <span class="pg-main">
          <span class="pg-date">${esc(gameDate(g.date))} · ${g.home === false ? "at" : "vs"} ${esc(g.opp)}</span>
          <span class="pg-score"><span class="result ${esc(g.result)}">${esc(g.result || "")}</span> ${esc(`${g.bos}–${g.oppScore}${g.ot ? " OT" : ""}`)}</span>
          ${g.headline ? `<span class="pg-sub">${esc(g.headline)}</span>` : ""}
        </span>
        <span class="pg-go" aria-hidden="true">›</span>
      </a></li>`).join("");
    return `${masthead(ctx.name, TEAM_NAME[team] || "Past games", ctx)}<main class="sports-main"><ul class="pg-list">${rows || `<li class="pg-empty">No games yet.</li>`}</ul></main>`;
  }

  function pastGame(g, ctx) {
    return `${masthead(ctx.name, `${TEAM_NAME[g.teamKey] || ""} · ${gameDate(g.date)}`, ctx)}
      <main class="sports-main">${game(g, true)}</main>`;
  }

  window.Layouts.sports = { issue, archive, mount, pastTeams, pastTeamGames, pastGame, scoreText, themeColor: "#141414" };
})();

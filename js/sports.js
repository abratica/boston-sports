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

  /* ── Listen live: shown under each game on the scoreboard from 10 minutes before the start until the
     game ends. For 98.5 The Sports Hub it plays the station's live stream right here in the app (so you
     can keep watching the scoreboard), with a small ↗ button to open the station's own page instead.
     An issue can override the station per game with "radio": { "name", "url" } (e.g. when two Boston
     games overlap and one moves to WZLX); without a stream, the bar just opens that page. */
  const SPORTS_HUB = { name: "98.5 The Sports Hub", url: "https://985thesportshub.com/listen",
    stream: "https://playerservices.streamtheworld.com/api/livestream-redirect/WBZFMAAC.aac" };
  const RADIO = { patriots: SPORTS_HUB, celtics: SPORTS_HUB, bruins: SPORTS_HUB };
  const RADIO_ICON = `<svg class="ic-radio" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 8l10-4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15.5" cy="14" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6.5 12.5h4M6.5 15.5h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const PAUSE_ICON = `<svg class="ic-pause" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>`;
  const SPIN_ICON = `<svg class="ic-spin" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="30 60" stroke-linecap="round"/></svg>`;
  const EXT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const clockMin = (t) => {   // "7:30 PM" -> minutes after midnight, or "" if it isn't a clock time
    const m = String(t || "").match(/(\d{1,2})(?::(\d{2}))?\s*([AP])M/i);
    if (!m) return "";
    return ((+m[1] % 12) + (m[3].toUpperCase() === "P" ? 12 : 0)) * 60 + (+(m[2] || 0));
  };
  const safeUrl = (u) => /^https:\/\//.test(String(u || "")) ? u : "";
  function pageHref(url) {
    // On Android, try the full Chrome app (its own tab) rather than the in-app browser sheet.
    if (!/Android/i.test(navigator.userAgent)) return url;
    const u = new URL(url);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  }
  function listenLink(g) {
    const r = g.radio && safeUrl(g.radio.url) ? g.radio : RADIO[g.teamKey];
    if (!r) return "";
    const stream = safeUrl(r.stream);
    const title = `${g.team} ${g.matchup || ""}`.trim();
    const body = `<span class="bl-ic">${RADIO_ICON}${PAUSE_ICON}${SPIN_ICON}</span><span class="bl-go">Listen live</span><span class="bl-st">${esc(r.name)}</span>`;
    return `<div class="board-listen" data-start="${clockMin(g.time)}" data-stream="${esc(stream)}" hidden>${stream
      ? `<button type="button" class="bl-play" data-title="${esc(title)}" data-station="${esc(r.name)}" aria-pressed="false">${body}</button>
         <a class="bl-ext" href="${esc(pageHref(r.url))}" target="_blank" rel="noopener" aria-label="Open ${esc(r.name)}'s page">${EXT_ICON}</a>`
      : `<a class="bl-play" href="${esc(pageHref(r.url))}" target="_blank" rel="noopener">${body}<span class="bl-arrow" aria-hidden="true">›</span></a>`}</div>`;
  }

  // One audio player for the whole app, so it keeps playing while you move between tabs and recaps.
  const PLAYER = { audio: null, src: "", state: "idle" };   // state: idle | loading | playing | error
  const LABEL = { idle: "Listen live", loading: "Connecting…", playing: "Live", error: "Couldn't connect · tap to retry" };
  function setListenUI() {
    document.querySelectorAll(".board-listen").forEach((el) => {
      const mine = !!el.dataset.stream && el.dataset.stream === PLAYER.src;
      const st = mine ? PLAYER.state : "idle";
      el.dataset.state = st;
      const go = el.querySelector("button.bl-play .bl-go");
      if (go) go.textContent = LABEL[st];
      const b = el.querySelector("button.bl-play");
      if (b) b.setAttribute("aria-pressed", String(st === "playing"));
    });
  }
  function setState(st) { PLAYER.state = st; setListenUI(); }
  function playStream(src, title, station) {
    if (!PLAYER.audio) {
      const a = new Audio();
      a.preload = "none";
      a.addEventListener("playing", () => setState("playing"));
      a.addEventListener("waiting", () => { if (PLAYER.state === "playing") setState("loading"); });
      a.addEventListener("error", () => { if (PLAYER.state !== "idle") setState("error"); });
      PLAYER.audio = a;
    }
    PLAYER.src = src;
    setState("loading");
    PLAYER.audio.src = src;
    PLAYER.audio.play().catch(() => { if (PLAYER.state !== "idle") setState("error"); });
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title, artist: station, album: "PS Sports",
          artwork: [{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
        navigator.mediaSession.setActionHandler("play", () => playStream(src, title, station));
        navigator.mediaSession.setActionHandler("pause", stopStream);
        navigator.mediaSession.setActionHandler("stop", stopStream);
      } catch { /* not supported */ }
    }
  }
  function stopStream() {
    if (!PLAYER.audio) return;
    setState("idle");   // set first, so the error fired by clearing the source is ignored
    PLAYER.audio.pause();
    PLAYER.audio.removeAttribute("src");   // drop the buffer so pressing play again rejoins the live broadcast
    PLAYER.audio.load();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button.bl-play");
    if (!b) return;
    const src = b.closest(".board-listen").dataset.stream;
    if (PLAYER.src === src && (PLAYER.state === "playing" || PLAYER.state === "loading")) stopStream();
    else playStream(src, b.dataset.title, b.dataset.station);
  });

  function updateListen(root, date) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    const today = `${parts.year}-${parts.month}-${parts.day}`, now = +parts.hour * 60 + +parts.minute;
    root.querySelectorAll(".board-listen").forEach((a) => {
      const row = a.previousElementSibling;
      const live = !!(row && row.classList.contains("is-live")), final = !!(row && row.classList.contains("is-final"));
      const s = a.dataset.start === "" ? null : +a.dataset.start;
      const inWindow = date === today && s !== null && now >= s - 10 && now <= s + 240;
      const playing = !!a.dataset.stream && a.dataset.stream === PLAYER.src && PLAYER.state !== "idle";
      a.hidden = !playing && (final || !(live || inWindow));   // never yank the bar while it's playing
    });
    setListenUI();
  }

  /* Opponents by nickname (as written in "matchup"): [abbreviation, color]. Colors are each team's
     brightest brand color, picked so the stripe shows up on the dark scoreboard. */
  const OPP = {
    nba: { Hawks: ["ATL", "#E03A3E"], Nets: ["BKN", "#B5B5B5"], Celtics: ["BOS", "#007A33"], Hornets: ["CHA", "#00788C"], Bulls: ["CHI", "#CE1141"],
      Cavaliers: ["CLE", "#860038"], Mavericks: ["DAL", "#0064B1"], Nuggets: ["DEN", "#FEC524"], Pistons: ["DET", "#C8102E"], Warriors: ["GS", "#FFC72C"],
      Rockets: ["HOU", "#CE1141"], Pacers: ["IND", "#FDBB30"], Clippers: ["LAC", "#C8102E"], Lakers: ["LAL", "#552583"], Grizzlies: ["MEM", "#5D76A9"],
      Heat: ["MIA", "#98002E"], Bucks: ["MIL", "#00471B"], Timberwolves: ["MIN", "#236192"], Pelicans: ["NO", "#B4975A"], Knicks: ["NY", "#F58426"],
      Thunder: ["OKC", "#007AC1"], Magic: ["ORL", "#0077C0"], "76ers": ["PHI", "#006BB6"], Suns: ["PHX", "#E56020"], "Trail Blazers": ["POR", "#E03A3E"],
      Blazers: ["POR", "#E03A3E"], Kings: ["SAC", "#5A2D81"], Spurs: ["SA", "#C4CED4"], Raptors: ["TOR", "#CE1141"], Jazz: ["UTAH", "#753BBD"], Wizards: ["WSH", "#E31837"] },
    nhl: { Ducks: ["ANA", "#F47A38"], Mammoth: ["UTAH", "#69B3E7"], Bruins: ["BOS", "#FFB81C"], Sabres: ["BUF", "#FCB514"], Flames: ["CGY", "#C8102E"],
      Hurricanes: ["CAR", "#CE1126"], Blackhawks: ["CHI", "#CF0A2C"], Avalanche: ["COL", "#236192"], "Blue Jackets": ["CBJ", "#CE1126"], Stars: ["DAL", "#00A862"],
      "Red Wings": ["DET", "#CE1126"], Oilers: ["EDM", "#FF4C00"], Panthers: ["FLA", "#C8102E"], Kings: ["LA", "#A2AAAD"], Wild: ["MIN", "#AF1E2D"],
      Canadiens: ["MTL", "#AF1E2D"], Predators: ["NSH", "#FFB81C"], Devils: ["NJ", "#CE1126"], Islanders: ["NYI", "#F47D30"], Rangers: ["NYR", "#0038A8"],
      Senators: ["OTT", "#C52032"], Flyers: ["PHI", "#F74902"], Penguins: ["PIT", "#FCB514"], Sharks: ["SJ", "#00A3AD"], Kraken: ["SEA", "#99D9D9"],
      Blues: ["STL", "#2F6BCB"], Lightning: ["TB", "#2C5BBF"], "Maple Leafs": ["TOR", "#3F74C6"], Canucks: ["VAN", "#00843D"], "Golden Knights": ["VGK", "#B4975A"],
      Capitals: ["WSH", "#C8102E"], Jets: ["WPG", "#AC162C"] },
    nfl: { Cardinals: ["ARI", "#97233F"], Falcons: ["ATL", "#A71930"], Ravens: ["BAL", "#6A4FC9"], Bills: ["BUF", "#C60C30"], Panthers: ["CAR", "#0085CA"],
      Bears: ["CHI", "#C83803"], Bengals: ["CIN", "#FB4F14"], Browns: ["CLE", "#FF3C00"], Cowboys: ["DAL", "#4A78C9"], Broncos: ["DEN", "#FB4F14"],
      Lions: ["DET", "#0076B6"], Packers: ["GB", "#FFB612"], Texans: ["HOU", "#A71930"], Colts: ["IND", "#2F63B5"], Jaguars: ["JAX", "#00828C"],
      Chiefs: ["KC", "#E31837"], Raiders: ["LV", "#A5ACAF"], Chargers: ["LAC", "#0080C6"], Rams: ["LAR", "#FFA300"], Dolphins: ["MIA", "#008E97"],
      Vikings: ["MIN", "#7E57C2"], Patriots: ["NE", "#1D4F8C"], Saints: ["NO", "#D3BC8D"], Giants: ["NYG", "#A71930"], Jets: ["NYJ", "#1E9A5E"],
      Eagles: ["PHI", "#2E8B8B"], Steelers: ["PIT", "#FFB612"], "49ers": ["SF", "#AA0000"], Seahawks: ["SEA", "#69BE28"], Buccaneers: ["TB", "#D50A0A"],
      Titans: ["TEN", "#4B92DB"], Commanders: ["WSH", "#FFB612"] },
    mlb: { Diamondbacks: ["ARI", "#A71930"], Braves: ["ATL", "#CE1141"], Orioles: ["BAL", "#DF4601"], "Red Sox": ["BOS", "#BD3039"], Cubs: ["CHC", "#3D6DC2"],
      "White Sox": ["CHW", "#C4CED4"], Reds: ["CIN", "#C6011F"], Guardians: ["CLE", "#E31937"], Rockies: ["COL", "#7A5BB5"], Tigers: ["DET", "#FA4616"],
      Astros: ["HOU", "#EB6E1F"], Royals: ["KC", "#3D7CC9"], Angels: ["LAA", "#BA0021"], Dodgers: ["LAD", "#1E73BE"], Marlins: ["MIA", "#00A3E0"],
      Brewers: ["MIL", "#FFC52F"], Twins: ["MIN", "#D31145"], Mets: ["NYM", "#FF5910"], Yankees: ["NYY", "#8C9FB8"], Athletics: ["ATH", "#EFB21E"],
      Phillies: ["PHI", "#E81828"], Pirates: ["PIT", "#FDB827"], Padres: ["SD", "#FFC425"], Giants: ["SF", "#FD5A1E"], Mariners: ["SEA", "#00A3AD"],
      Cardinals: ["STL", "#C41E3A"], Rays: ["TB", "#8FBCE6"], Rangers: ["TEX", "#C0111F"], "Blue Jays": ["TOR", "#1D6FD1"], Nationals: ["WSH", "#AB0003"] },
  };
  const TEAM_ABBR = { patriots: "NE", celtics: "BOS", bruins: "BOS", redsox: "BOS" };
  const ordinal = (n) => ["", "1ST", "2ND", "3RD"][n] || `${n}TH`;

  /* ── Today's games: an arena-style scoreboard per game. Away team on the left, home on the right,
     the start time in the middle before the game, then live scores and the clock, then FINAL. */
  function scoreboard(g, ymd) {
    const league = SPORT_PATH[g.league] ? g.league : "";
    const away = /^\s*at\b/i.test(g.matchup || "");
    const nick = String(g.matchup || "").replace(/^\s*(vs\.?|at|@)\s*/i, "").trim();
    const o = (OPP[league] || {})[nick] || [nick.slice(0, 3).toUpperCase(), "#8A8478"];
    const bos = { cls: "us", ab: TEAM_ABBR[g.teamKey] || g.team.slice(0, 3).toUpperCase(), nm: g.team, rec: g.record, color: (TEAMS[g.teamKey] || {}).color };
    const them = { cls: "them", ab: o[0], nm: nick, rec: g.oppRecord, color: o[1] };
    const [L, R] = away ? [bos, them] : [them, bos];
    const block = (t, side) => `<div class="sb-team sb-${t.cls}" style="--c:${t.color}">
        <div class="sb-side">${side}</div><div class="sb-ab">${esc(t.ab)}</div><div class="sb-nm">${esc(t.nm)}</div><div class="sb-rec">${esc(t.rec || "")}</div></div>`;
    const mins = clockMin(g.time);
    const when = mins !== "" && mins < 17 * 60 ? "TODAY" : "TONIGHT";
    const tm = String(g.time || "").match(/^(\d{1,2}:\d{2})\s*([AP]M)$/i);
    const timeHtml = tm ? `${esc(tm[1])}<span class="sb-ampm">${esc(tm[2].toUpperCase())}</span>` : esc(g.time || "TBD");
    const attrs = league ? ` href="https://www.espn.com/${league}/scoreboard/_/date/${ymd}" target="_blank" rel="noopener" data-league="${league}" data-abbr="${ESPN_ABBR[g.teamKey] || ""}"` : "";
    const tag = league ? "a" : "div";
    return `<${tag} class="board-row sb"${attrs} data-away="${away ? 1 : 0}">
        <div class="sb-grid">
          ${block(L, "AWAY")}
          <div class="sb-mid">
            <div class="sb-pre"><div class="sb-when">${when}</div><div class="sb-time">${timeHtml}</div>${g.venue ? `<div class="sb-venue">${esc(g.venue)}</div>` : ""}</div>
            <div class="sb-live" hidden><div class="sb-digits"><div class="sb-dg" data-side="L"></div><div class="sb-dg" data-side="R"></div></div><div class="sb-clock"></div></div>
          </div>
          ${block(R, "HOME")}
        </div>
        ${g.tv ? `<div class="board-tv sb-tv"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${esc(g.tv)}</div>` : ""}
      </${tag}>`;
  }
  function board(today, date, off) {
    const ymd = String(date || "").replace(/-/g, "");
    const rows = (today || []).map((g) => scoreboard(g, ymd) + listenLink(g)).join("");
    return `<section class="board" aria-label="Today's games">
      <h2>Today's games</h2>
      ${rows || `<div class="board-empty">No Boston games today.</div>`}
    </section>`;
  }
  // Coming up: the next game for each in-season team not playing today, below Last night.
  function comingUp(off) {
    if (!off || !off.length) return "";
    const rows = off.map((o) => {
      const t = String(o.text || "").replace(/^Next:\s*/i, "");
      const m = t.match(/^(.*?)(?:,\s*)(\d{1,2}:\d{2}\s*[AP]M|TBD)$/i);
      const what = m ? m[1] : t, time = m ? m[2] : "";
      const w = what.match(/^(.*?)\s+((?:vs|at)\s.+)$/i);
      return `<li style="${teamVar(o.teamKey)}"><span class="chip" aria-hidden="true"></span><b>${esc(o.team)}</b>
        <span class="cu-what">${w ? `<span class="cu-date">${esc(w[1])}</span> · ${esc(w[2])}` : esc(what)}</span>${time ? `<span class="cu-time">${esc(time)}</span>` : ""}</li>`;
    }).join("");
    return `<h2 class="section-title">Coming up</h2><ul class="cu-list">${rows}</ul>`;
  }

  /* ── Highlight videos (official YouTube uploads) ──
     Shows a thumbnail; the YouTube player only loads when tapped. */
  const ytId = (id) => String(id || "").replace(/[^A-Za-z0-9_-]/g, "");
  // Some leagues (the NFL) block their videos from playing inside other apps, so those open in YouTube instead.
  const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
  function player(v, external) {
    const id = ytId(v.id);
    if (external) return `<a class="yt" href="${watchUrl(id)}" target="_blank" rel="noopener" aria-label="Watch on YouTube: ${esc(v.title)}">
      <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
      <span class="yt-play" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
      <span class="yt-ext">Opens in YouTube</span>
    </a>`;
    return `<button class="yt" type="button" data-yt="${id}" aria-label="Play: ${esc(v.title)}">
      <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
      <span class="yt-play" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
    </button>`;
  }
  function videos(list, sport) {
    const vids = (list || []).filter((v) => ytId(v.id));
    if (!vids.length) return "";
    const [main, ...more] = vids;
    const external = main.embed === false || String(sport || "").toUpperCase() === "NFL";
    return `<div class="vids">
      <div class="yt-slot">${player(main, external)}</div>
      <p class="yt-cap"><span class="yt-title">${esc(main.title)}</span> <span class="yt-ch">${esc(main.channel || "")}</span>${external ? "" : ` <a class="yt-open" href="${watchUrl(ytId(main.id))}" target="_blank" rel="noopener">Open in YouTube ↗</a>`}</p>
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
        ${videos(g.videos, g.sport)}
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
      // First 3 stories show; the rest sit behind "See more".
      const items = (news[k] || []).map((n, i) => `<details class="tn-item${i >= 3 ? " tn-extra" : ""}"${i >= 3 ? " hidden" : ""}>
          <summary><span class="tn-h">${esc(n.headline)}</span>${chevron(14)}</summary>
          <div class="tn-body"><p>${esc(n.summary)}</p>
            <p class="rp-src">${esc(n.dateLabel || "")}${n.url ? ` · <a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.source || "Source")}</a>` : ""}</p></div>
        </details>`).join("") + ((news[k] || []).length > 3
        ? `<button type="button" class="tn-more" data-more="${(news[k] || []).length - 3}">See ${(news[k] || []).length - 3} more</button>` : "");
      return `<section class="team" style="${teamVar(k)}">
        <header class="team-head">
          <div class="team-id"><span class="chip"></span><h2>${esc(TEAM_NAME[k])}</h2></div>
          ${has ? `<div class="team-btns"><button type="button" class="st-btn" data-team="${k}">Standings</button>
            <button type="button" class="st-btn" data-team="${k}" data-sched="1">Schedule</button></div>` : ""}
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
  /* ── Schedule sheet (List / Calendar) ─────────────
     Season schedule from schedule.json, merged with saved recaps (games/index.json) for results. */
  let SCHED = null, RESULTS = null;
  const todayET = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const dt = (iso) => new Date(iso + "T12:00:00");
  const md = (iso) => dt(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dow = (iso) => dt(iso).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const monthName = (iso) => dt(iso).toLocaleDateString("en-US", { month: "long" });
  async function loadSchedule() {
    const get = async (u) => { try { const r = await fetch(u, { cache: "no-store" }); return r.ok ? r.json() : null; } catch { return null; } };
    if (!SCHED) SCHED = await get("schedule.json");
    if (!RESULTS) RESULTS = ((await get("games/index.json")) || {}).games || [];
  }
  function seasonGames(k) {
    const list = ((SCHED && SCHED.teams && SCHED.teams[k]) || {}).games || [];
    return list.map((g) => ({ ...g, res: RESULTS.find((r) => r.team === k && r.date === g.date) || null }));
  }
  function scRow(k, g, today, isNext) {
    const ha = g.home === false ? "at" : "vs";
    const date = `<span class="sc-date">${esc(md(g.date))}<small>${esc(dow(g.date))}</small></span>`;
    const opp = `<span class="sc-opp"><span class="ha">${ha}</span>${esc(g.opp)}</span>`;
    const sub = [g.tv ? `📺 ${g.tv}` : "", g.note || ""].filter(Boolean).join(" · ");
    if (g.res) {
      const r = g.res;
      return `<li><a class="sc-row" href="#/games/${k}/${esc(r.id)}"><span>${date}</span><span>${opp}${g.note ? `<span class="sc-sub">${esc(g.note)}</span>` : ""}</span>
        <span class="sc-right"><span class="result ${esc(r.result)}">${esc(r.result)}</span> ${esc(`${r.bos}–${r.oppScore}${r.ot ? " OT" : ""}`)}<span class="go" aria-hidden="true">›</span></span></a></li>`;
    }
    const past = g.date < today;
    const tag = g.date === today ? "TODAY" : "";
    return `<li><div class="sc-row${isNext || g.date === today ? " is-next" : ""}"><span>${date}</span><span>${opp}${sub ? `<span class="sc-sub">${esc(sub)}</span>` : ""}</span>
      <span class="sc-right">${tag ? `<span class="sc-tag">${tag}</span>` : ""}<span class="sc-time">${past ? "Final" : esc(g.time || "TBD")}</span></span></div></li>`;
  }
  function scList(k, games, today) {
    let out = "", curMonth = null, nextShown = false;
    const done = (g) => g.res || g.date < today;
    for (const g of games) {
      const isNext = !nextShown && !done(g);
      if (isNext) {
        // The next game sits in its own highlighted box, then the list carries on under its month.
        if (curMonth) out += "</ul>";
        out += `<div class="sc-next" id="sc-next">Next up</div><ul class="sc-list sc-list-next">${scRow(k, g, today, true)}</ul>`;
        curMonth = null; nextShown = true; continue;
      }
      const m = monthName(g.date);
      if (m !== curMonth) { if (curMonth) out += "</ul>"; out += `<h3 class="sc-month">${esc(m)}</h3><ul class="sc-list">`; curMonth = m; }
      out += scRow(k, g, today);
    }
    if (curMonth) out += "</ul>";
    return out || `<p class="tn-empty">Schedule coming soon.</p>`;
  }
  const calTitle = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }); };
  function calCells(games, today, ym, sel) {
    const [y, m] = ym.split("-").map(Number);
    const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
    const byDate = Object.fromEntries(games.map((g) => [g.date, g]));
    let cells = ["S", "M", "T", "W", "T", "F", "S"].map((x) => `<div class="cal-dow">${x}</div>`).join("");
    for (let j = 0; j < first.getDay(); j++) cells += `<div class="cal-day empty"></div>`;
    for (let n = 1; n <= days; n++) {
      const iso = `${ym}-${String(n).padStart(2, "0")}`;
      const g = byDate[iso];
      let chip = "";
      if (g) {
        const ab = `${g.home === false ? "@" : ""}${esc(g.oppAbbr || g.opp.slice(0, 3).toUpperCase())}`;
        chip = g.res ? `<span class="cal-g ${esc(g.res.result)}">${ab}<small>${esc(g.res.result)} ${esc(`${g.res.bos}–${g.res.oppScore}`)}</small></span>`
          : `<span class="cal-g up">${ab}<small>${esc((g.time || (g.date < today ? "Final" : "TBD")).replace(":00", "").replace(" PM", "p").replace(" AM", "a"))}</small></span>`;
      }
      cells += `<button type="button" class="cal-day${iso === today ? " today" : ""}${iso === sel ? " sel" : ""}"${g ? ` data-day="${iso}"` : " disabled"}><span class="n">${n}</span>${chip}</button>`;
    }
    return cells;
  }
  function scCalendar(k, games, today, ym, sel) {
    const byDate = Object.fromEntries(games.map((g) => [g.date, g]));
    const months = [...new Set(games.map((g) => g.date.slice(0, 7)))];
    const i = months.indexOf(ym);
    return `<div class="cal-head"><h3>${esc(calTitle(ym))}</h3><div class="cal-nav">
        <button type="button" data-cal="${months[i - 1] || ""}" aria-label="Previous month"${i > 0 ? "" : " disabled"}>‹</button>
        <button type="button" data-cal="${months[i + 1] || ""}" aria-label="Next month"${i >= 0 && i < months.length - 1 ? "" : " disabled"}>›</button></div></div>
      <div class="cal-vp"><div class="cal-grid">${calCells(games, today, ym, sel)}</div></div>
      <div class="cal-key"><span><i class="k-w"></i>Win</span><span><i class="k-l"></i>Loss</span><span><i class="k-u"></i>Upcoming</span><span>@ = away</span></div>
      ${sel && byDate[sel] ? `<ul class="sc-list cal-detail">${scRow(k, byDate[sel], today)}</ul>` : ""}`;
  }
  async function openSchedule(k) {
    await loadSchedule();
    const games = seasonGames(k);
    const today = todayET();
    const nextG = games.find((g) => !g.res && g.date >= today);
    const rec = (RESULTS.find((r) => r.team === k) || {}).record || "";
    let mode = "list"; try { mode = sessionStorage.getItem("bs-sched") || "list"; } catch { /* list */ }
    let ym = (nextG ? nextG.date : today).slice(0, 7), sel = nextG ? nextG.date : null;
    if (games.length && !games.some((g) => g.date.slice(0, 7) === ym)) ym = games[games.length - 1].date.slice(0, 7);
    const el = document.createElement("div");
    el.className = "st-sheet sc-sheet";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", `${TEAM_NAME[k]} schedule`);
    el.style.cssText = teamVar(k);
    el.innerHTML = `<div class="st-panel">
      <header class="st-head"><h2>Schedule</h2><span class="st-lg">${esc(TEAM_NAME[k].toUpperCase())}${rec ? ` · ${esc(rec)}` : ""}</span>
        <button type="button" class="st-close" aria-label="Close">✕</button></header>
      <div class="st-seg" role="tablist">
        <button type="button" data-mode="list" aria-selected="${mode === "list"}">List</button>
        <button type="button" data-mode="cal" aria-selected="${mode === "cal"}">Calendar</button>
      </div>
      <div class="st-body"></div>
    </div>`;
    const body = el.querySelector(".st-body");
    const render = () => {
      body.innerHTML = mode === "list" ? scList(k, games, today) : scCalendar(k, games, today, ym, sel);
      if (mode === "list") { const n = body.querySelector("#sc-next"); body.scrollTop = n ? Math.max(0, n.offsetTop - 220) : 0; }
      else body.scrollTop = 0;
    };
    document.body.appendChild(el);
    document.body.style.overflow = "hidden";
    render();
    history.pushState({ stSheet: true }, "");
    let closed = false;
    const remove = () => {
      if (closed) return;
      closed = true;
      el.remove();
      document.body.style.overflow = "";
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", remove);
    };
    const onPop = () => remove();
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", remove);   // tapping a result opens its recap
    const close = () => { if (history.state && history.state.stSheet) history.back(); else remove(); };
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest(".st-close")) return close();
      const seg = e.target.closest(".st-seg button");
      if (seg) {
        mode = seg.dataset.mode;
        try { sessionStorage.setItem("bs-sched", mode); } catch { /* fine */ }
        el.querySelectorAll(".st-seg button").forEach((x) => x.setAttribute("aria-selected", String(x === seg)));
        return render();
      }
      const nav = e.target.closest("[data-cal]");
      if (nav && nav.dataset.cal) return slide(nav.getAttribute("aria-label").startsWith("Next") ? -1 : 1);
      const day = e.target.closest(".cal-day[data-day]");
      if (day) { sel = day.dataset.day; const top = body.scrollTop; render(); body.scrollTop = top; }
    });
    // Swipe the calendar to change months. The neighbouring month is drawn right beside the current one
    // and both move together with your finger, like a carousel, so there's never an empty gap.
    // The arrows run the same slide.
    let sx = 0, sy = 0, st = 0, dx = 0, axis = null, grid = null, ghost = null, ghostDir = 0, busy = false;
    const EASE = "cubic-bezier(.2,.8,.2,1)", GAP = 16;
    const navBtn = (dir) => body.querySelector(`.cal-nav button[aria-label="${dir < 0 ? "Next" : "Previous"} month"]`);
    const target = (dir) => { const b = navBtn(dir); return b && !b.disabled && b.dataset.cal ? b.dataset.cal : null; };
    const width = () => grid.getBoundingClientRect().width + GAP;
    const placeGhost = (dir) => {   // dir -1 = next month (comes in from the right), 1 = previous
      if (ghostDir === dir && ghost) return;
      if (ghost) ghost.remove();
      ghost = null; ghostDir = dir;
      const t = target(dir);
      if (!t) return;
      ghost = document.createElement("div");
      ghost.className = "cal-grid cal-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.innerHTML = calCells(games, today, t, null);
      grid.parentNode.appendChild(ghost);
    };
    const pos = (x, ms) => {
      const tr = ms ? `transform ${ms}ms ${EASE}` : "none";
      grid.style.transition = tr; grid.style.transform = `translateX(${x}px)`;
      if (ghost) { ghost.style.transition = tr; ghost.style.transform = `translateX(${x - ghostDir * width()}px)`; }
    };
    const finish = (dir, ms) => {   // complete a move to the neighbouring month
      busy = true;
      const t = target(dir);
      const h = body.querySelector(".cal-head h3");
      if (h) h.textContent = calTitle(t);
      pos(dir * width(), ms);
      setTimeout(() => { ym = t; sel = null; ghost = null; ghostDir = 0; render(); busy = false; }, ms + 20);
    };
    function slide(dir) {   // arrow buttons
      if (busy || !target(dir)) return;
      grid = body.querySelector(".cal-grid"); if (!grid) return;
      placeGhost(dir); pos(0, 0);
      requestAnimationFrame(() => requestAnimationFrame(() => finish(dir, 300)));
    }
    body.addEventListener("touchstart", (e) => {
      if (busy || mode !== "cal" || !e.target.closest(".cal-vp")) { grid = null; return; }
      grid = body.querySelector(".cal-grid:not(.cal-ghost)");
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = performance.now(); dx = 0; axis = null;
      ghost = null; ghostDir = 0;
      grid.style.transition = "none";
    }, { passive: true });
    body.addEventListener("touchmove", (e) => {
      if (!grid) return;
      const mx = e.touches[0].clientX - sx, my = e.touches[0].clientY - sy;
      if (!axis && Math.abs(mx) + Math.abs(my) > 8) axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (axis !== "x" || !mx) return;
      const dir = mx < 0 ? -1 : 1;
      placeGhost(dir);
      dx = ghost ? mx : mx * 0.25;   // rubber-band when there's no month that way
      pos(dx, 0);
    }, { passive: true });
    body.addEventListener("touchend", () => {
      if (!grid) return;
      const v = Math.abs(dx) / Math.max(performance.now() - st, 1);   // px per ms
      const dir = dx < 0 ? -1 : 1;
      const go = axis === "x" && ghost && ghostDir === dir && (Math.abs(dx) > 60 || (v > 0.45 && Math.abs(dx) > 20));
      if (go) {
        const left = width() - Math.abs(dx);
        finish(dir, Math.round(Math.min(320, Math.max(160, left / Math.max(v, 1.2)))));
      } else {   // snap back
        const g = ghost;
        pos(0, 240);
        setTimeout(() => { if (!g) return; g.remove(); if (g === ghost) { ghost = null; ghostDir = 0; } }, 260);
      }
      grid = null;
    }, { passive: true });
    el.querySelector(".st-close").focus();
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
    if (!b) return;
    if (b.dataset.sched) openSchedule(b.dataset.team); else openSheet(b.dataset.team);
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
          ${board(data.today, data.date)}
          ${results.length ? `<h2 class="section-title">Last night</h2>${results.map((g) => game(g)).join("")}` : ""}
          ${comingUp(data.off)}
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
    if (listenTimer) clearInterval(listenTimer);
    listenTimer = null;
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
    const st = (ev.status && ev.status.type) || {};
    const state = st.state;
    if (state === "pre" || !state) return;
    const usLeft = row.dataset.away === "1";
    const left = usLeft ? us : them, right = usLeft ? them : us;
    const n = (c) => Number(c.score) || 0;
    const dL = row.querySelector('.sb-dg[data-side="L"]'), dR = row.querySelector('.sb-dg[data-side="R"]');
    dL.textContent = left.score ?? "0"; dR.textContent = right.score ?? "0";
    dL.classList.toggle("lose", n(left) < n(right)); dR.classList.toggle("lose", n(right) < n(left));
    row.querySelector(".sb-pre").hidden = true;
    row.querySelector(".sb-live").hidden = false;
    row.classList.toggle("is-live", state === "in");
    row.classList.toggle("is-final", state === "post");
    const tv = row.querySelector(".sb-tv");
    if (tv) tv.hidden = state === "post";   // no need for the channel once it's over
    const clock = row.querySelector(".sb-clock");
    const league = row.dataset.league;
    if (state === "in") {
      const p = (ev.status && ev.status.period) || 0, dc = (ev.status && ev.status.displayClock) || "";
      const regs = league === "nhl" ? 3 : league === "mlb" ? 99 : 4;
      let txt;
      if (/HALFTIME/.test(st.name || "")) txt = "HALFTIME";
      else if (league === "mlb" || dc === "0:00" || !dc) txt = String(st.shortDetail || st.detail || "").toUpperCase();
      else if (p > regs) txt = `${league === "nhl" && p > 4 ? "SO" : p - regs > 1 ? `${p - regs}OT` : "OT"} · ${dc}`;
      else txt = `${league === "nhl" ? ordinal(p) : `Q${p}`} · ${dc}`;
      clock.textContent = txt;
    } else {
      const res = us.winner ? "W" : them.winner ? "L" : "";
      clock.textContent = `${String(st.shortDetail || "Final").toUpperCase()}${res ? ` · ${res}` : ""}`;
      // Once final, show both teams' updated records from the feed.
      const rec = (c) => {
        const r = (c.records || []).find((x) => x.type === "total" || x.name === "overall") || (c.records || [])[0];
        return r && r.summary ? String(r.summary).replace(/-/g, "–") : "";
      };
      const ru = rec(us), rt = rec(them);
      if (ru) row.querySelector(".sb-us .sb-rec").textContent = ru;
      if (rt) row.querySelector(".sb-them .sb-rec").textContent = rt;
    }
  }

  let listenTimer = null;
  function mount(root, data) {
    stopLive();
    const upd = () => updateListen(root, data.date);
    upd();
    listenTimer = setInterval(upd, 60000);
    const rows = [...root.querySelectorAll(".board-row[data-league]")];
    const todayET = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
    // Keep checking scores after midnight until the next morning's issue replaces this one,
    // so last night's games keep their final scores (and late games keep updating) overnight.
    const yday = new Date(Date.now() - 864e5);
    const yesterdayET = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(yday);
    if (!rows.length || (data.date !== todayET && data.date !== yesterdayET)) return;
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
      upd();
      if (allDone) stopLive();
    };
    tick();
    timer = setInterval(tick, 30000);
    document.addEventListener("visibilitychange", onVisible);
  }
  window.addEventListener("hashchange", stopLive);

  document.addEventListener("click", (e) => {
    const b = e.target.closest(".tn-more");
    if (!b) return;
    const team = b.closest(".team");
    const open = b.dataset.open === "1";
    team.querySelectorAll(".tn-extra").forEach((d) => { d.hidden = open; if (open) d.open = false; });
    b.dataset.open = open ? "" : "1";
    b.textContent = open ? `See ${b.dataset.more} more` : "Show less";
  });

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

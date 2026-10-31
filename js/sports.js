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

  /* ── Listen live: shown under each game on the scoreboard from 30 minutes before the start until the
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
    updateLayout(root, date, today, now);
    root.querySelectorAll(".board-listen").forEach((a) => {
      const row = a.previousElementSibling;
      const live = !!(row && row.classList.contains("is-live")), final = !!(row && row.classList.contains("is-final"));
      const s = a.dataset.start === "" ? null : +a.dataset.start;
      const inWindow = date === today && s !== null && now >= s - 30 && now <= s + 240;
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

  /* Team logos from ESPN's image server (the same images ESPN's own feeds point to). The "dark" versions
     are made for dark backgrounds; if one is missing we fall back to the regular logo, and if that fails
     too the image just disappears and the team's color dot shows instead. */
  const LOGO_ABBR = { celtics: "bos", bruins: "bos", patriots: "ne", redsox: "bos" };
  const darkTheme = () => document.documentElement.dataset.theme === "dark";
  function logo(league, abbr, cls, dark) {
    if (!league || !abbr) return "";
    const a = String(abbr).toLowerCase().replace(/[^a-z]/g, "");
    const base = `https://a.espncdn.com/i/teamlogos/${league}/500`;
    const fb = dark ? ` data-fb="${base}/${a}.png"` : "";
    return `<img class="tlogo ${cls}" src="${dark ? `${base}-dark/${a}.png` : `${base}/${a}.png`}"${fb} alt="" loading="lazy" decoding="async"
      onerror="if(this.dataset.fb){this.src=this.dataset.fb;this.removeAttribute('data-fb')}else{this.parentNode.classList.add('nologo');this.remove()}">`;
  }
  const teamLogo = (k, cls, dark) => logo(TEAM_LEAGUE[k], LOGO_ABBR[k], cls, dark);

  /* ── Today's games: an arena-style scoreboard per game. Away team on the left, home on the right,
     the start time in the middle before the game, then live scores and the clock, then FINAL. */
  function scoreboard(g, ymd) {
    const league = SPORT_PATH[g.league] ? g.league : "";
    const away = /^\s*at\b/i.test(g.matchup || "");
    const nick = String(g.matchup || "").replace(/^\s*(vs\.?|at|@)\s*/i, "").trim();
    const o = (OPP[league] || {})[nick] || [nick.slice(0, 3).toUpperCase(), "#8A8478"];
    const bos = { cls: "us", ab: TEAM_ABBR[g.teamKey] || g.team.slice(0, 3).toUpperCase(), nm: g.team, rec: g.record, color: (TEAMS[g.teamKey] || {}).color,
      img: logo(league, LOGO_ABBR[g.teamKey], "sb-logo", true) };
    const them = { cls: "them", ab: o[0], nm: nick, rec: g.oppRecord, color: o[1], img: logo(league, o[0], "sb-logo", true) };
    const [L, R] = away ? [bos, them] : [them, bos];
    const block = (t, side) => `<div class="sb-team sb-${t.cls}" style="--c:${t.color}">
        <div class="sb-side">${side}</div>${t.img || ""}<div class="sb-ab">${esc(t.ab)}</div><div class="sb-rec">${esc(t.rec || "")}</div></div>`;
    const mins = clockMin(g.time);
    const when = mins !== "" && mins < 17 * 60 ? "TODAY" : "TONIGHT";
    const tm = String(g.time || "").match(/^(\d{1,2}:\d{2})\s*([AP]M)$/i);
    const timeHtml = tm ? `${esc(tm[1])}<span class="sb-ampm">${esc(tm[2].toUpperCase())}</span>` : esc(g.time || "TBD");
    const attrs = league ? ` href="https://www.espn.com/${league}/scoreboard/_/date/${ymd}" target="_blank" rel="noopener" data-league="${league}" data-abbr="${ESPN_ABBR[g.teamKey] || ""}"` : "";
    const tag = league ? "a" : "div";
    return `<${tag} class="board-row sb"${attrs} data-away="${away ? 1 : 0}" data-team="${esc(g.teamKey)}">
        <div class="sb-grid">
          ${block(L, "AWAY")}
          <div class="sb-mid">
            <div class="sb-pre"><div class="sb-when">${when}</div><div class="sb-time">${timeHtml}</div>${g.venue ? `<div class="sb-venue">${esc(g.venue)}</div>` : ""}</div>
            <div class="sb-live" hidden><div class="sb-digits"><div class="sb-dg" data-side="L"></div><div class="sb-dg" data-side="R"></div></div><div class="sb-clock"></div></div>
            ${g.tv ? `<div class="board-tv sb-tv"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${esc(g.tv)}</div>` : ""}
          </div>
          ${block(R, "HOME")}
        </div>
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
  const cuChev = () => chevronRight.replace("ta-chev", "cu-chev");   // tap a game for its preview
  // Coming up: the next game for each in-season team not playing today, below Last night.
  function comingUp(off, today) {
    const todays = (today || []).map((g) => `<li class="cu-today" data-pv="${esc(g.teamKey)}" role="button" tabindex="0" style="${teamVar(g.teamKey)}"><span class="cu-mark">${teamLogo(g.teamKey, "cu-logo", darkTheme())}<span class="chip" aria-hidden="true"></span></span><b>${esc(g.team)}</b>
        <span class="cu-what"><span class="cu-tag">TODAY</span> ${esc(g.matchup || "")}</span>${g.time ? `<span class="cu-time">${esc(g.time)}</span>` : ""}${cuChev()}</li>`).join("");
    if (!todays && (!off || !off.length)) return "";
    const rows = todays + (off || []).map((o) => {
      const t = String(o.text || "").replace(/^Next:\s*/i, "");
      const m = t.match(/^(.*?)(?:,\s*)(\d{1,2}:\d{2}\s*[AP]M|TBD)$/i);
      const what = m ? m[1] : t, time = m ? m[2] : "";
      const w = what.match(/^(.*?)\s+((?:vs|at)\s.+)$/i);
      return `<li class="cu-off" data-team="${esc(o.teamKey)}" data-pv="${esc(o.teamKey)}" role="button" tabindex="0" style="${teamVar(o.teamKey)}"><span class="cu-mark">${teamLogo(o.teamKey, "cu-logo", darkTheme())}<span class="chip" aria-hidden="true"></span></span><b>${esc(o.team)}</b>
        <span class="cu-what">${w ? `<span class="cu-date">${esc(w[1])}</span> · ${esc(w[2])}` : esc(what)}</span>${time ? `<span class="cu-time">${esc(time)}</span>` : ""}${cuChev()}</li>`;
    }).join("");
    return `<section class="cu"><h2 class="section-title">Coming up</h2><ul class="cu-list">${rows}</ul></section>`;
  }
  /* Newspaper order: recaps first for most of the day. Thirty minutes before the day's first game, every
     game today switches to scoreboard mode at the top of the page (and leaves Coming up). The
     scoreboards stay up overnight until the next morning's issue replaces this one. */
  function gameDayCutoff(today) {
    const mins = (today || []).map((g) => clockMin(g.time));
    if (!mins.length) return "";
    if (mins.some((m) => m === "")) return 0;   // a game with no set time: show the scoreboard all day
    return Math.max(0, Math.min(...mins) - 30);
  }
  function updateLayout(root, date, today, now) {
    const slot = root.querySelector(".sb-slot");
    if (!slot) return;
    const cut = slot.dataset.cutoff === "" ? null : +slot.dataset.cutoff;
    const started = !!slot.querySelector(".board-row.is-live, .board-row.is-final");
    const on = started || (cut !== null && ((date === today && now >= cut) || date < today));
    slot.hidden = !on;
    // Scoreboard mode: last night's closed recap cards drop their summary line.
    const panel = slot.closest(".tab-panel");
    if (panel) panel.classList.toggle("sb-mode", on);
    root.querySelectorAll(".cu-today").forEach((li) => { li.hidden = on; });
    const cu = root.querySelector(".cu");
    if (cu) cu.hidden = !cu.querySelector(".cu-list li:not([hidden])");
    // As soon as a game is final, that team's next game joins Coming up.
    slot.querySelectorAll(".board-row.sb.is-final[data-team]").forEach((r) => {
      addNextGame(root, r.dataset.team, date);
      if (!r.dataset.stRefreshed) {   // ESPN's standings can lag a final by a few minutes: check now, then twice more
        r.dataset.stRefreshed = "1";
        [0, 180000, 900000].forEach((ms) => setTimeout(() => { if (root.isConnected) refreshStandings(root, true); }, ms));
      }
    });
  }
  const nextPending = new Set();
  async function addNextGame(root, team, date) {
    const key = `${date}:${team}`;
    if (nextPending.has(key) && root.querySelector(`.cu-list li[data-next="${team}"]`)) return;
    if (nextPending.has(key)) return;
    nextPending.add(key);
    await loadSchedule();
    const games = ((SCHED && SCHED.teams && SCHED.teams[team]) || {}).games || [];
    const n = games.find((x) => x.date > date);
    if (!n || !root.isConnected) { nextPending.delete(key); return; }
    // Teams tab: swap "Today · …" for the next game too.
    const day0 = new Date(n.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const tn = root.querySelector(`.team-next[data-team="${team}"]`);
    if (tn) tn.textContent = `Next · ${day0} ${n.home === false ? "at" : "vs"} ${n.opp}, ${n.time || "TBD"}`;
    let list = root.querySelector(".cu-list");
    if (!list) {   // no Coming up section yet (e.g. every in-season team played today): add one
      const sec = document.createElement("section");
      sec.className = "cu";
      sec.innerHTML = `<h2 class="section-title">Coming up</h2><ul class="cu-list"></ul>`;
      const past = root.querySelector('.tab-panel[data-tab="games"] .archive-link');
      if (!past) { nextPending.delete(key); return; }
      past.before(sec);
      list = sec.querySelector(".cu-list");
    }
    if (list.querySelector(`li[data-next="${team}"]`)) return;
    const day = new Date(n.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const li = document.createElement("li");
    const sortKey = (g) => `${g.date} ${String(clockMin(g.time) === "" ? 9999 : clockMin(g.time)).padStart(4, "0")}`;
    li.dataset.next = team; li.dataset.date = sortKey(n);
    li.dataset.pv = team; li.dataset.pvdate = n.date; li.setAttribute("role", "button"); li.tabIndex = 0;
    li.setAttribute("style", teamVar(team));
    li.innerHTML = `<span class="cu-mark">${teamLogo(team, "cu-logo", darkTheme())}<span class="chip" aria-hidden="true"></span></span><b>${esc(TEAM_NAME[team] || team)}</b>
      <span class="cu-what"><span class="cu-date">${esc(day)}</span> · ${esc(`${n.home === false ? "at" : "vs"} ${n.opp}`)}</span><span class="cu-time">${esc(n.time || "TBD")}</span>${cuChev()}`;
    list.appendChild(li);
    // Keep the list in date order: date the other teams' rows from the schedule, then sort.
    list.querySelectorAll("li.cu-off[data-team]").forEach((o) => {
      if (o.dataset.date) return;
      const g = (((SCHED.teams || {})[o.dataset.team] || {}).games || []).find((x) => x.date >= date);
      o.dataset.date = g ? sortKey(g) : "9999";
    });
    [...list.querySelectorAll("li:not(.cu-today)")].sort((a, b) => (a.dataset.date || "9999").localeCompare(b.dataset.date || "9999"))
      .forEach((x) => list.appendChild(x));
    const cu = list.closest(".cu");
    if (cu) cu.hidden = !list.querySelector("li:not([hidden])");
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

  // "/OT", "/2OT", "/SO" when the line score has extra periods.
  const otTag = (g) => {
    const ps = ((g.report && g.report.periods) || []).map(String);
    const extra = ps.filter((x) => /OT|SO/i.test(x));
    if (!extra.length) return g.ot ? "/OT" : "";
    if (extra.some((x) => /SO/i.test(x))) return "/SO";
    return extra.length > 1 ? `/${extra.length}OT` : "/OT";
  };
  const prevDay = (iso) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };
  function game(g, open) {
    const pli = (p) => `
      <li><span class="p-name">${esc(p.name)}</span>
        <span class="p-line">${esc(p.line)}</span>
        ${p.note ? `<span class="p-note">${esc(p.note)}</span>` : ""}</li>`;
    const P = (g.performers || []).slice(0, 3);
    // Closed card: date/FINAL + result, two score rows (away on top, home below), headline, "See full recap".
    const league = String(g.sport || "").toLowerCase();
    const oppInfo = (OPP[league] || {})[g.opp.name] || [g.opp.abbr, "#8A8478"];
    const dk = darkTheme();
    const bos = { ab: g.boston.abbr, nm: TEAM_NAME[g.teamKey] || "", sc: g.boston.score, rec: g.record, c: (TEAMS[g.teamKey] || {}).color, img: teamLogo(g.teamKey, "rc-logo", dk) };
    const opp = { ab: g.opp.abbr, nm: g.opp.name || "", sc: g.opp.score, rec: g.opp.record, c: oppInfo[1], img: logo(league, oppInfo[0], "rc-logo", dk) };
    const rows = g.home === false ? [bos, opp] : [opp, bos];
    const hi = Math.max(+bos.sc || 0, +opp.sc || 0);
    const row = (t) => `<div class="rc-row${(+t.sc || 0) < hi ? " lose" : ""}" style="--c:${t.c}">
          <span class="rc-mark">${t.img || ""}<span class="rc-dot"></span></span><span class="rc-ab">${esc(t.ab)}</span>
          <span class="rc-nm">${esc(t.nm)}${t.rec ? `<span class="rc-rec">${esc(t.rec)}</span>` : ""}</span>
          <span class="rc-sc">${esc(t.sc)}</span></div>`;
    const day = g.date ? new Date(g.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() + " · " : "";
    const head = esc(g.headline).replace(/ (\d+[–-]\d+)$/, "&nbsp;$1");   // keep a trailing score with the word before it
    return `<details class="game rc" style="${teamVar(g.teamKey)}"${open ? " open" : ""}>
      <summary>
        <div class="rc-top"><span>${day}FINAL${otTag(g)}</span><span class="result ${esc(g.result)}">${esc(g.result)}</span></div>
        <div class="rc-rows">${rows.map(row).join("")}</div>
        <div class="rc-hl"><h3 class="headline">${head}</h3><span class="rc-chev" aria-hidden="true">${chevron(18)}</span></div>
        ${g.takeaway ? `<p class="rc-sum">${esc(g.takeaway)}</p>` : ""}
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

  /* ── Live standings ──────────────────────
     The morning issue carries a standings snapshot. While the app is open it also pulls live standings
     from ESPN's public feed (the same source as live scores), sorts them itself (ESPN doesn't list teams
     in order) and swaps them in only if they're at least as current as the snapshot. Otherwise the
     snapshot stays. Refreshed when a sheet opens and right after a Boston game goes final. */
  const ST_PATH = { nba: "basketball/nba", nhl: "hockey/nhl", nfl: "football/nfl", mlb: "baseball/mlb" };
  const ST_COLS = { nba: ["W–L", "GB"], nhl: ["W–L–OT", "PTS"], nfl: ["W–L", "GB"], mlb: ["W–L", "GB"] };
  const ST_CUTS = {
    nba: [[6, 10], "Top 6 make the playoffs, 7–10 the play-in"],
    nfl: [[7], "Top 7 make the playoffs (division winners seeded 1–4)"],
    nhl: [[], "Top 3 in each division plus 2 wild cards make the playoffs"],
    mlb: [[6], "Top 6 make the playoffs (division winners seeded 1–3)"],
  };
  const ST_BOSTON = { nba: "Celtics", nhl: "Bruins", nfl: "Patriots", mlb: "Red Sox" };
  function stSeason(lg) {   // ESPN names NBA/NHL seasons by the year they end, NFL/MLB by the year they start
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date()).split("-").map(Number);
    const [y, m] = p;
    if (lg === "nba" || lg === "nhl") return m >= 7 ? y + 1 : y;
    if (lg === "nfl") return m >= 3 ? y : y - 1;
    return y;
  }
  function parseStandings(lg, json) {
    const stat = (e, n) => { const s = (e.stats || []).find((x) => x.name === n); return s && typeof s.value === "number" ? s.value : null; };
    const confs = [];
    for (const c of json.children || []) {
      const isNfl = lg === "nfl";
      const label = isNfl ? (c.abbreviation || c.name) : String(c.name || "");
      const name = isNfl ? label : ({ Eastern: "East", Western: "West", American: "AL", National: "NL" }[label.split(" ")[0]] || label);
      const divs = [];
      for (const d of c.children || []) {
        const rows = ((d.standings || {}).entries || []).map((e) => {
          const w = stat(e, "wins") || 0, l = stat(e, "losses") || 0;
          const r = { team: (e.team || {}).name || (e.team || {}).shortDisplayName || "", w, l,
            pct: stat(e, "winPercent"), seed: stat(e, "playoffSeed") ?? 99, gp: stat(e, "gamesPlayed") };
          // For the game preview: last 10 games and current streak, when ESPN has them.
          const l10 = (e.stats || []).find((x) => x.type === "lasttengames" || x.name === "Last Ten Games");
          const stk = (e.stats || []).find((x) => x.name === "streak");
          if (l10 && l10.summary) r.l10 = String(l10.summary).replace(/-/g, "–");
          if (stk && stk.displayValue && /^[WLT]\d+$/.test(stk.displayValue)) r.streak = stk.displayValue;
          if (lg === "nhl") {
            const otl = stat(e, "otLosses") ?? stat(e, "overtimeLosses") ?? 0;
            Object.assign(r, { otl, pts: stat(e, "points") ?? 2 * w + otl, rw: stat(e, "regWins") || 0, row: stat(e, "rotWins") || 0 });
            r.gp = r.gp ?? w + l + otl;
            r.rec = `${w}–${l}–${otl}`;
          } else {
            const t = lg === "nfl" ? stat(e, "ties") || 0 : 0;
            r.t = t; r.gp = w + l + t;
            if (r.pct == null) r.pct = r.gp ? (w + t / 2) / r.gp : 0;
            r.rec = `${w}–${l}` + (t ? `–${t}` : "");
          }
          return r;
        });
        if (rows.length) divs.push({ name: String(d.name || "").replace(/\s+Division$/, ""), rows });
      }
      if (divs.length) confs.push({ name, label, divs });
    }
    if (!confs.length) return null;
    const order = lg === "nhl"
      ? (a, b) => b.pts - a.pts || a.gp - b.gp || b.rw - a.rw || b.row - a.row || a.seed - b.seed
      : (a, b) => b.pct - a.pct || b.w - a.w || a.seed - b.seed;
    const gb = (rows) => {
      if (lg === "nhl" || !rows.length) return rows;
      const L = rows[0];
      rows.forEach((r, i) => { const v = ((L.w - r.w) + (r.l - L.l)) / 2; r.gb = i === 0 || v <= 0 ? "—" : String(+v.toFixed(1)); });
      return rows;
    };
    const pub = (r, rank) => {
      const o = { team: r.team, rec: r.rec };
      if (r.l10) o.l10 = r.l10;
      if (r.streak) o.streak = r.streak;
      if (lg === "nhl") o.pts = r.pts; else o.gb = r.gb;
      if (rank != null) o.rank = rank;
      if (r.team === ST_BOSTON[lg]) o.boston = true;
      return o;
    };
    const me = confs.find((c) => c.divs.some((d) => d.rows.some((r) => r.team === ST_BOSTON[lg])));
    if (!me) return null;
    confs.sort((a, b) => (b === me) - (a === me));
    const out = { league: lg, cols: ST_COLS[lg], confLabel: {}, conferences: [], live: true };
    if (ST_CUTS[lg][0].length) out.cut = ST_CUTS[lg][0];
    out.cutNote = ST_CUTS[lg][1];
    for (const c of confs) {
      out.confLabel[c.name] = c.label;
      const divs = c === me ? [...c.divs].sort((a, b) => b.rows.some((r) => r.team === ST_BOSTON[lg]) - a.rows.some((r) => r.team === ST_BOSTON[lg])) : c.divs;
      const all = divs.flatMap((d) => d.rows);
      // Conference order: ESPN's playoff seed already applies the tiebreakers (NBA/NFL/MLB); NHL by points.
      const seedsOk = lg !== "nhl" && all.every((r) => r.seed < 99) && new Set(all.map((r) => r.seed)).size === all.length;
      const ranked = gb([...all].sort(seedsOk ? (a, b) => a.seed - b.seed : order).map((r) => ({ ...r })));
      out.conferences.push({
        name: c.name,
        divisions: divs.map((d) => ({ name: d.name, rows: gb([...d.rows].sort(order).map((r) => ({ ...r }))).map((r) => pub(r)) })),
        ranked: ranked.map((r, i) => pub(r, i + 1)),
      });
    }
    return out;
  }
  const gpOf = (rec) => String(rec || "").split(/[–-]/).reduce((a, n) => a + (+n || 0), 0);
  function bostonRec(S) {
    for (const c of S.conferences) for (const d of c.divisions) { const r = d.rows.find((x) => x.boston); if (r) return r.rec; }
    return "";
  }
  const liveAt = {};
  async function fetchLive(lg) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/v2/sports/${ST_PATH[lg]}/standings?level=3&season=${stSeason(lg)}&seasontype=2`, { cache: "no-store" });
      if (!res.ok) return null;
      return parseStandings(lg, await res.json());
    } catch { return null; }
  }
  // Pull live standings for every league the issue has; keep them only if they're as current as what we have.
  async function refreshStandings(root, force) {
    if (!ALL) return false;
    let changed = false;
    await Promise.all(Object.keys(ALL).filter((lg) => ST_PATH[lg]).map(async (lg) => {
      if (!force && liveAt[lg] && Date.now() - liveAt[lg] < 60000) return;
      const S = await fetchLive(lg);
      if (!S || !ALL) return;
      const have = gpOf(bostonRec(ALL[lg])), got = gpOf(bostonRec(S));
      if (!got || got < have || got > have + 4) return;   // stale or wrong season: keep the snapshot
      ALL[lg] = S; liveAt[lg] = Date.now(); changed = true;
    }));
    if (changed && root) root.querySelectorAll(".team-meta[data-team]").forEach((el) => { el.textContent = placeLine(el.dataset.team); });
    return changed;
  }

  const chevronRight = `<svg class="ta-chev" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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
          <div class="team-id"><span class="cu-mark tm-mark">${teamLogo(k, "tm-logo", darkTheme())}<span class="chip"></span></span><h2>${esc(TEAM_NAME[k])}</h2></div>
          <span class="team-meta" data-team="${k}">${esc(placeLine(k))}</span>
        </header>
        ${next ? `<p class="team-next" data-team="${k}">${esc(next)}</p>` : ""}
        ${has ? `<div class="team-acts">
          <button type="button" class="st-btn ta-btn" data-team="${k}" data-sched="1"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg><span>Schedule</span>${chevronRight}</button>
          <button type="button" class="st-btn ta-btn" data-team="${k}"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V12M10 20V5M15 20V9M20 20V14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg><span>Standings</span>${chevronRight}</button>
        </div>` : ""}
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
      <header class="st-head"><h2>Standings</h2><span class="st-lg">${esc(S.league.toUpperCase())}<span class="st-live">${S.live ? " · LIVE" : ""}</span></span>
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
      el.querySelector(".st-body").innerHTML = sheetBody(cur(), b.dataset.mode);
      el.querySelector(".st-body").scrollTop = 0;
    });
    el.querySelector(".st-close").focus();
    // Show the snapshot right away, then swap in live standings if they come back newer.
    const lg = TEAM_LEAGUE[k];
    const cur = () => (ALL && ALL[lg]) || S;
    refreshStandings(document.getElementById("app"), false).then(() => {
      if (closed || cur() === S) return;
      const mode = (el.querySelector('.st-seg button[aria-selected="true"]') || {}).dataset?.mode || "division";
      el.querySelector(".st-body").innerHTML = sheetBody(cur(), mode);
      el.querySelector(".st-live").textContent = " · LIVE";
    });
  }
  /* ── Game preview: tap a game in Coming up ─────────────
     The matchup (away left, home right, logos, day, time, arena, then TV and radio), a side-by-side team
     snapshot from the standings (record, last 10, streak, division place), this season's meetings from
     saved recaps, and a link to ESPN's full preview for odds, injuries and deeper stats. It's before the
     game, so there's no Listen button. */
  let PV_DATA = null;
  const PV_TV = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  function pvTeam(lg, nick) {   // a team's standings row plus its division place, by nickname
    const S = ALL && ALL[lg];
    if (!S || !nick) return {};
    for (const c of S.conferences || []) for (const d of c.divisions || []) {
      const i = d.rows.findIndex((r) => r.team === nick);
      if (i >= 0) return { ...d.rows[i], place: `${ord(i + 1)} · ${d.name}` };
    }
    return {};
  }
  function pvWhen(date) {
    const t = todayET();
    if (date === t) return ["TODAY", true];
    if (date === new Date(dt(t).getTime() + 864e5).toLocaleDateString("en-CA")) return ["TOMORROW", false];
    return [`${dow(date)} · ${md(date).toUpperCase()}`, false];
  }
  async function pvInfo(k, pvdate) {
    const d = PV_DATA || {};
    const lg = TEAM_LEAGUE[k];
    await loadSchedule();
    const t = (d.today || []).find((g) => g.teamKey === k);
    if (t && (!pvdate || pvdate === d.date)) {
      return { k, lg: t.league || lg, date: d.date, time: t.time, tv: t.tv, venue: t.venue, radio: t.radio,
        home: !/^\s*at\b/i.test(t.matchup || ""), opp: String(t.matchup || "").replace(/^\s*(vs\.?|at|@)\s*/i, "").trim(),
        rec: t.record, oppRec: t.oppRecord };
    }
    const games = ((SCHED && SCHED.teams && SCHED.teams[k]) || {}).games || [];
    const g = pvdate ? games.find((x) => x.date === pvdate) : games.find((x) => x.date >= (d.date || todayET()));
    if (!g) return null;
    return { k, lg, date: g.date, time: g.time, tv: g.tv, venue: g.venue || "", home: g.home !== false, opp: g.opp, oppAbbr: g.oppAbbr };
  }
  function pvBody(p) {
    const o = (OPP[p.lg] || {})[p.opp] || [p.oppAbbr || String(p.opp).slice(0, 3).toUpperCase(), "#8A8478"];
    const bos = { ab: TEAM_ABBR[p.k], nick: TEAM_NAME[p.k], c: (TEAMS[p.k] || {}).color, la: LOGO_ABBR[p.k], rec: p.rec };
    const them = { ab: o[0], nick: p.opp, c: o[1], la: o[0], rec: p.oppRec };
    const [A, H] = p.home ? [them, bos] : [bos, them];
    const block = (t, side, r) => `<div class="pv-t${r ? " r" : ""}" style="--c:${t.c}"><span class="pv-mark">${logo(p.lg, t.la, "pv-logo", true)}</span>
        <div><div class="pv-side">${side}</div><div class="pv-ab">${esc(t.ab)}</div></div></div>`;
    const [when, isToday] = pvWhen(p.date);
    const tm = String(p.time || "").match(/^(\d{1,2}:\d{2})\s*([AP]M)$/i);
    const time = tm ? `${esc(tm[1])}<span>${esc(tm[2].toUpperCase())}</span>` : esc(p.time || "TBD");
    const radio = (p.radio && p.radio.name) || (RADIO[p.k] || {}).name || "";
    const strip = [p.tv ? `<span class="it">${PV_TV}<span>TV: <b>${esc(p.tv)}</b></span></span>` : "",
      radio ? `<span class="it">${RADIO_ICON}<span>Radio: <b>${esc(radio)}</b></span></span>` : ""].filter(Boolean).join(`<span class="sep"></span>`);
    // Snapshot: live standings when we have them, the morning's numbers otherwise.
    const sa = { ...pvTeam(p.lg, A.nick) }, sh = { ...pvTeam(p.lg, H.nick) };
    if (!sa.rec && A.rec) sa.rec = A.rec;
    if (!sh.rec && H.rec) sh.rec = H.rec;
    const rows = [["Record", "rec"], ["Last 10", "l10"], ["Streak", "streak"], ["Division", "place"]]
      .filter(([, f]) => sa[f] || sh[f])
      .map(([label, f]) => `<div class="rw"><span>${esc(sa[f] || "—")}</span><span>${label}</span><span>${esc(sh[f] || "—")}</span></div>`).join("");
    const hd = (t) => `<div style="--c:${t.c}"><span class="pv-mark sm">${logo(p.lg, t.la, "pv-logo", darkTheme())}</span>${esc(t.ab)}</div>`;
    // This season: earlier meetings from saved recaps, and which meeting this is.
    const met = (RESULTS || []).filter((r) => r.team === p.k && r.opp === p.opp && r.date < p.date).sort((a, b) => a.date.localeCompare(b.date));
    const all = (((SCHED && SCHED.teams && SCHED.teams[p.k]) || {}).games || []).filter((g) => g.opp === p.opp);
    const n = all.filter((g) => g.date <= p.date).length || met.length + 1, total = Math.max(all.length, n);
    const note = total <= 1 ? "Only meeting of the season." : `${n === 1 ? "First" : ord(n)} of ${total} meetings this season.`;
    const list = met.map((r) => `<a class="pv-meet" href="#/games/${p.k}/${esc(r.id)}"><span class="pv-md">${esc(md(r.date))}</span>
        <span class="pv-mo">${r.home === false ? "at" : "vs"} ${esc(r.opp)}</span><span class="pv-res"><span class="result ${esc(r.result)}">${esc(r.result)}</span> ${esc(`${r.bos}–${r.oppScore}${r.ot ? " OT" : ""}`)}</span><span class="go" aria-hidden="true">›</span></a>`).join("");
    const ymd = String(p.date).replace(/-/g, "");
    const espn = p.espn || `https://www.espn.com/${p.lg}/scoreboard/_/date/${ymd}`;
    return `<h3 class="pv-title">${esc(TEAM_NAME[p.k])} ${p.home ? "vs" : "at"} ${esc(p.opp)}</h3>
      <div class="pv-card">
        <div class="pv-grid">
          ${block(A, "AWAY")}
          <div class="pv-mid"><span class="pv-pill${isToday ? "" : " later"}">${esc(when)}</span><div class="pv-time">${time}</div>${p.venue ? `<div class="pv-venue">${esc(p.venue)}</div>` : ""}</div>
          ${block(H, "HOME", true)}
        </div>
        ${strip ? `<div class="pv-strip">${strip}</div>` : ""}
      </div>
      ${rows ? `<h4 class="pv-h">Team snapshot</h4><div class="pv-snap"><div class="hd">${hd(A)}<span></span>${hd(H)}</div>${rows}</div>` : ""}
      <h4 class="pv-h">This season</h4>
      <div class="pv-list">${list}<div class="pv-empty">${esc(note)}</div></div>
      <a class="pv-espn" href="${espn}" target="_blank" rel="noopener">ESPN preview: odds, injuries, stats<span aria-hidden="true">↗</span></a>`;
  }
  async function pvEspn(p) {   // venue and the exact ESPN game page, from ESPN's scoreboard for that day
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${SPORT_PATH[p.lg]}/scoreboard?dates=${p.date.replace(/-/g, "")}`, { cache: "no-store" });
      if (!res.ok) return false;
      const json = await res.json();
      const ev = (json.events || []).find((e) => e.competitions && e.competitions[0] &&
        e.competitions[0].competitors.some((c) => c.team && c.team.abbreviation === ESPN_ABBR[p.k]));
      if (!ev) return false;
      const comp = ev.competitions[0];
      if (!p.venue && comp.venue && comp.venue.fullName) p.venue = comp.venue.fullName;
      if (ev.id) p.espn = `https://www.espn.com/${p.lg}/game/_/gameId/${ev.id}`;
      return true;
    } catch { return false; }
  }
  let pvBusy = false;
  async function openPreview(k, pvdate) {
    if (pvBusy || document.querySelector(".st-sheet")) return;
    pvBusy = true;
    const p = await pvInfo(k, pvdate).catch(() => null);
    pvBusy = false;
    if (!p) return;
    const el = document.createElement("div");
    el.className = "st-sheet pv-sheet";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", `${TEAM_NAME[k]} game preview`);
    el.style.cssText = teamVar(k);
    el.innerHTML = `<div class="st-panel">
      <header class="st-head"><h2>Preview</h2><span class="st-lg">${esc(String(p.lg).toUpperCase())}</span>
        <button type="button" class="st-close" aria-label="Close">✕</button></header>
      <div class="st-body">${pvBody(p)}</div>
    </div>`;
    document.body.appendChild(el);
    document.body.style.overflow = "hidden";
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
    window.addEventListener("hashchange", remove);   // tapping an earlier meeting opens its recap
    const close = () => { if (history.state && history.state.stSheet) history.back(); else remove(); };
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest(".st-close")) close(); });
    el.querySelector(".st-close").focus();
    const redraw = () => { if (closed) return; const b = el.querySelector(".st-body"), top = b.scrollTop; b.innerHTML = pvBody(p); b.scrollTop = top; };
    pvEspn(p).then((ok) => { if (ok) redraw(); });
    refreshStandings(document.getElementById("app"), false).then((ch) => { if (ch) redraw(); });
  }
  document.addEventListener("click", (e) => {
    const li = e.target.closest(".cu-list li[data-pv]");
    if (li) openPreview(li.dataset.pv, li.dataset.pvdate || "");
  });
  document.addEventListener("keydown", (e) => {
    const li = e.target && e.target.closest && e.target.closest(".cu-list li[data-pv]");
    if (li && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openPreview(li.dataset.pv, li.dataset.pvdate || ""); }
  });

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
          ${(data.today || []).length ? `<div class="sb-slot" data-cutoff="${gameDayCutoff(data.today)}" hidden>${board(data.today, data.date)}</div>` : ""}
          ${results.length ? `<h2 class="section-title">Last night</h2>${results.map((g) => game({ ...g, date: g.date || prevDay(data.date) })).join("")}` : ""}
          ${comingUp(data.off, data.today)}
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
    PV_DATA = data;
    refreshStandings(root, false);
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

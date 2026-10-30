/* PS Sports, standalone: opens straight to today's issue. Routes: #/ (today), #/games, #/games/<team>, #/games/<team>/<game id>. */
(() => {
  const app = document.getElementById("app");
  const layout = window.Layouts.sports;
  const NAME = "PS Sports";

  /* Light / dark / auto. Keys are prefixed so they never mix with other apps on this site. */
  const THEME_KEY = "bs-theme";
  const THEME_LABEL = { auto: "Auto (follows your phone)", light: "Light mode", dark: "Dark mode" };
  const darkMQ = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function themePref() {
    try { const v = localStorage.getItem(THEME_KEY); return v === "light" || v === "dark" ? v : "auto"; }
    catch { return "auto"; }
  }
  function applyTheme() {
    const pref = themePref();
    const dark = pref === "dark" || (pref === "auto" && darkMQ && darkMQ.matches);
    document.documentElement.dataset.pref = pref;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const btn = document.querySelector(".theme-btn");
    if (btn) btn.setAttribute("aria-label", `Theme: ${THEME_LABEL[pref]}. Tap to change.`);
  }
  window.themeButton = () => `<button class="theme-btn" type="button" aria-label="Change light or dark mode">
    <svg class="i-auto" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg>
    <svg class="i-light" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g></svg>
    <svg class="i-dark" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/></svg>
  </button>`;
  let toastTimer = null;
  function toast(text) {
    let el = document.querySelector(".theme-toast");
    if (!el) { el = document.createElement("div"); el.className = "theme-toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1400);
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".theme-btn")) return;
    const order = ["auto", "light", "dark"];
    const next = order[(order.indexOf(themePref()) + 1) % order.length];
    try { localStorage.setItem(THEME_KEY, next); } catch { /* still applies now */ }
    applyTheme();
    toast(THEME_LABEL[next]);
  });
  if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener("change", applyTheme);
  applyTheme();

  async function getJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path} returned ${res.status}`);
    return res.json();
  }

  function show() { document.body.className = "view-sports"; window.scrollTo(0, 0); }

  async function route() {
    try {
      const h = location.hash;
      const ctx = { name: NAME, backHref: null, backLabel: "", archiveHref: "#/games", issueHref: () => "#/", isRead: () => true };
      const pg = h.match(/^#\/games(?:\/([a-z]+)(?:\/([a-z0-9-]+))?)?$/);
      if (pg) {
        const list = (await getJSON("games/index.json")).games || [];
        const [, team, id] = pg;
        if (id) {
          const g = await getJSON(`games/${id}.json`);
          ctx.backHref = `#/games/${team}`; ctx.backLabel = "Back to the team's games";
          show(); app.innerHTML = layout.pastGame(g, ctx);
        } else if (team) {
          ctx.backHref = "#/games"; ctx.backLabel = "Back to past games";
          show(); app.innerHTML = layout.pastTeamGames(team, list, ctx);
        } else {
          ctx.backHref = "#/"; ctx.backLabel = "Back to today";
          show(); app.innerHTML = layout.pastTeams(list, ctx);
        }
        applyTheme();
        return;
      }
      if (h && h !== "#/" && h !== "#") { location.replace("#/"); return; }   // old past-issue links land on today
      const issues = (await getJSON("index.json")).issues || [];
      if (!issues.length) { show(); app.innerHTML = `<p class="status">The first issue arrives tomorrow morning.</p>`; return; }
      const data = await getJSON(`issues/${issues[0].date}.json`);
      show();
      app.innerHTML = layout.issue(data, ctx);
      applyTheme();
      if (layout.mount) layout.mount(app, data, ctx);
    } catch (err) {
      console.error(err);
      app.innerHTML = `<p class="status">Couldn't load this. Check your connection and reopen the app.</p>`;
    }
  }

  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();

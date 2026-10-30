/* Boston Sports, standalone: opens straight to today's issue. Routes: #/ (latest), #/archive, #/YYYY-MM-DD. */
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

  /* Which issues have been opened, kept on this phone only. */
  const READ_KEY = "bs-read";
  function readSet() {
    try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); } catch { return new Set(); }
  }
  function markRead(date) {
    try { const s = readSet(); s.add(date); localStorage.setItem(READ_KEY, JSON.stringify([...s])); } catch { /* not saved */ }
  }

  function show() { document.body.className = "view-sports"; window.scrollTo(0, 0); }

  async function route() {
    try {
      const m = location.hash.match(/^#\/(archive|\d{4}-\d{2}-\d{2})?$/);
      const part = m ? m[1] : undefined;
      const issues = (await getJSON("index.json")).issues || [];
      if (!issues.length) { show(); app.innerHTML = `<p class="status">The first issue arrives tomorrow morning.</p>`; return; }
      const read = readSet();
      const ctx = {
        name: NAME, backHref: null, backLabel: "",
        archiveHref: "#/archive",
        issueHref: (date) => `#/${date}`,
        isRead: (date) => read.has(date),
      };
      if (part === "archive") {
        ctx.backHref = "#/"; ctx.backLabel = "Back to today's issue";
        show(); app.innerHTML = layout.archive(issues, ctx); applyTheme();
        return;
      }
      const date = part || issues[0].date;
      const data = await getJSON(`issues/${date}.json`);
      if (date !== issues[0].date) { ctx.backHref = "#/archive"; ctx.backLabel = "Back to past issues"; }
      ctx.unreadOthers = issues.filter((i) => i.date !== date && !read.has(i.date)).length;
      show();
      app.innerHTML = layout.issue(data, ctx);
      applyTheme();
      if (layout.mount) layout.mount(app, data, ctx);
      markRead(date);
    } catch (err) {
      console.error(err);
      app.innerHTML = `<p class="status">Couldn't load this. Check your connection and reopen the app.</p>`;
    }
  }

  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();

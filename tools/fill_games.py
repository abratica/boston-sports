"""Fill in box scores and highlight videos for today's issue, straight from the source.

Runs on GitHub's servers (see .github/workflows/fill-games.yml) right after the morning issue is
published and then every 20 minutes through midday. For each game in today's "results" that has no
"box", it pulls ESPN's official game data and builds the box score in the app's format (with the same
add-up checks as GENERATOR.md). For each game with no video (or only a stand-in), it looks for the
official full-game highlights on the league / team YouTube channels and checks it with YouTube.
Writes the issue only when something new passed the checks, then re-saves the game recaps.

    python3 tools/fill_games.py            # from the repo root
Prints what it did; writes tools/fill_status.json (only when the status changes).
"""
import datetime as dt
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

UA = {"User-Agent": "Mozilla/5.0 (PS Sports box score filler)"}
PATH = {"nba": "basketball/nba", "nhl": "hockey/nhl", "nfl": "football/nfl", "mlb": "baseball/mlb"}
ESPN_ABBR = {"celtics": "BOS", "bruins": "BOS", "patriots": "NE", "redsox": "BOS"}
TEAM_NAME = {"celtics": "Celtics", "bruins": "Bruins", "patriots": "Patriots", "redsox": "Red Sox"}
# YouTube channels to search, best first: league, then team, then national broadcaster.
CHANNELS = {
    "nba": [("@NBA", "UCWJ2lWNubArHWmf3FIHbfcQ"), ("@celtics", None)],
    "nhl": [("@NHL", "UCqFMzb-4AUf6WAIbl132QKA"), ("@NHLBruins", None), ("@Sportsnet", None)],
    "nfl": [("@NFL", "UCDVYQ4Zhbm3S2dlz7P1GBDg"), ("@Patriots", None)],
    "mlb": [("@MLB", "UCoLrcjPV5PbUrUyXq5mjc_A"), ("@RedSox", None)],
}
ALLOWED_AUTHORS = {"NBA", "NHL", "NFL", "MLB", "Boston Celtics", "NHL Bruins", "Boston Bruins", "New England Patriots",
                   "Red Sox", "Boston Red Sox", "NBC Sports Boston", "NESN", "Sportsnet", "ESPN", "NBA on ESPN",
                   "NBC Sports", "TNT Sports", "NHL on TNT", "CBS Sports", "FOX Sports", "NFL on FOX", "NFL on CBS",
                   "MLB on FOX", "Prime Video", "NBA on Prime"}
log = []


def say(msg):
    log.append(msg)
    print(msg)


def get(url, as_json=True):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return json.loads(data) if as_json else data.decode("utf-8", "replace")


def num(v):
    s = str(v).strip()
    return int(s) if re.fullmatch(r"-?\d+", s) else s


def pm(v):   # plus/minus as the app stores it: "-2", "+5", "0"
    s = str(v).strip()
    return s if s.startswith(("+", "-")) or s in ("", "--") else ("+" + s if s not in ("0",) else "0")


def find_event(league, team_key, date):
    """ESPN event for Boston's game on `date` (YYYY-MM-DD), if final."""
    ab = ESPN_ABBR[team_key]
    for d in (date,):
        sb = get(f"https://site.api.espn.com/apis/site/v2/sports/{PATH[league]}/scoreboard?dates={d.replace('-', '')}&limit=100")
        for ev in sb.get("events", []):
            comp = (ev.get("competitions") or [{}])[0]
            if any((c.get("team") or {}).get("abbreviation") == ab for c in comp.get("competitors", [])):
                done = ((ev.get("status") or {}).get("type") or {}).get("completed")
                return ev if done else None
    return None


def labels_of(group):
    return group.get("labels") or group.get("names") or []


def nba_box(team_stats):
    g = team_stats["statistics"][0]
    lab = labels_of(g)
    idx = {l: i for i, l in enumerate(lab)}
    cols = ["MIN", "PTS", "REB", "AST", "FG", "3PT", "FT", "STL", "BLK", "TO", "+/-"]
    if not all(c in idx for c in cols):
        raise ValueError(f"NBA labels missing: {[c for c in cols if c not in idx]}")
    starters, bench = [], []
    for a in g.get("athletes", []):
        st = a.get("stats") or []
        if a.get("didNotPlay") or not st or not str(st[idx["MIN"]]).strip() or str(st[idx["MIN"]]) in ("0", "--"):
            continue
        vals = []
        for c in cols:
            v = st[idx[c]]
            vals.append(pm(v) if c == "+/-" else (v if c in ("FG", "3PT", "FT") else num(v)))
        row = {"name": a["athlete"]["displayName"], "values": vals}
        (starters if a.get("starter") else bench).append(row)
    bench.sort(key=lambda r: -(r["values"][0] if isinstance(r["values"][0], int) else 0))
    tot = g.get("totals") or []
    totals = ["" if c in ("MIN", "+/-") else (tot[idx[c]] if c in ("FG", "3PT", "FT") else num(tot[idx[c]])) for c in cols] if tot else []
    grp = {"label": "", "columns": cols, "rows": starters + bench, "totals": totals}
    if starters:
        grp["starters"] = len(starters)
    pts = sum(r["values"][1] for r in grp["rows"] if isinstance(r["values"][1], int))
    return [grp], pts, None


def nhl_box(team_stats):
    sk_rows, gl_rows, shots = [], [], 0
    for g in team_stats["statistics"]:
        lab = labels_of(g)
        idx = {l: i for i, l in enumerate(lab)}
        name = str(g.get("name") or g.get("type") or "").lower()
        for a in g.get("athletes", []):
            st = a.get("stats") or []
            if not st:
                continue
            if "goal" in name and "SA" in idx:   # goalies
                toi = st[idx["TOI"]] if "TOI" in idx else ""
                if not toi or toi in ("0:00", "--"):
                    continue
                svp = st[idx["SV%"]] if "SV%" in idx else ""
                gl_rows.append({"name": a["athlete"]["displayName"],
                                "values": [num(st[idx["SA"]]), num(st[idx["SV"]]), str(svp).lstrip("0") or svp, toi]})
            else:
                need = ["G", "A", "+/-", "S", "HT", "BS", "TOI"]
                if not all(k in idx for k in need):
                    raise ValueError(f"NHL skater labels missing: {[k for k in need if k not in idx]} in {lab}")
                toi = st[idx["TOI"]]
                if not toi or toi in ("0:00", "--"):
                    continue
                gg, aa = num(st[idx["G"]]), num(st[idx["A"]])
                sog = num(st[idx["S"]])
                shots += sog if isinstance(sog, int) else 0
                sk_rows.append({"name": a["athlete"]["displayName"],
                                "values": [gg, aa, (gg if isinstance(gg, int) else 0) + (aa if isinstance(aa, int) else 0),
                                           str(st[idx["+/-"]]), sog, num(st[idx["HT"]]), num(st[idx["BS"]]), toi]})
    secs = lambda t: sum(int(x) * m for x, m in zip(str(t).split(":")[::-1], (1, 60, 3600))) if re.fullmatch(r"[\d:]+", str(t)) else 0
    sk_rows.sort(key=lambda r: -secs(r["values"][7]))
    s = lambda i: sum(r["values"][i] for r in sk_rows if isinstance(r["values"][i], int))
    skaters = {"label": "Skaters", "columns": ["G", "A", "PTS", "+/-", "SOG", "HIT", "BLK", "TOI"], "rows": sk_rows,
               "totals": [s(0), s(1), s(2), "", s(4), s(5), s(6), ""]}
    goalies = {"label": "Goalies", "columns": ["SA", "SV", "SV%", "TOI"], "rows": gl_rows}
    sa = sum(r["values"][0] for r in gl_rows if isinstance(r["values"][0], int))
    return [skaters, goalies], s(0), (shots, sa)


def nfl_box(team_stats):
    groups = {str(g.get("name") or "").lower(): g for g in team_stats["statistics"]}
    out = []

    def rows_for(gname, want, sort_key=None, top=None):
        g = groups.get(gname)
        if not g:
            return None
        lab = labels_of(g)
        idx = {l: i for i, l in enumerate(lab)}
        rows = []
        for a in g.get("athletes", []):
            st = a.get("stats") or []
            if not st:
                continue
            rows.append({"name": a["athlete"]["displayName"], "values": [num(st[idx[w]]) if w in idx else "" for w in want]})
        if sort_key is not None:
            rows.sort(key=lambda r: -(r["values"][sort_key] if isinstance(r["values"][sort_key], int) else 0))
        return rows[:top] if top else rows

    for label, gname, src, cols in (("Passing", "passing", ["C/ATT", "YDS", "TD", "INT"], ["C/ATT", "YDS", "TD", "INT"]),
                                    ("Rushing", "rushing", ["CAR", "YDS", "TD", "LONG"], ["CAR", "YDS", "TD", "LONG"]),
                                    ("Receiving", "receiving", ["REC", "YDS", "TD", "TGTS"], ["REC", "YDS", "TD", "TGT"])):
        r = rows_for(gname, src)
        if r:
            out.append({"label": label, "columns": cols, "rows": r})
    d = rows_for("defensive", ["TOT", "SACKS", "TFL"], sort_key=0, top=6)
    if d:
        ints = {x["name"]: x["values"][0] for x in (rows_for("interceptions", ["INT"]) or [])}
        for x in d:
            x["values"] += [ints.get(x["name"], 0), ""]
        out.append({"label": "Defense", "columns": ["TCKL", "SACK", "TFL", "INT", "FF"], "rows": d})
    if not out:
        raise ValueError("NFL groups missing")
    return out, None, None


BUILD = {"nba": nba_box, "nhl": nhl_box, "nfl": nfl_box}


def build_box(league, team_key, r, ev):
    summ = get(f"https://site.api.espn.com/apis/site/v2/sports/{PATH[league]}/summary?event={ev['id']}")
    players = (summ.get("boxscore") or {}).get("players") or []
    ab = ESPN_ABBR[team_key]
    mine = next((p for p in players if (p.get("team") or {}).get("abbreviation") == ab), None)
    theirs = next((p for p in players if p is not mine), None)
    if not mine or not theirs:
        raise ValueError("no player box in ESPN summary yet")
    b_groups, b_pts, b_sh = BUILD[league](mine)
    o_groups, o_pts, o_sh = BUILD[league](theirs)
    bs, os_ = r["boston"]["score"], r["opp"]["score"]
    if b_pts is not None and (b_pts != bs or o_pts != os_):
        raise ValueError(f"players don't add up: BOS {b_pts} vs {bs}, OPP {o_pts} vs {os_}")
    if league == "nhl" and b_sh and o_sh and (b_sh[0] != o_sh[1] or o_sh[0] != b_sh[1]):
        raise ValueError(f"shots don't match goalies: {b_sh} vs {o_sh}")
    return {"source": {"name": "ESPN", "url": f"https://www.espn.com/{league}/boxscore/_/gameId/{ev['id']}"},
            "boston": {"name": TEAM_NAME[team_key], "groups": b_groups},
            "opp": {"name": r["opp"].get("name") or r["opp"]["abbr"], "groups": o_groups}}


def channel_id(handle, fallback):
    try:
        html = get(f"https://www.youtube.com/{handle}", as_json=False)
        m = re.search(r'"(?:externalId|channelId)":"(UC[\w-]{22})"', html)
        if m:
            return m.group(1)
    except Exception as e:   # noqa: BLE001
        say(f"  channel lookup {handle} failed: {e}")
    return fallback


def yt_search(query):
    """[(videoId, title, channel)] from YouTube's search results page."""
    html = get("https://www.youtube.com/results?search_query=" + urllib.parse.quote(query) + "&hl=en&gl=US", as_json=False)
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", html, re.S)
    if not m:
        return []
    out = []

    def walk(o):
        if isinstance(o, dict):
            vr = o.get("videoRenderer")
            if vr and vr.get("videoId"):
                t = "".join(x.get("text", "") for x in (vr.get("title") or {}).get("runs", []))
                ch = "".join(x.get("text", "") for x in (vr.get("ownerText") or {}).get("runs", []))
                out.append((vr["videoId"], t, ch))
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(json.loads(m.group(1)))
    return out


def find_video(league, team_key, r, ev, notes):
    start = dt.datetime.fromisoformat(ev["date"].replace("Z", "+00:00"))
    names = [TEAM_NAME[team_key].upper(), str(r["opp"].get("name") or "").upper()]
    best = None
    comps = ev["competitions"][0]["competitors"]
    home_t = next(c for c in comps if c.get("homeAway") == "home")["team"]
    away_t = next(c for c in comps if c.get("homeAway") == "away")["team"]
    day = start.astimezone(dt.timezone(dt.timedelta(hours=-5))).date()
    day_words = f"{day.strftime('%B')} {day.day}, {day.year}"
    for rank, (handle, fid) in enumerate(CHANNELS.get(league, [])):
        cid = channel_id(handle, fid)
        if not cid:
            continue
        try:
            xml = get(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}", as_json=False)
        except Exception as e:   # noqa: BLE001
            say(f"  feed {handle} failed: {e}")
            continue
        ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
        for en in ET.fromstring(xml).findall("a:entry", ns):
            title = en.findtext("a:title", "", ns)
            vid = en.findtext("yt:videoId", "", ns)
            pub = dt.datetime.fromisoformat(en.findtext("a:published", "", ns))
            T = title.upper()
            if not vid or not all(n and n in T for n in names) or "HIGHLIGHT" not in T:
                continue
            if not (start <= pub <= start + dt.timedelta(hours=36)):
                continue
            if any(w in T for w in ("PRESS CONFERENCE", "POSTGAME", "REACTION", "PODCAST", "INTERVIEW")):
                continue
            full = "FULL GAME" in T or "GAME HIGHLIGHTS" in T or league in ("nhl",) and "HIGHLIGHTS" in T
            score = (0 if full else 10) + rank
            if best is None or score < best[0]:
                best = (score, vid, title, full)
        if best and best[3] and best[0] == rank:
            break   # a full package from the best channel so far
    notes.append(f"feeds: {'found ' + best[1] if best else 'nothing'}")
    if not best or not best[3]:
        # Channel feeds only list the latest 15 uploads (the NBA posts dozens a day), so search YouTube too.
        A, H = away_t.get("shortDisplayName", ""), home_t.get("shortDisplayName", "")
        queries = {"nba": [f'"{A} at {H}" full game highlights {day_words}', f"{A} {H} full game highlights"],
                   "nhl": [f"NHL highlights {H} vs {A} {day_words}", f"{A} {H} highlights NHL"],
                   "nfl": [f"{A} vs {H} game highlights NFL", f"{A} {H} highlights"],
                   "mlb": [f"{A} vs {H} game highlights MLB {day_words}"]}[league]
        for q in queries:
            try:
                res = yt_search(q)
            except Exception as e:   # noqa: BLE001
                notes.append(f"search failed: {e}")
                continue
            notes.append(f"search {q!r}: {len(res)} results")
            for vid, title, ch in res:
                T = title.upper()
                if ch not in ALLOWED_AUTHORS or not all(n and n in T for n in names) or "HIGHLIGHT" not in T:
                    continue
                if any(w in T for w in ("PRESS CONFERENCE", "POSTGAME", "REACTION", "PODCAST", "INTERVIEW")):
                    continue
                if league == "nba" and "FULL GAME" not in T:
                    continue
                if day_words.upper() not in T and str(day.year) not in T and league != "nfl":
                    notes.append(f"skipped {vid} (date not in title): {title}")
                    continue
                best = (0, vid, title, True)
                notes.append(f"search hit {vid} [{ch}]: {title}")
                break
            if best and best[3]:
                break
    if not best or not best[3]:
        return None
    _, vid, title, _ = best
    # Check with YouTube: right channel, and whether it can play inside the app.
    embed = True
    try:
        o = get(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json")
        author = o.get("author_name", "")
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            embed, author = False, None
        else:
            return None
    if author is not None and author not in ALLOWED_AUTHORS:
        say(f"  video {vid} by {author!r} isn't an allowed channel")
        return None
    h, a = home_t.get("shortDisplayName", ""), away_t.get("shortDisplayName", "")
    v = {"id": vid, "title": f"{a} at {h}: {'full game' if league == 'nba' else 'game'} highlights",
         "channel": author or {"nba": "NBA", "nhl": "NHL", "nfl": "NFL", "mlb": "MLB"}[league], "kind": "full"}
    if not embed and league != "nfl":
        v["embed"] = False
    return v


def main():
    idx = json.load(open("index.json"))
    date = idx["issues"][0]["date"]
    path = f"issues/{date}.json"
    issue = json.load(open(path))
    game_day = (dt.date.fromisoformat(date) - dt.timedelta(days=1)).isoformat()
    changed, status = False, {"issue": date, "games": {}}
    for r in issue.get("results", []):
        key, league = r["teamKey"], str(r.get("sport", "")).lower()
        st = status["games"].setdefault(key, {})
        need_box = not r.get("box") and league in BUILD
        vids = r.get("videos") or []
        need_vid = not vids or all(v.get("kind") == "standin" for v in vids)
        if not need_box and not need_vid:
            st.update(box="ok", video="ok")
            continue
        try:
            ev = find_event(league, key, game_day)
        except Exception as e:   # noqa: BLE001
            st["error"] = f"scoreboard: {e}"
            say(f"{key}: scoreboard failed: {e}")
            continue
        if not ev:
            st["error"] = "game not found or not final on ESPN"
            say(f"{key}: game not found / not final")
            continue
        if need_box:
            try:
                r["box"] = build_box(league, key, r, ev)
                changed = True
                st["box"] = "added"
                say(f"{key}: box score added from ESPN event {ev['id']}")
            except Exception as e:   # noqa: BLE001
                st["box"] = f"not yet: {e}"
                say(f"{key}: box score not added: {e}")
        else:
            st["box"] = "ok"
        if need_vid:
            notes = []
            try:
                v = find_video(league, key, r, ev, notes)
            except Exception as e:   # noqa: BLE001
                v = None
                notes.append(f"error: {e}")
                say(f"{key}: video search failed: {e}")
            st["video_notes"] = notes[:12]
            if v:
                r["videos"] = [v]
                changed = True
                st["video"] = f"added {v['id']} ({v['channel']})"
                say(f"{key}: video added {v['id']} — {v['title']} [{v['channel']}]")
            else:
                st["video"] = "not found yet"
        else:
            st["video"] = "ok"
    if changed:
        with open(path, "w") as f:
            json.dump(issue, f, ensure_ascii=False, indent=2)
            f.write("\n")
        subprocess.run([sys.executable, "-I", "tools/save_games.py"], check=True)
    old = None
    try:
        old = json.load(open("tools/fill_status.json"))
    except Exception:   # noqa: BLE001
        pass
    if old != status:
        with open("tools/fill_status.json", "w") as f:
            json.dump(status, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print("CHANGED" if changed else "NO CHANGE")


if __name__ == "__main__":
    main()

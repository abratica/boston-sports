"""Build Boston Sports' `standingsAll` from the sports data tool's standings feeds.

Usage (run with -I, from anywhere):
    python3 -I build_standings.py --nba nba.json --nhl nhl.json --nfl nfl.json [--mlb mlb.json] > standings_all.json

Each input file is the JSON the sports data tool returned for data_type "standings"
(an object with a "standings" list). Pass only in-season leagues. Output is the
object to store as `standingsAll` in the day's issue (keys: nba / nhl / nfl / mlb).
"""
import argparse
import json
import sys

BOSTON = {"nba": "Celtics", "nhl": "Bruins", "nfl": "Patriots", "mlb": "Red Sox"}
TWO_WORD = {"Trail Blazers", "Red Sox", "White Sox", "Blue Jays", "Maple Leafs", "Red Wings",
            "Golden Knights", "Blue Jackets"}
COLS = {"nba": ["W–L", "GB"], "nhl": ["W–L–OT", "PTS"], "nfl": ["W–L", "GB"], "mlb": ["W–L", "GB"]}
CUTS = {
    "nba": ([6, 10], "Top 6 make the playoffs, 7–10 the play-in"),
    "nfl": ([7], "Top 7 make the playoffs (division winners seeded 1–4)"),
    "nhl": ([], "Top 3 in each division plus 2 wild cards make the playoffs"),
    "mlb": ([6], "Top 6 make the playoffs (division winners seeded 1–3)"),
}


def nickname(full):
    words = full.split()
    two = " ".join(words[-2:])
    return two if two in TWO_WORD else words[-1]


def conf_label(name):
    up = name.upper()
    if up in ("AFC", "NFC"):
        return up
    return " ".join(w.capitalize() for w in name.split())


def short_conf(label):
    """'Eastern Conference' -> 'East'; others unchanged."""
    first = label.split()[0]
    return {"Eastern": "East", "Western": "West"}.get(first, label)


def fmt_gb(v):
    return "—" if v <= 0 else ("%g" % v)


def team_rows(league, feed):
    out = []
    for t in feed:
        w, l = int(t["wins"]), int(t["losses"])
        pct = float(t.get("win_percentage") or 0)
        row = {"team": nickname(t["team"]["name"]), "conf": conf_label(t["conference"]),
               "div": t["division"], "dr": t["rank"].get("division", 99),
               "cr": t["rank"].get("conference", 99), "w": w, "l": l}
        if league == "nhl":
            # The feed has W, L and W/GP; overtime losses = GP - W - L.
            gp = round(w / pct) if pct > 0 else w + l
            otl = max(gp - w - l, 0)
            row.update(rec=f"{w}–{l}–{otl}", pts=2 * w + otl)
        elif league == "nfl":
            # Ties: pct = (W + T/2) / (W + L + T)  ->  T = (W - pct(W+L)) / (pct - 1/2)
            num = w - pct * (w + l)
            ties = 0 if abs(num) < 0.05 or abs(pct - 0.5) < 1e-6 else max(round(num / (pct - 0.5)), 0)
            row.update(rec=f"{w}–{l}" + (f"–{ties}" if ties else ""))
        else:
            row.update(rec=f"{w}–{l}")
        out.append(row)
    return out


def with_gb(league, rows):
    if league == "nhl" or not rows:
        return rows
    lead = rows[0]
    for r in rows:
        r["gb"] = fmt_gb(((lead["w"] - r["w"]) + (r["l"] - lead["l"])) / 2)
    rows[0]["gb"] = "—"
    return rows


def public(r, league, rank=None):
    d = {"team": r["team"], "rec": r["rec"]}
    if "pts" in r:
        d["pts"] = r["pts"]
    if "gb" in r:
        d["gb"] = r["gb"]
    if rank is not None:
        d["rank"] = rank
    if r["team"] == BOSTON[league]:
        d["boston"] = True
    return d


def build(league, data):
    rows = team_rows(league, data["standings"])
    me = next((r for r in rows if r["team"] == BOSTON[league]), None)
    if me is None:
        raise SystemExit(f"{league}: {BOSTON[league]} not found in the feed")
    confs = list(dict.fromkeys(r["conf"] for r in rows))
    confs.sort(key=lambda c: c != me["conf"])
    out = {"league": league, "cols": COLS[league], "confLabel": {}, "conferences": []}
    cut, note = CUTS[league]
    if cut:
        out["cut"] = cut
    out["cutNote"] = note
    for c in confs:
        name = short_conf(c)
        out["confLabel"][name] = c
        divs = list(dict.fromkeys(r["div"] for r in rows if r["conf"] == c))
        if c == me["conf"]:
            divs.sort(key=lambda d: d != me["div"])
        div_list = []
        for d in divs:
            lst = with_gb(league, sorted([dict(r) for r in rows if r["div"] == d], key=lambda r: r["dr"]))
            div_list.append({"name": d, "rows": [public(r, league) for r in lst]})
        ranked = with_gb(league, sorted([dict(r) for r in rows if r["conf"] == c], key=lambda r: r["cr"]))
        out["conferences"].append({"name": name, "divisions": div_list,
                                   "ranked": [public(r, league, i + 1) for i, r in enumerate(ranked)]})
    return out


def main():
    ap = argparse.ArgumentParser()
    for lg in ("nba", "nhl", "nfl", "mlb"):
        ap.add_argument(f"--{lg}")
    args = ap.parse_args()
    result = {}
    for lg in ("nba", "nhl", "nfl", "mlb"):
        path = getattr(args, lg)
        if path:
            with open(path) as f:
                result[lg] = build(lg, json.load(f))
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()

"""Save every game recap from the daily issues as its own file, for the app's Past games pages.

Usage (from the repo root):  python3 -I tools/save_games.py

Reads every issues/*.json, and for each game in "results" writes games/<id>.json
(the full game card plus its date), then rebuilds games/index.json, newest first.
Safe to run any number of times: it always rebuilds from the issues, so a catch-up
run's new video or box score flows into the saved recap too.
"""
import datetime
import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def game_date(issue_date):
    # Issues report games that started the day before (ET).
    d = datetime.date.fromisoformat(issue_date) - datetime.timedelta(days=1)
    return d.isoformat()


def main():
    os.makedirs(os.path.join(ROOT, "games"), exist_ok=True)
    games = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "issues", "*.json"))):
        with open(path) as f:
            issue = json.load(f)
        for r in issue.get("results") or []:
            date = r.get("gameDate") or game_date(issue["date"])
            gid = f"{date}-{r['teamKey']}-{str(r['opp']['abbr']).lower()}"
            games[gid] = dict(r, id=gid, date=date)   # a later issue wins if a game appears twice
    index = []
    for gid, g in games.items():
        with open(os.path.join(ROOT, "games", f"{gid}.json"), "w") as f:
            json.dump(g, f, ensure_ascii=False, indent=2)
            f.write("\n")
        index.append({
            "id": gid, "team": g["teamKey"], "date": g["date"], "home": g.get("home"),
            "opp": g["opp"].get("name") or g["opp"]["abbr"], "oppAbbr": g["opp"]["abbr"],
            "bos": g["boston"]["score"], "oppScore": g["opp"]["score"],
            "result": g.get("result"), "record": g.get("record"), "headline": g.get("headline"),
            "ot": (g.get("report") or {}).get("periods", [])[-1:] in (["OT"], ["SO"], ["2OT"], ["3OT"]),
        })
    index.sort(key=lambda x: (x["date"], x["id"]), reverse=True)
    with open(os.path.join(ROOT, "games", "index.json"), "w") as f:
        json.dump({"games": index}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{len(index)} games saved")


if __name__ == "__main__":
    main()

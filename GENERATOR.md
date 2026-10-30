# Boston Sports: daily issue generator

These are the instructions for the scheduled run that writes each morning's Boston Sports issue.
All paths below are relative to the root of the `abratica/boston-sports` repo (live at https://abratica.github.io/boston-sports/). This repo is the only copy of the issues: the standalone Boston Sports app (shared with Andrew's friends) and Andrew's Newsletters app both read from here.
The app (`index.html`, `js/`, `css/`, `sw.js`) only displays what is in these JSON files. Do not change the app during a daily run.

The issue has two tabs in the app:
- **Games:** today's games (+ "Upcoming games": the next game for every team not playing today), and last night's game cards.
- **Teams:** one card per Boston team with its place in the standings, next game, team news, and a Standings button (Division / Conference views).

## What to produce

1. `issues/YYYY-MM-DD.json`: today's issue, where the date is **today in America/New_York**.
2. Update `index.json`: put `{ "date", "headline", "ticker" }` at the **top** of `issues` (newest first), copying `headline` and `ticker` from the issue. If today's date is already there, replace that entry instead of adding a second one.
3. Run `python3 -I tools/save_games.py`. It saves every game card from `results` as its own recap in `games/` (one file per game plus `games/index.json`), which is what the app's **Past games** pages show. Commit the `games/` changes together with the issue.
3. Validate both files (`python3 -m json.tool <file>`), then commit `Boston Sports YYYY-MM-DD` and push to `main`.

Publish an issue every day, even when no Boston team played or plays.

`issues/2026-10-27.json` is the reference example for every field below. Top-level keys: `date`, `headline`, `ticker`, `today`, `off`, `results`, `teamNews`, `standingsAll`.

## Teams

| teamKey  | Team     | League | Home venue       |
|----------|----------|--------|------------------|
| patriots | Patriots | NFL    | Gillette Stadium |
| celtics  | Celtics  | NBA    | TD Garden        |
| bruins   | Bruins   | NHL    | TD Garden        |
| redsox   | Red Sox  | MLB    | Fenway Park      |

## Data: where facts come from

- Use the sports data tool first (`fetch_sports_data`): `scores` with the team filter for each league, `game_stats` with the game id for every Boston game that finished yesterday, and `standings` for each in-season league.
- The official box score comes from ESPN's game data feed, fetched with WebFetch (the shell can't reach ESPN):
  `https://site.api.espn.com/apis/site/v2/sports/<path>/summary?event=<ESPN gameId>` where `<path>` is `basketball/nba`, `hockey/nhl`, `football/nfl` or `baseball/mlb`. Find the gameId via search or the ESPN game page URL.
  Use a prompt that asks for the data copied exactly, not summarized: for each team in `boxscore.players`, each statistics group's `labels` array verbatim, then one line per athlete with `displayName | stats array verbatim`, every athlete, and whether the game is final. Map the columns from the labels (don't assume positions).
  - Backups, in order: the ESPN box score page (`https://www.espn.com/<league>/boxscore/_/gameId/<id>`), then the league's own box score page. The ESPN page can serve a snapshot from mid-game, so only use it if it shows the game as final. The data feed itself can also serve a stale copy (status "pre" or mid-game) for hours after the final. When the feed or espn.com isn't final, try ESPN's international mirrors of the box score page, which often update first: `https://www.espn.co.uk/<league>/boxscore/_/gameId/<id>`, then `espn.com.au`, then `espn.in`. Use one only if it shows the game as final.
  - Never build the box score from the sports data tool's `game_stats`: its player list is often incomplete (it can miss the goal scorer, goalies and minutes).
- If the tool isn't available or is missing something, use web search against official or major sources (NFL.com, NBA.com, NHL.com, MLB.com, ESPN, AP, Boston Globe, NBC Sports Boston, NESN).
- **Only state facts that come from the data or a source you actually read.** No descriptors you haven't verified ("rookie", "career high", "first time since…") unless a source says so. If unsure, leave it out.
- Whenever you mention a lead or a turning point, give the actual score at that point. If you don't have the exact score for a moment (like the peak of a lead), don't mention that moment.

## Ticker

`ticker` is 2–5 very short items that scroll across the top of the app's home screen, mixed with other newsletters' items. Plain text, no labels, under ~30 characters each:
- Each final from last night: `"Celtics 134, Bulls 99"` (Boston's score first).
- Each game today: `"Celtics vs Nets 7:30"`, `"Bruins at Hurricanes 8:00"` (ET, no "PM").
- At most one big injury or roster note if there is one: `"<Player> out (ankle)"`.
If there's nothing, use an empty array.

## headline

The top game card's headline. On days with no results, a one-line summary of the biggest team news.

## today (Today's games)

Every Boston game scheduled today (ET), sorted by start time.
- `teamKey`, `team`.
- `league`: `"nfl"`, `"nba"`, `"nhl"`, or `"mlb"`. Required: the app uses it to show the live score during the game.
- `record`: the Boston team's current record. Shown next to the team name.
- `matchup`: `"vs Nets"` at home, `"at Hurricanes"` on the road (opponent nickname).
- `oppRecord`: opponent's current record (NBA/NFL `W–L`, NHL `W–L–OT`, MLB `W–L`).
- `time`: ET, like `"7:30 PM"`.
- `tv`: where to watch, from an official or schedule source you read for this game (team/league schedule, NBC Sports Boston or NESN listings, the league's national TV schedule, or a broadcast-listing schedule like FanDuel Research's team schedule page). List the Boston-area option(s) joined with ` · `: e.g. `"NBC Sports Boston · Peacock"` (Celtics local; Peacock streams NBCSB), `"NESN"` (Bruins/Red Sox local), `"ESPN"`, `"TNT"`, `"Prime Video"`, `"CBS"`. If a national broadcast is exclusive, show only the national one. Omit the field if you can't confirm it. Never guess.
- `venue`: home venue name for home games; for road games, the arena/stadium name only if a source confirms it, otherwise the city.

## off (Upcoming games)

**Every in-season** Boston team that does **not** play today, whether or not it played last night, each with its next game, sorted by date (soonest first):
`{ "teamKey": "bruins", "team": "Bruins", "text": "Next: Thu, Oct 29 at Blues, 8:00 PM" }` (ET; "vs" at home, "at" on the road; opponent nickname).
Shown as "Upcoming games" inside the Today's games panel. Teams playing today are already listed above it, so leave them out. Offseason teams are left out. Take the next game from the sports data tool's `scores` (it lists upcoming games) or the team's official schedule.

## results (Last night's game cards)

Every Boston game that **started yesterday (ET)** and is final, including late West Coast games. Order by **how newsworthy the result is**, biggest first.

The closed card shows `headline`, the score, `result`, `record` and `takeaway`. Opened, it reads: highlights video → game story (line score + period by period) → top player stats → opponent line → ▸ full box score → "What it means".

Each result:
- `teamKey`, `headline` (short, punchy, factual, e.g. "Pritchard's seven threes bury Chicago").
- `home`: true/false. `boston` / `opp`: `abbr` (3 letters), `score`; `opp.name` is the opponent's nickname.
- `result`: `"W"`, `"L"`, `"OTL"` (NHL overtime/shootout loss), or `"T"`. `record`: Boston's record after the game.
- `videos` (optional): **one** video, a game highlights package, shown first in the opened card.
  `[{ "id": "<YouTube video id>", "title": "Bulls at Celtics: full game highlights", "channel": "NBA", "kind": "full" }]`
  - **Pick in this order**, using the first that exists:
    1. The league's full-game highlights: NBA, NHL, NFL, MLB channels (e.g. NBA titles look like `"BULLS at CELTICS | FULL GAME HIGHLIGHTS | October 26, 2026"`).
    2. Team or Boston broadcaster game highlights: Boston Celtics, NHL Bruins / Boston Bruins, New England Patriots, Red Sox, NBC Sports Boston, NESN.
    3. A national rights-holding broadcaster's game highlights: ESPN / NBA on ESPN / ABC, NBC Sports, Prime Video, TNT / NHL on TNT, Sportsnet, CBS Sports, FOX Sports, NFL on FOX/CBS, MLB on FOX.
  - `kind`: `"full"` for a whole-game highlights package from any tier above. `"standin"` only when no full-game package exists yet and a tier 1–3 channel has posted a **player-centered package** for this game (e.g. "40 points and a game-winner"). A stand-in gets replaced by the catch-up run once a full package is up.
  - **Never:** single-play clips, talk shows, analysis, reaction, podcasts, postgame interviews, or fan/aggregator/independent channels (House of Highlights, CLNS, etc.), even if they look official.
  - Find it. Exact-title searches often come back empty even when the video is up (the NBA's full-game highlights are usually posted within about an hour of the final), so don't stop at the first search. Work through these until one finds a qualifying video:
    1. Exact title: `"<AWAY> at <HOME>" "FULL GAME HIGHLIGHTS" "<Month D, YYYY>"`, or for the NHL `"NHL Highlights" "<Team> vs. <Team>" "<Month D, YYYY>"`.
    2. Looser, with `mode: "extended"`: `<Team> <Opponent> full game highlights <Month D> <YYYY> youtube`, plus a player or moment from the game if there was one (e.g. `Tatum overtime buzzer beater`).
    3. Without the date words: `"<AWAY> at <HOME>" full game highlights youtube` and `<Team> vs <Opponent> highlights <league channel name>`.
    4. A daily-links / highlights roundup page that embeds the YouTube video.
    Search results include fan channels; that's fine, because oEmbed verification below decides. Only after all four come up empty, use a stand-in or omit `videos`.
  - **Verify** by fetching `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json`: `author_name` must be an allowed channel and `title` must match this game and date. If oEmbed fails, don't use it.
  - NFL highlights (NFL and Patriots channels) can't play inside other apps, so the app shows NFL videos as a thumbnail that opens YouTube. Pick them the same way. For any other video you know can't be embedded, add `"embed": false`.
  - Write `title` in plain sentence case; `channel` is the channel's display name. If nothing qualifies yet, omit `videos` (the catch-up run tries again). Never guess an id.
- `report` (the game story, always shown when the card is opened):
  ```json
  "report": {
    "periods": ["1","2","3","4"],          // NHL: ["1","2","3"] (+ "OT", "SO"); NFL: ["1","2","3","4"] (+ "OT"); MLB: innings "1"–"9" (+ extras)
    "boston": [33,33,39,29], "opp": [21,33,21,24],
    "sections": [ { "label": "1st quarter", "score": "BOS 33, CHI 21", "text": "2–4 sentences" } ],
    "sources": [ { "name": "AP", "url": "https://..." } ]
  }
  ```
  - One section per quarter (NBA/NFL) or period (NHL, plus OT/shootout). MLB: 3–4 sections around the innings that mattered (e.g. "Innings 1–3", "6th inning").
  - `score` is the score at the end of that period (`"Final: ..."` for the last one).
  - Cover what actually swung it: runs with their numbers, who drove them, key plays, foul trouble/injuries, momentum. Every score you mention must be an actual score at that moment.
  - Facts come from the line score plus recaps you read (AP, ESPN, league sites, Boston Globe, NBC Sports Boston). If sources disagree, use the one whose numbers add up against the line score, or leave it out. Don't attach a play to a period unless a source places it there.
  - A blowout's last period can be one short line.
- `performers` ("Top player stats"): **3** Boston players. Each has `name`, `line` (stats joined with ` · `), and `note` (one sentence on why it mattered; can include a bad side).
- `oppLine`: one sentence on the opponent's top performers, e.g. `"Norman Powell had 20 points (4-of-7 from three) and 4 steals; Caleb Wilson added 17."`
- `box` (▸ Full box score, collapsed):
  ```json
  "box": {
    "source": { "name": "ESPN", "url": "https://www.espn.com/nba/boxscore/_/gameId/..." },
    "boston": { "name": "Celtics", "groups": [ { "label": "", "columns": ["MIN","PTS",...], "starters": 5,
                "rows": [ { "name": "Paul George", "values": [25,16,...] } ], "totals": ["",134,...] } ] },
    "opp":    { "name": "Bulls",   "groups": [ ... ] }
  }
  ```
  - Every player who played, both teams, from the official box score. `values` line up with `columns`; `totals` too (use `""` for columns without a team total). `starters` = number of starters listed first (draws a divider); omit when not meaningful.
  - **NBA** (one group, label `""`): `["MIN","PTS","REB","AST","FG","3PT","FT","STL","BLK","TO","+/-"]`, starters first then bench by minutes.
  - **NHL**: groups `"Skaters"` `["G","A","PTS","+/-","SOG","HIT","BLK","TOI"]` (sorted by TOI) and `"Goalies"` `["SA","SV","SV%","TOI"]`.
  - **NFL**: groups `"Passing"` `["C/ATT","YDS","TD","INT"]`, `"Rushing"` `["CAR","YDS","TD","LONG"]`, `"Receiving"` `["REC","YDS","TD","TGT"]`, `"Defense"` `["TCKL","SACK","TFL","INT","FF"]` (top 6 tacklers).
  - **MLB**: groups `"Batting"` `["AB","R","H","RBI","BB","K","HR"]` (lineup order) and `"Pitching"` `["IP","H","R","ER","BB","K","PC"]`.
  - Check: each team's player points/goals/runs must add up to its final score (NHL: also each team's skater shots on goal = the other goalie's shots against). If a source fails the check, try the next source in the order above. Only if none passes, omit `box` rather than publish a partial one, and say in the final message which sources failed and why.
  - `source.url` is the ESPN box score page for the game (what a reader would open), whichever source the numbers came from.
- `takeaway` ("What it means"): one sentence. Streak, standings move, concern, injury to watch. Also shown on the closed card.

## teamNews (Teams tab)

```json
"teamNews": {
  "celtics":  [ { "headline": "...", "summary": "2–3 factual sentences", "source": "NBC Sports Boston", "url": "https://...", "dateLabel": "Oct 27" } ],
  "bruins":   [ ... ], "patriots": [ ... ], "redsox": [ ... ]
}
```
- **6–10 items per team**, depending on how much is going on (fewer only when there genuinely isn't more real news; offseason teams can have fewer). The app shows the first 3 and hides the rest behind "See more", so **put the 3 most important first**, then the rest newest first.
- What counts: injuries and injury updates, transactions (trades, signings, waivers, call-ups), lineup/depth changes, front-office and coaching moves, notable quotes, upcoming-game storylines, milestones and streaks, notable performances that aren't the game result itself, team features from reputable outlets.
- Freshness: items stay as long as they're still current news (about the last week). Carry still-relevant items over from yesterday's issue and add new ones; drop anything stale or superseded (e.g. an injury update replaced by a newer one).
- **Not** plain game results (the Games tab covers those), though a notable post-game injury or quote is fine.
- No rumors or speculation pieces ("could target…", mock trades). Only actual reporting.
- Offseason teams (e.g. the Red Sox in winter) still get news: front office, coaching staff, free agency, trades, injuries. If there's genuinely nothing new, use the most recent real item with its actual `dateLabel`.
- Sources: team sites, NBC Sports Boston, Boston Globe, Boston Herald, MassLive, NESN, ESPN, AP, The Athletic. Every item links to the article you read.
- `dateLabel` is the article date like `"Oct 27"`.

## standingsAll (Standings button: Division / Conference)

Full standings for every **in-season** league with a Boston team. Build it with the script so the format and math are consistent:

1. Call `fetch_sports_data` with `data_type: "standings"` for each in-season league and save each result as-is to a JSON file (`nba.json`, `nhl.json`, `nfl.json`, `mlb.json`).
2. Run: `python3 -I tools/build_standings.py --nba nba.json --nhl nhl.json --nfl nfl.json > standings_all.json` (only the in-season leagues).
3. Put the output object in the issue as `standingsAll`.

The script orders divisions with Boston's first, computes GB, derives NHL overtime losses and points and NFL ties from the feed, and flags the Boston row. Sanity-check Boston's line against its `record` in today's issue; if they disagree, trust the official standings page and note it in the final message. Don't hand-edit the output.

## Catch-up run (about 8:37 AM)

A second, smaller run fills in what wasn't available at 4:40 AM. It works on **today's** issue only and changes nothing else:
1. For each game in `results` with no `videos`, or with a `kind: "standin"` video: look again using the rules above. Add a qualifying video, or replace the stand-in with a full-game package if one is now up.
2. For each game with no `box`: try again to get the complete official box score (same rules and add-up check).
3. If nothing changed, don't commit. Otherwise validate the JSON, run `python3 -I tools/save_games.py` so the saved recap in `games/` gets the new video or box score too, and commit `Boston Sports catch-up YYYY-MM-DD`. Don't touch `index.json`, the text, news, or standings.

## Final message of the run

End the run with one line summarizing the issue, e.g. "Celtics beat the Bulls 134–99; Celtics and Bruins play tonight." No notification is sent; the issue is simply waiting in the app.

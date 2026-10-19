# Download, validate, and use real match data

This guide uses Windows PowerShell and the StatsBomb open-data scripts in this repository. The research packages are separate from the app's runtime requirements. StatsBomb open data can be used without credentials; credit StatsBomb wherever you publish or present the data and visuals.

## 1. Create the Python 3.12 research environment

`socceraction` may not install under very new Python versions. Install Python 3.12 if needed, then create a separate virtual environment from the project root:

```powershell
py install 3.12
py -3.12 -m venv .venv-research
.\.venv-research\Scripts\python.exe -m pip install --upgrade pip
.\.venv-research\Scripts\python.exe -m pip install -r requirements-research.txt
```

Use `.venv-research\Scripts\python.exe` for the research scripts below. This avoids accidentally using the app's other virtual environment.

## 2. Find competitions, seasons, and match IDs

List the competitions and seasons available in StatsBomb open data:

```powershell
.\.venv-research\Scripts\python.exe scripts/fetch_statsbomb.py --list
```

List matches for a competition and season using the IDs from that output. For example, Premier League 2015/16 is competition `2`, season `27`:

```powershell
.\.venv-research\Scripts\python.exe scripts/fetch_statsbomb.py --competition 2 --season 27
```

The command prints match IDs, dates, teams, and scores. It does not download the matches yet.

## 3. Download matches

Pass one or more real match IDs from the list. Repeat `--match` for each match. This example uses an ID from Premier League 2015/16:

```powershell
.\.venv-research\Scripts\python.exe scripts/fetch_statsbomb.py --match 3754217
```

Download several at once:

```powershell
.\.venv-research\Scripts\python.exe scripts/fetch_statsbomb.py --match 3754217 --match 3754117 --match 3754296
```

Each match creates two files in `data/`:

- `sb_<match_id>.json` contains events converted to this app's format. Use this file to run the app and fit the xT grid.
- `sb_<match_id>_context.json` contains StatsBomb reference details such as score, xG, and formations. The validation script reads it beside the event file.

Keep the `_context.json` files out of the event-file list passed to `fit_xt.py` and `validate_on_statsbomb.py`.

## 4. Fit and validate the xT grid

For a better grid, fit at least 20 matches. PowerShell can collect the event files while excluding their context files:

```powershell
$files = Get-ChildItem data/sb_*.json |
    Where-Object { $_.Name -notlike '*_context.json' } |
    ForEach-Object { $_.FullName }

if (-not $files) { throw 'No downloaded data/sb_<match_id>.json event files found.' }

.\.venv-research\Scripts\python.exe scripts/fit_xt.py @files
.\.venv-research\Scripts\python.exe scripts/validate_on_statsbomb.py @files
```

`fit_xt.py` saves the learned grid to `data/xt_grid.json`; the app reads it automatically. The validator compares shot values, formations, and win probabilities with the StatsBomb reference data and prints the results. Treat a small-sample validation as an indication, not a guarantee of model accuracy.

## 5. Make match visuals

Generate pitch pictures for a downloaded match:

```powershell
.\.venv-research\Scripts\python.exe scripts/make_visuals.py data/sb_3754217.json --out out
```

The images are written to `out/`. You can substitute any downloaded `sb_<match_id>.json` file.

## 6. Run the app with a downloaded match

Set `EVENTS_FILE` in your local `.env` to an event file, for example:

```dotenv
EVENTS_FILE=data/sb_3754217.json
```

Start or restart the API from the project root using the app environment:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` or the frontend to view the selected match. Change `EVENTS_FILE` and restart the API to switch matches.

## 7. Use the downloaded data in Docker

The Dockerfile copies `data/` into the image, including downloaded event files and `xt_grid.json`. Set `EVENTS_FILE` in `.env` to the desired file, then rebuild and start the image:

```powershell
docker compose up --build
```

The research dependencies are not installed in Docker; the image installs only `requirements.txt`. Docker can use the downloaded JSON and xT grid without `statsbombpy`, `socceraction`, or the visualization packages.

## 8. Package files for sharing

For a reproducible match analysis, share the selected `sb_<match_id>.json`, its matching `_context.json`, `data/xt_grid.json` if the fitted grid was used, and the validation output or images you want the recipient to review. Do not share `.env`; it can contain API keys and other private settings. Include StatsBomb attribution when sharing derived data or visuals.

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd

# =========================
# CONFIG
# =========================
BASE = Path(__file__).resolve().parents[1]  # project root
INPUT_DIR = str(BASE / "raw")
OUTPUT_DIR = str(BASE / "src" / "data")

WRITE_FULL_JSON = True        # set False if you only want the map index
INCLUDE_VILLAGES_IN_FULL = True  # if full.json is written, include 村里 arrays?

# Minimal alias map (tweak once, then forget)
ALIASES = {
    "language": ["族語", "語言", "Language"],
    "dialect": ["方言別", "方言", "Dialect"],
    "county": ["縣市", "縣", "市", "County"],
    "township": ["鄉鎮市區", "鄉鎮市", "鄉鎮", "Township"],
    "village": ["村里", "部落", "Village"],
}

# Optional per-file forced mapping (strongest + fastest)
# Example:
# FORCED_MAP = {"原住民16族42方言分佈參考.xlsx": {"language":"族語","dialect":"方言別","county":"縣","township":"鄉鎮市","village":"村里"}}
FORCED_MAP: Dict[str, Dict[str, str]] = {}

# If your Taiwan map uses slightly different labels, normalize them here
# e.g. "台北市" -> "臺北市"
NAME_NORMALIZATION = {
    "台北市": "臺北市",
    "台中市": "臺中市",
    "台南市": "臺南市",
    "台東縣": "臺東縣",
}

# =========================
# HELPERS
# =========================
def is_blank(x) -> bool:
    if x is None:
        return True
    if isinstance(x, float) and pd.isna(x):
        return True
    s = str(x).strip()
    return s == "" or s.lower() == "nan"

def norm_text(x) -> str:
    if is_blank(x):
        return ""
    s = str(x)
    s = s.replace("\u3000", " ")
    s = re.sub(r"\s+", " ", s).strip()
    # normalize brackets (optional)
    s = s.replace("（", "(").replace("）", ")")
    # normalize separators a bit
    s = s.replace("；", ";").replace("，", ",")
    # apply name normalization table
    return NAME_NORMALIZATION.get(s, s)

def split_multi(s: str) -> List[str]:
    s = norm_text(s)
    if not s:
        return []
    # split on comma / newline / semicolon / slash
    parts = re.split(r"[\n,;/]+", s)
    return [p.strip() for p in parts if p.strip()]

def iter_xlsx_files(folder: Path) -> List[Path]:
    files = []
    for p in folder.rglob("*.xlsx"):
        if p.name.startswith("~$"):
            continue
        files.append(p)
    return sorted(files)

def read_first_sheet(path: Path) -> Tuple[pd.DataFrame, str]:
    xls = pd.ExcelFile(path)
    sheet = xls.sheet_names[0]
    df = pd.read_excel(path, sheet_name=sheet)
    df = df.dropna(axis=1, how="all")
    return df, sheet

def detect_map(df: pd.DataFrame) -> Optional[Dict[str, str]]:
    colnames = [str(c) for c in df.columns]
    lower = {c: norm_text(c).lower() for c in colnames}

    out = {}
    for key, opts in ALIASES.items():
        opts_norm = [norm_text(o).lower() for o in opts]
        found = None

        # exact match first
        for c in colnames:
            if lower[c] in opts_norm:
                found = c
                break

        # substring fallback
        if not found:
            for c in colnames:
                for o in opts_norm:
                    if o and o in lower[c]:
                        found = c
                        break
                if found:
                    break

        if found:
            out[key] = found

    needed = {"language", "dialect", "county", "township"}
    return out if needed.issubset(out.keys()) else None

def df_to_records(df: pd.DataFrame, colmap: Dict[str, str]) -> List[dict]:
    recs = []
    for _, row in df.iterrows():
        language = norm_text(row.get(colmap["language"]))
        dialect = norm_text(row.get(colmap["dialect"]))
        county = norm_text(row.get(colmap["county"]))
        township = norm_text(row.get(colmap["township"]))
        village_raw = norm_text(row.get(colmap.get("village", ""))) if "village" in colmap else ""

        # skip empty rows
        if not any([language, dialect, county, township, village_raw]):
            continue

        rec = {
            "族語": language,
            "方言別": dialect,
            "縣": county,
            "鄉鎮市": township,
        }
        if "village" in colmap:
            villages = split_multi(village_raw)
            if INCLUDE_VILLAGES_IN_FULL:
                rec["村里"] = villages
            else:
                rec["村里_raw"] = village_raw
        recs.append(rec)
    return recs

# =========================
# OUTPUT BUILDERS
# =========================
def build_area_index(records: List[dict]) -> dict:
    """
    index[county][township] = list of {族語, 方言別}
    de-duplicated, stable order.
    """
    index: Dict[str, Dict[str, List[dict]]] = {}
    for r in records:
        c = r.get("縣", "")
        t = r.get("鄉鎮市", "")
        lang = r.get("族語", "")
        dia = r.get("方言別", "")
        if not (c and t and lang and dia):
            continue

        index.setdefault(c, {})
        index[c].setdefault(t, [])

        entry = {"族語": lang, "方言別": dia}
        if entry not in index[c][t]:
            index[c][t].append(entry)

    return {"schema": "taiwan.dialect.area_index.v1", "index": index}

def build_full_grouped(records: List[dict]) -> dict:
    """
    Optional: group by (族語, 方言別) like your original style,
    but keep it compact and consistent.
    """
    grouped: Dict[Tuple[str, str], Dict] = {}
    for r in records:
        key = (r.get("族語",""), r.get("方言別",""))
        if not all(key):
            continue

        grouped.setdefault(key, {"族語": key[0], "方言別": key[1], "分佈": []})

        dist_item = {"縣": r.get("縣",""), "鄉鎮市": r.get("鄉鎮市","")}
        if "村里" in r:
            dist_item["村里"] = r["村里"]

        grouped[key]["分佈"].append(dist_item)

    # return as list for stable JSON
    return {"schema": "taiwan.dialect.full.v1", "items": list(grouped.values())}

# =========================
# MAIN
# =========================
def convert_one(xlsx: Path, out_dir: Path):
    df, sheet = read_first_sheet(xlsx)

    colmap = FORCED_MAP.get(xlsx.name) or detect_map(df)
    if not colmap:
        # still write raw dump for debugging instead of failing
        raw = {
            "schema": "xlsx.raw.v1",
            "source_xlsx": xlsx.name,
            "sheet": sheet,
            "columns": [str(c) for c in df.columns],
            "rows_preview": df.head(20).fillna("").to_dict(orient="records"),
            "note": "Could not map required columns to build index. Add FORCED_MAP or extend ALIASES.",
        }
        raw_path = out_dir / f"{xlsx.stem}.raw_preview.json"
        raw_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[WARN] {xlsx.name}: wrote {raw_path.resolve()} (mapping missing)")
        return

    records = df_to_records(df, colmap)

    # 1) map-hover optimized index
    area_index = build_area_index(records)
    idx_path = out_dir / f"{xlsx.stem}.area_index.json"
    idx_path.write_text(json.dumps(area_index, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[OK]  {xlsx.name} -> {idx_path.resolve()}")

    # 2) optional full grouped output (closer to your original json style)
    if WRITE_FULL_JSON:
        full = build_full_grouped(records)
        full_path = out_dir / f"{xlsx.stem}.full.json"
        full_path.write_text(json.dumps(full, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"      {xlsx.name} -> {full_path.resolve()}")

def main():
    base = Path(INPUT_DIR) if INPUT_DIR else Path(__file__).resolve().parent
    out_base = Path(OUTPUT_DIR) if OUTPUT_DIR else base

    files = iter_xlsx_files(base)
    print(f"Found {len(files)} xlsx file(s) under: {base}")
    print(f"Output dir: {out_base}")

    for xlsx in files:
        try:
            convert_one(xlsx, out_base)
        except Exception as e:
            print(f"[FAIL] {xlsx.name}\n  Reason: {e}")

    print(f"Found {len(files)} xlsx file(s):")
    for f in files:
        print("  -", f.resolve())
print("\nDone.")

if __name__ == "__main__":
    main()
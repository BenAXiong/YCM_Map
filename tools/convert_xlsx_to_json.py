import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

import pandas as pd

# =========================
# CONFIG
# =========================
BASE = Path(__file__).resolve().parents[1]  # project root (script in tools/)
INPUT_DIR = str(BASE / "raw")              # put XLSX here
OUTPUT_DIR = str(BASE / "src" / "data")    # JSON outputs go here

WRITE_FULL_JSON = True
INCLUDE_VILLAGES_IN_FULL = True

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

# Normalize known naming variants (keep small; add only when needed)
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
    # normalize brackets
    s = s.replace("（", "(").replace("）", ")")
    # normalize separators a bit
    s = s.replace("；", ";").replace("，", ",")
    # apply name normalization table
    return NAME_NORMALIZATION.get(s, s)


def split_multi(s: str) -> List[str]:
    s = norm_text(s)
    if not s:
        return []
    # normalize common separators to a newline then split
    s = s.replace("、", "\n")
    s = s.replace(",", "\n").replace("，", "\n").replace("；", "\n").replace(";", "\n")
    s = s.replace("/", "\n")
    parts = [p.strip() for p in s.splitlines() if p.strip()]
    return parts


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

    out: Dict[str, str] = {}
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


def forward_fill_merged_cells(df: pd.DataFrame, colmap: Dict[str, str]) -> pd.DataFrame:
    """
    Excel merged cells often come through as NaN on subsequent rows.
    Forward-fill the important columns based on the detected mapping.
    """
    for k in ["language", "dialect", "county", "township", "village"]:
        c = colmap.get(k)
        if c and c in df.columns:
            df[c] = df[c].ffill()
    return df


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

        rec = {"族語": language, "方言別": dialect, "縣": county, "鄉鎮市": township}

        if "village" in colmap:
            villages = split_multi(village_raw)
            if INCLUDE_VILLAGES_IN_FULL:
                rec["村里"] = villages
            else:
                rec["村里_raw"] = village_raw

        recs.append(rec)
    return recs


# =========================
# BUILDERS (bundle + stats)
# =========================
def build_area_index(records: List[dict]) -> Dict:
    """
    areaIndex[county][township] = list of {族語, 方言別}
    de-duplicated, stable insertion order.
    """
    idx: Dict[str, Dict[str, List[dict]]] = {}
    for r in records:
        c, t = r.get("縣", ""), r.get("鄉鎮市", "")
        lang, dia = r.get("族語", ""), r.get("方言別", "")
        if not (c and t and lang and dia):
            continue

        idx.setdefault(c, {})
        idx[c].setdefault(t, [])

        entry = {"族語": lang, "方言別": dia}
        if entry not in idx[c][t]:
            idx[c][t].append(entry)

    return idx


def build_language_groups(area_index: Dict[str, Dict[str, List[dict]]]) -> Dict[str, List[str]]:
    """
    languageGroups[族語] = [方言別...]
    """
    groups: Dict[str, set] = {}
    for towns in area_index.values():
        for entries in towns.values():
            for e in entries:
                lang = e.get("族語", "")
                dia = e.get("方言別", "")
                if not (lang and dia):
                    continue
                groups.setdefault(lang, set()).add(dia)

    return {lang: sorted(list(dias)) for lang, dias in groups.items()}


def compute_admin_division_stats_v2(records: List[dict]) -> Dict:
    """
    For each language and each dialect, count distinct:
    - counties: unique 縣
    - townships: unique (縣, 鄉鎮市) pairs
    - villages: unique (縣, 鄉鎮市, 村里) triples

    Also returns overall totals.
    Dialect key uses '族語|方言別' to avoid name collisions.
    """

    overall_counties = set()
    overall_townships = set()   # (縣, 鄉鎮市)
    overall_villages = set()    # (縣, 鄉鎮市, 村里)

    # per language
    lang_counties: Dict[str, set] = {}
    lang_townships: Dict[str, set] = {}
    lang_villages: Dict[str, set] = {}

    # per dialect (lang|dialect)
    dia_counties: Dict[str, set] = {}
    dia_townships: Dict[str, set] = {}
    dia_villages: Dict[str, set] = {}

    for r in records:
        lang = r.get("族語", "")
        dia = r.get("方言別", "")
        c = r.get("縣", "")
        t = r.get("鄉鎮市", "")
        if not (lang and dia and c and t):
            continue

        dkey = f"{lang}|{dia}"

        overall_counties.add(c)
        overall_townships.add((c, t))

        lang_counties.setdefault(lang, set()).add(c)
        lang_townships.setdefault(lang, set()).add((c, t))

        dia_counties.setdefault(dkey, set()).add(c)
        dia_townships.setdefault(dkey, set()).add((c, t))

        villages = r.get("村里", [])
        if isinstance(villages, list):
            for v in villages:
                if not v:
                    continue
                overall_villages.add((c, t, v))
                lang_villages.setdefault(lang, set()).add((c, t, v))
                dia_villages.setdefault(dkey, set()).add((c, t, v))

    per_language = {
        lang: {
            "縣_count": len(lang_counties.get(lang, set())),
            "鄉鎮市_count": len(lang_townships.get(lang, set())),
            "村里_count": len(lang_villages.get(lang, set())),
        }
        for lang in sorted(set(lang_counties) | set(lang_townships) | set(lang_villages))
    }

    per_dialect = {
        dkey: {
            "族語": dkey.split("|", 1)[0],
            "方言別": dkey.split("|", 1)[1],
            "縣_count": len(dia_counties.get(dkey, set())),
            "鄉鎮市_count": len(dia_townships.get(dkey, set())),
            "村里_count": len(dia_villages.get(dkey, set())),
        }
        for dkey in sorted(set(dia_counties) | set(dia_townships) | set(dia_villages))
    }

    return {
        "overall": {
            "縣_count": len(overall_counties),
            "鄉鎮市_count": len(overall_townships),
            "村里_count": len(overall_villages),
        },
        "perLanguage": per_language,
        "perDialect": per_dialect,
    }


def build_full_grouped(records: List[dict]) -> Dict:
    """
    Optional: group by (族語, 方言別) like your original style.
    """
    grouped: Dict[Tuple[str, str], Dict] = {}
    for r in records:
        key = (r.get("族語", ""), r.get("方言別", ""))
        if not all(key):
            continue

        grouped.setdefault(key, {"族語": key[0], "方言別": key[1], "分佈": []})

        dist_item = {"縣": r.get("縣", ""), "鄉鎮市": r.get("鄉鎮市", "")}
        if "村里" in r:
            dist_item["村里"] = r["村里"]

        grouped[key]["分佈"].append(dist_item)

    return {"schema": "taiwan.dialect.full.v1", "items": list(grouped.values())}


def build_bundle(xlsx_name: str, sheet: str, area_index: Dict, language_groups: Dict, records: List[dict], colmap: Dict[str, str]) -> Dict:
    languages = sorted(list(language_groups.keys()))
    all_dialects = sorted({f"{e['族語']}|{e['方言別']}" for towns in area_index.values() for entries in towns.values() for e in entries})

    admin_stats = compute_admin_division_stats_v2(records)

    return {
        "schema": "taiwan.dialect.bundle.v1",
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "source": {"xlsx": xlsx_name, "sheet": sheet, "usedColumns": colmap},
        "stats": {
            "languages": len(languages),
            "dialects": len(all_dialects),
            "records": len(records),
            **admin_stats,
        },
        "allLanguages": languages,
        "allDialects": all_dialects,
        "languageGroups": language_groups,
        "areaIndex": area_index,
    }


# =========================
# MAIN
# =========================
def convert_one(xlsx: Path, out_dir: Path):
    df, sheet = read_first_sheet(xlsx)

    colmap = FORCED_MAP.get(xlsx.name) or detect_map(df)
    if not colmap:
        raw = {
            "schema": "xlsx.raw_preview.v1",
            "source_xlsx": xlsx.name,
            "sheet": sheet,
            "columns": [str(c) for c in df.columns],
            "rows_preview": df.head(20).fillna("").to_dict(orient="records"),
            "note": "Could not map required columns to build outputs. Add FORCED_MAP or extend ALIASES.",
        }
        raw_path = out_dir / f"{xlsx.stem}.raw_preview.json"
        raw_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[WARN] wrote: {raw_path.resolve()} (mapping missing)")
        return

    df = forward_fill_merged_cells(df, colmap)
    records = df_to_records(df, colmap)

    area_index = build_area_index(records)
    language_groups = build_language_groups(area_index)

    bundle = build_bundle(xlsx.name, sheet, area_index, language_groups, records, colmap)
    bundle_path = out_dir / f"{xlsx.stem}.bundle.json"
    bundle_path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK]  wrote: {bundle_path.resolve()}")

    if WRITE_FULL_JSON:
        full = build_full_grouped(records)
        full_path = out_dir / f"{xlsx.stem}.full.json"
        full_path.write_text(json.dumps(full, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"      wrote: {full_path.resolve()}")


def main():
    base = Path(INPUT_DIR) if INPUT_DIR else Path(__file__).resolve().parent
    out_base = Path(OUTPUT_DIR) if OUTPUT_DIR else base
    out_base.mkdir(parents=True, exist_ok=True)

    files = iter_xlsx_files(base)

    print(f"BASE: {BASE}")
    print(f"INPUT_DIR: {base.resolve()}")
    print(f"OUTPUT_DIR: {out_base.resolve()}")
    print(f"Found {len(files)} xlsx file(s):")
    for f in files:
        print("  -", f.resolve())

    for xlsx in files:
        try:
            convert_one(xlsx, out_base)
        except Exception as e:
            print(f"[FAIL] {xlsx.name}\n  Reason: {e}")

    print("\nDone.")


if __name__ == "__main__":
    main()
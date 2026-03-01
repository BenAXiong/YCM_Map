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

# Name normalization is loaded from raw/county_reforms.json at startup.
# The file documents administrative reforms (升格/合併) and orthographic
# variants (台/臺) so that source data recorded under old names maps
# correctly to the names used in the current TopoJSON.
REFORMS_FILE = BASE / "raw" / "county_reforms.json"


def _load_name_normalization() -> Dict[str, str]:
    """Build flat {old: new} map from county_reforms.json.
    Falls back to a minimal built-in table if the file is missing."""
    if REFORMS_FILE.exists():
        try:
            data = json.loads(REFORMS_FILE.read_text(encoding="utf-8"))
            mapping: Dict[str, str] = {}
            for reform in data.get("reforms", []):
                for m in reform.get("mappings", []):
                    old, new = m.get("old", ""), m.get("new", "")
                    if old and new:
                        mapping[old] = new
            print(f"[INFO] Loaded {len(mapping)} name mappings from {REFORMS_FILE.name}")
            return mapping
        except Exception as e:
            print(f"[WARN] Could not load {REFORMS_FILE}: {e} — using built-in fallback")

    # Built-in fallback (kept minimal intentionally — update county_reforms.json instead)
    return {
        "台北市": "臺北市",
        "台中市": "臺中市",
        "台中縣": "臺中市",
        "台南市": "臺南市",
        "台南縣": "臺南市",
        "台北縣": "新北市",
        "臺北縣": "新北市",
        "桃園縣": "桃園市",
        "高雄縣": "高雄市",
        "台東縣": "臺東縣",
    }


NAME_NORMALIZATION: Dict[str, str] = _load_name_normalization()


def _load_township_normalization() -> Dict[str, Dict[str, str]]:
    """Build {county: {old_township: new_township}} map from county_reforms.json.
    Falls back to a minimal built-in table if the file is missing."""
    if REFORMS_FILE.exists():
        try:
            data = json.loads(REFORMS_FILE.read_text(encoding="utf-8"))
            raw = data.get("township_renames", {})
            result: Dict[str, Dict[str, str]] = {}
            for county, v in raw.items():
                if county.startswith("_") or not isinstance(v, dict):
                    continue
                result[county] = {k: val for k, val in v.items() if not k.startswith("_")}
            print(f"[INFO] Loaded township renames for {len(result)} county/ies from {REFORMS_FILE.name}")
            return result
        except Exception as e:
            print(f"[WARN] Could not load township_renames from {REFORMS_FILE}: {e}")
    return {}


TOWNSHIP_NORMALIZATION: Dict[str, Dict[str, str]] = _load_township_normalization()

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


def split_aware_of_brackets(s: str, separators: List[str]) -> List[str]:
    """Split a string by separators, but only if they are OUTSIDE of (...), [\u3010...\u3011], etc.
    This prevents splitting villages like '\u9577\u6a02\u6751(\u548c\u5e73\u8def\u3001\u516b\u7464\u8def)' at the internal comma.
    """
    if not any(sep in s for sep in separators):
        return [s]

    res = []
    current = []
    depth = 0
    # Map of opening to closing brackets
    opening = {'(': ')', '\u3010': '\u3011', '[': ']'}
    closing = {')': '(', '\u3011': '\u3010', ']': '['}

    for char in s:
        if char in opening:
            depth += 1
        elif char in closing:
            depth = max(0, depth - 1)

        if depth == 0 and char in separators:
            token = "".join(current).strip()
            if token:
                res.append(token)
            current = []
        else:
            current.append(char)

    last_token = "".join(current).strip()
    if last_token:
        res.append(last_token)

    return res


def clean_village_name(v: str) -> str:
    """Clean a single village name token.

    Handles the following artefacts from Excel merged-cell exports:
    - Mid-word whitespace: '\u5185\u7375 \u6751' -> '\u5185\u7375\u6751'
    - Parenthetical annotations: '\u4e09\u548c\u6751(\u7f8e\u5712\u793e\u5340)' -> '\u4e09\u548c\u6751'
    - Full-width bracket annotations: '\u53e4\u83ef\u6751\u3010\u58eb\u6587\u65cf\u7fa4\u3011' -> '\u53e4\u83ef\u6751'
    - Unclosed / hanging brackets: '\u9577\u6a02\u6751(\u548c\u5e73\u8def' -> '\u9577\u6a02\u6751'
    - Leading/trailing whitespace after stripping
    """
    # collapse mid-word spaces (e.g. '\u5167\u7375 \u6751', '\u5357 \u6c99\u9b6f\u91cc')
    v = re.sub(r'([\u4e00-\u9fff])\s+([\u4e00-\u9fff])', r'\1\2', v)

    # strip matched parentheticals
    v = re.sub(r'\([^)]*\)', '', v)
    v = re.sub(r'\u3010[^\u3011]*\u3011', '', v)
    v = re.sub(r'\[[^\]]*\]', '', v)

    # strip unclosed/hanging notes (anything from first paren/bracket to end)
    v = re.sub(r'[(\u3010\[].*$', '', v)

    return v.strip()


def is_valid_village(v: str) -> bool:
    """Return True if the string looks like an actual 村/里 admin unit.

    Rejects:
    - Empty strings
    - Strings that end with ) (tail fragment of a split parenthetical)
    - Strings that don't end in 村 or 里 after cleaning
      (e.g. pure sub-village descriptions like '大平林', '內坤', '大坤')
    """
    if not v:
        return False
    # must end with 村 or 里
    if not (v.endswith('村') or v.endswith('里')):
        return False
    return True


def extract_village_annotations(
    raw_str: str,
    county: str,
    township: str,
    dialect: str,
) -> tuple:
    """從原始村里字串中提取兩類資訊:

    1. village_notes: {"縣|鄉鎮市|村里": "小地名/社區名"} — from entries like
       '生涯村(古美)' → note='古美'
    2. non_admin: [{縣, 鄉鎮市, name, 方言別, note?}] — place names that
       don't end in 村/里 (hamlets, settlements, sub-village names).
       e.g. '大平林', '內坪', '達卡努瓦里(Takanua)'  ← this one HAS 里
    """
    if not raw_str:
        return {}, []

    # split on list separators only — preserve paren content intact
    s = raw_str
    separators = ["\u3001", "\n", "\x00"] # \x00 is from a previous replace if any
    tokens = split_aware_of_brackets(s, separators)

    village_notes: Dict[str, str] = {}
    non_admin: List[dict] = []

    for tok in tokens:
        # collapse mid-word CJK spaces first
        tok = re.sub(r'([\u4e00-\u9fff])\s+([\u4e00-\u9fff])', r'\1\2', tok)
        # extract all parenthetical and bracket content before stripping
        paren_notes = re.findall(r'\(([^)]*)\)', tok)
        fw_notes = re.findall(r'\u3010([^\u3011]*)\u3011', tok)
        all_notes = [n.strip() for n in paren_notes + fw_notes if n.strip()]
        # build clean base name
        base = re.sub(r'\([^)]*\)', '', tok)
        base = re.sub(r'\u3010[^\u3011]*\u3011', '', base).strip()
        if not base:
            continue
        if is_valid_village(base):
            if all_notes:
                key = f"{county}|{township}|{base}"
                new_note = '、'.join(all_notes)
                existing = village_notes.get(key, '')
                village_notes[key] = f"{existing}、{new_note}" if existing else new_note
        elif not base.endswith(')'):
            # non-admin place name (hamlet, settlement, etc.)
            entry: dict = {"縣": county, "鄉鎮市": township, "name": base, "方言別": dialect}
            if all_notes:
                entry["note"] = '、'.join(all_notes)
            non_admin.append(entry)

    return village_notes, non_admin


def split_multi(s: str) -> List[str]:
    s = norm_text(s)
    if not s:
        return []

    # split by list separators, but ignore those inside parentheses
    separators = ["\u3001", "\n", ",", "\uff0c", "\uff1b", ";", "/"]
    parts = split_aware_of_brackets(s, separators)

    # clean and filter each token
    cleaned = []
    seen = set()
    for p in parts:
        p = clean_village_name(p)
        if not is_valid_village(p):
            continue
        if p not in seen:
            seen.add(p)
            cleaned.append(p)
    return cleaned


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


def df_to_records(df: pd.DataFrame, colmap: Dict[str, str]) -> tuple:
    """Returns (records, village_notes, non_admin_places).

    village_notes: {"縣|鄉鎮市|村里": "annotation string"}
    non_admin_places: [{obj}] — place names that are not \u91cc/\u6751 admin units
    """
    recs = []
    all_village_notes: Dict[str, str] = {}
    all_non_admin: List[dict] = []

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

        # Context-bound township rename (e.g. 復興鄉 → 復興區 under 桃園市)
        if county in TOWNSHIP_NORMALIZATION:
            township = TOWNSHIP_NORMALIZATION[county].get(township, township)
            rec["鄉鎮市"] = township

        if "village" in colmap:
            villages = split_multi(village_raw)
            if INCLUDE_VILLAGES_IN_FULL:
                rec["村里"] = villages
            else:
                rec["村里_raw"] = village_raw

            # collect annotation metadata from the raw string
            vn, na = extract_village_annotations(village_raw, county, township, dialect)
            for k, v in vn.items():
                all_village_notes[k] = v
            all_non_admin.extend(na)

        recs.append(rec)
    return recs, all_village_notes, all_non_admin



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

def build_village_lookup(records: List[dict]) -> Dict:
    """
    Build a flat lookup: {"縣|鄉鎮市|村里": ["方言別", ...]}
    Used by the future village-level map layer to color 里/村 by dialect.
    """
    lookup: Dict[str, List[str]] = {}
    for r in records:
        c = r.get("縣", "")
        t = r.get("鄉鎮市", "")
        dia = r.get("方言別", "")
        if not (c and t and dia):
            continue
        for v in r.get("村里", []):
            if not v:
                continue
            key = f"{c}|{t}|{v}"
            if dia not in lookup.get(key, []):
                lookup.setdefault(key, []).append(dia)
    return {"schema": "taiwan.village.lookup.v1", "lookup": lookup}


def build_admin_tree_md(records: List[dict]) -> str:
    """Build a human-readable markdown tree of the administrative divisions found in the data."""
    tree: Dict[str, Dict[str, set]] = {}
    for r in records:
        c = r.get("縣", "")
        t = r.get("鄉鎮市", "")
        villages = r.get("村里", [])
        if not (c and t):
            continue
        tree.setdefault(c, {}).setdefault(t, set())
        if isinstance(villages, list):
            for v in villages:
                if v:
                    tree[c][t].add(v)

    lines = ["# Administrative division tree recorded in source\n"]
    counties = sorted(tree.keys())
    lines.append(f"- Counties: **{len(counties)}**\n")

    for county in counties:
        towns = tree[county]
        lines.append(f"\n## {county}\n")
        lines.append(f"- 鄉鎮市：**{len(towns)}**\n")
        for town in sorted(towns.keys()):
            villages = sorted(list(towns[town]))
            lines.append(f"- **{town}** (村里：{len(villages)})\n")
            for v in villages:
                lines.append(f"  - {v}\n")

    return "".join(lines)

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
    records, village_notes, non_admin = df_to_records(df, colmap)

    area_index = build_area_index(records)
    language_groups = build_language_groups(area_index)

    bundle = build_bundle(xlsx.name, sheet, area_index, language_groups, records, colmap)
    bundle_path = out_dir / "dialects.bundle.json"
    bundle_path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK]  wrote: {bundle_path.resolve()}")

    # Output reports to a subfolder
    report_dir = out_dir / "reports"
    report_dir.mkdir(exist_ok=True)

    if WRITE_FULL_JSON:
        full = build_full_grouped(records)
        full_path = out_dir / "dialects.full.json"
        full_path.write_text(json.dumps(full, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"      wrote: {full_path.resolve()}")

        village_lookup = build_village_lookup(records)
        vl_path = out_dir / "villages.lookup.json"
        vl_path.write_text(json.dumps(village_lookup, ensure_ascii=False, indent=2), encoding="utf-8")
        village_count = len(village_lookup["lookup"])
        print(f"      wrote: {vl_path.resolve()} ({village_count} entries)")

        annotations_out = {
            "schema": "taiwan.village.annotations.v1",
            "note": "Parenthetical notes and non-admin place names extracted from the XLSX. Useful for UI tooltips.",
            "village_notes": village_notes,
            "non_admin_places": non_admin,
        }
        va_path = out_dir / "villages.notes.json"
        va_path.write_text(json.dumps(annotations_out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"      wrote: {va_path.resolve()} ({len(village_notes)} notes)")

    # reports
    tree_path = report_dir / "dialects.summary.md"
    tree_path.write_text(build_admin_tree_md(records), encoding="utf-8")

    index_path = out_dir / "dialects.index.json" # keep index in main data if it's used by frontend
    index_path.write_text(json.dumps(area_index, ensure_ascii=False, indent=2), encoding="utf-8")

    dup_path = report_dir / "dialects.duplicates.csv"
    pd.DataFrame(records).to_csv(dup_path, index=False) # this is a placeholder for duplicate logic if needed later


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
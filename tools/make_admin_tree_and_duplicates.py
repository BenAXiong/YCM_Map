import csv
import re
from collections import defaultdict, Counter
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import pandas as pd

# ---------------- CONFIG ----------------
BASE = Path(__file__).resolve().parents[1]   # project root (tools/..)
INPUT_DIR = BASE / "raw"                    # where xlsx lives
OUTPUT_DIR = BASE / "src" / "data"          # outputs here

# Set to None to print ALL villages (can be huge).
MAX_VILLAGES_PER_TOWNSHIP = None  # e.g. 50

ALIASES = {
    "language": ["族語", "語言", "Language"],
    "dialect": ["方言別", "方言", "Dialect"],
    "county": ["縣市", "縣", "市", "County"],
    "township": ["鄉鎮市區", "鄉鎮市", "鄉鎮", "Township"],
    "village": ["村里", "部落", "Village"],
}

NAME_NORMALIZATION = {
    "台北市": "臺北市",
    "台中市": "臺中市",
    "台南市": "臺南市",
    "台東縣": "臺東縣",
}

# ---------------------------------------


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
    s = str(x).replace("\u3000", " ")
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("（", "(").replace("）", ")")
    s = s.replace("；", ";").replace("，", ",")
    s = NAME_NORMALIZATION.get(s, s)
    return s


def split_multi(s: str) -> List[str]:
    s = norm_text(s)
    if not s:
        return []
    parts = re.split(r"[\n,;/]+", s)
    return [p.strip() for p in parts if p.strip()]


def detect_map(df: pd.DataFrame) -> Optional[Dict[str, str]]:
    colnames = [str(c) for c in df.columns]
    lower = {c: norm_text(c).lower() for c in colnames}

    out: Dict[str, str] = {}
    for key, opts in ALIASES.items():
        opts_norm = [norm_text(o).lower() for o in opts]
        found = None

        for c in colnames:  # exact
            if lower[c] in opts_norm:
                found = c
                break

        if not found:  # substring
            for c in colnames:
                for o in opts_norm:
                    if o and o in lower[c]:
                        found = c
                        break
                if found:
                    break

        if found:
            out[key] = found

    needed = {"county", "township", "village"}
    return out if needed.issubset(out.keys()) else None


def forward_fill(df: pd.DataFrame, colmap: Dict[str, str]) -> pd.DataFrame:
    # merged cells -> NaN on following rows
    for k in ["language", "dialect", "county", "township", "village"]:
        c = colmap.get(k)
        if c and c in df.columns:
            df[c] = df[c].ffill()
    return df


def iter_xlsx_files(folder: Path) -> List[Path]:
    return sorted([p for p in folder.rglob("*.xlsx") if not p.name.startswith("~$")])


def read_first_sheet(path: Path) -> Tuple[pd.DataFrame, str]:
    xls = pd.ExcelFile(path)
    sheet = xls.sheet_names[0]
    df = pd.read_excel(path, sheet_name=sheet).dropna(axis=1, how="all")
    return df, sheet


def build_tree_and_dupes(df: pd.DataFrame, colmap: Dict[str, str]):
    c_col = colmap["county"]
    t_col = colmap["township"]
    v_col = colmap["village"]
    l_col = colmap.get("language")
    d_col = colmap.get("dialect")

    # Tree: county -> township -> set(villages)
    tree: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
    seen_village: Dict[Tuple[str, str], set] = defaultdict(set)

    # Duplicate tracking
    pair_ct = Counter()   # (county, township)
    triple_ct = Counter() # (county, township, village)
    fullrow_ct = Counter()# (lang, dialect, county, township, village)

    for _, row in df.iterrows():
        county = norm_text(row.get(c_col))
        town = norm_text(row.get(t_col))
        if not (county and town):
            continue

        pair_ct[(county, town)] += 1

        villages_raw = norm_text(row.get(v_col))
        villages = split_multi(villages_raw) or ([] if not villages_raw else [villages_raw])

        lang = norm_text(row.get(l_col)) if l_col else ""
        dia = norm_text(row.get(d_col)) if d_col else ""

        for v in villages:
            if not v:
                continue
            triple_ct[(county, town, v)] += 1
            fullrow_ct[(lang, dia, county, town, v)] += 1

            if v not in seen_village[(county, town)]:
                seen_village[(county, town)].add(v)
                tree[county][town].append(v)

    return tree, pair_ct, triple_ct, fullrow_ct


def write_tree_md(tree: Dict[str, Dict[str, List[str]]], out_path: Path):
    lines = []
    counties = sorted(tree.keys())
    lines.append(f"# Administrative division tree\n")
    lines.append(f"- Counties: **{len(counties)}**\n")

    for county in counties:
        towns = tree[county]
        lines.append(f"\n## {county}  \n")
        lines.append(f"- 鄉鎮市：**{len(towns)}**\n")

        for town in sorted(towns.keys()):
            villages = towns[town]
            lines.append(f"- **{town}** (村里：{len(villages)})\n")

            show = villages
            hidden = 0
            if MAX_VILLAGES_PER_TOWNSHIP is not None and len(villages) > MAX_VILLAGES_PER_TOWNSHIP:
                show = villages[:MAX_VILLAGES_PER_TOWNSHIP]
                hidden = len(villages) - len(show)

            for v in show:
                lines.append(f"  - {v}\n")
            if hidden:
                lines.append(f"  - … (+{hidden} more)\n")

    out_path.write_text("".join(lines), encoding="utf-8")


def write_duplicates_csv(
    pair_ct: Counter,
    triple_ct: Counter,
    fullrow_ct: Counter,
    out_path: Path
):
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["type", "count", "縣", "鄉鎮市", "村里", "族語", "方言別"])

        for (c, t), n in pair_ct.items():
            if n > 1:
                w.writerow(["dup_county_township", n, c, t, "", "", ""])

        for (c, t, v), n in triple_ct.items():
            if n > 1:
                w.writerow(["dup_county_township_village", n, c, t, v, "", ""])

        for (lang, dia, c, t, v), n in fullrow_ct.items():
            if n > 1:
                w.writerow(["dup_full_row", n, c, t, v, lang, dia])


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    files = iter_xlsx_files(INPUT_DIR)
    print(f"INPUT_DIR:  {INPUT_DIR.resolve()}")
    print(f"OUTPUT_DIR: {OUTPUT_DIR.resolve()}")
    print(f"Found {len(files)} xlsx file(s).")

    for xlsx in files:
        df, sheet = read_first_sheet(xlsx)
        colmap = detect_map(df)
        if not colmap:
            print(f"[WARN] {xlsx.name}: missing required columns for (縣,鄉鎮市,村里). Columns={list(df.columns)}")
            continue

        df = forward_fill(df, colmap)

        tree, pair_ct, triple_ct, fullrow_ct = build_tree_and_dupes(df, colmap)

        md_path = OUTPUT_DIR / f"{xlsx.stem}.admin_tree.md"
        dup_path = OUTPUT_DIR / f"{xlsx.stem}.duplicates.csv"

        write_tree_md(tree, md_path)
        write_duplicates_csv(pair_ct, triple_ct, fullrow_ct, dup_path)

        print(f"[OK] wrote: {md_path.resolve()}")
        print(f"[OK] wrote: {dup_path.resolve()}")

    print("\nDone.")


if __name__ == "__main__":
    main()
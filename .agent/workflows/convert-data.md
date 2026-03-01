---
description: regenerate src/data JSON files from the raw XLSX source
---

Regenerate the dialect bundle and full JSON files from the raw XLSX.
Run from the project root (`YCM_Map/`).

// turbo
1. Run the conversion script:
```
python tools\convert_xlsx_to_json.py
```

Expected output lines:
- `[INFO] Loaded N name mappings from county_reforms.json`
- `[INFO] Loaded township renames for N county/ies from county_reforms.json`
- `[OK]  wrote: ...bundle.json`
- `      wrote: ...full.json`

2. Verify the output files were updated (`generatedAt` timestamp should be recent) in `src/data/`.

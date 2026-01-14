import pandas as pd
import json
import os
import shutil
from datetime import datetime

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
JSON_FILE = os.path.join(DATA_DIR, "activities.json")
XLSX_FILE = os.path.join(DATA_DIR, "activities.xlsx")

def json_to_xlsx():
    if not os.path.exists(JSON_FILE):
        print(f"Error: {JSON_FILE} not found.")
        return

    # 1. Read JSON
    print(f"Reading {JSON_FILE}...")
    with open(JSON_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 2. Convert to DataFrame
    df = pd.json_normalize(data)

    if "listing_id" in df.columns:
        df["listing_id"] = pd.to_numeric(df["listing_id"], errors="ignore")
        columns = ["listing_id"] + [col for col in df.columns if col != "listing_id"]
        df = df[columns]

    # 3. Handle Lists/Arrays (e.g. tags, accessibility_flags, coordinates)
    # Convert lists to comma-separated strings for Excel compatibility
    list_columns = []
    for col in df.columns:
        if df[col].apply(lambda x: isinstance(x, list)).any():
            list_columns.append(col)
            # Convert list to string representation or comma separated
            # For coordinates, we might want to keep them as "[lat, lng]" string
            # For tags, "tag1, tag2"
            
            def list_to_str(val):
                if isinstance(val, list):
                    if col == 'coordinates':
                        return json.dumps(val) # Keep [lat, lng] format
                    return ",".join(map(str, val))
                return val
            
            df[col] = df[col].apply(list_to_str)
            print(f"Converted list column '{col}' to string format.")

    # 4. Create Backup of existing XLSX if it exists
    if os.path.exists(XLSX_FILE):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = os.path.join(DATA_DIR, f"activities_backup_{timestamp}.xlsx")
        shutil.copy2(XLSX_FILE, backup_file)
        print(f"Created backup of existing Excel file: {backup_file}")

    # 5. Write to Excel
    print(f"Writing to {XLSX_FILE}...")
    try:
        df.to_excel(XLSX_FILE, index=False)
        print("Success! JSON converted to XLSX.")
    except Exception as e:
        print(f"Error writing Excel file: {e}")
        print("Ensure 'openpyxl' is installed (pip install openpyxl).")

if __name__ == "__main__":
    json_to_xlsx()

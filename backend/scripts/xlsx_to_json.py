import pandas as pd
import json
import os
import shutil
from datetime import datetime
import ast

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
JSON_FILE = os.path.join(DATA_DIR, "activities.json")
XLSX_FILE = os.path.join(DATA_DIR, "activities.xlsx")

def xlsx_to_json():
    if not os.path.exists(XLSX_FILE):
        print(f"Error: {XLSX_FILE} not found.")
        return

    # 1. Read Excel
    print(f"Reading {XLSX_FILE}...")
    try:
        df = pd.read_excel(XLSX_FILE)
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return

    # 2. Convert DataFrame back to list of dicts
    # We need to handle the columns we converted to strings back to lists
    
    # Identify likely list columns based on names or content content from known structure
    # Or just hardcode the known list fields from activities.json structure
    known_list_fields = ['tags', 'accessibility_flags', 'coordinates']
    
    records = df.to_dict(orient='records')
    
    cleaned_records = []
    
    for record in records:
        # Filter out NaN values (empty cells in Excel become NaN/float)
        cleaned_record = {k: v for k, v in record.items() if pd.notna(v)}
        
        # Restore lists
        for field in known_list_fields:
            if field in cleaned_record and isinstance(cleaned_record[field], str):
                val = cleaned_record[field]
                if field == 'coordinates':
                    try:
                        # Expecting JSON string "[lat, lng]"
                        cleaned_record[field] = json.loads(val)
                    except:
                        # Fallback for simple comma separated "lat, lng" if user edited it
                        try:
                            cleaned_record[field] = [float(x.strip()) for x in val.split(",")]
                        except:
                            pass # Keep as string if parsing fails
                else:
                    # Expecting comma separated "tag1, tag2"
                    if val.strip():
                        cleaned_record[field] = [x.strip() for x in val.split(",")]
                    else:
                        cleaned_record[field] = []
        
        cleaned_records.append(cleaned_record)

    # 3. Create Backup of existing JSON
    if os.path.exists(JSON_FILE):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = os.path.join(DATA_DIR, f"activities_backup_{timestamp}.json")
        shutil.copy2(JSON_FILE, backup_file)
        print(f"Created backup of existing JSON file: {backup_file}")

    # 4. Write JSON
    print(f"Writing to {JSON_FILE}...")
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(cleaned_records, f, indent=2, ensure_ascii=False)
    
    print("Success! XLSX converted to JSON.")

if __name__ == "__main__":
    xlsx_to_json()

import os
import re

versions_dir = 'backend/alembic/versions'
revs = {}
down_revs = set()

for f in os.listdir(versions_dir):
    if not f.endswith('.py') or f == '__init__.py':
        continue
    
    with open(os.path.join(versions_dir, f), 'r', encoding='utf-8') as file:
        content = file.read()
        
        # Match revision
        r = re.search(r'''revision\s*(?::\s*str)?\s*=\s*['"]([a-f0-9]+)['"]''', content)
        
        # Match down_revision
        d = re.search(r'''down_revision\s*(?::.*)?\s*=\s*['"]([a-f0-9]+)['"]''', content)
        d_tuple = re.search(r'''down_revision\s*(?::.*)?\s*=\s*\(([^)]+)\)''', content)

        if r:
            rid = r.group(1)
            revs[rid] = f
            
            if d:
                down_revs.add(d.group(1))
            elif d_tuple:
                parts = d_tuple.group(1).replace("'", "").replace('"', "").replace(" ", "").split(",")
                for part in parts:
                    if part:
                        down_revs.add(part)

heads = set(revs.keys()) - down_revs
print(f"Heads: {heads}")

import re

files = [
    r'd:\printer\client\src\components\CustomerView.jsx',
    r'd:\printer\client\src\components\ShopkeeperDashboard.jsx',
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    # Fix broken pattern from PowerShell: fetch(\\/api/  -> fetch(`${API_BASE}/api/
    content = content.replace("fetch(\\\\/api/", "fetch(`${API_BASE}/api/")
    # Fix any remaining single-quoted: fetch('/api/ -> fetch(`${API_BASE}/api/
    content = content.replace("fetch('/api/", "fetch(`${API_BASE}/api/")
    # Fix backtick: fetch(`/api/ -> fetch(`${API_BASE}/api/
    content = re.sub(r"fetch\(`/api/", "fetch(`${API_BASE}/api/", content)
    
    with open(filepath, 'w', encoding='utf-8') as fh:
        fh.write(content)
    print("Fixed:", filepath)

import re

files = [
    r'd:\printer\client\src\components\CustomerView.jsx',
    r'd:\printer\client\src\components\ShopkeeperDashboard.jsx',
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    # Fix pattern: fetch(`${API_BASE}/api/...', {  -> fetch(`${API_BASE}/api/...`, {
    # i.e., closing single quote after template literal path -> backtick
    content = re.sub(r"(fetch\(`\$\{API_BASE\}/api/[^'`\n]+)'(\s*,|\s*\))", r"\1`\2", content)
    
    with open(filepath, 'w', encoding='utf-8') as fh:
        fh.write(content)
    print("Fixed quotes:", filepath)

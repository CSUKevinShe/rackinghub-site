#!/usr/bin/env python3
"""Clean up dead CSS in sub-pages and ensure mobile nav works."""
import os, glob, re

files = []
for f in glob.glob('products/*.html'): files.append(f)
for f in glob.glob('blog/*.html'): files.append(f)
for f in ['blog.html', 'contact.html', 'about.html', 'case-studies.html']:
    if os.path.exists(f): files.append(f)

for filepath in files:
    with open(filepath, 'r') as fh:
        content = fh.read()
    
    original = content
    
    # Remove dead CSS: .header-right position:relative (no longer exists in HTML)
    content = re.sub(r'\s*\.header-right\s*\{[^}]*position\s*:\s*relative[^}]*\}', '', content)
    
    # Remove dead CSS: .nav-links a styles (if any orphan ones outside media query)
    
    # Ensure the hamburger base CSS exists before media query
    if '.hamburger { display: none;' not in content and '.hamburger{display:none' not in content:
        # Add hamburger base CSS before the mobile media query
        content = re.sub(
            r'(@media\s*\(max-width:\s*768px\))',
            '.hamburger{display:none;flex-direction:column;cursor:pointer;gap:5px;padding:5px;}'
            r'\1',
            content
        )
    
    if content != original:
        with open(filepath, 'w') as fh:
            fh.write(content)
        print(f"Cleaned: {filepath}")
    else:
        print(f"OK: {filepath}")

print("Done!")

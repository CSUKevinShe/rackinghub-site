#!/usr/bin/env python3
import os, glob, re

files = glob.glob('blog/*.html')

for filepath in files:
    with open(filepath, 'r') as fh:
        content = fh.read()
    
    # Skip if no header-right (already fixed)
    if 'class="header-right"' not in content:
        print(f"OK: {filepath}")
        continue
    
    # Replace header-right div with just hamburger
    old_pattern = r'<div class="header-right">\s*<ul class="nav-links".*?</ul>\s*<div class="hamburger".*?</div>\s*</div>'
    new_header = '''<div class="hamburger" id="hamburger" onclick="toggleMenu()">
                <span></span><span></span><span></span>
            </div>'''
    
    content = re.sub(old_pattern, new_header, content, flags=re.DOTALL)
    
    # Remove duplicate mobile menu overlay if exists
    if content.count('<div class="mobile-menu" id="mobileMenu"') > 1:
        # Find and remove the duplicate (the one that comes after <!-- Page Header -->)
        content = re.sub(
            r'<!-- Page Header -->\s*<!-- Mobile Menu Overlay -->',
            '<!-- Page Header -->',
            content
        )
    
    with open(filepath, 'w') as fh:
        fh.write(content)
    
    print(f"FIXED: {filepath}")

print("Done!")

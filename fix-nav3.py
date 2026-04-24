#!/usr/bin/env python3
import os, re, glob

menu_html = """    <!-- Mobile Menu Overlay -->
    <div class="mobile-menu" id="mobileMenu" onclick="closeMenuOutside(event)">
        <div class="mobile-menu-content">
            <a href="/" class="mobile-menu-item">HOME</a>
            <a href="/products" class="mobile-menu-item">PRODUCTS</a>
            <a href="/about" class="mobile-menu-item">ABOUT US</a>
            <a href="/blog" class="mobile-menu-item">BLOG</a>
            <a href="/faq" class="mobile-menu-item">FAQ</a>
            <a href="/contact" class="mobile-menu-item">CONTACT</a>
            <a href="/contact" class="mobile-menu-cta">GET A FREE QUOTE</a>
        </div>
    </div>

"""

files = []
for f in ['about.html', 'blog.html', 'faq.html', 'contact.html']:
    if os.path.exists(f): files.append(f)
for f in glob.glob('products/*.html'): files.append(f)
for f in glob.glob('blog/*.html'): files.append(f)

for filepath in files:
    with open(filepath, 'r') as fh:
        content = fh.read()
    
    # Check if HTML overlay already exists
    if '<div class="mobile-menu" id="mobileMenu"' in content:
        print(f"SKIP (HTML done): {filepath}")
        continue
    
    updated = False
    
    # 1. Replace header-right div with just hamburger
    # Match: <div class="header-right">...</div> where it contains nav-links and hamburger
    header_match = re.search(
        r'(<a href="[^"]*" class="logo">.*?</a>)\s*<div class="header-right">.*?</div>',
        content, re.DOTALL
    )
    if header_match:
        new_header = (
            header_match.group(1) + '\n'
            '            <div class="hamburger" id="hamburger" onclick="toggleMenu()">\n'
            '                <span></span><span></span><span></span>\n'
            '            </div>'
        )
        content = content.replace(header_match.group(0), new_header)
        updated = True
    
    # 2. Add mobile menu overlay before page header or hero
    if '<div class="page-header">' in content:
        content = content.replace('<div class="page-header">', menu_html + '    <div class="page-header">')
        updated = True
    elif '<section class="hero">' in content:
        content = content.replace('<section class="hero">', menu_html + '    <section class="hero">')
        updated = True
    elif '<section class="page-header">' in content:
        content = content.replace('<section class="page-header">', menu_html + '    <section class="page-header">')
        updated = True
    
    if updated:
        with open(filepath, 'w') as fh:
            fh.write(content)
        print(f"UPDATED: {filepath}")
    else:
        print(f"NO CHANGE: {filepath}")

print("Done!")

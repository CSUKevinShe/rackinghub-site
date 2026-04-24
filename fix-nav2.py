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
    
    if 'mobile-menu-content' in content:
        print(f"SKIP: {filepath}")
        continue
    
    updated = False
    
    # 1. Replace header structure
    # Pattern: <div class="header-right">...nav-links...hamburger...</div>
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
    
    # 2. Add mobile menu overlay HTML before Page Header or Hero Section
    if '<!-- Mobile Menu Overlay -->' not in content:
        if '<div class="page-header">' in content:
            content = content.replace('<div class="page-header">', menu_html + '\n    <div class="page-header">')
            updated = True
        elif '<section class="hero">' in content:
            content = content.replace('<section class="hero">', menu_html + '\n    <section class="hero">')
            updated = True
        elif '<section class="page-header">' in content:
            content = content.replace('<section class="page-header">', menu_html + '\n    <section class="page-header">')
            updated = True
        elif '<!-- Page Header -->' in content:
            content = content.replace('    <!-- Page Header -->', menu_html + '\n    <!-- Page Header -->')
            updated = True
    
    if updated:
        with open(filepath, 'w') as fh:
            fh.write(content)
        print(f"UPDATED: {filepath}")
    else:
        print(f"NO CHANGE: {filepath}")

print("Done!")

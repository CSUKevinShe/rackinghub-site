#!/usr/bin/env python3
"""Fix blog article pages - replace old header HTML with new hamburger + overlay."""
import os, glob, re

mobile_menu_css = """
        /* Mobile Menu Overlay */
        .mobile-menu{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1050;opacity:0;transition:opacity 0.3s;}
        .mobile-menu.active{display:block;opacity:1;}
        .mobile-menu-content{position:absolute;right:0;top:0;bottom:0;width:280px;background:#fff;padding:5rem 2rem 2rem;display:flex;flex-direction:column;box-shadow:-4px 0 20px rgba(0,0,0,0.15);transform:translateX(100%);transition:transform 0.3s;}
        .mobile-menu.active .mobile-menu-content{transform:translateX(0);}
        .mobile-menu-item{color:#333;font-weight:600;font-size:1.1rem;padding:1rem 0;border-bottom:1px solid #f0f0f0;transition:color 0.3s;text-transform:uppercase;letter-spacing:0.5px;}
        .mobile-menu-item:hover{color:#2c5282;}
        .mobile-menu-cta{display:block;background:#fbbf24;color:#1a365d;text-align:center;padding:1rem;font-weight:700;font-size:1rem;border-radius:5px;margin-top:1.5rem;text-transform:uppercase;letter-spacing:0.5px;transition:transform 0.3s;}
        .mobile-menu-cta:hover{transform:translateY(-1px);}
"""

new_js = """    <!-- Mobile Menu Toggle -->
    <script>
        function toggleMenu(){
            document.getElementById('mobileMenu').classList.toggle('active');
            document.getElementById('hamburger').classList.toggle('active');
        }
        function closeMenuOutside(e){
            if(e.target===document.getElementById('mobileMenu')){
                document.getElementById('mobileMenu').classList.remove('active');
                document.getElementById('hamburger').classList.remove('active');
            }
        }
        document.querySelectorAll('.mobile-menu-item, .mobile-menu-cta').forEach(function(link){
            link.addEventListener('click',function(){
                document.getElementById('mobileMenu').classList.remove('active');
                document.getElementById('hamburger').classList.remove('active');
            });
        });
    </script>"""

files = glob.glob('blog/*.html')

for filepath in files:
    with open(filepath, 'r') as fh:
        content = fh.read()
    
    # Skip if already updated
    if '<div class="mobile-menu" id="mobileMenu"' in content:
        print(f"SKIP (done): {filepath}")
        continue
    
    updated = False
    
    # 1. Replace header structure
    # Find: <div class="header-right">...nav-links...hamburger...</div>
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
    
    # 2. Add mobile menu overlay before article or page-header
    for marker in ['<article', '<div class="article"', '<!-- Article Content -->', '<section class="page-header"', '<div class="page-header"']:
        if marker in content and '<div class="mobile-menu"' not in content:
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

    """ + marker
            content = content.replace(marker, menu_html, 1)
            updated = True
            break
    
    # 3. Add mobile menu CSS
    if '.mobile-menu' not in content and '</style>' in content:
        content = content.replace('</style>', mobile_menu_css + '    </style>')
        updated = True
    
    # 4. Update JS
    old_js = re.search(r'<!-- Mobile Menu Toggle -->\s*<script>.*?function toggleMenu.*?</script>', content, re.DOTALL)
    if old_js and 'navLinks' in old_js.group(0):
        content = content.replace(old_js.group(0), new_js)
        updated = True
    
    if updated:
        with open(filepath, 'w') as fh:
            fh.write(content)
        print(f"FIXED: {filepath}")
    else:
        print(f"NO CHANGE: {filepath}")

print("Done!")

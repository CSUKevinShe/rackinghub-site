import os, glob, re

files = glob.glob('*.html') + glob.glob('products/*.html') + glob.glob('blog/*.html')

for f in files:
    if not os.path.isfile(f):
        continue
    with open(f, 'r') as fh:
        content = fh.read()
    
    # Skip if already updated
    if 'mobile-menu' in content:
        continue
    
    # 1. Update header HTML - replace header-right/nav-links/hamburger with new structure
    old_header_pattern = r'<div class="header-right">\s*<ul class="nav-links".*?</ul>\s*<div class="hamburger".*?</div>\s*</div>'
    
    # Find the nav section and replace
    if '<div class="header-right">' in content:
        # Extract the nav links pattern - find the ul and hamburger div inside header-right
        # Replace the entire header-right div content
        old_header_right = re.search(
            r'(<a href=".*?" class="logo">.*?</a>)\s*'
            r'<div class="header-right">.*?</div>\s*'
            r'(</nav>)',
            content, re.DOTALL
        )
        if old_header_right:
            new_header = (
                old_header_right.group(1) + '\n'
                '            <div class="hamburger" id="hamburger" onclick="toggleMenu()">\n'
                '                <span></span><span></span><span></span>\n'
                '            </div>\n'
                '        ' + old_header_right.group(3)
            )
            content = content[:old_header_right.start()] + new_header + content[old_header_right.end():]
    
    # 2. Add mobile menu overlay HTML before Hero section
    if '<!-- Page Header -->' in content:
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

    <!-- Page Header -->"""
        content = content.replace('    <!-- Page Header -->', menu_html)
    elif '<!-- Hero Section -->' in content:
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

    <!-- Hero Section -->"""
        content = content.replace('    <!-- Hero Section -->', menu_html)
    
    # 3. Add CSS for mobile menu
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
    # Insert before </style>
    if '</style>' in content and '.mobile-menu' not in content:
        content = content.replace('</style>', mobile_menu_css + '    </style>')
    
    # 4. Update JS toggleMenu
    old_js = r"function toggleMenu\(\)\s*\{\s*document\.getElementById\('navLinks'\)\.classList\.toggle\('active'\);\s*document\.getElementById\('hamburger'\)\.classList\.toggle\('active'\);\s*\}"
    new_js = """function toggleMenu(){
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
        });"""
    content = re.sub(old_js, new_js, content)
    
    # 5. Update nav-links mobile CSS to hide on mobile
    old_mobile_css = r'(\.nav-links)\s*\{[^}]*\}\s*\.nav-links\.active\s*\{[^}]*display:\s*flex'
    # Simpler approach: just add display:none to the mobile media query
    if '@media (max-width: 768px)' in content:
        # Find the media query and add nav-links display:none
        media_match = re.search(r'@media\s*\(max-width:\s*768px\)\s*\{(.*?)(\})\s*(@media|$)', content, re.DOTALL)
        if media_match:
            inner = media_match.group(1)
            if '.nav-links' not in inner or '.nav-links.active' in inner:
                # Add nav-links hide
                new_inner = inner.rstrip() + '\n            .nav-links { display: none !important; }'
                content = content[:media_match.start(1)] + new_inner + content[media_match.end(1):]
    
    with open(f, 'w') as fh:
        fh.write(content)
    
    print(f"Updated: {f}")

print("Done!")

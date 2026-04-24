#!/usr/bin/env python3
import os, re, glob

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
    
    # 1. Add mobile menu CSS
    if '.mobile-menu' not in content and '</style>' in content:
        content = content.replace('</style>', mobile_menu_css + '    </style>')
        updated = True
    
    # 2. Replace JS
    # Find and replace the entire script block containing toggleMenu with navLinks
    js_block_match = re.search(
        r'(<!--\s*Mobile Menu Toggle\s*-->\s*<script>.*?</script>)',
        content, re.DOTALL
    )
    if js_block_match and 'navLinks' in js_block_match.group(1):
        content = content.replace(js_block_match.group(1), new_js)
        updated = True
    else:
        # Try to find inline script with toggleMenu and navLinks
        script_match = re.search(
            r'<script>\s*function toggleMenu\(\)\s*\{[^}]*navLinks[^}]*\}[^<]*(?:document\.querySelectorAll\([^)]*nav-links[^)]*\)[^;]*;\s*)*</script>',
            content, re.DOTALL
        )
        if script_match:
            content = content.replace(script_match.group(0), new_js)
            updated = True
        elif 'function toggleMenu()' in content and 'navLinks' in content:
            # Try a more aggressive replacement
            content = re.sub(
                r"function toggleMenu\(\)\s*\{[^}]*navLinks[^}]*\}",
                "function toggleMenu(){\n            document.getElementById('mobileMenu').classList.toggle('active');\n            document.getElementById('hamburger').classList.toggle('active');\n        }",
                content
            )
            content = re.sub(
                r"document\.querySelectorAll\(['\"]\.nav-links\s+a['\"]\)\.forEach\(function\(link\)\{[^}]*document\.getElementById\(['\"]navLinks['\"]\)\.classList\.remove\(['\"]active['\"]\);[^}]*document\.getElementById\(['\"]hamburger['\"]\)\.classList\.remove\(['\"]active['\"]\);\s*\}\);",
                """function closeMenuOutside(e){
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
        });""",
                content
            )
            updated = True
    
    # 3. Hide nav-links in mobile media query
    media_match = re.search(r'@media\s*\(max-width:\s*768px\)\s*\{(.*?)\n\s{8}\}', content, re.DOTALL)
    if media_match and '.nav-links' not in media_match.group(1):
        # Add nav-links hide rule before closing brace
        inner = media_match.group(1)
        new_inner = inner.rstrip() + '\n            .nav-links { display: none !important; }'
        old_media = media_match.group(0)
        new_media = old_media.replace(media_match.group(1), new_inner)
        content = content.replace(old_media, new_media)
        updated = True
    
    if updated:
        with open(filepath, 'w') as fh:
            fh.write(content)
        print(f"UPDATED: {filepath}")
    else:
        print(f"NO CHANGE: {filepath}")

print("Done!")

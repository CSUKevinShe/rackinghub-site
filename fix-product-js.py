#!/usr/bin/env python3
import os, glob

mobile_js = """    <!-- Mobile Menu Toggle -->
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
    </script>
</body>
</html>"""

files = glob.glob('products/*.html')

for filepath in files:
    with open(filepath, 'r') as fh:
        content = fh.read()
    
    # Skip if already has the JS
    if 'function toggleMenu()' in content:
        print(f"OK: {filepath}")
        continue
    
    # Replace </body>\n</html> with the JS
    if '</body>\n</html>' in content:
        content = content.replace('</body>\n</html>', mobile_js)
        with open(filepath, 'w') as fh:
            fh.write(content)
        print(f"FIXED: {filepath}")
    else:
        print(f"ERROR: {filepath}")

print("Done!")

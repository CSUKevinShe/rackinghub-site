#!/usr/bin/env python3
import os, glob, re

# Fix 1: Hide Google Translate on mobile in all pages that have it
files_with_translate = []
for f in ['about.html', 'blog.html', 'case-studies.html', 'index.html']:
    if os.path.exists(f): files_with_translate.append(f)
for f in glob.glob('blog/*.html'):
    if os.path.exists(f): files_with_translate.append(f)

for filepath in files_with_translate:
    with open(filepath, 'r') as fh:
        content = fh.read()
    
    # Check if mobile hide rule already exists
    if '@media(max-width:768px)' in content or '@media (max-width: 768px)' in content:
        # Find the 768px media query and add the rule
        media_match = re.search(r'@media\s*\(max-width:\s*768px\)\s*\{(.*?)\n\s{8}\}', content, re.DOTALL)
        if media_match:
            inner = media_match.group(1)
            if '#google_translate_element' not in inner:
                new_inner = inner.rstrip() + '\n            #google_translate_element { display: none !important; }'
                old_media = media_match.group(0)
                new_media = old_media.replace(media_match.group(1), new_inner)
                content = content.replace(old_media, new_media)
                with open(filepath, 'w') as fh:
                    fh.write(content)
                print(f"Updated Google Translate hide: {filepath}")
            else:
                print(f"Already has Google Translate hide: {filepath}")
        else:
            print(f"No media query found: {filepath}")
    else:
        print(f"No 768px media query: {filepath}")

# Fix 2: FAQ page - hide "Official Export Sales" on mobile
faq_path = 'faq.html'
if os.path.exists(faq_path):
    with open(faq_path, 'r') as fh:
        content = fh.read()
    
    # Find the media query and add the rule
    media_match = re.search(r'@media\s*\(max-width:\s*768px\)\s*\{(.*?)\n\s{8}\}', content, re.DOTALL)
    if media_match:
        inner = media_match.group(1)
        if '.desktop-only' not in inner:
            new_inner = inner.rstrip() + '\n            .desktop-only { display: none !important; }'
            old_media = media_match.group(0)
            new_media = old_media.replace(media_match.group(1), new_inner)
            content = content.replace(old_media, new_media)
            with open(faq_path, 'w') as fh:
                fh.write(content)
            print("Updated FAQ: hide Official Export Sales on mobile")
        else:
            print("FAQ already has the rule")
    else:
        print("FAQ: No media query found")

print("Done!")

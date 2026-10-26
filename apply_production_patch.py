#!/usr/bin/env python3
"""
Apply Production Patch — Odd/Even Year Dingbat Rotation
======================================================
Run this script in your production directory (where 'app.js' and/or 'print_router.py' reside):

    python3 apply_production_patch.py

What this script does:
1. In 'app.js':
   - Updates loadDingbatsManifest() to fetch 'dingbats_year_1.json' on odd years (e.g. 2025, 2027)
     and 'dingbats_year_2.json' on even years (e.g. 2026, 2028).
   - Updates getCurrentDailyDingbatInfo() to look in 'dingbats_year_1/' or 'dingbats_year_2/'.
2. In 'print_router.py':
   - Updates image search directories to search 'dingbats_year_1' and 'dingbats_year_2'.
3. Automatically creates safe backup copies (e.g. app.js.bak, print_router.py.bak).
"""

import os
import sys
import re
import shutil

BASE_DIR = os.getcwd()

def patch_app_js():
    app_path = os.path.join(BASE_DIR, "app.js")
    if not os.path.exists(app_path):
        print("[-] 'app.js' not found in current directory. Skipping.")
        return False

    with open(app_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "dingbats_year_1.json" in content and "dingbats_year_2.json" in content:
        print("[✓] 'app.js' is already up to date with odd/even year support.")
        return True

    # Backup
    shutil.copyfile(app_path, app_path + ".bak")

    # Replace loadDingbatsManifest
    old_load = re.search(r"function loadDingbatsManifest\(\)\s*\{[\s\S]*?return dingbatsManifestArray;[\s\S]*?\}\);[\s\S]*?\}", content)
    new_load = """function loadDingbatsManifest() {
    const baseUrl = getApiBaseUrl();
    const currentYear = new Date().getFullYear();
    const isOddYear = (currentYear % 2 !== 0);
    const primaryFile = isOddYear ? "dingbats_year_1.json" : "dingbats_year_2.json";

    return fetch(`${baseUrl}/${primaryFile}`)
        .then(res => {
            if (!res.ok) {
                return fetch(`${baseUrl}/dingbats.json`);
            }
            return res;
        })
        .then(res => {
            if (!res.ok) {
                return fetch(`${baseUrl}/dingbat.json`);
            }
            return res;
        })
        .then(res => {
            if (!res.ok) throw new Error("Dingbats manifest missing or unreachable.");
            return res.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                dingbatsManifestArray = data;
            } else if (data && typeof data === 'object') {
                dingbatsManifestArray = Object.values(data);
            }
            return dingbatsManifestArray;
        })
        .catch(err => {
            console.warn("Using offline fallback generator for dingbats:", err);
            return [];
        });
}"""

    if old_load:
        content = content[:old_load.start()] + new_load + content[old_load.end():]
    else:
        content = re.sub(
            r"return fetch\(`\$\{baseUrl\}\/dingbats\.json`\)",
            r"const isOddYear = (new Date().getFullYear() % 2 !== 0);\n    const primaryFile = isOddYear ? 'dingbats_year_1.json' : 'dingbats_year_2.json';\n    return fetch(`${baseUrl}/${primaryFile}`)",
            content
        )

    # Replace imagePath in getCurrentDailyDingbatInfo
    content = re.sub(
        r"imagePath:\s*`dingbats\/\$\{currentImageFile\}`",
        r"imagePath: `${(new Date().getFullYear() % 2 !== 0) ? 'dingbats_year_1' : 'dingbats_year_2'}/${currentImageFile}`",
        content
    )

    with open(app_path, "w", encoding="utf-8") as f:
        f.write(content)

    print("[✓] Successfully patched 'app.js' (Backup saved as app.js.bak)")
    return True


def patch_print_router():
    router_path = os.path.join(BASE_DIR, "print_router.py")
    if not os.path.exists(router_path):
        print("[-] 'print_router.py' not found in current directory. Skipping.")
        return False

    with open(router_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "dingbats_year_1" in content and "dingbats_year_2" in content:
        print("[✓] 'print_router.py' is already up to date with odd/even year support.")
        return True

    # Backup
    shutil.copyfile(router_path, router_path + ".bak")

    target_block = """    clean_filename = os.path.basename(image_filename)
    search_dirs = [
        os.path.join(base_dir, 'label-graphics'),
        os.path.join(base_dir, 'dingbats'),
        base_dir
    ]"""

    replacement_block = """    clean_filename = os.path.basename(image_filename)
    current_year = datetime.datetime.now().year
    active_year_dir = 'dingbats_year_1' if (current_year % 2 != 0) else 'dingbats_year_2'
    fallback_year_dir = 'dingbats_year_2' if (current_year % 2 != 0) else 'dingbats_year_1'

    search_dirs = [
        os.path.join(base_dir, 'label-graphics'),
        os.path.join(base_dir, active_year_dir),
        os.path.join(base_dir, fallback_year_dir),
        os.path.join(base_dir, 'dingbats'),
        base_dir
    ]"""

    if target_block in content:
        content = content.replace(target_block, replacement_block)
    else:
        content = re.sub(
            r"search_dirs\s*=\s*\[\s*os\.path\.join\(base_dir,\s*'label-graphics'\),\s*os\.path\.join\(base_dir,\s*'dingbats'\),\s*base_dir\s*\]",
            r"""current_year = datetime.datetime.now().year
    active_year_dir = 'dingbats_year_1' if (current_year % 2 != 0) else 'dingbats_year_2'
    fallback_year_dir = 'dingbats_year_2' if (current_year % 2 != 0) else 'dingbats_year_1'

    search_dirs = [
        os.path.join(base_dir, 'label-graphics'),
        os.path.join(base_dir, active_year_dir),
        os.path.join(base_dir, fallback_year_dir),
        os.path.join(base_dir, 'dingbats'),
        base_dir
    ]""",
            content
        )

    with open(router_path, "w", encoding="utf-8") as f:
        f.write(content)

    print("[✓] Successfully patched 'print_router.py' (Backup saved as print_router.py.bak)")
    return True


def main():
    print("===============================================================")
    print("  🔧 Production Code Patcher: Odd/Even Year Dingbats")
    print("===============================================================")
    print(f"[*] Target Directory: {BASE_DIR}\n")

    p1 = patch_app_js()
    p2 = patch_print_router()

    print("\n===============================================================")
    if p1 or p2:
        print("  🎉 Production updates applied successfully!")
        print("  - Odd Years:  uses 'dingbats_year_1.json' & 'dingbats_year_1/'")
        print("  - Even Years: uses 'dingbats_year_2.json' & 'dingbats_year_2/'")
    else:
        print("  [!] Neither 'app.js' nor 'print_router.py' were found in this folder.")
        print("      Make sure you run this script where your production files live.")
    print("===============================================================\n")


if __name__ == "__main__":
    main()
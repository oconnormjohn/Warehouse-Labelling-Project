#!/usr/bin/env python3
"""
Daily Dingbat Graphic Generator (High-Resolution 800x480 Double-Size)
Generates all 732 puzzle and answer PNG images directly from dingbats.json.

Output specifications:
- Dimensions: 800x480 pixels (Double-size for full-label Zebra 203dpi 4-inch/2-inch thermal print)
- Color depth: Pure monochrome / grayscale (Black on White, 1-bit thermal friendly)
- Clean layout: No outer borders (label edge serves as border), no inverse banners,
  no header underlines, no superfluous bottom prompts.
- Directory: ./dingbats/
- Files: dingbat_001_puzzle.png through dingbat_366_answer.png
"""

import os
import sys
import json

def get_font(size):
    """Attempt to load a clean TrueType font, falling back to PIL default font."""
    from PIL import ImageFont
    font_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "DejaVuSans-Bold.ttf",
        "Arial.ttf",
    ]
    for candidate in font_candidates:
        if os.path.exists(candidate):
            try:
                return ImageFont.truetype(candidate, size)
            except Exception:
                pass
    try:
        return ImageFont.load_default()
    except Exception:
        return None

def draw_centered_text(draw, text, y, font, image_width=800, fill=0):
    """Draw text horizontally centered at a specific vertical coordinate y."""
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
    except AttributeError:
        text_w, text_h = draw.textsize(text, font=font)
    x = max(10, (image_width - text_w) // 2)
    draw.text((x, y), text, font=font, fill=fill)
    return text_h

def render_puzzle_graphic(item, output_path):
    """Renders a single 800x480 puzzle graphic based on dingbats.json entry."""
    from PIL import Image, ImageDraw

    width, height = 800, 480
    img = Image.new("L", (width, height), 255)
    draw = ImageDraw.Draw(img)

    day = item.get("day", 1)
    puzzle = item.get("puzzle_text", "").strip()

    font_header = get_font(30)
    font_med = get_font(44)
    font_huge = get_font(66)

    # Top header: clean and simple, no underline beneath
    header_text = f"DAILY DINGBAT  -  DAY {day}"
    draw_centered_text(draw, header_text, 36, font_header, width, fill=0)

    # Layout detection for visual dingbat idioms
    if "/" in puzzle:
        parts = [p.strip() for p in puzzle.split("/", 1)]
        top_txt = parts[0]
        bot_txt = parts[1]
        
        draw_centered_text(draw, top_txt, 140, font_huge, width, fill=0)
        # Spatial divider line representing "under / over"
        draw.line([(160, 246), (width - 160, 246)], fill=0, width=5)
        draw_centered_text(draw, bot_txt, 276, font_huge, width, fill=0)

    elif puzzle.startswith("[") and puzzle.endswith("]"):
        inner = puzzle.strip("[]").strip()
        # Visual containment box representing "in / box"
        draw.rectangle([(160, 150), (width - 160, 360)], outline=0, width=5)
        draw_centered_text(draw, inner, 218, font_huge, width, fill=0)

    elif "|" in puzzle:
        draw_centered_text(draw, puzzle, 220, font_med, width, fill=0)

    else:
        if len(puzzle) > 22:
            draw_centered_text(draw, puzzle, 220, font_med, width, fill=0)
        else:
            draw_centered_text(draw, puzzle, 200, font_huge, width, fill=0)

    # (No border around edge, no bottom words)
    img.save(output_path, "PNG")

def render_answer_graphic(item, output_path):
    """Renders a single 800x480 answer graphic based on dingbats.json entry."""
    from PIL import Image, ImageDraw

    width, height = 800, 480
    img = Image.new("L", (width, height), 255)
    draw = ImageDraw.Draw(img)

    day = item.get("day", 1)
    answer = item.get("answer_text", "").strip()

    font_header = get_font(30)
    font_huge = get_font(60)
    font_large = get_font(46)

    # Clean header matching puzzle style
    draw_centered_text(draw, f"DAILY DINGBAT ANSWER  -  DAY {day}", 36, font_header, width, fill=0)

    # Clean, bold answer centered vertically and horizontally (no puzzle clue clutter)
    if len(answer) > 22:
        words = answer.split()
        half = len(words) // 2
        line1 = " ".join(words[:half])
        line2 = " ".join(words[half:])
        draw_centered_text(draw, line1, 185, font_large, width, fill=0)
        draw_centered_text(draw, line2, 260, font_large, width, fill=0)
    else:
        draw_centered_text(draw, answer, 215, font_huge, width, fill=0)

    img.save(output_path, "PNG")

def main():
    print("==================================================")
    print("Daily Dingbat 366-Day Generator (800x480 Clean)")
    print("==================================================")

    try:
        from PIL import Image
    except ImportError:
        print("\n[ERROR] Pillow (PIL) is not installed on this system.")
        print("Please install it on your Raspberry Pi by running:")
        print("    sudo apt-get update && sudo apt-get install -y python3-pil")
        print("or:")
        print("    pip3 install pillow\n")
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "dingbats.json"),
        os.path.join(script_dir, "..", "dingbats.json"),
        os.path.join(os.getcwd(), "dingbats.json"),
    ]

    json_path = None
    for cand in candidates:
        if os.path.exists(cand):
            json_path = cand
            break

    if not json_path:
        print(f"[ERROR] Could not find dingbats.json in: {candidates}")
        sys.exit(1)

    print(f"[*] Found manifest: {json_path}")
    with open(json_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    target_dir = os.path.join(os.path.dirname(json_path), "dingbats")
    os.makedirs(target_dir, exist_ok=True)
    print(f"[*] Generating {len(manifest) * 2} graphics (800x480) in: {target_dir}")

    count = 0
    for item in manifest:
        p_filename = item.get("puzzle_image", f"dingbat_{item['day']:03d}_puzzle.png")
        a_filename = item.get("answer_image", f"dingbat_{item['day']:03d}_answer.png")

        p_path = os.path.join(target_dir, p_filename)
        a_path = os.path.join(target_dir, a_filename)

        render_puzzle_graphic(item, p_path)
        render_answer_graphic(item, a_path)
        count += 2

        if item["day"] % 50 == 0 or item["day"] == len(manifest):
            print(f"    Progress: Day {item['day']} / {len(manifest)} processed ({count} PNGs created)")

    print("==================================================")
    print(f"[SUCCESS] Generated all {count} PNG graphics successfully!")
    print(f"Files are ready in: {target_dir}")
    print("==================================================")

if __name__ == "__main__":
    main()
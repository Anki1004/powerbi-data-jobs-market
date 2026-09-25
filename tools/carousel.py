from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

SRC = r"C:\Users\Ankit\AppData\Local\Temp\claude\c--Users-Ankit-Desktop-gm\3292c0a5-ea57-49c3-8a7d-ea2d8956d92c\scratchpad"
OUT = r"C:\Users\Ankit\Desktop\PowerBI-DataJobs\carousel"
SHOTS = r"C:\Users\Ankit\Desktop\PowerBI-DataJobs\screenshots"
os.makedirs(OUT, exist_ok=True)
BOX = (279, 223, 1582, 955)
W, H = 1600, 900
BG, CARD, BORDER = (11, 18, 32), (19, 28, 49), (30, 42, 68)
TEXT, TEXT2, TEXT3, TEAL, AMBER, VIOLET = (226, 232, 240), (148, 163, 184), (100, 116, 139), (45, 212, 191), (245, 158, 11), (167, 139, 250)
F = lambda size, bold=False: ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf", size)

pages = [
    ("01-overview", "Overview", "The 2023 data job market at a glance",
     "SQL and Python each appear in ~49% of postings. Data Analyst is the #1 title with 196K postings."),
    ("02-roles", "Roles", "Which roles dominate — and how they differ",
     "Only 8.9% of roles are remote and 30.6% never mention a degree. Drill the tree by role, country, schedule."),
    ("03-skills", "Skills", "What employers actually ask for",
     "SQL 49% · Python 48.5% · AWS 18.5%. The heat matrix shows how the skill mix shifts by role."),
    ("04-salaries", "Salaries", "What the market pays",
     "Median disclosed pay is $115K (only 2.8% disclose). Cloud and big-data skills carry a ~17% premium."),
    ("05-geography", "Geography", "Where the jobs are",
     "US 206K postings, India #2 with 51K. LinkedIn alone carries 189K of the volume."),
]
TOTAL = len(pages) + 2

# 1. crop the fresh captures
shots = []
for i, (name, *_ ) in enumerate(pages, 1):
    im = Image.open(os.path.join(SRC, f"y{i}.png")).convert("RGB").crop(BOX)
    im.save(os.path.join(SHOTS, name + ".png"), optimize=True)
    shots.append(im)
print("screenshots", shots[0].size)

def base():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    # subtle grid
    for x in range(0, W, 80): d.line([(x, 0), (x, H)], fill=(14, 22, 38), width=1)
    for y in range(0, H, 80): d.line([(0, y), (W, y)], fill=(14, 22, 38), width=1)
    return im, d

def glow(im, xy, r, color, alpha=90):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse([xy[0]-r, xy[1]-r, xy[0]+r, xy[1]+r], fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.6))
    im.paste(Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB"))

def footer(d, n):
    d.text((60, H - 38), "DATA JOBS MARKET INTELLIGENCE  ·  Power BI", font=F(18), fill=TEXT3)
    s = f"{n:02d} / {TOTAL:02d}"
    d.text((W - 60 - d.textlength(s, font=F(18, True)), H - 38), s, font=F(18, True), fill=TEXT2)

def framed(im, shot, x, y, w):
    h = int(shot.height * w / shot.width)
    sh = shot.resize((w, h), Image.LANCZOS)
    # shadow
    sd = Image.new("RGBA", (w + 60, h + 60), (0, 0, 0, 0))
    ImageDraw.Draw(sd).rounded_rectangle([30, 34, w + 30, h + 34], radius=14, fill=(0, 0, 0, 160))
    sd = sd.filter(ImageFilter.GaussianBlur(16))
    im.paste(Image.alpha_composite(im.convert("RGBA").crop((x-30, y-30, x+w+30, y+h+30)), sd).convert("RGB"), (x-30, y-30))
    # rounded mask
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w-1, h-1], radius=12, fill=255)
    im.paste(sh, (x, y), mask)
    ImageDraw.Draw(im).rounded_rectangle([x-1, y-1, x+w, y+h], radius=13, outline=BORDER, width=2)
    return h

slides = []

# --- cover ---
im, d = base()
glow(im, (1250, 300), 260, TEAL, 60); d = ImageDraw.Draw(im)
d.rectangle([60, 120, 68, 330], fill=TEAL)
d.text((92, 110), "DATA JOBS", font=F(72, True), fill=TEXT)
d.text((92, 190), "MARKET INTELLIGENCE", font=F(72, True), fill=TEAL)
d.text((92, 285), "785,741 real job postings from 2023, turned into a 5-page interactive Power BI dashboard", font=F(26), fill=TEXT2)
stats = [("786K", "job postings", TEAL), ("244", "skills tracked", AMBER), ("161", "countries", VIOLET), ("$115K", "median salary", (56, 189, 248))]
x = 92
for v, l, c in stats:
    d.rounded_rectangle([x, 370, x + 300, 480], radius=14, fill=CARD, outline=BORDER)
    d.rectangle([x, 384, x + 4, 466], fill=c)
    d.text((x + 24, 384), v, font=F(44, True), fill=TEXT)
    d.text((x + 24, 440), l, font=F(18), fill=TEXT2)
    x += 324
VIS = 320
prev = shots[0].resize((1300, int(shots[0].height * 1300 / shots[0].width)), Image.LANCZOS).crop((0, 0, 1300, VIS))
h = framed(im, prev, 92, 520, 1300)
fade = Image.new("RGBA", (1300, 170), (0, 0, 0, 0))
for i in range(170):
    ImageDraw.Draw(fade).line([(0, i), (1300, i)], fill=BG + (int(255 * i / 170),))
im.paste(Image.alpha_composite(im.convert("RGBA").crop((92, 520 + VIS - 170, 1392, 520 + VIS)), fade).convert("RGB"), (92, 520 + VIS - 170))
d = ImageDraw.Draw(im)
d.text((W - 60 - d.textlength("swipe  →", font=F(22, True)), 128), "swipe  →", font=F(22, True), fill=TEAL)
footer(d, 1); slides.append(im)

# --- page slides ---
for i, (name, title, sub, insight) in enumerate(pages, 2):
    im, d = base()
    d.rectangle([60, 48, 66, 118], fill=TEAL)
    d.text((86, 40), f"{title}", font=F(40, True), fill=TEXT)
    d.text((86, 92), sub, font=F(22), fill=TEXT2)
    # insight pill on the right
    pill = insight
    fnt = F(19)
    tw = d.textlength(pill, font=fnt)
    if tw > 760:
        words = pill.split(); lines = []; cur = ""
        for wd in words:
            t = (cur + " " + wd).strip()
            if d.textlength(t, font=fnt) > 740: lines.append(cur); cur = wd
            else: cur = t
        lines.append(cur)
    else: lines = [pill]
    ph = 24 + 26 * len(lines)
    d.rounded_rectangle([W - 60 - 780, 40, W - 60, 40 + ph], radius=12, fill=CARD, outline=BORDER)
    d.text((W - 60 - 780 + 18, 50), "INSIGHT", font=F(13, True), fill=TEAL)
    for k, ln in enumerate(lines):
        d.text((W - 60 - 780 + 90, 48 + 26 * k), ln, font=fnt, fill=TEXT)
    framed(im, shots[i - 2], 165, 132, 1270)
    footer(ImageDraw.Draw(im), i); slides.append(im)

# --- closing ---
im, d = base()
glow(im, (300, 250), 240, VIOLET, 50); d = ImageDraw.Draw(im)
d.rectangle([60, 120, 68, 260], fill=TEAL)
d.text((92, 110), "How it's built", font=F(56, True), fill=TEXT)
d.text((92, 190), "Power BI Desktop · PBIP / TMDL · generated from code", font=F(24), fill=TEXT2)
bullets = [
    "Star schema: Jobs (786K) · JobSkills bridge (3.6M) · DimSkill · DimDate",
    "54 DAX measures — rank-based Top-N that stay live under every slicer",
    "Synced slicers on all pages, page navigator, decomposition tree",
    "Native conditional formatting: heat matrix, salary shading, premium colours",
    "Custom dark theme, colour-blind-checked palette",
]
y = 290
for b in bullets:
    d.ellipse([96, y + 12, 108, y + 24], fill=TEAL)
    d.text((130, y), b, font=F(26), fill=TEXT)
    y += 54
d.rounded_rectangle([92, 600, 1508, 720], radius=14, fill=CARD, outline=BORDER)
d.text((120, 618), "Dataset", font=F(16, True), fill=TEAL)
d.text((120, 646), "Luke Barousse — data_jobs (Hugging Face) · 785,741 job postings scraped from Google Jobs, Jan–Dec 2023", font=F(22), fill=TEXT)
d.text((120, 680), "Only 2.8% of postings disclose pay; salary figures use those 22,003 postings.", font=F(18), fill=TEXT2)
d.text((92, 770), "Ankit  ·  Data Analyst  ·  ankitdataanalyst.me", font=F(26, True), fill=TEXT)
d.text((92, 810), "Want the .pbip or the DAX? Comment “DATA JOBS” and I’ll share it.", font=F(22), fill=TEAL)
footer(ImageDraw.Draw(im), TOTAL); slides.append(im)

for i, s in enumerate(slides, 1):
    s.save(os.path.join(OUT, f"slide-{i:02d}.png"), optimize=True)
slides[0].save(os.path.join(OUT, "DataJobs-LinkedIn-Carousel.pdf"), save_all=True, append_images=slides[1:], resolution=150)

# --- single "all pages" grid image ---
gw, gh = 2 * 1303 + 3 * 40, 3 * 732 + 4 * 40 + 120
grid = Image.new("RGB", (gw, gh), BG)
gd = ImageDraw.Draw(grid)
gd.text((40, 30), "DATA JOBS MARKET INTELLIGENCE", font=F(56, True), fill=TEXT)
gd.text((40 + gd.textlength("DATA JOBS MARKET INTELLIGENCE  ", font=F(56, True)), 44), "5-page Power BI dashboard · 785,741 real postings · 2023", font=F(30), fill=TEXT2)
cells = [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2)]
for shot, (cx, cy) in zip(shots, cells):
    x = 40 + cx * (1303 + 40); y = 120 + 40 + cy * (732 + 40)
    grid.paste(shot, (x, y))
    gd.rectangle([x - 1, y - 1, x + 1303, y + 732], outline=BORDER, width=2)
# last cell: credits card
x = 40 + 1 * (1303 + 40); y = 120 + 40 + 2 * (732 + 40)
gd.rounded_rectangle([x, y, x + 1303, y + 732], radius=20, fill=CARD, outline=BORDER, width=2)
gd.text((x + 60, y + 70), "Built in Power BI", font=F(54, True), fill=TEXT)
for k, b in enumerate(bullets):
    gd.ellipse([x + 62, y + 170 + k * 60 + 14, x + 76, y + 170 + k * 60 + 28], fill=TEAL)
    gd.text((x + 100, y + 170 + k * 60), b, font=F(28), fill=TEXT)
gd.text((x + 60, y + 520), "Dataset: lukebarousse/data_jobs (Hugging Face)", font=F(26), fill=TEXT2)
gd.text((x + 60, y + 600), "Ankit · Data Analyst · ankitdataanalyst.me", font=F(32, True), fill=TEAL)
grid.save(os.path.join(OUT, "all-pages-grid.png"), optimize=True)
print("done", len(slides), "slides;", grid.size)

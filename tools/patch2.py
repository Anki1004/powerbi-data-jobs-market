import re
p = 'tools/build_pbip.mjs'; s = open(p, encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, cnt)

# A. layout
rep("const HDR = { title: { x: 24, y: 12, w: 620, h: 34 }, sub: { x: 24, y: 42, w: 700, h: 22 }, nav: { x: 736, y: 16, w: 520, h: 36 } };",
    "const HDR = { title: { x: 24, y: 8, w: 660, h: 36 }, sub: { x: 24, y: 44, w: 720, h: 22 }, nav: { x: 760, y: 14, w: 496, h: 36 } };")
rep("const SL = { y: 82, h: 46, w: 226, xs: [24, 258, 492, 726] };", "const SL = { y: 76, h: 56, w: 226, xs: [24, 258, 492, 726] };")
rep("const KPI = { y: 140, h: 100, w: 240, xs: [24, 272, 520, 768, 1016] };", "const KPI = { y: 142, h: 96, w: 240, xs: [24, 272, 520, 768, 1016] };")
rep("const R2 = { y: 252, h: 220 };", "const R2 = { y: 248, h: 222 };")
rep("const R3 = { y: 484, h: 220 };", "const R3 = { y: 480, h: 224 };")
rep("{ x: 964, y: SL.y + 4, w: 292, h: SL.h - 8 }", "{ x: 964, y: SL.y + 8, w: 292, h: SL.h - 12 }")
rep("h: R2.h + R3.h + 12 }, 'clusteredBarChart'", "h: R2.h + R3.h + 10 }, 'clusteredBarChart'")
rep("h: R2.h + R3.h + 12 }, 'treemap'", "h: R2.h + R3.h + 10 }, 'treemap'")
# B. slicer padding
rep("padding: [{ properties: { top: num(4), bottom: num(4), left: num(10), right: num(10) } }],\n    },\n    syncGroup",
    "padding: [{ properties: { top: num(2), bottom: num(2), left: num(10), right: num(10) } }],\n    },\n    syncGroup")
# C. kpi rewrite
start = s.index("// --- KPI card (new card visual) ---"); end = s.index("// --- text box ---")
kpi_new = r'''// --- KPI card (new card visual) ---
function kpi(name, pos, main, { ref, label, refLabel, accent = C.accentSoft, colorMeasure, fontSize = 22 } = {}) {
  const FID = 'ref-' + name;
  const mainRef = `${M_TABLE}.${main}`;
  const queryState = { Data: { projections: [meas(main, { displayName: label || main })] } };
  if (ref) queryState.ReferenceLabels = { projections: [meas(ref)] };
  const valueColor = colorMeasure ? { solid: { color: { expr: measField(colorMeasure) } } } : color(C.text);
  const objects = {
    outline: [{ properties: { show: bool(false) }, selector: { id: 'default' } }],
    divider: [{ properties: { show: bool(false) }, selector: { id: 'default' } }],
    fillCustom: [{ properties: { show: bool(false) } }],
    shadowCustom: [{ properties: { show: bool(false) } }],
    label: [{ properties: { show: bool(true), matchValueAlignment: bool(true), color: color(C.text2), fontSize: num(9), fontFamily: str(FONT) }, selector: { id: 'default' } }],
    value: [{ properties: { fontSize: num(fontSize), fontFamily: str(FONT_B), color: valueColor, labelDisplayUnits: num(0) }, selector: { id: 'default' } }],
    calloutValue: [{ properties: { fontSize: num(fontSize), fontFamily: str(FONT_B), color: valueColor } }],
    layout: [{ properties: { paddingUniform: num(6, 'L'), verticalAlignment: str('Top') }, selector: { id: 'default' } }],
    padding: [{ properties: { paddingUniform: num(0, 'L') }, selector: { id: 'default' } }],
    accentBar: [{ properties: { show: bool(true), color: color(accent), width: num(3), position: str('Left') }, selector: { id: 'default' } }],
  };
  if (ref) {
    objects.referenceLabel = [
      { properties: { backgroundShow: bool(false), paddingUniform: num(2, 'L'), paddingIndividual: bool(true), paddingTop: num(4, 'L') }, selector: { id: 'default' } },
      { properties: { value: { expr: measField(ref) } }, selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }], metadata: mainRef, id: FID, order: 0 } },
    ];
    objects.referenceLabelTitle = [{ properties: { show: bool(true), titleContentType: str('custom'), titleText: str(refLabel || ref), titleFontColor: color(C.text2), titleFontSize: num(9), titleFontFamily: str(FONT) }, selector: { metadata: mainRef, id: FID } }];
    objects.referenceLabelValue = [{ properties: { valueFontColor: color(accent), valueFontSize: num(10), valueBold: bool(true), valueFontFamily: str(FONT_B) }, selector: { metadata: mainRef, id: FID } }];
    objects.referenceLabelDetail = [{ properties: { show: bool(false) }, selector: { metadata: mainRef, id: FID } }];
  }
  return container(name, pos, { visualType: 'cardVisual', query: { queryState }, objects, visualContainerObjects: cardChrome(null), drillFilterOtherVisuals: true });
}

'''
s = s[:start] + kpi_new + s[end:]
# D. data label units
rep("labels: [{ properties: { show: bool(o.labels !== false), color: color(C.text), fontSize: num(9), labelDisplayUnits: num(0), ...(o.lab || {}) } }],",
    "labels: [{ properties: { show: bool(o.labels !== false), color: color(C.text), fontSize: num(9), labelDisplayUnits: num(o.units ?? 1000, 'L'), labelPrecision: num(o.units === 0 ? 1 : 0, 'L'), ...(o.lab || {}) } }],")
for name in ["v19BarSkills", "v15BarTitleShare", "v15BarTopSkills"]:
    i = s.index(name); j = s.index("axisObjs({", i)
    s = s[:j] + "axisObjs({ units: 0, " + s[j + len("axisObjs({ "):]
# E. line chart month
rep("{ Category: [col('DimDate', 'Month Year')], Y: [meas('Total Postings')] },", "{ Category: [col('DimDate', 'Month')], Y: [meas('Total Postings')] },")
# F. donut precision
rep("labels: [{ properties: { show: bool(true), labelStyle: str('Percent of total'), color: color(C.text), fontSize: num(9) } }]",
    "labels: [{ properties: { show: bool(true), labelStyle: str('Percent of total'), color: color(C.text), fontSize: num(9), labelPrecision: num(1, 'L') } }]")
# G. skill measures -> COUNTROWS based
rep("M('Postings with Skill', 'DISTINCTCOUNT(JobSkills[Job ID])', '#,0', 'Skills');",
    "M('Postings with Skill', 'DISTINCTCOUNT(JobSkills[Job ID])', '#,0', 'Skills');\nM('Skill Postings', 'COUNTROWS(JobSkills)', '#,0', 'Skills');")
rep("M('Skill Likelihood %', 'DIVIDE([Postings with Skill], [Postings (Skill Base)])'", "M('Skill Likelihood %', 'DIVIDE([Skill Postings], [Postings (Skill Base)])'")
rep("CALCULATE([Postings with Skill], REMOVEFILTERS(Jobs[Job Title]))", "CALCULATE([Skill Postings], REMOVEFILTERS(Jobs[Job Title]))")
rep("M('Skill Likelihood % (Top 15)', 'IF(RANKX(ALLSELECTED(DimSkill[Skill]), [Postings with Skill]) <= 15, [Skill Likelihood %])'", "M('Skill Likelihood % (Top 15)', 'IF(RANKX(ALLSELECTED(DimSkill[Skill]), [Skill Postings]) <= 15, [Skill Likelihood %])'")
rep("M('Postings with Skill (Top 30)', 'IF(RANKX(ALLSELECTED(DimSkill[Skill]), [Postings with Skill]) <= 30, [Postings with Skill])'", "M('Postings with Skill (Top 30)', 'IF(RANKX(ALLSELECTED(DimSkill[Skill]), [Skill Postings]) <= 30, [Skill Postings])'")
rep("M('Median Salary (Top 30 Skills)', 'IF(RANKX(ALLSELECTED(DimSkill[Skill]), [Postings with Skill]) <= 30, [Median Salary])'", "M('Median Salary (Top 30 Skills)', 'IF(RANKX(ALLSELECTED(DimSkill[Skill]), [Skill Postings]) <= 30, [Median Salary])'")
rep("TOPN(1, VALUES(DimSkill[Skill]), [Postings with Skill], DESC)", "TOPN(1, VALUES(DimSkill[Skill]), [Skill Postings], DESC)")
# H. heat colour measures
heat = r'''const HEX = 'VAR hx = "0123456789ABCDEF"\nRETURN "#" & MID(hx, INT(r / 16) + 1, 1) & MID(hx, MOD(r, 16) + 1, 1) & MID(hx, INT(g / 16) + 1, 1) & MID(hx, MOD(g, 16) + 1, 1) & MID(hx, INT(b / 16) + 1, 1) & MID(hx, MOD(b, 16) + 1, 1)';
const blend = (a, b) => `VAR r = ROUND(${a[0]} + (${b[0]} - ${a[0]}) * t, 0)\nVAR g = ROUND(${a[1]} + (${b[1]} - ${a[1]}) * t, 0)\nVAR b = ROUND(${a[2]} + (${b[2]} - ${a[2]}) * t, 0)\n${HEX}`;
M('Heat Skill Color', 'VAR v = [Skill Likelihood % (Top 12 Overall)]\nVAR t = IF(ISBLANK(v), 0, MIN(1, SQRT(v / 0.45)))\n' + blend([19, 28, 49], [13, 148, 136]), '', 'Colors');
M('Heat Pay Color', 'VAR v = [Median Salary (Top 30 Skills)]\nVAR t = IF(ISBLANK(v), 0, MAX(0, MIN(1, (v - 85000) / 60000)))\n' + blend([19, 28, 49], [124, 58, 237]), '', 'Colors');
'''
rep("M('Color Premium', 'IF([Salary Premium %] >= 0, \"#22C55E\", \"#EF4444\")', '', 'Colors');\n",
    "M('Color Premium', 'IF([Salary Premium %] >= 0, \"#22C55E\", \"#EF4444\")', '', 'Colors');\n" + heat)
rep("backColor: gradient(measField('Skill Likelihood % (Top 12 Overall)'), C.card, C.series[0])", "backColor: { solid: { color: { expr: measField('Heat Skill Color') } } }")
rep("backColor: gradient(measField('Median Salary (Top 30 Skills)'), C.card, '#5B21B6')", "backColor: { solid: { color: { expr: measField('Heat Pay Color') } } }")
open(p, 'w', encoding='utf-8').write(s); print("patched")

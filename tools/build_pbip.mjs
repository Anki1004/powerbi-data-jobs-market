// Builds the complete PBIP project (semantic model TMDL + PBIR report) for the
// Data Jobs Market Intelligence dashboard. Run: node tools/build_pbip.mjs
import { writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const ROOT = 'C:\\Users\\Ankit\\Desktop\\PowerBI-DataJobs';
const NAME = 'DataJobsMarket';
const DATA_DIR = join(ROOT, 'data') + '\\';
const REPORT = join(ROOT, `${NAME}.Report`);
const MODEL = join(ROOT, `${NAME}.SemanticModel`);
const uuid = () => randomUUID();

// ---------- design tokens (validated with dataviz validate_palette.js, dark mode) ----------
const C = {
  page: '#0B1220', outspace: '#070C17', card: '#131C31', cardBorder: '#1E2A44', cardAlt: '#182339',
  text: '#E2E8F0', text2: '#94A3B8', text3: '#64748B', grid: '#1E2A44',
  accent: '#14B8A6', accentSoft: '#2DD4BF', good: '#22C55E', bad: '#EF4444', warn: '#F59E0B',
  series: ['#0D9488', '#D97706', '#7C3AED', '#DB2777', '#0284C7', '#EA580C', '#65A30D', '#DC2626'],
};
const FONT = 'Segoe UI';
const FONT_B = 'Segoe UI Semibold';

// ---------- schemas (PBIR) ----------
const S = {
  vc: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.0.0/schema.json',
  page: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json',
  pages: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json',
  report: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/1.3.0/schema.json',
  version: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json',
  platform: 'https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json',
  pbir: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json',
  pbism: 'https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json',
  pbip: 'https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json',
};

// =====================================================================================
//  SEMANTIC MODEL (TMDL)
// =====================================================================================
const M_TABLE = '_Measures';
const tables = {
  Jobs: {
    file: 'Jobs.csv', columns: 17,
    cols: [
      ['Job ID', 'int64', { hidden: true }],
      ['Date', 'date'],
      ['Posted Hour', 'int64'],
      ['Job Title', 'string'], ['Full Title', 'string'], ['Location', 'string'], ['Country', 'string'],
      ['Company', 'string'], ['Platform', 'string'], ['Schedule', 'string'], ['Remote', 'string'],
      ['Degree Mention', 'string'], ['Health Insurance', 'string'],
      ['Annual Salary', 'double', { format: '\\$#,0' }], ['Hourly Salary', 'double', { format: '\\$#,0.00' }],
      ['Salary Band', 'string', { sortBy: 'Salary Band Order' }], ['Salary Band Order', 'double', { hidden: true }],
    ],
  },
  JobSkills: {
    file: 'JobSkills.csv', columns: 2,
    cols: [['Job ID', 'int64', { hidden: true }], ['Skill', 'string', { hidden: true }]],
  },
  DimSkill: {
    file: 'DimSkill.csv', columns: 3,
    cols: [['Skill', 'string'], ['Skill Type', 'string'], ['Skill Rank', 'int64']],
  },
  DimDate: {
    file: 'DimDate.csv', columns: 11, dateTable: true,
    cols: [
      ['Date', 'date', { key: true }], ['Year', 'int64'], ['Quarter', 'string'], ['Month Number', 'int64', { hidden: true }],
      ['Month', 'string', { sortBy: 'Month Number' }], ['Month Year', 'string', { sortBy: 'Year Month' }],
      ['Year Month', 'string', { hidden: true }], ['Week', 'int64'], ['Weekday Number', 'int64', { hidden: true }],
      ['Weekday', 'string', { sortBy: 'Weekday Number' }], ['Day', 'int64'],
    ],
  },
};

const mType = { int64: 'Int64.Type', double: 'type number', string: 'type text', date: 'type date' };
const tmdlType = { int64: 'int64', double: 'double', string: 'string', date: 'dateTime' };

function tableTmdl(name, t) {
  const L = [`table ${name}`, `\tlineageTag: ${uuid()}`];
  if (t.dateTable) L.push('\tdataCategory: Time');
  L.push('');
  for (const [c, ty, o = {}] of t.cols) {
    const q = c.includes(' ') ? `'${c}'` : c;
    L.push(`\tcolumn ${q}`);
    L.push(`\t\tdataType: ${tmdlType[ty]}`);
    if (o.key) L.push('\t\tisKey');
    if (o.hidden) L.push('\t\tisHidden');
    if (ty === 'date') L.push('\t\tformatString: yyyy-MM-dd');
    else if (o.format) L.push(`\t\tformatString: ${o.format}`);
    else if (ty === 'int64') L.push('\t\tformatString: #,0');
    L.push(`\t\tlineageTag: ${uuid()}`);
    L.push(`\t\tsummarizeBy: none`);
    if (o.sortBy) L.push(`\t\tsortByColumn: ${o.sortBy.includes(' ') ? `'${o.sortBy}'` : o.sortBy}`);
    L.push(`\t\tsourceColumn: ${c}`);
    L.push('');
    L.push('\t\tannotation SummarizationSetBy = User');
    if (ty === 'date') L.push('', '\t\tannotation UnderlyingDateTimeDataType = Date');
    L.push('');
  }
  const types = t.cols.map(([c, ty]) => `{"${c}", ${mType[ty]}}`).join(', ');
  L.push(`\tpartition ${name} = m`);
  L.push('\t\tmode: import');
  L.push('\t\tsource =');
  L.push('\t\t\t\tlet');
  L.push(`\t\t\t\t    Source = Csv.Document(File.Contents(DataFolder & "${t.file}"),[Delimiter=",", Columns=${t.columns}, Encoding=65001, QuoteStyle=QuoteStyle.Csv]),`);
  L.push('\t\t\t\t    Headers = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),');
  L.push(`\t\t\t\t    Typed = Table.TransformColumnTypes(Headers,{${types}}, "en-US")`);
  L.push('\t\t\t\tin');
  L.push('\t\t\t\t    Typed');
  L.push('');
  L.push('\tannotation PBI_ResultType = Table');
  L.push('');
  return L.join('\n');
}

// ---------- DAX measures (all live on the Jobs table's hidden _Measures twin) ----------
const measures = [];
const M = (name, dax, format, folder = 'Core') => measures.push({ name, dax, format, folder });
M('Total Postings', 'COUNTROWS(Jobs)', '#,0');
M('Postings (K)', 'DIVIDE([Total Postings], 1000)', '#,0.0"K"');
M('Companies Hiring', 'DISTINCTCOUNT(Jobs[Company])', '#,0');
M('Countries', 'DISTINCTCOUNT(Jobs[Country])', '#,0');
M('Locations', 'DISTINCTCOUNT(Jobs[Location])', '#,0');
M('Job Titles', 'DISTINCTCOUNT(Jobs[Job Title])', '#,0');
M('Avg Postings per Day', 'AVERAGEX(VALUES(DimDate[Date]), [Total Postings])', '#,0');
M('Share of Postings %', 'DIVIDE([Total Postings], CALCULATE([Total Postings], ALLSELECTED(Jobs)))', '0.0%');
M('Remote %', 'DIVIDE(CALCULATE(COUNTROWS(Jobs), Jobs[Remote] = "Remote"), [Total Postings])', '0.0%', 'Flags');
M('No Degree Mentioned %', 'DIVIDE(CALCULATE(COUNTROWS(Jobs), Jobs[Degree Mention] = "No degree mentioned"), [Total Postings])', '0.0%', 'Flags');
M('Health Insurance %', 'DIVIDE(CALCULATE(COUNTROWS(Jobs), Jobs[Health Insurance] = "Offered"), [Total Postings])', '0.0%', 'Flags');
M('Full-time %', 'DIVIDE(CALCULATE(COUNTROWS(Jobs), Jobs[Schedule] = "Full-time"), [Total Postings])', '0.0%', 'Flags');
// salary
M('Median Salary', 'MEDIAN(Jobs[Annual Salary])', '\\$#,0', 'Salary');
M('Average Salary', 'AVERAGE(Jobs[Annual Salary])', '\\$#,0', 'Salary');
M('Max Salary', 'MAX(Jobs[Annual Salary])', '\\$#,0', 'Salary');
M('P25 Salary', 'PERCENTILE.INC(Jobs[Annual Salary], 0.25)', '\\$#,0', 'Salary');
M('P75 Salary', 'PERCENTILE.INC(Jobs[Annual Salary], 0.75)', '\\$#,0', 'Salary');
M('Postings with Salary', 'CALCULATE(COUNTROWS(Jobs), NOT ISBLANK(Jobs[Annual Salary]))', '#,0', 'Salary');
M('Salary Disclosure %', 'DIVIDE([Postings with Salary], [Total Postings])', '0.0%', 'Salary');
M('Overall Median Salary', 'CALCULATE([Median Salary], REMOVEFILTERS(DimSkill), REMOVEFILTERS(JobSkills), REMOVEFILTERS(Jobs[Job Title]), REMOVEFILTERS(Jobs[Country]))', '\\$#,0', 'Salary');
M('Salary Premium %', 'DIVIDE([Median Salary] - [Overall Median Salary], [Overall Median Salary])', '+0.0%;-0.0%;0.0%', 'Salary');
M('Median Salary (Top 10 Titles)', 'IF(RANKX(ALLSELECTED(Jobs[Job Title]), [Postings with Salary]) <= 10, [Median Salary])', '\\$#,0', 'Salary');
M('Median Salary (Top 10 Countries)', 'IF(RANKX(ALLSELECTED(Jobs[Country]), [Postings with Salary]) <= 10, [Median Salary])', '\\$#,0', 'Salary');
// skills
M('Skill Mentions', 'COUNTROWS(JobSkills)', '#,0', 'Skills');
M('Distinct Skills', 'DISTINCTCOUNT(JobSkills[Skill])', '#,0', 'Skills');
M('Postings with Skill', 'DISTINCTCOUNT(JobSkills[Job ID])', '#,0', 'Skills');
M('Skill Postings', 'COUNTROWS(JobSkills)', '#,0', 'Skills');
M('Avg Skills per Posting', 'DIVIDE([Skill Mentions], [Postings with Skill])', '0.0', 'Skills');
M('Postings (Skill Base)', 'CALCULATE([Total Postings], REMOVEFILTERS(DimSkill), REMOVEFILTERS(JobSkills))', '#,0', 'Skills');
M('Skill Likelihood %', 'DIVIDE([Skill Postings], [Postings (Skill Base)])', '0.0%', 'Skills');
M('Skill Rank Overall', 'RANKX(ALLSELECTED(DimSkill[Skill]), CALCULATE([Skill Postings], REMOVEFILTERS(Jobs[Job Title])))', '0', 'Skills');
M('Skill Likelihood % (Top 15)', 'IF(RANKX(ALLSELECTED(DimSkill[Skill]), [Skill Postings]) <= 15, [Skill Likelihood %])', '0.0%', 'Skills');
M('Skill Likelihood % (Top 12 Overall)', 'IF([Skill Rank Overall] <= 12, [Skill Likelihood %])', '0.0%', 'Skills');
M('Postings with Skill (Top 30)', 'IF(RANKX(ALLSELECTED(DimSkill[Skill]), [Skill Postings]) <= 25, [Skill Postings])', '#,0', 'Skills');
M('Median Salary (Top 30 Skills)', 'IF(RANKX(ALLSELECTED(DimSkill[Skill]), [Skill Postings]) <= 25, [Median Salary])', '\\$#,0', 'Skills');
M('Top Skill', 'CALCULATE(SELECTCOLUMNS(TOPN(1, VALUES(DimSkill[Skill]), [Skill Postings], DESC), "s", DimSkill[Skill]))', '', 'Headline');
M('Top Skill Type', 'CALCULATE(SELECTCOLUMNS(TOPN(1, VALUES(DimSkill[Skill Type]), [Skill Mentions], DESC), "s", DimSkill[Skill Type]))', '', 'Headline');
M('Top Job Title', 'CALCULATE(SELECTCOLUMNS(TOPN(1, VALUES(Jobs[Job Title]), [Total Postings], DESC), "s", Jobs[Job Title]))', '', 'Headline');
M('Top Country', 'CALCULATE(SELECTCOLUMNS(TOPN(1, VALUES(Jobs[Country]), [Total Postings], DESC), "s", Jobs[Country]))', '', 'Headline');
M('Top Platform', 'CALCULATE(SELECTCOLUMNS(TOPN(1, VALUES(Jobs[Platform]), [Total Postings], DESC), "s", Jobs[Platform]))', '', 'Headline');
M('Top Company', 'CALCULATE(SELECTCOLUMNS(TOPN(1, VALUES(Jobs[Company]), [Total Postings], DESC), "s", Jobs[Company]))', '', 'Headline');
M('Peak Month', 'CALCULATE(SELECTCOLUMNS(TOPN(1, VALUES(DimDate[Month Year]), [Total Postings], DESC), "s", DimDate[Month Year]))', '', 'Headline');
// ranking helpers (blank outside top N -> hides the category on the axis, keeps slicers live)
M('Postings (Top 10 Countries)', 'IF(RANKX(ALLSELECTED(Jobs[Country]), [Total Postings]) <= 10, [Total Postings])', '#,0', 'Ranking');
M('Postings (Top 10 Companies)', 'IF(RANKX(ALLSELECTED(Jobs[Company]), [Total Postings]) <= 10, [Total Postings])', '#,0', 'Ranking');
M('Postings (Top 8 Platforms)', 'IF(RANKX(ALLSELECTED(Jobs[Platform]), [Total Postings]) <= 8, [Total Postings])', '#,0', 'Ranking');
M('Postings (Top 12 Locations)', 'IF(RANKX(ALLSELECTED(Jobs[Location]), [Total Postings]) <= 12, [Total Postings])', '#,0', 'Ranking');
M('Postings (Top 6 Schedules)', 'IF(RANKX(ALLSELECTED(Jobs[Schedule]), [Total Postings]) <= 6, [Total Postings])', '#,0', 'Ranking');
// time
M('Postings PM', 'CALCULATE([Total Postings], DATEADD(DimDate[Date], -1, MONTH))', '#,0', 'Time');
M('Postings MoM %', 'DIVIDE([Total Postings] - [Postings PM], [Postings PM])', '+0.0%;-0.0%;0.0%', 'Time');
M('Postings 7D Avg', 'AVERAGEX(DATESINPERIOD(DimDate[Date], MAX(DimDate[Date]), -7, DAY), [Total Postings])', '#,0', 'Time');
M('Color MoM', 'IF([Postings MoM %] >= 0, "#22C55E", "#EF4444")', '', 'Colors');
M('Color Premium', 'IF([Salary Premium %] >= 0, "#22C55E", "#EF4444")', '', 'Colors');
const HEX = 'VAR hx = "0123456789ABCDEF"\nRETURN "#" & MID(hx, INT(r / 16) + 1, 1) & MID(hx, MOD(r, 16) + 1, 1) & MID(hx, INT(g / 16) + 1, 1) & MID(hx, MOD(g, 16) + 1, 1) & MID(hx, INT(b / 16) + 1, 1) & MID(hx, MOD(b, 16) + 1, 1)';
const blend = (a, b) => `VAR r = ROUND(${a[0]} + (${b[0]} - ${a[0]}) * t, 0)\nVAR g = ROUND(${a[1]} + (${b[1]} - ${a[1]}) * t, 0)\nVAR b = ROUND(${a[2]} + (${b[2]} - ${a[2]}) * t, 0)\n${HEX}`;
M('Heat Skill Color', 'VAR v = [Skill Likelihood % (Top 12 Overall)]\nVAR t = IF(ISBLANK(v), 0, MIN(1, SQRT(v / 0.45)))\n' + blend([19, 28, 49], [13, 148, 136]), '', 'Colors');
M('Heat Pay Color', 'VAR v = [Median Salary (Top 30 Skills)]\nVAR t = IF(ISBLANK(v), 0, MAX(0, MIN(1, (v - 85000) / 60000)))\n' + blend([19, 28, 49], [124, 58, 237]), '', 'Colors');

function measureTmdl(m) {
  const L = [];
  const q = `'${m.name}'`;
  if (m.dax.includes('\n')) {
    L.push(`\tmeasure ${q} = \`\`\``);
    for (const line of m.dax.split('\n')) L.push(`\t\t\t${line}`);
    L.push('\t\t\t```');
  } else L.push(`\tmeasure ${q} = ${m.dax}`);
  if (m.format) L.push(`\t\tformatString: ${m.format}`);
  L.push(`\t\tdisplayFolder: ${m.folder}`);
  L.push(`\t\tlineageTag: ${uuid()}`);
  return L;
}

function measuresTableTmdl() {
  // Dedicated measure table: one hidden column, empty "enter data" partition.
  const L = [`table ${M_TABLE}`, `\tlineageTag: ${uuid()}`, ''];
  for (const m of measures) L.push(...measureTmdl(m), '');
  L.push('\tcolumn Column1', '\t\tdataType: string', '\t\tisHidden', `\t\tlineageTag: ${uuid()}`, '\t\tsummarizeBy: none', '\t\tsourceColumn: Column1', '', '\t\tannotation SummarizationSetBy = Automatic', '');
  L.push(`\tpartition ${M_TABLE} = m`, '\t\tmode: import', '\t\tsource =', '\t\t\t\tlet',
    '\t\t\t\t    Source = Table.FromRows(Json.Document(Binary.Decompress(Binary.FromText("i44FAA==", BinaryEncoding.Base64), Compression.Deflate)), let _t = ((type nullable text) meta [Serialized.Text = true]) in type table [Column1 = _t])',
    '\t\t\t\tin', '\t\t\t\t    Source', '', '\tannotation PBI_ResultType = Table', '');
  return L.join('\n');
}

function writeModel() {
  rmSync(MODEL, { recursive: true, force: true });
  mkdirSync(join(MODEL, 'definition', 'tables'), { recursive: true });
  mkdirSync(join(MODEL, 'definition', 'cultures'), { recursive: true });
  writeFileSync(join(MODEL, '.platform'), JSON.stringify({ $schema: S.platform, metadata: { type: 'SemanticModel', displayName: NAME }, config: { version: '2.0', logicalId: uuid() } }, null, 2));
  writeFileSync(join(MODEL, 'definition.pbism'), JSON.stringify({ $schema: S.pbism, version: '4.0', settings: {} }, null, 2));
  writeFileSync(join(MODEL, 'definition', 'database.tmdl'), 'database\n\tcompatibilityLevel: 1600\n');
  const order = ['DataFolder', ...Object.keys(tables), M_TABLE];
  writeFileSync(join(MODEL, 'definition', 'model.tmdl'), [
    'model Model', '\tculture: en-US', '\tdefaultPowerBIDataSourceVersion: powerBI_V3', '\tsourceQueryCulture: en-US',
    '\tdataAccessOptions', '\t\tlegacyRedirects', '\t\treturnErrorValuesAsNull', '',
    `annotation PBI_QueryOrder = ${JSON.stringify(order)}`, '', 'annotation __PBI_TimeIntelligenceEnabled = 0', '',
    'annotation PBI_ProTooling = ["DevMode"]', '',
    ...[...Object.keys(tables), M_TABLE].map(t => `ref table ${t}`), '', 'ref cultureInfo en-US', ''].join('\n'));
  writeFileSync(join(MODEL, 'definition', 'expressions.tmdl'), [
    `expression DataFolder = "${DATA_DIR}" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]`,
    `\tlineageTag: ${uuid()}`, '', '\tannotation PBI_ResultType = Text', ''].join('\n'));
  writeFileSync(join(MODEL, 'definition', 'cultures', 'en-US.tmdl'), ['cultureInfo en-US', '', '\tlinguisticMetadata =', '\t\t\t{"Version":"1.0.0","Language":"en-US"}', '\t\tcontentType: json', ''].join('\n'));
  const rel = (from, to, extra = []) => [`relationship ${uuid()}`, ...extra, `\tfromColumn: ${from}`, `\ttoColumn: ${to}`, ''];
  writeFileSync(join(MODEL, 'definition', 'relationships.tmdl'), [
    ...rel('Jobs.Date', 'DimDate.Date', ['\tjoinOnDateBehavior: datePartOnly']),
    ...rel("JobSkills.'Job ID'", "Jobs.'Job ID'", ['\tcrossFilteringBehavior: bothDirections']),
    ...rel('JobSkills.Skill', 'DimSkill.Skill'),
  ].join('\n'));
  for (const [name, t] of Object.entries(tables)) {
    writeFileSync(join(MODEL, 'definition', 'tables', `${name}.tmdl`), tableTmdl(name, t));
  }
  writeFileSync(join(MODEL, 'definition', 'tables', `${M_TABLE}.tmdl`), measuresTableTmdl());
  console.log('model written:', Object.keys(tables).length + 1, 'tables,', measures.length, 'measures');
}

// =====================================================================================
//  REPORT (PBIR)
// =====================================================================================
const lit = v => ({ expr: { Literal: { Value: v } } });
const str = s => lit(`'${String(s).replace(/'/g, "''")}'`);
const num = (n, unit = 'D') => lit(`${n}${unit}`);
const bool = b => lit(b ? 'true' : 'false');
const color = hex => ({ solid: { color: lit(`'${hex}'`) } });
const colField = (entity, prop) => ({ Column: { Expression: { SourceRef: { Entity: entity } }, Property: prop } });
const measField = (prop, entity = M_TABLE) => ({ Measure: { Expression: { SourceRef: { Entity: entity } }, Property: prop } });
const col = (entity, prop, extra = {}) => ({ field: colField(entity, prop), queryRef: `${entity}.${prop}`, nativeQueryRef: prop, ...extra });
const meas = (prop, extra = {}) => ({ field: measField(prop), queryRef: `${M_TABLE}.${prop}`, nativeQueryRef: prop, ...extra });

const gradient = (field, minHex, maxHex) => {
  const fr = { linearGradient2: { min: { color: { Literal: { Value: `'${minHex}'` } } }, max: { color: { Literal: { Value: `'${maxHex}'` } } }, nullColoringStrategy: { strategy: { Literal: { Value: "'asZero'" } } } } };
  return { solid: { color: { expr: { FillRule: { Input: field, FillRule: fr } } } } };
};
let z = 1000;
function container(name, pos, visual, extra = {}) {
  return { $schema: S.vc, name, position: { x: pos.x, y: pos.y, z: z++, width: pos.w, height: pos.h, tabOrder: z }, visual, ...extra };
}
function cardChrome(title, opts = {}) {
  const o = {
    background: [{ properties: { show: bool(true), color: color(opts.bg || C.card), transparency: num(0) } }],
    border: [{ properties: { show: bool(true), color: color(C.cardBorder), radius: num(12), width: num(1) } }],
    dropShadow: [{ properties: { show: bool(false) } }],
    padding: [{ properties: { top: num(10), bottom: num(10), left: num(14), right: num(14) } }],
  };
  o.title = title ? [{ properties: { show: bool(true), text: str(title), fontColor: color(C.text), fontSize: num(11), fontFamily: str(FONT_B), alignment: str('left') } }] : [{ properties: { show: bool(false) } }];
  if (opts.subtitle) o.subTitle = [{ properties: { show: bool(true), text: str(opts.subtitle), fontColor: color(C.text3), fontSize: num(9), fontFamily: str(FONT) } }];
  return o;
}
function chart(name, pos, visualType, roles, { title, subtitle, objects = {}, sort, chrome = {}, extra = {} } = {}) {
  const queryState = {};
  for (const [role, projs] of Object.entries(roles)) queryState[role] = { projections: projs };
  const query = { queryState };
  if (sort) query.sortDefinition = { sort: [{ field: sort.field, direction: sort.dir || 'Descending' }], isDefaultSort: true };
  return container(name, pos, { visualType, query, objects, visualContainerObjects: cardChrome(title, { subtitle, ...chrome }), drillFilterOtherVisuals: true, ...extra });
}
const axisObjs = (o = {}) => ({
  categoryAxis: [{ properties: { show: bool(true), labelColor: color(C.text2), fontSize: num(9), showAxisTitle: bool(false), gridlineShow: bool(false), ...(o.cat || {}) } }],
  valueAxis: [{ properties: { show: bool(o.valueAxis !== false), labelColor: color(C.text2), fontSize: num(9), showAxisTitle: bool(false), gridlineShow: bool(o.grid !== false), gridlineColor: color(C.grid), ...(o.val || {}) } }],
  labels: [{ properties: { show: bool(o.labels !== false), color: color(C.text), fontSize: num(9), labelDisplayUnits: num(o.units ?? 1000, 'L'), labelPrecision: num(o.units === 0 ? 1 : 0, 'L'), ...(o.lab || {}) } }],
  legend: [{ properties: { show: bool(!!o.legend), position: str(o.legendPos || 'Top'), labelColor: color(C.text2), fontSize: num(9), showTitle: bool(false) } }],
  ...(o.fill ? { dataPoint: [{ properties: { fill: color(o.fill) } }] } : {}),
});

// --- KPI card (new card visual) ---
function kpi(name, pos, main, { ref, label, refLabel, accent = C.accentSoft, colorMeasure, fontSize = 20 } = {}) {
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
    label: [{ properties: { show: bool(false) }, selector: { id: 'default' } }],
    value: [{ properties: { fontSize: num(fontSize), fontFamily: str(FONT_B), color: valueColor, fontColor: valueColor, labelDisplayUnits: num(0) }, selector: { id: 'default' } }, ...(colorMeasure ? [{ properties: { color: valueColor, fontColor: valueColor }, selector: { metadata: mainRef, data: [{ dataViewWildcard: { matchingOption: 0 } }] } }] : [])],
    calloutValue: [{ properties: { fontSize: num(fontSize), fontFamily: str(FONT_B), color: valueColor } }],
    layout: [{ properties: { paddingUniform: num(2, 'L'), verticalAlignment: str('Top') }, selector: { id: 'default' } }],
    padding: [{ properties: { paddingUniform: num(0, 'L') }, selector: { id: 'default' } }],
    accentBar: [{ properties: { show: bool(true), color: color(accent), width: num(3), position: str('Left') }, selector: { id: 'default' } }],
  };
  if (ref) {
    objects.referenceLabel = [
      { properties: { backgroundShow: bool(false), paddingUniform: num(0, 'L'), paddingIndividual: bool(true), paddingTop: num(2, 'L') }, selector: { id: 'default' } },
      { properties: { value: { expr: measField(ref) } }, selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }], metadata: mainRef, id: FID, order: 0 } },
    ];
    objects.referenceLabelTitle = [{ properties: { show: bool(true), titleContentType: str('custom'), titleText: str(refLabel || ref), titleFontColor: color(C.text2), titleFontSize: num(8), titleFontFamily: str(FONT) }, selector: { metadata: mainRef, id: FID } }];
    objects.referenceLabelValue = [{ properties: { valueFontColor: color(accent), valueFontSize: num(9), valueBold: bool(true), valueFontFamily: str(FONT_B), valueDisplayUnits: num(1) }, selector: { metadata: mainRef, id: FID } }];
    objects.referenceLabelDetail = [{ properties: { show: bool(false) }, selector: { metadata: mainRef, id: FID } }];
  }
  const chrome = cardChrome(label || main); chrome.title[0].properties.fontSize = num(8); chrome.title[0].properties.fontColor = color(C.text2); chrome.title[0].properties.fontFamily = str(FONT);
  chrome.padding = [{ properties: { top: num(6), bottom: num(6), left: num(12), right: num(10) } }];
  return container(name, pos, { visualType: 'cardVisual', query: { queryState }, objects, visualContainerObjects: chrome, drillFilterOtherVisuals: true });
}

// --- text box ---
function textbox(name, pos, runs, { align = 'left' } = {}) {
  const paragraphs = runs.map(r => ({ horizontalTextAlignment: align, textRuns: (Array.isArray(r) ? r : [r]).map(t => ({ value: t.text, textStyle: { fontFamily: t.font || FONT, fontSize: `${t.size || 10}pt`, color: t.color || C.text, ...(t.bold ? { fontWeight: 'bold' } : {}) } })) }));
  return container(name, pos, {
    visualType: 'textbox', objects: { general: [{ properties: { paragraphs } }] },
    visualContainerObjects: { background: [{ properties: { show: bool(false) } }], border: [{ properties: { show: bool(false) } }], title: [{ properties: { show: bool(false) } }] },
    drillFilterOtherVisuals: true,
  });
}

// --- slicer (dropdown, synced across pages) ---
function slicer(name, pos, entity, column, label, group) {
  return container(name, pos, {
    visualType: 'slicer',
    query: { queryState: { Values: { projections: [col(entity, column)] } } },
    objects: {
      data: [{ properties: { mode: str('Dropdown') } }],
      general: [{ properties: { orientation: num(1) } }],
      header: [{ properties: { show: bool(true), text: str(label), fontColor: color(C.text2), fontSize: num(9), fontFamily: str(FONT), outline: str('None') } }],
      items: [{ properties: { fontColor: color(C.text), background: color(C.cardAlt), fontSize: num(10), fontFamily: str(FONT), outline: str('None') } }],
      selection: [{ properties: { selectAllCheckboxEnabled: bool(true), singleSelect: bool(false) } }],
    },
    visualContainerObjects: {
      background: [{ properties: { show: bool(true), color: color(C.card), transparency: num(0) } }],
      border: [{ properties: { show: bool(true), color: color(C.cardBorder), radius: num(10), width: num(1) } }],
      title: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(2), bottom: num(2), left: num(10), right: num(10) } }],
    },
    syncGroup: { groupName: group, fieldChanges: true, filterChanges: true },
    drillFilterOtherVisuals: true,
  });
}

// --- page navigator ---
function pageNav(name, pos) {
  return container(name, pos, {
    visualType: 'pageNavigator',
    objects: {
      shape: [{ properties: { tileShape: str('rectangleRounded'), rectangleRoundedCurve: num(10, 'L') } }],
      fill: [
        { properties: { show: bool(true), fillColor: color(C.card), transparency: num(0) } },
        { properties: { fillColor: color(C.accent) }, selector: { id: 'selected' } },
        { properties: { fillColor: color(C.cardAlt) }, selector: { id: 'hover' } },
      ],
      text: [
        { properties: { show: bool(true), fontColor: color(C.text2), fontSize: num(10), fontFamily: str(FONT_B) } },
        { properties: { fontColor: color('#FFFFFF') }, selector: { id: 'selected' } },
      ],
      outline: [{ properties: { show: bool(false) } }],
      layout: [{ properties: { orientation: num(2) } }],
      pages: [{ properties: { showHiddenPages: bool(false) } }],
      title: [{ properties: { show: bool(false) } }],
    },
    visualContainerObjects: { background: [{ properties: { show: bool(false) } }], border: [{ properties: { show: bool(false) } }], title: [{ properties: { show: bool(false) } }] },
    drillFilterOtherVisuals: true,
  });
}

// ---------- shared header + slicer row on every page ----------
const HDR = { title: { x: 24, y: 6, w: 720, h: 64 }, nav: { x: 760, y: 14, w: 496, h: 36 } };
const SL = { y: 76, h: 56, w: 226, xs: [24, 258, 492, 726] };
const KPI = { y: 142, h: 104, w: 240, xs: [24, 272, 520, 768, 1016] };
const R2 = { y: 256, h: 218 };
const R3 = { y: 484, h: 220 };

function pageFrame(pageTitle, pageBlurb) {
  const v = [];
  v.push(textbox('v00Title', HDR.title, [
    [{ text: 'DATA JOBS ', size: 17, bold: true, color: C.text, font: FONT_B }, { text: 'MARKET INTELLIGENCE', size: 17, bold: true, color: C.accentSoft, font: FONT_B }, { text: `   ·   ${pageTitle}`, size: 11, color: C.text2 }],
    [{ text: pageBlurb, size: 8, color: C.text3 }],
  ]));
  v.push(pageNav('v00Nav', HDR.nav));
  v.push(slicer('v01SlTitle', { x: SL.xs[0], y: SL.y, w: SL.w, h: SL.h }, 'Jobs', 'Job Title', 'JOB TITLE', 'sgTitle'));
  v.push(slicer('v01SlCountry', { x: SL.xs[1], y: SL.y, w: SL.w, h: SL.h }, 'Jobs', 'Country', 'COUNTRY', 'sgCountry'));
  v.push(slicer('v01SlSchedule', { x: SL.xs[2], y: SL.y, w: SL.w, h: SL.h }, 'Jobs', 'Schedule', 'SCHEDULE', 'sgSchedule'));
  v.push(slicer('v01SlRemote', { x: SL.xs[3], y: SL.y, w: SL.w, h: SL.h }, 'Jobs', 'Remote', 'WORK MODE', 'sgRemote'));
  v.push(textbox('v01Source', { x: 964, y: SL.y + 8, w: 292, h: SL.h - 12 }, [
    [{ text: '785,741 job postings · Jan–Dec 2023', size: 9, bold: true, color: C.text2 }],
    [{ text: 'Source: lukebarousse/data_jobs (Hugging Face)', size: 8, color: C.text3 }],
  ], { align: 'right' }));
  return v;
}
const kpiPos = i => ({ x: KPI.xs[i], y: KPI.y, h: KPI.h, w: KPI.w });

// =====================================================================================
//  PAGES
// =====================================================================================
const pages = [];

// ---- 1. Overview ----
{
  const v = pageFrame('Overview', 'What the 2023 data job market looked like: volume, roles, where the jobs are and what they ask for. Use the filters to slice any view.');
  v.push(kpi('v10KpiPostings', kpiPos(0), 'Total Postings', { ref: 'Avg Postings per Day', label: 'JOB POSTINGS', refLabel: 'per day' }));
  v.push(kpi('v11KpiCompanies', kpiPos(1), 'Companies Hiring', { ref: 'Countries', label: 'COMPANIES HIRING', refLabel: 'countries', accent: C.series[1] }));
  v.push(kpi('v12KpiSalary', kpiPos(2), 'Median Salary', { ref: 'Salary Disclosure %', label: 'MEDIAN SALARY (USD)', refLabel: 'disclose pay', accent: C.series[2] }));
  v.push(kpi('v13KpiRemote', kpiPos(3), 'Remote %', { ref: 'No Degree Mentioned %', label: 'REMOTE ROLES', refLabel: 'no degree req.', accent: C.series[3] }));
  v.push(kpi('v14KpiTopSkill', kpiPos(4), 'Top Skill', { ref: 'Top Job Title', label: 'MOST DEMANDED SKILL', refLabel: 'top role', accent: C.series[4], fontSize: 22 }));
  v.push(chart('v15LineMonthly', { x: 24, y: R2.y, w: 744, h: R2.h }, 'lineChart',
    { Category: [col('DimDate', 'Month')], Y: [meas('Total Postings')] },
    { title: 'Monthly job postings', subtitle: 'Total postings per month, 2023', objects: { ...axisObjs({ labels: false, fill: C.accentSoft }), lineStyles: [{ properties: { strokeWidth: num(3), showMarker: bool(true), markerSize: num(5), lineStyle: str('solid'), smoothLine: bool(true) } }], dataPoint: [{ properties: { fill: color(C.accentSoft) } }] } }));
  v.push(chart('v16DonutSchedule', { x: 784, y: R2.y, w: 472, h: R2.h }, 'donutChart',
    { Category: [col('Jobs', 'Schedule')], Y: [meas('Postings (Top 6 Schedules)')] },
    { title: 'Schedule type', subtitle: 'Share of postings', objects: { legend: [{ properties: { show: bool(true), position: str('Right'), labelColor: color(C.text2), fontSize: num(9), showTitle: bool(false) } }], labels: [{ properties: { show: bool(true), labelStyle: str('Percent of total'), color: color(C.text), fontSize: num(9), labelPrecision: num(1, 'L') } }], slices: [{ properties: { innerRadiusRatio: num(62) } }] }, sort: { field: measField('Postings (Top 6 Schedules)') } }));
  v.push(chart('v17BarTitles', { x: 24, y: R3.y, w: 420, h: R3.h }, 'clusteredBarChart',
    { Category: [col('Jobs', 'Job Title')], Y: [meas('Total Postings')] },
    { title: 'Postings by job title', objects: axisObjs({ fill: C.series[0], valueAxis: false, grid: false }), sort: { field: measField('Total Postings') } }));
  v.push(chart('v18BarCountries', { x: 456, y: R3.y, w: 400, h: R3.h }, 'clusteredBarChart',
    { Category: [col('Jobs', 'Country')], Y: [meas('Postings (Top 10 Countries)')] },
    { title: 'Top 10 countries', objects: axisObjs({ fill: C.series[4], valueAxis: false, grid: false }), sort: { field: measField('Postings (Top 10 Countries)') } }));
  v.push(chart('v19BarSkills', { x: 868, y: R3.y, w: 388, h: R3.h }, 'clusteredBarChart',
    { Category: [col('DimSkill', 'Skill')], Y: [meas('Skill Likelihood % (Top 15)')] },
    { title: 'Top skills requested', subtitle: '% of postings mentioning the skill', objects: axisObjs({ units: 0, fill: C.series[1], valueAxis: false, grid: false }), sort: { field: measField('Skill Likelihood % (Top 15)') } }));
  pages.push({ name: 'pg01Overview', displayName: 'Overview', visuals: v });
}

// ---- 2. Roles ----
{
  z = 1000;
  const v = pageFrame('Roles', 'Which roles dominate the market, how they differ on remote work, degree requirements and benefits — and what drives the volume.');
  v.push(kpi('v10KpiPostings', kpiPos(0), 'Total Postings', { ref: 'Job Titles', label: 'JOB POSTINGS', refLabel: 'distinct roles' }));
  v.push(kpi('v11KpiFT', kpiPos(1), 'Full-time %', { ref: 'Postings with Salary', label: 'FULL-TIME ROLES', refLabel: 'with salary', accent: C.series[1] }));
  v.push(kpi('v12KpiRemote', kpiPos(2), 'Remote %', { ref: 'Top Job Title', label: 'REMOTE ROLES', refLabel: 'top role', accent: C.series[3] }));
  v.push(kpi('v13KpiDegree', kpiPos(3), 'No Degree Mentioned %', { ref: 'Health Insurance %', label: 'NO DEGREE MENTIONED', refLabel: 'offer health cover', accent: C.series[2] }));
  v.push(kpi('v14KpiSalary', kpiPos(4), 'Median Salary', { ref: 'Average Salary', label: 'MEDIAN SALARY (USD)', refLabel: 'average', accent: C.series[4] }));
  v.push(chart('v15BarTitleShare', { x: 24, y: R2.y, w: 500, h: R2.h }, 'clusteredBarChart',
    { Category: [col('Jobs', 'Job Title')], Y: [meas('Share of Postings %')] },
    { title: 'Share of postings by role', objects: axisObjs({ units: 0, fill: C.series[0], valueAxis: false, grid: false }), sort: { field: measField('Share of Postings %') } }));
  v.push(chart('v16StackRemote', { x: 536, y: R2.y, w: 720, h: R2.h }, 'hundredPercentStackedBarChart',
    { Category: [col('Jobs', 'Job Title')], Y: [meas('Total Postings')], Series: [col('Jobs', 'Remote')] },
    { title: 'Remote vs on-site by role', objects: { ...axisObjs({ labels: false, legend: true, valueAxis: false, grid: false }), dataPoint: [{ properties: { fill: color(C.series[0]) }, selector: { data: [{ scopeId: { Comparison: { ComparisonKind: 0, Left: colField('Jobs', 'Remote'), Right: { Literal: { Value: "'On-site'" } } } } }] } }, { properties: { fill: color(C.series[1]) }, selector: { data: [{ scopeId: { Comparison: { ComparisonKind: 0, Left: colField('Jobs', 'Remote'), Right: { Literal: { Value: "'Remote'" } } } } }] } }] }, sort: { field: measField('Total Postings') } }));
  v.push(chart('v17Decomp', { x: 24, y: R3.y, w: 1232, h: R3.h }, 'decompositionTreeVisual',
    { Analyze: [meas('Total Postings')], ExplainBy: [col('Jobs', 'Job Title'), col('Jobs', 'Country'), col('Jobs', 'Schedule'), col('Jobs', 'Remote'), col('Jobs', 'Degree Mention')] },
    { title: 'Decompose the market', subtitle: 'Click a + to expand postings by role, country, schedule, work mode or degree requirement', objects: { tree: [{ properties: { fontColor: color(C.text) } }], nodes: [{ properties: { fontColor: color(C.text), fill: color(C.series[0]) } }], connectors: [{ properties: { color: color(C.cardBorder) } }], categoryLabels: [{ properties: { color: color(C.text2) } }] } }));
  pages.push({ name: 'pg02Roles', displayName: 'Roles', visuals: v });
}

// ---- 3. Skills ----
{
  z = 1000;
  const v = pageFrame('Skills', 'The skills employers actually ask for: how often each one appears, how that changes by role, and which skills come with a pay premium.');
  v.push(kpi('v10KpiMentions', kpiPos(0), 'Skill Mentions', { ref: 'Distinct Skills', label: 'SKILL MENTIONS', refLabel: 'distinct skills' }));
  v.push(kpi('v11KpiPerPost', kpiPos(1), 'Avg Skills per Posting', { ref: 'Postings with Skill', label: 'SKILLS PER POSTING', refLabel: 'postings list skills', accent: C.series[1] }));
  v.push(kpi('v12KpiTop', kpiPos(2), 'Top Skill', { ref: 'Top Skill Type', label: 'MOST DEMANDED SKILL', refLabel: 'top category', accent: C.series[2], fontSize: 22 }));
  v.push(kpi('v13KpiSalary', kpiPos(3), 'Median Salary', { ref: 'Overall Median Salary', label: 'MEDIAN SALARY (USD)', refLabel: 'all postings', accent: C.series[3] }));
  v.push(kpi('v14KpiPremium', kpiPos(4), 'Salary Premium %', { ref: 'Postings with Salary', label: 'PAY PREMIUM VS MARKET', refLabel: 'with salary', accent: C.series[4], colorMeasure: 'Color Premium' }));
  v.push(chart('v15BarTopSkills', { x: 24, y: R2.y, w: 500, h: R2.h + R3.h + 10 }, 'clusteredBarChart',
    { Category: [col('DimSkill', 'Skill')], Y: [meas('Skill Likelihood % (Top 15)')] },
    { title: 'Top 15 skills', subtitle: '% of postings that mention the skill', objects: axisObjs({ units: 0, fill: C.series[0], valueAxis: false, grid: false }), sort: { field: measField('Skill Likelihood % (Top 15)') } }));
  v.push(chart('v16MatrixHeat', { x: 536, y: R2.y, w: 720, h: R2.h }, 'pivotTable',
    { Rows: [col('DimSkill', 'Skill')], Columns: [col('Jobs', 'Job Title')], Values: [meas('Skill Likelihood % (Top 12 Overall)')] },
    { title: 'Skill demand by role', subtitle: 'Heat = % of postings for that role mentioning the skill', objects: {
      values: [{ properties: { fontColor: color(C.text), backColor: gradient(measField('Skill Likelihood % (Top 12 Overall)'), C.card, C.series[0]), fontSize: num(9), fontFamily: str(FONT) }, selector: { metadata: `${M_TABLE}.Skill Likelihood % (Top 12 Overall)`, data: [{ dataViewWildcard: { matchingOption: 0 } }] } }],
      columnHeaders: [{ properties: { fontColor: color(C.text2), backColor: color(C.card), fontSize: num(8), fontFamily: str(FONT_B), wordWrap: bool(true), autoSizeColumnWidth: bool(false) } }],
      rowHeaders: [{ properties: { fontColor: color(C.text), backColor: color(C.card), fontSize: num(9), fontFamily: str(FONT) } }],
      grid: [{ properties: { gridVertical: bool(false), gridHorizontal: bool(false), rowPadding: num(2), outlineColor: color(C.cardBorder) } }],
      subTotals: [{ properties: { rowSubtotals: bool(false), columnSubtotals: bool(false) } }],
      general: [{ properties: { rowSubtotals: bool(false), columnSubtotals: bool(false) } }],
      columnWidth: [{ properties: { value: num(58) }, selector: { metadata: `${M_TABLE}.Skill Likelihood % (Top 12 Overall)` } }, { properties: { value: num(70) }, selector: { metadata: 'DimSkill.Skill' } }],
    }, sort: { field: measField('Skill Likelihood % (Top 12 Overall)') } }));
  v.push(chart('v17ScatterSkills', { x: 536, y: R3.y, w: 720, h: R3.h }, 'scatterChart',
    { Category: [col('DimSkill', 'Skill')], X: [meas('Postings with Skill (Top 30)')], Y: [meas('Median Salary (Top 30 Skills)')], Series: [col('DimSkill', 'Skill Type')] },
    { title: 'Demand vs pay — top 25 skills', subtitle: 'X: postings mentioning the skill · Y: median salary of those postings', objects: { ...axisObjs({ labels: false, legend: true, legendPos: 'Right', val: { showAxisTitle: bool(true), titleColor: color(C.text3), titleText: str('Median salary') }, cat: { showAxisTitle: bool(true), titleColor: color(C.text3), titleText: str('Postings (log scale)'), axisScale: str('log') } }), categoryLabels: [{ properties: { show: bool(true), color: color(C.text2), fontSize: num(8) } }], bubbles: [{ properties: { bubbleSize: num(10) } }] } }));
  pages.push({ name: 'pg03Skills', displayName: 'Skills', visuals: v });
}

// ---- 4. Salaries ----
{
  z = 1000;
  const v = pageFrame('Salaries', 'Pay across roles, countries and skills — from the 22,003 postings that disclose an annual salary. All figures in USD.');
  v.push(kpi('v10KpiMedian', kpiPos(0), 'Median Salary', { ref: 'Postings with Salary', label: 'MEDIAN SALARY', refLabel: 'postings with pay' }));
  v.push(kpi('v11KpiAvg', kpiPos(1), 'Average Salary', { ref: 'Max Salary', label: 'AVERAGE SALARY', refLabel: 'highest', accent: C.series[1] }));
  v.push(kpi('v12KpiP25', kpiPos(2), 'P25 Salary', { ref: 'P75 Salary', label: '25TH PERCENTILE', refLabel: '75th pct', accent: C.series[2] }));
  v.push(kpi('v13KpiDisclosure', kpiPos(3), 'Salary Disclosure %', { ref: 'Total Postings', label: 'POSTINGS DISCLOSING PAY', refLabel: 'all postings', accent: C.series[3] }));
  v.push(kpi('v14KpiPremium', kpiPos(4), 'Salary Premium %', { ref: 'Overall Median Salary', label: 'PREMIUM VS MARKET MEDIAN', refLabel: 'market median', accent: C.series[4], colorMeasure: 'Color Premium' }));
  v.push(chart('v15ColBands', { x: 24, y: R2.y, w: 620, h: R2.h }, 'clusteredColumnChart',
    { Category: [col('Jobs', 'Salary Band')], Y: [meas('Postings with Salary')] },
    { title: 'Salary distribution', subtitle: 'Postings per annual salary band', objects: axisObjs({ fill: C.series[2], valueAxis: false, grid: false }), sort: { field: colField('Jobs', 'Salary Band'), dir: 'Ascending' } }));
  v.push(chart('v16BarTitleSalary', { x: 656, y: R2.y, w: 600, h: R2.h }, 'clusteredBarChart',
    { Category: [col('Jobs', 'Job Title')], Y: [meas('Median Salary (Top 10 Titles)')] },
    { title: 'Median salary by role', objects: axisObjs({ fill: C.series[0], valueAxis: false, grid: false }), sort: { field: measField('Median Salary (Top 10 Titles)') } }));
  v.push(chart('v17BarCountrySalary', { x: 24, y: R3.y, w: 520, h: R3.h }, 'clusteredBarChart',
    { Category: [col('Jobs', 'Country')], Y: [meas('Median Salary (Top 10 Countries)')] },
    { title: 'Median salary — top 10 hiring countries', objects: axisObjs({ fill: C.series[4], valueAxis: false, grid: false }), sort: { field: measField('Median Salary (Top 10 Countries)') } }));
  v.push(chart('v18TableSkillPay', { x: 556, y: R3.y, w: 700, h: R3.h }, 'tableEx',
    { Values: [col('DimSkill', 'Skill'), col('DimSkill', 'Skill Type'), meas('Postings with Skill (Top 30)', { displayName: 'Postings' }), meas('Median Salary (Top 30 Skills)', { displayName: 'Median salary' }), meas('Salary Premium %', { displayName: 'Premium vs market' })] },
    { title: 'What each skill pays', subtitle: 'Top 25 most-requested skills, ranked by median salary', objects: {
      values: [{ properties: { fontColor: color(C.text), backColor: color(C.card), fontSize: num(9), fontFamily: str(FONT) } },
        { properties: { fontColor: { solid: { color: { expr: measField('Color Premium') } } } }, selector: { metadata: `${M_TABLE}.Salary Premium %`, data: [{ dataViewWildcard: { matchingOption: 0 } }] } },
        { properties: { backColor: gradient(measField('Median Salary (Top 30 Skills)'), C.card, '#5B21B6') }, selector: { metadata: `${M_TABLE}.Median Salary (Top 30 Skills)`, data: [{ dataViewWildcard: { matchingOption: 0 } }] } }],
      columnHeaders: [{ properties: { fontColor: color(C.text2), backColor: color(C.card), fontSize: num(9), fontFamily: str(FONT_B) } }],
      grid: [{ properties: { gridVertical: bool(false), gridHorizontal: bool(true), gridHorizontalColor: color(C.cardBorder), rowPadding: num(3) } }],
      total: [{ properties: { totals: bool(false) } }],
      columnWidth: [
        { properties: { value: num(130) }, selector: { metadata: 'DimSkill.Skill' } },
        { properties: { value: num(140) }, selector: { metadata: 'DimSkill.Skill Type' } },
        { properties: { value: num(100) }, selector: { metadata: `${M_TABLE}.Postings with Skill (Top 30)` } },
        { properties: { value: num(130) }, selector: { metadata: `${M_TABLE}.Median Salary (Top 30 Skills)` } },
        { properties: { value: num(150) }, selector: { metadata: `${M_TABLE}.Salary Premium %` } },
      ],
    }, sort: { field: measField('Median Salary (Top 30 Skills)') } }));
  pages.push({ name: 'pg04Salaries', displayName: 'Salaries', visuals: v });
}

// ---- 5. Geography & Companies ----
{
  z = 1000;
  const v = pageFrame('Geography & Companies', 'Where the postings come from, which cities and employers hire the most, and which job boards carry the volume.');
  v.push(kpi('v10KpiCountries', kpiPos(0), 'Countries', { ref: 'Locations', label: 'COUNTRIES', refLabel: 'cities / regions' }));
  v.push(kpi('v11KpiCompanies', kpiPos(1), 'Companies Hiring', { ref: 'Top Company', label: 'COMPANIES HIRING', refLabel: 'top employer', accent: C.series[1] }));
  v.push(kpi('v12KpiTopCountry', kpiPos(2), 'Top Country', { ref: 'Top Platform', label: 'TOP COUNTRY', refLabel: 'top job board', accent: C.series[4], fontSize: 22 }));
  v.push(kpi('v13KpiRemote', kpiPos(3), 'Remote %', { ref: 'Peak Month', label: 'REMOTE ROLES', refLabel: 'peak month', accent: C.series[3] }));
  v.push(kpi('v14KpiSalary', kpiPos(4), 'Median Salary', { ref: 'Salary Disclosure %', label: 'MEDIAN SALARY (USD)', refLabel: 'disclose pay', accent: C.series[2] }));
  v.push(chart('v15Treemap', { x: 24, y: R2.y, w: 744, h: R2.h + R3.h + 10 }, 'treemap',
    { Group: [col('Jobs', 'Country')], Values: [meas('Total Postings')] },
    { title: 'Postings by country', subtitle: 'Tile area = number of postings', objects: { labels: [{ properties: { show: bool(true), color: color('#FFFFFF'), fontSize: num(9) } }], categoryLabels: [{ properties: { show: bool(true), color: color('#FFFFFF'), fontSize: num(10) } }], legend: [{ properties: { show: bool(false) } }] }, sort: { field: measField('Total Postings') } }));
  v.push(chart('v16BarCompanies', { x: 784, y: R2.y, w: 472, h: R2.h }, 'clusteredBarChart',
    { Category: [col('Jobs', 'Company')], Y: [meas('Postings (Top 10 Companies)')] },
    { title: 'Top 10 employers', objects: axisObjs({ fill: C.series[1], valueAxis: false, grid: false }), sort: { field: measField('Postings (Top 10 Companies)') } }));
  v.push(chart('v17BarPlatforms', { x: 784, y: R3.y, w: 472, h: R3.h }, 'clusteredBarChart',
    { Category: [col('Jobs', 'Platform')], Y: [meas('Postings (Top 8 Platforms)')] },
    { title: 'Top job boards', subtitle: 'Where the postings were published', objects: axisObjs({ fill: C.series[5], valueAxis: false, grid: false }), sort: { field: measField('Postings (Top 8 Platforms)') } }));
  pages.push({ name: 'pg05Geography', displayName: 'Geography', visuals: v });
}

// =====================================================================================
//  THEME
// =====================================================================================
const theme = {
  name: 'DataJobsDark',
  dataColors: C.series,
  background: C.page, foreground: C.text, tableAccent: C.accent,
  good: C.good, neutral: C.warn, bad: C.bad, maximum: C.series[0], center: C.series[2], minimum: C.card, null: '#334155',
  textClasses: {
    callout: { fontSize: 24, fontFace: FONT_B, color: C.text },
    title: { fontSize: 11, fontFace: FONT_B, color: C.text },
    header: { fontSize: 11, fontFace: FONT_B, color: C.text },
    label: { fontSize: 9, fontFace: FONT, color: C.text2 },
  },
  visualStyles: {
    '*': { '*': {
      background: [{ show: true, color: { solid: { color: C.card } }, transparency: 0 }],
      border: [{ show: true, color: { solid: { color: C.cardBorder } }, radius: 12 }],
      dropShadow: [{ show: false }],
      title: [{ show: true, fontColor: { solid: { color: C.text } }, fontSize: 11, fontFamily: FONT_B }],
      categoryAxis: [{ labelColor: { solid: { color: C.text2 } }, fontSize: 9, showAxisTitle: false, gridlineShow: false }],
      valueAxis: [{ labelColor: { solid: { color: C.text2 } }, fontSize: 9, showAxisTitle: false, gridlineColor: { solid: { color: C.grid } } }],
      legend: [{ labelColor: { solid: { color: C.text2 } }, fontSize: 9, showTitle: false }],
      labels: [{ color: { solid: { color: C.text } }, fontSize: 9 }],
      categoryLabels: [{ color: { solid: { color: C.text2 } } }],
      dataLabels: [{ color: { solid: { color: C.text } } }],
      visualTooltip: [{ background: { solid: { color: C.cardAlt } }, titleFontColor: { solid: { color: C.text } }, valueFontColor: { solid: { color: C.text } } }],
      header: [{ foreground: { solid: { color: C.text2 } }, background: { solid: { color: C.card } }, border: { solid: { color: C.cardBorder } } }],
    } },
    page: { '*': {
      background: [{ color: { solid: { color: C.page } }, transparency: 0 }],
      outspace: [{ color: { solid: { color: C.outspace } }, transparency: 0 }],
    } },
    textbox: { '*': { background: [{ show: false }], border: [{ show: false }], title: [{ show: false }] } },
    pageNavigator: { '*': { background: [{ show: false }], border: [{ show: false }], title: [{ show: false }] } },
    slicer: { '*': {
      title: [{ show: false }],
      header: [{ fontColor: { solid: { color: C.text2 } }, fontSize: 9, outline: 'None' }],
      items: [{ fontColor: { solid: { color: C.text } }, background: { solid: { color: C.cardAlt } }, outline: 'None' }],
    } },
    cardVisual: { '*': {
      title: [{ show: false }],
      calloutValue: [{ fontSize: 24, fontFamily: FONT_B, color: { solid: { color: C.text } } }],
      label: [{ color: { solid: { color: C.text2 } }, fontSize: 9 }],
    } },
    tableEx: { '*': { values: [{ backColor: { solid: { color: C.card } }, fontColor: { solid: { color: C.text } } }], columnHeaders: [{ backColor: { solid: { color: C.card } }, fontColor: { solid: { color: C.text2 } } }], grid: [{ gridVertical: false, gridHorizontalColor: { solid: { color: C.cardBorder } } }] } },
    pivotTable: { '*': { values: [{ backColor: { solid: { color: C.card } }, fontColor: { solid: { color: C.text } } }], columnHeaders: [{ backColor: { solid: { color: C.card } }, fontColor: { solid: { color: C.text2 } } }], rowHeaders: [{ backColor: { solid: { color: C.card } }, fontColor: { solid: { color: C.text } } }], grid: [{ gridVertical: false, gridHorizontal: false, outlineColor: { solid: { color: C.cardBorder } } }] } },
  },
};

// =====================================================================================
//  WRITE REPORT
// =====================================================================================
function writeReport() {
  rmSync(REPORT, { recursive: true, force: true });
  const def = join(REPORT, 'definition');
  mkdirSync(join(def, 'pages'), { recursive: true });
  mkdirSync(join(REPORT, 'StaticResources', 'RegisteredResources'), { recursive: true });
  writeFileSync(join(REPORT, '.platform'), JSON.stringify({ $schema: S.platform, metadata: { type: 'Report', displayName: NAME }, config: { version: '2.0', logicalId: uuid() } }, null, 2));
  writeFileSync(join(REPORT, 'definition.pbir'), JSON.stringify({ $schema: S.pbir, version: '4.0', datasetReference: { byPath: { path: `../${NAME}.SemanticModel` } } }, null, 2));
  writeFileSync(join(def, 'version.json'), JSON.stringify({ $schema: S.version, version: '2.0.0' }, null, 2));
  writeFileSync(join(REPORT, 'StaticResources', 'RegisteredResources', 'DataJobsDark.json'), JSON.stringify(theme, null, 2));
  writeFileSync(join(def, 'report.json'), JSON.stringify({
    $schema: S.report,
    layoutOptimization: 'None',
    themeCollection: {
      baseTheme: { name: 'CY24SU10', reportVersionAtImport: '5.55', type: 'SharedResources' },
      customTheme: { name: 'DataJobsDark.json', reportVersionAtImport: '5.55', type: 'RegisteredResources' },
    },
    resourcePackages: [{ name: 'RegisteredResources', type: 'RegisteredResources', items: [{ name: 'DataJobsDark.json', path: 'DataJobsDark.json', type: 'CustomTheme' }] }],
    objects: { outspacePane: [{ properties: { visible: bool(false) } }] },
    settings: { useStylableVisualContainerHeader: true, exportDataMode: 'AllowSummarized', defaultDrillFilterOtherVisuals: true, allowChangeFilterTypes: true, useEnhancedTooltips: true, useDefaultAggregateDisplayName: true, isPersistentUserStateDisabled: true, hideVisualContainerHeader: false },
  }, null, 2));
  writeFileSync(join(def, 'pages', 'pages.json'), JSON.stringify({ $schema: S.pages, pageOrder: pages.map(p => p.name), activePageName: pages[0].name }, null, 2));
  let count = 0;
  for (const p of pages) {
    const pd = join(def, 'pages', p.name);
    mkdirSync(join(pd, 'visuals'), { recursive: true });
    writeFileSync(join(pd, 'page.json'), JSON.stringify({
      $schema: S.page, name: p.name, displayName: p.displayName, displayOption: 'FitToPage', width: 1280, height: 720,
      objects: {
        background: [{ properties: { color: color(C.page), transparency: num(0) } }],
        outspace: [{ properties: { color: color(C.outspace), transparency: num(0) } }],
      },
    }, null, 2));
    for (const v of p.visuals) {
      mkdirSync(join(pd, 'visuals', v.name), { recursive: true });
      writeFileSync(join(pd, 'visuals', v.name, 'visual.json'), JSON.stringify(v, null, 2));
      count++;
    }
  }
  writeFileSync(join(ROOT, `${NAME}.pbip`), JSON.stringify({ $schema: S.pbip, version: '1.0', artifacts: [{ report: { path: `${NAME}.Report` } }], settings: { enableAutoRecovery: true } }, null, 2));
  writeFileSync(join(ROOT, '.gitignore'), '**/.pbi/localSettings.json\n**/.pbi/cache.abf\n');
  console.log('report written:', pages.length, 'pages,', count, 'visuals');
}

// validate every JSON we wrote parses
function validate(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) n += validate(p);
    else if (/\.(json|pbir|pbism|pbip|platform)$/.test(e.name) || e.name === '.platform') { JSON.parse(readFileSync(p, 'utf8')); n++; }
  }
  return n;
}

writeModel();
writeReport();
console.log('json files validated:', validate(ROOT));

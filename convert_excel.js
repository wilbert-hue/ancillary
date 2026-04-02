/**
 * Convert "Dataset-U.S. Ancillary Services Adjacent Moving Market.xlsx"
 * to value.json, volume.json, and segmentation_analysis.json for the dashboard.
 *
 * Reads the "Master Sheet" tab which has flat rows:
 *   Col A: Unit (Value / Volume)
 *   Col B: Segment type (By Service Category, By Customer Type, By Region)
 *   Col C: Sub-segment name
 *   Cols D-L: Year data (2025-2033)
 *
 * Usage: node convert_excel.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_FILE = 'Dataset-U.S. Ancillary Services Adjacent Moving Market.xlsx';
const SHEET_NAME = 'Master Sheet';
const HEADER_ROW = 5; // 0-indexed (row 6 in Excel)
const DATA_START_ROW = 6; // 0-indexed (row 7 in Excel)
const GEO = 'U.S.';

function readMasterSheet() {
  const wb = XLSX.readFile(EXCEL_FILE);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) {
    throw new Error(`Sheet "${SHEET_NAME}" not found. Available: ${wb.SheetNames.join(', ')}`);
  }

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Extract years from header row
  const headerRow = data[HEADER_ROW];
  const years = [];
  for (let col = 3; col < headerRow.length; col++) {
    const val = headerRow[col];
    if (val !== null && val !== undefined) {
      years.push(String(Math.floor(Number(val))));
    }
  }
  console.log('Years:', years);

  // Parse data rows
  const records = [];
  for (let i = DATA_START_ROW; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    const unit = String(row[0]).trim();
    const segment = String(row[1] || '').trim();
    const subSegment = String(row[2] || '').trim();

    if (!unit || !segment || !subSegment) continue;

    const yearData = {};
    for (let j = 0; j < years.length; j++) {
      const val = row[3 + j];
      if (val !== null && val !== undefined) {
        yearData[years[j]] = Number(val);
      }
    }

    records.push({ unit, segment, subSegment, yearData });
  }

  console.log(`Parsed ${records.length} total records`);
  return { records, years };
}

function buildJson(records, unitFilter, roundFn) {
  const result = { [GEO]: {} };

  const filtered = records.filter(r => r.unit === unitFilter);
  console.log(`  ${unitFilter} records: ${filtered.length}`);

  for (const rec of filtered) {
    if (!result[GEO][rec.segment]) {
      result[GEO][rec.segment] = {};
    }

    const rounded = {};
    for (const [yr, val] of Object.entries(rec.yearData)) {
      rounded[yr] = roundFn(val);
    }

    result[GEO][rec.segment][rec.subSegment] = rounded;
  }

  return result;
}

function buildSegmentationAnalysis(valueData) {
  const result = {};
  for (const [geo, segTypes] of Object.entries(valueData)) {
    result[geo] = {};
    for (const [segType, subSegs] of Object.entries(segTypes)) {
      result[geo][segType] = {};
      for (const subSeg of Object.keys(subSegs)) {
        result[geo][segType][subSeg] = {};
      }
    }
  }
  return result;
}

function main() {
  console.log('Reading Excel file...');
  const { records, years } = readMasterSheet();

  console.log('\nBuilding value.json...');
  const valueData = buildJson(records, 'Value', v => Math.round(v * 10) / 10);

  console.log('\nBuilding volume.json...');
  const volumeData = buildJson(records, 'Volume', v => Math.round(v));

  console.log('\nBuilding segmentation_analysis.json...');
  const segAnalysis = buildSegmentationAnalysis(valueData);

  // Write files
  const outDir = path.join(__dirname, 'public', 'data');

  fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
  console.log('Written: public/data/value.json');

  fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));
  console.log('Written: public/data/volume.json');

  fs.writeFileSync(path.join(outDir, 'segmentation_analysis.json'), JSON.stringify(segAnalysis, null, 2));
  console.log('Written: public/data/segmentation_analysis.json');

  // Verification
  console.log('\n=== Verification ===');
  for (const segType of Object.keys(valueData[GEO])) {
    const items = Object.keys(valueData[GEO][segType]);
    const firstItem = items[0];
    const firstVal = valueData[GEO][segType][firstItem][years[0]];
    console.log(`  ${segType}: ${items.length} items (first: "${firstItem}" = ${firstVal} in ${years[0]})`);
  }

  console.log(`\nGeographies: ${Object.keys(valueData)}`);
  console.log(`Years: ${years}`);
  console.log('Done!');
}

main();

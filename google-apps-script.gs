// ─── Protocol Tracker — Google Apps Script ───────────────────────────────────
// Paste this code into Google Sheets → Extensions → Apps Script
// Then deploy as a web app (Execute as: Me, Access: Anyone)
// Copy the deployment URL and paste it into the app's Google Sheets settings

const SHEET_NAME_INCIDENTS  = 'Incidents';
const SHEET_NAME_POSITIVE   = 'Good Behaviour';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'positive') {
      writePositive(ss, data);
    } else {
      writeIncident(ss, data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeIncident(ss, data) {
  let sheet = ss.getSheetByName(SHEET_NAME_INCIDENTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_INCIDENTS);
    sheet.appendRow([
      'Timestamp', 'Date', 'Setting', 'Antecedents',
      'Behaviour', 'Logged By', 'Severity', 'Duration',
      'Correction', 'Cause', 'Notes', 'Server Timestamp'
    ]);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date(),
    data.date        || '',
    data.setting     || '',
    data.antecedents || '',
    data.behaviour   || '',
    data.loggedBy    || '',
    data.severity    || '',
    data.duration    || '',
    data.correction  || '',
    data.cause       || '',
    data.notes       || '',
    new Date().toISOString()
  ]);
}

function writePositive(ss, data) {
  let sheet = ss.getSheetByName(SHEET_NAME_POSITIVE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_POSITIVE);
    sheet.appendRow([
      'Timestamp', 'Date', 'Setting',
      'Behaviour', 'Logged By', 'Notes', 'Server Timestamp'
    ]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date(),
    data.date      || '',
    data.setting   || '',
    data.behaviour || '',
    data.loggedBy  || '',
    data.notes     || '',
    new Date().toISOString()
  ]);
}

// ─── Test function (run manually to check the sheet is working) ───────────────
function testWrite() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  writeIncident(ss, {
    date: new Date().toISOString(),
    setting: 'At home',
    antecedents: 'Instruction given',
    behaviour: 'Protocol violation',
    loggedBy: 'Test',
    severity: 'Minor',
    duration: '< 1 hour',
    correction: 'Verbal correction',
    cause: 'Forgetfulness',
    notes: 'This is a test entry — delete me'
  });
}

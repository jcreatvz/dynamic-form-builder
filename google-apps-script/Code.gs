const SHEET_NAME = "Submissions";

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet_(spreadsheet, SHEET_NAME);
    const fields = Array.isArray(payload.fields) ? payload.fields : [];
    const values = payload.values || {};
    const headers = ["Submitted At"].concat(fields.map(function (field) {
      return field.label || field.id;
    }));

    syncHeaders_(sheet, headers);

    const row = [payload.submittedAt || new Date().toISOString()].concat(fields.map(function (field) {
      const value = values[field.id];
      return Array.isArray(value) ? value.join("; ") : value || "";
    }));

    sheet.appendRow(row);

    return json_({
      ok: true,
      sheetName: SHEET_NAME
    });
  } catch (error) {
    return json_({
      ok: false,
      error: error.message
    });
  }
}

function doGet() {
  return json_({
    ok: true,
    message: "Dynamic Form Studio endpoint is ready."
  });
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function syncHeaders_(sheet, headers) {
  if (!headers.length) return;

  const currentColumnCount = Math.max(sheet.getLastColumn(), headers.length);
  const currentHeaders = sheet.getRange(1, 1, 1, currentColumnCount).getValues()[0];
  const changed = headers.some(function (header, index) {
    return currentHeaders[index] !== header;
  });

  if (changed || sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

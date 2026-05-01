const SHEET_NAME = "Submissions";

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet_(spreadsheet, SHEET_NAME);
    const fields = Array.isArray(payload.fields) ? payload.fields : [];
    const values = payload.values || {};
    const headers = ["Submitted At"].concat(uniqueHeaders_(fields.map(function (field) {
      return field.sheetLabel || field.label || field.id;
    })));

    const activeHeaders = syncHeaders_(sheet, headers);
    const row = new Array(activeHeaders.length).fill("");
    row[activeHeaders.indexOf("Submitted At")] = payload.submittedAt || new Date().toISOString();

    fields.forEach(function (field, index) {
      const header = headers[index + 1];
      const columnIndex = activeHeaders.indexOf(header);
      const value = values[field.id];
      row[columnIndex] = Array.isArray(value) ? value.join("; ") : value || "";
    });

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

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return headers;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(String);
  const activeHeaders = currentHeaders.slice();
  headers.forEach(function (header) {
    if (activeHeaders.indexOf(header) === -1) {
      activeHeaders.push(header);
    }
  });

  if (activeHeaders.length !== currentHeaders.length) {
    sheet.getRange(1, 1, 1, activeHeaders.length).setValues([activeHeaders]);
    sheet.setFrozenRows(1);
  }

  return activeHeaders;
}

function uniqueHeaders_(headers) {
  const seen = {};
  return headers.map(function (header) {
    const base = String(header || "Untitled Field").trim() || "Untitled Field";
    seen[base] = (seen[base] || 0) + 1;
    return seen[base] === 1 ? base : base + " " + seen[base];
  });
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

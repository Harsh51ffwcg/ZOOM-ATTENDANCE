import { google } from "googleapis";

const privateKey = process.env.GOOGLE_PRIVATE_KEY
  ?.replace(/\\n/g, "\n")
  .replace(/^["']|["']$/g, "")
  .trim();

const auth = new google.auth.GoogleAuth({
  credentials: {
    project_id: process.env.GOOGLE_PROJECT_ID,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey,
  },
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
const offlineSpreadsheetId =
  process.env.GOOGLE_OFFLINE_SHEET_ID!;

// --------------------------------------------------
// GOOGLE SHEETS CLIENT
// --------------------------------------------------

async function getSheets() {
  const client = await auth.getClient();

  return google.sheets({
    version: "v4",
    auth: client as any,
  });
}

// --------------------------------------------------
// GET BATCH SHEET NAME
// --------------------------------------------------

function getBatchSheetName(batch: string) {
  const normalized = batch.toLowerCase();

  const allowedBatches = [
    "batch1",
    "batch2",
    "batch3",
    "batch4",
  ];

  if (!allowedBatches.includes(normalized)) {
    throw new Error(`Invalid batch: ${batch}`);
  }

  return (
    normalized.charAt(0).toUpperCase() +
    normalized.slice(1)
  );
}

// --------------------------------------------------
// FINAL ATTENDANCE
// Main spreadsheet → Batch1/2/3/4
// --------------------------------------------------

export async function appendAttendance(
  rows: (string | number)[][],
  batch: string
) {
  const sheets = await getSheets();

  const sheetName = getBatchSheetName(batch);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:K`,
    valueInputOption: "RAW",
    requestBody: {
      values: rows,
    },
  });
}

// --------------------------------------------------
// TEMPORARY OFFLINE ATTENDANCE
// Separate Offline spreadsheet
// --------------------------------------------------

export async function hasOfflineAttendance(
  date: string,
  batch: string,
  studentId: string
) {
  const sheets = await getSheets();

  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId: offlineSpreadsheetId,
      range: "Offline!A:G",
    });

  const rows = response.data.values || [];

  return rows.some(
    (row) =>
      String(row[0] || "") === date &&
      String(row[1] || "").toLowerCase() ===
        batch.toLowerCase() &&
      String(row[2] || "") === String(studentId)
  );
}

export async function appendOfflineAttendance(
  row: (string | number)[]
) {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: offlineSpreadsheetId,
    range: "Offline!A:G",
    valueInputOption: "RAW",
    requestBody: {
      values: [row],
    },
  });
}

// --------------------------------------------------
// READ TEMPORARY OFFLINE ATTENDANCE
// --------------------------------------------------

export async function getOfflineAttendance() {
  const sheets = await getSheets();

  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId: offlineSpreadsheetId,
      range: "Offline!A:G",
    });

  const rows = response.data.values || [];

  if (rows.length <= 1) {
    return [];
  }

  return rows.slice(1);
}

// --------------------------------------------------
// WHATSAPP LOG
// DO NOT CHANGE
// --------------------------------------------------

export async function hasWhatsAppBeenSent(
  batch: string,
  date: string
) {
  const sheets = await getSheets();

  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "WhatsAppLog!A:E",
    });

  const rows = response.data.values || [];

  return rows.some(
    (row) =>
      row[0] === date &&
      row[1] === batch &&
      row[4] === "Sent"
  );
}

export async function markWhatsAppSent(
  date: string,
  batch: string,
  totalAbsent: number,
  totalSent: number
) {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "WhatsAppLog!A:E",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          date,
          batch,
          totalAbsent,
          totalSent,
          "Sent",
        ],
      ],
    },
  });
}
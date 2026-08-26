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

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// --------------------------------------------------
// ONLINE + OFFLINE ATTENDANCE
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
// OFFLINE ATTENDANCE
// --------------------------------------------------

export async function appendOfflineAttendance(
  row: (string | number)[],
  batch: string
) {
  const sheets = await getSheets();

  const sheetName = getBatchSheetName(batch);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:K`,
    valueInputOption: "RAW",
    requestBody: {
      values: [row],
    },
  });
}

// --------------------------------------------------
// GET OFFLINE ATTENDANCE
//
// Reads the new Batch1-4 tabs.
// This is used by the attendance API to recognise
// students who checked in offline.
// --------------------------------------------------

export async function getOfflineAttendance() {
  const sheets = await getSheets();

  const batches = [
    "Batch1",
    "Batch2",
    "Batch3",
    "Batch4",
  ];

  const allRows: any[][] = [];

  for (const sheetName of batches) {
    try {
      const response =
        await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:K`,
        });

      const rows = response.data.values || [];

      if (rows.length > 1) {
        allRows.push(...rows.slice(1));
      }
    } catch (error) {
      console.error(
        `Failed to read ${sheetName}:`,
        error
      );
    }
  }

  return allRows;
}

// --------------------------------------------------
// WHATSAPP LOG
//
// DO NOT CHANGE THIS STRUCTURE.
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
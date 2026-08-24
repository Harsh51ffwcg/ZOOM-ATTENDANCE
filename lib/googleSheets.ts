import { google } from "googleapis";

console.log("GOOGLE KEY CHECK:", {
  exists: !!process.env.GOOGLE_PRIVATE_KEY,
  startsCorrectly: process.env.GOOGLE_PRIVATE_KEY?.startsWith(
    "-----BEGIN PRIVATE KEY-----"
  ),
  endsCorrectly: process.env.GOOGLE_PRIVATE_KEY?.includes(
    "-----END PRIVATE KEY-----"
  ),
  hasLiteralSlashN: process.env.GOOGLE_PRIVATE_KEY?.includes("\\n"),
  length: process.env.GOOGLE_PRIVATE_KEY?.length,
});

const privateKey = process.env.GOOGLE_PRIVATE_KEY
  ?.trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\\n/g, "\n");

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

export async function appendAttendance(
  rows: (string | number)[][]
) {
  const client = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: client as any,
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:J",
    valueInputOption: "RAW",
    requestBody: {
      values: rows,
    },
  });
}

export async function appendOfflineAttendance(
  row: (string | number)[]
) {
  const client = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: client as any,
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: offlineSpreadsheetId,
    range: "Offline!A:G",
    valueInputOption: "RAW",
    requestBody: {
      values: [row],
    },
  });
}

export async function getOfflineAttendance() {
  const client = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: client as any,
  });

  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId: offlineSpreadsheetId,
      range: "Offline!A:G",
    });

  return response.data.values || [];
}

export async function hasWhatsAppBeenSent(
  batch: string,
  date: string
) {
  const client = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: client as any,
  });

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
  const client = await auth.getClient();

  const sheets = google.sheets({
    version: "v4",
    auth: client as any,
  });

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
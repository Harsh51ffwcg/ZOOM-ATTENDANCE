import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    project_id: process.env.GOOGLE_PROJECT_ID,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

export async function appendAttendance(rows: (string | number)[][]) {
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
import { google } from "googleapis";
import path from "path";

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(
    process.cwd(),
    "aarogyam-attendance-fa28d2375ed1.json"
  ),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({
  version: "v4",
  auth,
});

const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

export async function appendAttendance(rows: (string | number)[][]) {
  const client = await auth.getClient();

const sheetsApi = google.sheets({
  version: "v4",
  auth: client as any,
});

  await sheetsApi.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:J",
    valueInputOption: "RAW",
    requestBody: {
      values: rows,
    },
  });
}
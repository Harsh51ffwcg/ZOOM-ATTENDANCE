import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { appendOfflineAttendance } from "@/lib/googleSheets";

export async function POST(req: NextRequest) {
  try {
    const { batch, phone } = await req.json();

    if (!batch || !phone) {
      return NextResponse.json({
        success: false,
        message: "Missing batch or phone number",
      });
    }

    // Remove spaces and special characters
    let formattedPhone = String(phone).replace(/\D/g, "");

    // If user entered only 10 digits, add India's country code
    if (formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone;
    }

    const csvPath = path.join(
      process.cwd(),
      "students",
      `${batch}.csv`
    );

    const csvContent = fs.readFileSync(csvPath, "utf8");

    const students: any[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Find student
    const student = students.find(
      (s: any) =>
        String(s.Phone).replace(/\D/g, "") === formattedPhone
    );

    if (!student) {
      return NextResponse.json({
        success: false,
        message: "❌ Phone number not found.",
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const time = new Date().toISOString();

    // Save offline attendance to Google Sheets
    await appendOfflineAttendance([
      today,
      batch,
      student.StudentID,
      student.Name,
      student.Phone,
      time,
      "Offline",
    ]);

    return NextResponse.json({
      success: true,
      message: `✅ Welcome ${student.Name}! Attendance marked successfully.`,
    });
  } catch (error: any) {
    console.error("OFFLINE ATTENDANCE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
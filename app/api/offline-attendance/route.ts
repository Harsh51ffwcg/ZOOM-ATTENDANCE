import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import {
  appendOfflineAttendance,
  hasOfflineAttendance,
} from "@/lib/googleSheets";

export async function POST(req: NextRequest) {
  try {
    const { batch, phone } = await req.json();

    if (!batch || !phone) {
      return NextResponse.json({
        success: false,
        message: "Missing batch or phone number",
      });
    }

    // --------------------------------------------------
    // FORMAT PHONE NUMBER
    // --------------------------------------------------

    let formattedPhone = String(phone).replace(
      /\D/g,
      ""
    );

    if (formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone;
    }

    // --------------------------------------------------
    // READ STUDENT CSV
    // --------------------------------------------------

    const csvPath = path.join(
      process.cwd(),
      "students",
      `${batch}.csv`
    );

    const csvContent = fs.readFileSync(
      csvPath,
      "utf8"
    );

    const students: any[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // --------------------------------------------------
    // FIND STUDENT
    // --------------------------------------------------

    const student = students.find(
      (s: any) =>
        String(s.Phone).replace(/\D/g, "") ===
        formattedPhone
    );

    if (!student) {
      return NextResponse.json({
        success: false,
        message: "❌ Phone number not found.",
      });
    }

    // --------------------------------------------------
    // INDIAN DATE
    // --------------------------------------------------

    const today = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(new Date());

    // --------------------------------------------------
    // CHECK IF ALREADY MARKED TODAY
    // --------------------------------------------------

    const alreadyMarked =
      await hasOfflineAttendance(
        today,
        batch,
        String(student.StudentID)
      );

    if (alreadyMarked) {
      return NextResponse.json({
        success: false,
        alreadyMarked: true,
        message:
          "⚠️ Attendance already marked for today.",
      });
    }

    // --------------------------------------------------
    // SAVE TO TEMPORARY OFFLINE SHEET
    // --------------------------------------------------

    const time = new Date().toISOString();

    await appendOfflineAttendance([
      today,
      batch,
      student.StudentID,
      student.Name,
      student.Phone,
      time,
      "Offline",
    ]);

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      alreadyMarked: false,
      student: {
        StudentID: student.StudentID,
        Name: student.Name,
        Phone: student.Phone,
      },
      message: `✅ Welcome ${student.Name}! Attendance marked successfully.`,
    });
  } catch (error: any) {
    console.error(
      "OFFLINE ATTENDANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
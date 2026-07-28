import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

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

    // Read the correct batch CSV
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

    // Create attendance folder if needed
    const attendanceDir = path.join(
      process.cwd(),
      "attendance"
    );

    if (!fs.existsSync(attendanceDir)) {
      fs.mkdirSync(attendanceDir);
    }

    const attendanceFile = path.join(
      attendanceDir,
      `${batch}-offline.json`
    );

    let attendance: any[] = [];

    if (fs.existsSync(attendanceFile)) {
      attendance = JSON.parse(
        fs.readFileSync(attendanceFile, "utf8")
      );
    }

    // Prevent duplicate check-ins
    const alreadyPresent = attendance.find(
      (s) => s.StudentID === student.StudentID
    );

    if (alreadyPresent) {
      return NextResponse.json({
        success: false,
        message: "⚠️ Attendance already marked.",
      });
    }

    attendance.push({
      StudentID: student.StudentID,
      Name: student.Name,
      Phone: student.Phone,
      Time: new Date().toISOString(),
      Mode: "Offline",
    });

    fs.writeFileSync(
      attendanceFile,
      JSON.stringify(attendance, null, 2)
    );

    return NextResponse.json({
      success: true,
      message: `✅ Welcome ${student.Name}! Attendance marked successfully.`,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "Server Error",
    });
  }
}
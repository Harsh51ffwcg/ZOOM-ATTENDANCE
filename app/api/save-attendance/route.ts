import { NextRequest, NextResponse } from "next/server";
import { appendAttendance } from "@/lib/googleSheets";

export async function GET(request: NextRequest) {
  try {
    const batch =
      request.nextUrl.searchParams.get("batch") || "batch1";

    const baseUrl = request.nextUrl.origin;

    const response = await fetch(
      `${baseUrl}/api/attendance?batch=${batch}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch attendance.");
    }

    const data = await response.json();

    const attendance = data.attendance || [];

    const rows = attendance.map((student: any) => [
      new Date().toLocaleDateString("en-IN"),
      batch,
      student.StudentID,
      student.Name,
      student.Phone,
      student.Email,
      student.Present ? "Present" : "Absent",
      student.JoinTime || "",
      student.LeaveTime || "",
      student.Duration,
    ]);

    await appendAttendance(rows);

    return NextResponse.json({
      success: true,
      saved: rows.length,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Get attendance
    const attendanceResponse = await fetch(
      "http://localhost:3000/api/attendance",
      {
        cache: "no-store",
      }
    );

    const data = await attendanceResponse.json();

    const absentStudents = data.absentStudents;

    let sent = 0;

    for (const student of absentStudents) {
      await fetch("http://localhost:3000/api/send-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: student.Phone,
          name: student.Name,
        }),
      });

      sent++;
    }

    return NextResponse.json({
      success: true,
      sent,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}
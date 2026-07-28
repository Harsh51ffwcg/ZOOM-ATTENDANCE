import { NextRequest, NextResponse } from "next/server";

    export async function GET(req: NextRequest) {
  console.log("✅ GET route reached");

  try {
    const batch = req.nextUrl.searchParams.get("batch");
    const key = req.nextUrl.searchParams.get("key");

    if (key !== process.env.AUTO_SEND_SECRET) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          message: "Batch parameter missing",
        },
        {
          status: 400,
        }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const attendanceResponse = await fetch(
      `${baseUrl}/api/attendance?batch=${batch}`,
      {
        cache: "no-store",
      }
    );

    const attendance = await attendanceResponse.json();

    const absentStudents = attendance.absentStudents || [];

    let sent = 0;

    for (const student of absentStudents) {
      const response = await fetch(`${baseUrl}/api/send-whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: student.Phone,
          name: student.Name,
        }),
      });

      if (response.ok) {
        sent++;
      }
    }

    return NextResponse.json({
      success: true,
      batch,
      totalAbsent: absentStudents.length,
      messagesSent: sent,
      time: new Date().toLocaleString("en-IN"),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Automatic sending failed",
      },
      {
        status: 500,
      }
    );
  }
}
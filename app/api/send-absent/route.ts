import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Security key
    const key = request.nextUrl.searchParams.get("key");

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

    // Selected batch
    const batch =
      request.nextUrl.searchParams.get("batch") || "batch1";

    // Current site URL
    const baseUrl = request.nextUrl.origin;

    // Fetch attendance
    const attendanceResponse = await fetch(
      `${baseUrl}/api/attendance?batch=${batch}`,
      {
        cache: "no-store",
      }
    );

    if (!attendanceResponse.ok) {
      throw new Error("Unable to fetch attendance.");
    }

    const attendanceData = await attendanceResponse.json();
    const absentStudents = attendanceData.absentStudents || [];

    let sent = 0;

    for (const student of absentStudents) {
      const whatsappResponse = await fetch(
        `${baseUrl}/api/send-whatsapp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: student.Phone,
            name: student.Name,
          }),
        }
      );

      if (whatsappResponse.ok) {
        sent++;
      } else {
        console.log(`Failed to send to ${student.Name}`);
      }
    }

    return NextResponse.json({
      success: true,
      batch,
      totalAbsent: absentStudents.length,
      sent,
      message: `${sent} WhatsApp message(s) sent successfully.`,
      time: new Date().toLocaleString("en-IN"),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to send WhatsApp messages.",
      },
      {
        status: 500,
      }
    );
  }
}
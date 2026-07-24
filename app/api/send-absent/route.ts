import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Get selected batch
    const { searchParams } = new URL(request.url);
    const batch = searchParams.get("batch") || "batch1";

    // Automatically detect localhost or Netlify
    const baseUrl = new URL(request.url).origin;

    // Get attendance for selected batch
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
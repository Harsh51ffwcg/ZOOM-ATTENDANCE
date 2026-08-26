import { NextRequest, NextResponse } from "next/server";
import {
  hasWhatsAppBeenSent,
  markWhatsAppSent,
} from "@/lib/googleSheets";
import { claimWhatsAppSend } from "@/lib/whatsappLock";

export async function GET(request: NextRequest) {
  try {
    // Security key
    const key = request.nextUrl.searchParams.get("key");

    if (key !== process.env.ATTENDANCE_KEY) {
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

    // Use Indian date
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    console.log("================================");
    console.log("WhatsApp Attendance Automation");
    console.log("Batch:", batch);
    console.log("Date:", today);
    console.log("================================");

    // --------------------------------------------------
    // FIRST CHECK:
    // Has this batch already completed WhatsApp sending?
    // --------------------------------------------------

    const alreadySent = await hasWhatsAppBeenSent(
      batch,
      today
    );

    if (alreadySent) {
      console.log(
        `⚠️ WhatsApp messages already sent for ${batch} today.`
      );

      return NextResponse.json({
        success: true,
        batch,
        alreadySent: true,
        totalAbsent: 0,
        sent: 0,
        message: `WhatsApp messages for ${batch} have already been sent today.`,
        time: new Date().toLocaleString("en-IN"),
      });
    }

    // --------------------------------------------------
    // ATOMIC LOCK:
    // Only ONE request can claim this batch/day.
    // This prevents duplicate WhatsApp messages when
    // multiple Netlify executions happen simultaneously.
    // --------------------------------------------------

    const claimed = await claimWhatsAppSend(
      batch,
      today
    );

    if (!claimed) {
      console.log(
        `🚫 Another request is already processing ${batch} for ${today}.`
      );

      return NextResponse.json({
        success: true,
        batch,
        alreadySent: true,
        totalAbsent: 0,
        sent: 0,
        message:
          `WhatsApp automation for ${batch} is already running or has already run today.`,
        time: new Date().toLocaleString("en-IN"),
      });
    }

    console.log(
      `🔒 WhatsApp send lock claimed successfully for ${batch} on ${today}.`
    );

    // Current site URL
    const baseUrl = request.nextUrl.origin;

    // --------------------------------------------------
    // FETCH ATTENDANCE
    // --------------------------------------------------

    const attendanceResponse = await fetch(
      `${baseUrl}/api/attendance?batch=${batch}`,
      {
        cache: "no-store",
      }
    );

    if (!attendanceResponse.ok) {
      throw new Error(
        `Unable to fetch attendance. Status: ${attendanceResponse.status}`
      );
    }

    const attendanceData =
      await attendanceResponse.json();

    const absentStudents =
      attendanceData.absentStudents || [];

    // --------------------------------------------------
    // LOG ABSENT STUDENTS
    // --------------------------------------------------

    console.log("================================");
    console.log("WHATSAPP AUTOMATION FILTER");
    console.log("Batch:", batch);
    console.log("Students received as ABSENT:");

    console.log(
      absentStudents.map((student: any) => ({
        name: student.Name,
        phone: student.Phone,
      }))
    );

    console.log("================================");

    console.log(
      `🔴 ${absentStudents.length} absent student(s) found.`
    );

    // --------------------------------------------------
    // SAVE TODAY'S ATTENDANCE TO GOOGLE SHEETS
    // --------------------------------------------------

    const saveResponse = await fetch(
      `${baseUrl}/api/save-attendance?batch=${batch}`,
      {
        cache: "no-store",
      }
    );

    if (!saveResponse.ok) {
      console.error(
        `⚠️ Failed to save attendance to Google Sheets. Status: ${saveResponse.status}`
      );
    }

    // --------------------------------------------------
    // SEND WHATSAPP MESSAGES
    // --------------------------------------------------

    let sent = 0;

    for (const student of absentStudents) {
      try {
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
            cache: "no-store",
          }
        );

        const result =
          await whatsappResponse.json();

        console.log("================================");
        console.log("Student:", student.Name);
        console.log("Phone:", student.Phone);
        console.log(
          "Status:",
          whatsappResponse.status
        );
        console.log(
          JSON.stringify(result, null, 2)
        );
        console.log("================================");

        if (whatsappResponse.ok) {
          sent++;
        }
      } catch (error) {
        console.error(
          `❌ Failed to send message to ${student.Name}:`,
          error
        );
      }
    }

    // --------------------------------------------------
    // RECORD RESULT IN WHATSAPP LOG
    // --------------------------------------------------

    if (sent > 0) {
      await markWhatsAppSent(
        today,
        batch,
        absentStudents.length,
        sent
      );
    }

    // --------------------------------------------------
    // FINAL RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      success:
        sent > 0 || absentStudents.length === 0,
      batch,
      alreadySent: false,
      totalAbsent: absentStudents.length,
      sent,
      message:
        absentStudents.length === 0
          ? "No absent students found."
          : `${sent} WhatsApp message(s) sent successfully.`,
      time: new Date().toLocaleString("en-IN"),
    });
  } catch (error: any) {
    console.error(
      "WhatsApp automation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unknown server error",
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}
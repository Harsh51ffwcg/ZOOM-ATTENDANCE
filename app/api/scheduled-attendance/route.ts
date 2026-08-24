import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");
    const batch = request.nextUrl.searchParams.get("batch");

    // Security check
    if (!key || key !== process.env.AUTO_SEND_SECRET) {
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

    // Validate batch
    const allowedBatches = [
      "batch1",
      "batch2",
      "batch3",
      "batch4",
    ];

    if (!batch || !allowedBatches.includes(batch)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid batch.",
        },
        {
          status: 400,
        }
      );
    }

    const baseUrl = request.nextUrl.origin;

    console.log(
      `⏰ Scheduled attendance triggered for ${batch}`
    );

    // Trigger existing attendance + WhatsApp system
    const response = await fetch(
      `${baseUrl}/api/send-absent?batch=${batch}&key=${encodeURIComponent(
        process.env.AUTO_SEND_SECRET!
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(
      {
        success: response.ok,
        batch,
        result: data,
      },
      {
        status: response.status,
      }
    );
  } catch (error) {
    console.error(
      "Scheduled attendance error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Scheduled attendance failed.",
      },
      {
        status: 500,
      }
    );
  }
}
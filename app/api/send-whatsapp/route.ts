import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, name } = await request.json();

    if (!phone || !name) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number and name are required.",
        },
        {
          status: 400,
        }
      );
    }

    // WhatsApp Baileys service running on the old PC
    const whatsappServiceUrl =
      process.env.WHATSAPP_SERVICE_URL ||
      "http://192.168.1.6:3001";

    const cleanPhone = String(phone).replace(/\D/g, "");

   const message =
  `We missed you in today’s MAHAYOG Class.\n\n` +
  `Consistency is the key to progress in your Sadhana.\n` +
  `Do join us in the next session and keep your practice going. 🙏\n\n` +
  `Regards,\n` +
  `Aarogyam`;

    const response = await fetch(
      `${whatsappServiceUrl}/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: cleanPhone,
          message: message,
        }),
        cache: "no-store",
      }
    );

    const data = await response.json();

    console.log("========== BAILEYS RESPONSE ==========");
    console.log("Student:", name);
    console.log("Phone:", cleanPhone);
    console.log("Baileys URL:", whatsappServiceUrl);
    console.log("Baileys Status:", response.status);
    console.log(
      "Baileys Response:",
      JSON.stringify(data, null, 2)
    );
    console.log("======================================");

    return NextResponse.json(
      {
        success: response.ok,
        status: response.status,
        data,
      },
      {
        status: response.status,
      }
    );
  } catch (error) {
    console.error("WhatsApp sending error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send WhatsApp message.",
      },
      {
        status: 500,
      }
    );
  }
}
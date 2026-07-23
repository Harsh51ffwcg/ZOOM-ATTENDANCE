import { NextResponse } from "next/server";

async function getAccessToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID!;
  const clientId = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenResponse = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

export async function GET() {
  const accessToken = await getAccessToken();

  const response = await fetch(
    "https://api.zoom.us/v2/users/me/meetings?type=scheduled",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();

  return NextResponse.json(data);
}
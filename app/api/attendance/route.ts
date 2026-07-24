import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { batches } from "@/lib/batches";

const MINIMUM_DURATION = 5 * 60; // 5 Minutes
const MEETING_ID = "84458417524";

async function readStudents(batch: string) {
  const students: any[] = [];

  const batchInfo = (batches as any)[batch];

  if (!batchInfo) {
    throw new Error("Invalid batch selected.");
  }

  return new Promise<any[]>((resolve, reject) => {
    fs.createReadStream(
      path.join(process.cwd(), "students", batchInfo.csv)
    )
      .pipe(csv())
      .on("data", (row) => students.push(row))
      .on("end", () => resolve(students))
      .on("error", reject);
  });
}

async function getAccessToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID!;
  const clientId = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;

  const auth = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("Unable to get Zoom access token.");
  }

  return data.access_token;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const batch =
      searchParams.get("batch") || "batch1";

    const batchInfo = (batches as any)[batch];

    if (!batchInfo) {
      return NextResponse.json(
        {
          error: "Invalid batch.",
        },
        {
          status: 400,
        }
      );
    }

    const students = await readStudents(batch);

    const token = await getAccessToken();

    const response = await fetch(
      `https://api.zoom.us/v2/report/meetings/${MEETING_ID}/participants`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const zoomData = await response.json();

    const participants = zoomData.participants || [];

    const attendance = students.map((student: any) => {
      const matches = participants.filter(
        (participant: any) =>
          participant.name
            ?.trim()
            .toLowerCase() ===
          student.Name.trim().toLowerCase()
      );

      if (matches.length === 0) {
        return {
          StudentID: student.StudentID,
          Name: student.Name,
          Phone: student.Phone,
          Email: student.Email,
          Present: false,
          JoinTime: null,
          LeaveTime: null,
          Duration: 0,
        };
      }

      const totalDuration = matches.reduce(
        (sum: number, current: any) =>
          sum + (current.duration || 0),
        0
      );

      const firstJoin = matches.reduce(
        (earliest: any, current: any) =>
          new Date(current.join_time) <
          new Date(earliest.join_time)
            ? current
            : earliest
      );

      const lastLeave = matches.reduce(
        (latest: any, current: any) =>
          new Date(current.leave_time) >
          new Date(latest.leave_time)
            ? current
            : latest
      );

      return {
        StudentID: student.StudentID,
        Name: student.Name,
        Phone: student.Phone,
        Email: student.Email,
        Present:
          totalDuration >= MINIMUM_DURATION,
        JoinTime: firstJoin.join_time,
        LeaveTime: lastLeave.leave_time,
        Duration: totalDuration,
      };
    });

    const presentStudents = attendance.filter(
      (student) => student.Present
    );

    const absentStudents = attendance.filter(
      (student) => !student.Present
    );

    return NextResponse.json({
      batch,

      batchName: batchInfo.name,

      summary: {
        totalStudents: attendance.length,

        present: presentStudents.length,

        absent: absentStudents.length,

        attendancePercentage:
          (
            (presentStudents.length /
              attendance.length) *
            100
          ).toFixed(1) + "%",
      },

      attendance,

      presentStudents,

      absentStudents,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}
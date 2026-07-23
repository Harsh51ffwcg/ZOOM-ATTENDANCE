import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import csv from "csv-parser";

const MINIMUM_DURATION = 5 * 60; // 5 minutes

async function readStudents() {
  const students: any[] = [];

  return new Promise<any[]>((resolve) => {
    fs.createReadStream(path.join(process.cwd(), "students.csv"))
      .pipe(csv())
      .on("data", (row) => students.push(row))
      .on("end", () => resolve(students));
  });
}

async function getAccessToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID!;
  const clientId = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

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
  return data.access_token;
}

export async function GET() {
  const students = await readStudents();

  const token = await getAccessToken();

  // Replace with your Zoom Meeting ID
  const meetingId = "84458417524";

  const response = await fetch(
    `https://api.zoom.us/v2/report/meetings/${meetingId}/participants`,
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
      (p: any) =>
        p.name.trim().toLowerCase() ===
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

    const firstJoin = matches.reduce((earliest: any, current: any) =>
      new Date(current.join_time) < new Date(earliest.join_time)
        ? current
        : earliest
    );

    const lastLeave = matches.reduce((latest: any, current: any) =>
      new Date(current.leave_time) > new Date(latest.leave_time)
        ? current
        : latest
    );

    const totalDuration = matches.reduce(
      (sum: number, current: any) => sum + current.duration,
      0
    );

    return {
      StudentID: student.StudentID,
      Name: student.Name,
      Phone: student.Phone,
      Email: student.Email,
      Present: totalDuration >= MINIMUM_DURATION,
      JoinTime: firstJoin.join_time,
      LeaveTime: lastLeave.leave_time,
      Duration: totalDuration,
    };
  });

  const absentStudents = attendance.filter(
    (student) => !student.Present
  );

  const presentStudents = attendance.filter(
    (student) => student.Present
  );

  return NextResponse.json({
    summary: {
      totalStudents: attendance.length,
      present: presentStudents.length,
      absent: absentStudents.length,
      attendancePercentage:
        (
          (presentStudents.length / attendance.length) *
          100
        ).toFixed(1) + "%",
    },

    attendance,

    absentStudents,

    presentStudents,
  });
}
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { batches } from "@/lib/batches";
import { getOfflineAttendance } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OfflineAttendance = {
  StudentID: string;
  Name: string;
  Phone: string;
  Time: string;
  Mode: "Offline";
};

function getIndianDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function readOfflineAttendance(
  batch: string
): Promise<OfflineAttendance[]> {
  try {
    // Read offline attendance from the
    // Batch1 / Batch2 / Batch3 / Batch4 tabs
    const rows = await getOfflineAttendance();

    if (!rows || rows.length === 0) {
      return [];
    }

    const today = getIndianDate();

    return rows
      .filter((row: any[]) => {
        const date = String(row[0] || "");
        const rowBatch = String(row[1] || "");
        const mode = String(row[10] || "");

        return (
          date === today &&
          rowBatch.toLowerCase() === batch.toLowerCase() &&
          mode === "Offline"
        );
      })
      .map((row: any[]) => ({
        StudentID: String(row[2] || ""),
        Name: String(row[3] || ""),
        Phone: String(row[4] || ""),
        Time: String(row[7] || ""),
        Mode: "Offline" as const,
      }));
  } catch (error) {
    console.error(
      "OFFLINE ATTENDANCE READ ERROR:",
      error
    );

    return [];
  }
}

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
      path.join(
        process.cwd(),
        "students",
        batchInfo.csv
      )
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
  const clientSecret =
    process.env.ZOOM_CLIENT_SECRET!;

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
    throw new Error(
      "Unable to get Zoom access token."
    );
  }

  return data.access_token;
}

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

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

    // --------------------------------------------------
    // READ STUDENTS
    // --------------------------------------------------

    const students = await readStudents(batch);

    // --------------------------------------------------
    // READ TODAY'S OFFLINE ATTENDANCE
    // --------------------------------------------------

    const offlineAttendance =
      await readOfflineAttendance(batch);

    // --------------------------------------------------
    // GET ZOOM ACCESS TOKEN
    // --------------------------------------------------

    const token = await getAccessToken();

    // --------------------------------------------------
    // GET ZOOM PARTICIPANTS
    // --------------------------------------------------

    const response = await fetch(
      `https://api.zoom.us/v2/report/meetings/${MEETING_ID}/participants`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    const zoomData = await response.json();

    const participants =
      zoomData.participants || [];

    // --------------------------------------------------
    // TODAY'S DATE IN INDIA
    // --------------------------------------------------

    const today = getIndianDate();

    const todaysParticipants =
      participants.filter(
        (participant: any) => {
          if (!participant.join_time) {
            return false;
          }

          // Convert Zoom join time to Indian date
          const participantDate =
            new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Kolkata",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(
              new Date(participant.join_time)
            );

          return participantDate === today;
        }
      );

    // --------------------------------------------------
    // BUILD ATTENDANCE
    // --------------------------------------------------

    const attendance = students.map(
      (student: any) => {
        // Find offline attendance by Student ID
        const offlineStudent =
          offlineAttendance.find(
            (offline) =>
              String(offline.StudentID) ===
              String(student.StudentID)
          );

        // Student's first name
        const studentFirstName =
          String(student.Name || "")
            .trim()
            .split(/\s+/)[0]
            .toLowerCase();

        // --------------------------------------------------
        // MATCH ZOOM NAME BY FIRST NAME
        //
        // Examples:
        //
        // Pooja Gupta
        // Pooja
        // Pooja's iPhone
        // Pooja's iPad
        //
        // All match student "Pooja Gupta"
        // --------------------------------------------------

        const matches =
          todaysParticipants.filter(
            (participant: any) => {
              const zoomName = String(
                participant.name || ""
              )
                .trim()
                .toLowerCase();

              const zoomFirstName =
                zoomName
                  .split(/\s+/)[0]
                  .replace(/['’]s$/, "");

              return (
                zoomFirstName ===
                studentFirstName
              );
            }
          );

        // --------------------------------------------------
        // NO ONLINE ATTENDANCE
        // --------------------------------------------------

        if (matches.length === 0) {
          return {
            StudentID: student.StudentID,
            Name: student.Name,
            Phone: student.Phone,
            Email: student.Email || "",

            Present: !!offlineStudent,

            Mode: offlineStudent
              ? "Offline"
              : "Absent",

            JoinTime: offlineStudent
              ? offlineStudent.Time
              : null,

            LeaveTime: null,

            Duration: 0,
          };
        }

        // --------------------------------------------------
        // CALCULATE TOTAL ZOOM DURATION
        // --------------------------------------------------

        const totalDuration =
          matches.reduce(
            (
              sum: number,
              current: any
            ) =>
              sum +
              Number(current.duration || 0),
            0
          );

        // --------------------------------------------------
        // FIRST JOIN
        // --------------------------------------------------

        const firstJoin =
          matches.reduce(
            (
              earliest: any,
              current: any
            ) =>
              new Date(
                current.join_time
              ) <
              new Date(
                earliest.join_time
              )
                ? current
                : earliest
          );

        // --------------------------------------------------
        // LAST LEAVE
        // --------------------------------------------------

        const lastLeave =
          matches.reduce(
            (
              latest: any,
              current: any
            ) =>
              new Date(
                current.leave_time
              ) >
              new Date(
                latest.leave_time
              )
                ? current
                : latest
          );

        // --------------------------------------------------
        // ONLINE ATTENDANCE RESULT
        // --------------------------------------------------

        return {
          StudentID: student.StudentID,
          Name: student.Name,
          Phone: student.Phone,
          Email: student.Email || "",

          Present:
            totalDuration >=
            MINIMUM_DURATION,

          Mode:
            totalDuration >=
            MINIMUM_DURATION
              ? "Online"
              : "Absent",

          JoinTime:
            firstJoin.join_time,

          LeaveTime:
            lastLeave.leave_time,

          Duration:
            totalDuration,
        };
      }
    );

    // --------------------------------------------------
    // PRESENT / ABSENT
    // --------------------------------------------------

    const presentStudents =
      attendance.filter(
        (student) => student.Present
      );

    const absentStudents =
      attendance.filter(
        (student) => !student.Present
      );

    // --------------------------------------------------
    // DEBUG LOGGING
    // --------------------------------------------------

    console.log(
      "========================================"
    );

    console.log(
      "ATTENDANCE CHECK - BATCH:",
      batch
    );

    console.log(
      "TODAY:",
      today
    );

    console.log(
      "ALL STUDENTS:"
    );

    console.log(
      attendance.map((student) => ({
        studentID: student.StudentID,
        name: student.Name,
        phone: student.Phone,
        present: student.Present,
        mode: student.Mode,
        duration: student.Duration,
      }))
    );

    console.log(
      "ABSENT STUDENTS - WILL BE SENT WHATSAPP:"
    );

    console.log(
      absentStudents.map((student) => ({
        name: student.Name,
        phone: student.Phone,
      }))
    );

    console.log(
      "PRESENT STUDENTS - MUST NOT RECEIVE WHATSAPP:"
    );

    console.log(
      presentStudents.map((student) => ({
        name: student.Name,
        phone: student.Phone,
        mode: student.Mode,
      }))
    );

    console.log(
      "========================================"
    );

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      batch,

      batchName: batchInfo.name,

      summary: {
        totalStudents:
          attendance.length,

        present:
          presentStudents.length,

        absent:
          absentStudents.length,

        attendancePercentage:
          attendance.length > 0
            ? (
                (presentStudents.length /
                  attendance.length) *
                100
              ).toFixed(1) + "%"
            : "0.0%",
      },

      attendance,

      presentStudents,

      absentStudents,
    });
  } catch (error: any) {
    console.error(
      "ATTENDANCE ERROR:",
      error
    );

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
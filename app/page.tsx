"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch("/api/attendance")
      .then((res) => res.json())
      .then((data) => {
        setAttendance(data.attendance);
        setSummary(data.summary);
      });
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        📋 Zoom Attendance Dashboard
      </h1>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-600 text-white p-5 rounded-xl">
            <h2>Total Students</h2>
            <p className="text-3xl font-bold">{summary.totalStudents}</p>
          </div>

          <div className="bg-green-600 text-white p-5 rounded-xl">
            <h2>Present</h2>
            <p className="text-3xl font-bold">{summary.present}</p>
          </div>

          <div className="bg-red-600 text-white p-5 rounded-xl">
            <h2>Absent</h2>
            <p className="text-3xl font-bold">{summary.absent}</p>
          </div>

          <div className="bg-purple-600 text-white p-5 rounded-xl">
            <h2>Attendance %</h2>
            <p className="text-3xl font-bold">
              {summary.attendancePercentage}
            </p>
          </div>
        </div>
      )}


<div className="flex justify-end mb-6">
  <button
    onClick={async () => {
      const res = await fetch("/api/send-absent", {
        method: "POST",
      });

      const data = await res.json();

      alert(
        `✅ ${data.sent} WhatsApp message(s) sent successfully.`
      );
    }}
    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
  >
    📤 Send WhatsApp To All Absent Students
  </button>
</div>
      <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
        <table className="w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Name</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Email</th>
              <th className="p-4">Status</th>
              <th className="p-4">Join Time</th>
              <th className="p-4">Leave Time</th>
              <th className="p-4">Duration</th>
            </tr>
          </thead>

          <tbody>
            {attendance.map((student, index) => (
              <tr
                key={index}
                className="border-b hover:bg-gray-50 text-center"
              >
                <td className="p-4">{student.StudentID}</td>
                <td className="p-4">{student.Name}</td>
                <td className="p-4">{student.Phone}</td>
                <td className="p-4">{student.Email}</td>

                <td className="p-4">
                  {student.Present ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      ✅ Present
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">
                      ❌ Absent
                    </span>
                  )}
                </td>

                <td className="p-4">
                  {student.JoinTime
                    ? new Date(student.JoinTime).toLocaleString("en-IN")
                    : "-"}
                </td>

                <td className="p-4">
                  {student.LeaveTime
                    ? new Date(student.LeaveTime).toLocaleString("en-IN")
                    : "-"}
                </td>

                <td className="p-4">
                  {Math.floor(student.Duration / 60)} min
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
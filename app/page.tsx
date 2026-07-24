"use client";

import { useEffect, useState } from "react";

const batchList = [
  {
    id: "batch1",
    name: "🌅 Morning Batch",
    time: "6:30 AM",
  },
  {
    id: "batch2",
    name: "☀️ Morning Batch",
    time: "8:00 AM",
  },
  {
    id: "batch3",
    name: "🌞 Morning Batch",
    time: "10:00 AM",
  },
  {
    id: "batch4",
    name: "🌙 Evening Batch",
    time: "6:00 PM",
  },
];

export default function Home() {
  const [selectedBatch, setSelectedBatch] =
    useState("batch1");

  const [attendance, setAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadAttendance(batch: string) {
    setLoading(true);

    const res = await fetch(
      `/api/attendance?batch=${batch}`
    );

    const data = await res.json();

    setAttendance(data.attendance || []);
    setSummary(data.summary || null);

    setLoading(false);
  }

  useEffect(() => {
    loadAttendance(selectedBatch);
  }, [selectedBatch]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <h1 className="text-4xl font-bold text-center mb-8">
        📋 Aarogyam Attendance Dashboard
      </h1>

      {/* Batch Buttons */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">

        {batchList.map((batch) => (

          <button
            key={batch.id}
            onClick={() =>
              setSelectedBatch(batch.id)
            }
            className={`rounded-xl p-5 shadow-lg transition-all duration-300 border-2 ${
              selectedBatch === batch.id
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white hover:bg-blue-50 border-gray-200"
            }`}
          >
            <h2 className="font-bold text-lg">
              {batch.name}
            </h2>

            <p>{batch.time}</p>
          </button>

        ))}

      </div>

      {/* Summary */}

      {summary && (

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">

          <div className="bg-blue-600 text-white rounded-xl p-5 shadow">

            <p>Total Students</p>

            <h2 className="text-3xl font-bold">
              {summary.totalStudents}
            </h2>

          </div>

          <div className="bg-green-600 text-white rounded-xl p-5 shadow">

            <p>Present</p>

            <h2 className="text-3xl font-bold">
              {summary.present}
            </h2>

          </div>

          <div className="bg-red-600 text-white rounded-xl p-5 shadow">

            <p>Absent</p>

            <h2 className="text-3xl font-bold">
              {summary.absent}
            </h2>

          </div>

          <div className="bg-purple-600 text-white rounded-xl p-5 shadow">

            <p>Attendance</p>

            <h2 className="text-3xl font-bold">
              {summary.attendancePercentage}
            </h2>

          </div>

        </div>

      )}

      {/* WhatsApp */}

      <div className="flex justify-end mb-6">

        <button
          onClick={async () => {
            const res = await fetch(
              `/api/send-absent?batch=${selectedBatch}`,
              {
                method: "POST",
              }
            );

            const data = await res.json();

            alert(
              `✅ ${data.sent} WhatsApp message(s) sent successfully.`
            );
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
        >
          📤 Send WhatsApp To Absent Students
        </button>

      </div>

      {/* Table */}

      <div className="bg-white rounded-xl shadow-lg overflow-auto">

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

            {loading ? (

              <tr>

                <td
                  colSpan={8}
                  className="text-center p-10 text-xl"
                >
                  Loading...
                </td>

              </tr>

            ) : (

              attendance.map((student, index) => (

                <tr
                  key={index}
                  className="border-b hover:bg-gray-50 text-center"
                >

                  <td className="p-4">
                    {student.StudentID}
                  </td>

                  <td className="p-4">
                    {student.Name}
                  </td>

                  <td className="p-4">
                    {student.Phone}
                  </td>

                  <td className="p-4">
                    {student.Email}
                  </td>

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
                      ? new Date(
                          student.JoinTime
                        ).toLocaleString("en-IN")
                      : "-"}

                  </td>

                  <td className="p-4">

                    {student.LeaveTime
                      ? new Date(
                          student.LeaveTime
                        ).toLocaleString("en-IN")
                      : "-"}

                  </td>

                  <td className="p-4">

                    {Math.floor(
                      student.Duration / 60
                    )}{" "}
                    min

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </main>
  );
}
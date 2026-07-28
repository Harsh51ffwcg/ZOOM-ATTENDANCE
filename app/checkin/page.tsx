"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function CheckInPage() {
  const searchParams = useSearchParams();
  const batch = searchParams.get("batch");

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function markAttendance() {
    if (!phone) {
      alert("Enter phone number");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/offline-attendance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        batch,
        phone,
      }),
    });

    const data = await res.json();

    setMessage(data.message);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">

      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">

        <h1 className="text-3xl font-bold text-center mb-2">
          Aarogyam Attendance
        </h1>

        <p className="text-center text-gray-600 mb-6">
          Batch: <b>{batch}</b>
        </p>

        <input
          type="text"
          placeholder="Enter Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border rounded-lg p-3 mb-4"
        />

        <button
          onClick={markAttendance}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg p-3"
        >
          {loading ? "Please Wait..." : "Mark Attendance"}
        </button>

        {message && (
          <div className="mt-6 text-center font-semibold">
            {message}
          </div>
        )}

      </div>

    </main>
  );
}
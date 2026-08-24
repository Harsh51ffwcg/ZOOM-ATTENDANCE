export default async () => {
  const baseUrl = process.env.URL;
  const key = process.env.ATTENDANCE_KEY || "Harsh";

  try {
    const response = await fetch(
      `${baseUrl}/api/send-absent?batch=batch4&key=${encodeURIComponent(key)}`
    );

    const data = await response.json();

    console.log("Batch 4:", data);

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Batch 4 failed:", error);

    return new Response(
      JSON.stringify({ success: false, error: "Batch 4 scheduler failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const config = {
  schedule: "15 13 * * 2-6",
};
const cron = require("node-cron");

const BASE_URL = "http://localhost:3003";
const KEY = process.env.ATTENDANCE_KEY || "Harsh";

async function sendAbsent(batch) {
  try {
    console.log(`\n📤 Sending absent messages for ${batch}...`);

    const response = await fetch(
      `${BASE_URL}/api/send-absent?batch=${batch}&key=${encodeURIComponent(KEY)}`
    );

    const data = await response.json();

    console.log(`📊 ${batch} result:`, data);
  } catch (error) {
    console.error(`❌ Failed to send ${batch}:`, error);
  }
}

// Tuesday–Saturday
// 7:15 AM IST
cron.schedule(
  "15 7 * * 2-6",
  () => sendAbsent("batch1"),
  {
    timezone: "Asia/Kolkata",
  }
);

// 8:45 AM IST
cron.schedule(
  "45 8 * * 2-6",
  () => sendAbsent("batch2"),
  {
    timezone: "Asia/Kolkata",
  }
);

// 10:45 AM IST
cron.schedule(
  "45 10 * * 2-6",
  () => sendAbsent("batch3"),
  {
    timezone: "Asia/Kolkata",
  }
);

// 6:45 PM IST
cron.schedule(
  "45 18 * * 2-6",
  () => sendAbsent("batch4"),
  {
    timezone: "Asia/Kolkata",
  }
);

console.log("======================================");
console.log("   AAROGYAM ATTENDANCE SCHEDULER");
console.log("======================================");
console.log("🟢 Scheduler started");
console.log("📅 Tuesday → Saturday");
console.log("❌ Sunday + Monday OFF");
console.log("");
console.log("07:15 → Batch 1");
console.log("08:45 → Batch 2");
console.log("10:45 → Batch 3");
console.log("18:45 → Batch 4");
console.log("======================================");
const cron = require("node-cron");
const axios = require("axios");
const express = require("express");
const app = express();
const port = process.env.CALLBACK_PORT || 4000;

// Start express server
app.listen(port, () => {
  console.log(`🚀 Example app listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("✅ Payout Pending Service is running.");
});

console.log("🚀 Cron service started...");

// Schedule job to run every 5 minutes
cron.schedule("*/5 * * * *", () => {
  (async () => {
    console.log("⏰ Task triggered at:", new Date().toLocaleString());

    try {
      console.log("➡️ Preparing POST request...");

      const payload = {
        success: true,
        message: "Operation successful",
        data: 0,
        statusCode: 200,
      };

      console.log("📦 Payload:", payload);

      console.log("🌐 Sending POST request to API...");
      const response = await axios.post(
        "https://api.sahulatpay.com/backoffice/upd-disb",
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      console.log("✅ Request successful!");
      console.log("🔙 Response data:", response.data);
    } catch (error) {
      console.error("❌ Error occurred!");
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Response:", error.response.data);
      } else {
        console.error("Message:", error.message);
      }
    }

    console.log("🏁 Task finished at:", new Date().toLocaleString());
    console.log("-------------------------------------------------");
  })();
});

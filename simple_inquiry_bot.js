const axios = require("axios");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv");
const { toZonedTime, format } = require("date-fns-tz");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

app.listen(6001, () => {
  console.log(`Simple Inquiry Bot running on port 6001`);
});

app.get("/", (req, res) => {
  res.status(200).json({ status: "success" });
});

// Bot configuration
const BOT_TOKEN = "8694705721:AAHl71SoKSYp8ib9LQKd4hoCNnYep4VUzf0";
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// API Configuration
const BASE_URL = process.env.BOT_BASE_URL || "https://pc.assanpay.com";
const BOT_INQUIRY_KEY = process.env.BOT_INQUIRY_KEY || "";

// Configure axios instance
const axiosInstance = axios.create({
  timeout: 30000,
  validateStatus: () => true
});

// Function to format timestamp to 12-hour format GMT+5
const formatTimestamp = (timestampStr) => {
  try {
    const date = new Date(timestampStr);
    const timeZone = "Asia/Karachi"; // GMT+5
    const zonedDate = toZonedTime(date, timeZone);
    return format(zonedDate, "hh:mm a dd-MMM-yyyy", { timeZone });
  } catch (error) {
    console.error("Error formatting timestamp:", error.message);
    return timestampStr;
  }
};

// Function to format response message
const formatResponseMessage = (response, type) => {
  try {
    const data = response.data;

    // Check if it's an error response (not found)
    if (data.errorCode === "RESOURCE_NOT_FOUND" || !data.orderId) {
      return `❌ Order ID ${data.orderId || "Unknown"} not found in our backoffice`;
    }

    const orderId = data.orderId;
    const status = data.status;
    let timestamp = "";

    if (status === "FAILED") {
      timestamp = formatTimestamp(data.failedAt || data.occurredAt || "N/A");
      return `❌ Transaction Failed\n\nOrder ID: ${orderId}\nFailed At: ${timestamp}\nStatus: ❌ ${status}`;
    } else if (status === "SUCCESS") {
      timestamp = formatTimestamp(data.successAt || data.occurredAt || "N/A");
      return `✅ Transaction Successful\n\nOrder ID: ${orderId}\nSuccess At: ${timestamp}\nStatus: ✅ ${status}`;
    } else if (status === "PENDING") {
      timestamp = formatTimestamp(data.time || data.occurredAt || "N/A");
      return `⏳ Transaction Pending\n\nOrder ID: ${orderId}\nTime: ${timestamp}\nStatus: ⏳ ${status}`;
    } else {
      return `❓ Unknown Status\n\nOrder ID: ${orderId}\nStatus: ❓ ${status}`;
    }
  } catch (error) {
    console.error("Error formatting response:", error.message);
    return "Error processing response. Please try again.";
  }
};

// Function to perform status inquiry
const performStatusInquiry = async (chatId, orderId, type) => {
  try {
    console.log(`Performing ${type} inquiry for order: ${orderId}`);

    // Validate order ID
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      await bot.sendMessage(chatId, "❌ Invalid order ID provided.");
      return;
    }

    // Determine inquiry type
    const inquiryType = type === "payout" ? "payout" : "payin";

    // Build API URL
    const apiUrl = `${BASE_URL}/api/merchant/payments/bot/status-inquiry?type=${inquiryType}&order_id=${orderId}`;

    console.log(`API URL: ${apiUrl}`);

    // Make API request
    let response;
    try {
      response = await axiosInstance.get(apiUrl, {
        headers: {
          "X-Bot-Inquiry-Key": BOT_INQUIRY_KEY,
          "Content-Type": "application/json"
        }
      });

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error(`Error fetching inquiry for order ${orderId}:`, error.message);
      await bot.sendMessage(chatId, `❌ Error fetching ${type} status for ${orderId}`);
      return;
    }

    // Check for error response
    if (response.data.errorCode === "RESOURCE_NOT_FOUND" || response.status === 404) {
      await bot.sendMessage(
        chatId,
        `❌ Order ID ${orderId} not found in our backoffice`
      );
      return;
    }

    // Format and send response
    const formattedMessage = formatResponseMessage(response, type);
    await bot.sendMessage(chatId, formattedMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error(`Unexpected error during inquiry for ${orderId}:`, error.message);
    await bot.sendMessage(chatId, `❌ Error processing ${type} ${orderId}`);
  }
};

// Handle /apin command for payin transactions
bot.onText(/\/apin\s+(.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const orders = match[1].trim().split(/\s+/);

  if (orders.length === 0) {
    bot.sendMessage(chatId, "❌ Please provide at least one order ID.");
    return;
  }

  console.log(`Received /apin command with orders: ${orders.join(", ")}`);
  orders.forEach(order => performStatusInquiry(chatId, order.trim(), "payin"));
});

// Handle /apout command for payout transactions
bot.onText(/\/apout\s+(.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const orders = match[1].trim().split(/\s+/);

  if (orders.length === 0) {
    bot.sendMessage(chatId, "❌ Please provide at least one order ID.");
    return;
  }

  console.log(`Received /apout command with orders: ${orders.join(", ")}`);
  orders.forEach(order => performStatusInquiry(chatId, order.trim(), "payout"));
});

// Handle image messages with caption
bot.on("photo", (msg) => {
  const chatId = msg.chat.id;

  if (msg.caption) {
    const parts = msg.caption.split(/\s+/);
    const command = parts[0];
    const orders = parts.slice(1);

    if (command === "/apout" || command === "/apin") {
      const type = command === "/apout" ? "payout" : "payin";
      if (orders.length === 0) {
        bot.sendMessage(chatId, "❌ Please provide at least one order ID in the caption.");
        return;
      }
      console.log(`Received ${command} command via image with orders: ${orders.join(", ")}`);
      orders.forEach(order => performStatusInquiry(chatId, order.trim(), type));
    }
  }
});

// Error handling for bot
bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});

// Default message handler
bot.on("message", (msg) => {
  const text = msg.text || "";
  if (!text.startsWith("/")) return;

  const allowed = [/^\/apin\b/i, /^\/apout\b/i];
  if (!allowed.some((re) => re.test(text))) {
    console.log(`Ignoring unsupported command: ${text}`);
  }
});

console.log("Simple Inquiry Bot started successfully");

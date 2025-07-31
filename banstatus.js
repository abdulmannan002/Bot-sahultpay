const axios = require("axios");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();
console.log("Environment variables loaded");

// Initialize Express app
const app = express();
const PORT = 4019;
app.listen(PORT, () => {
  console.log(`Server started and running on port ${PORT}`);
});

app.get("/", (req, res) => {
  console.log("Received GET request on root endpoint");
  res.status(200).json({ status: "success" });
});

// Bot setup
const BOT_TOKEN = "8022347739:AAFog5fGoF8stzKm44VUb3ut_sYb87mLrJY";
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log("Telegram bot initialized with polling");

// API URLs
const API_BASE_URL = 'https://api5.assanpay.com';
const API_BACKOFFICE_URL = 'https://api5.assanpay.com';
const CALLBACK_API_URL = `${API_BASE_URL}/api/backoffice/payin-callback`;
const SETTLE_API_URL = `${API_BASE_URL}/api/backoffice/settle-transactions/tele`;
const PAYOUT_API_URL = `${API_BASE_URL}/api/disbursement/tele`;
const PAYOUT_CALLBACK_API_URL = `${API_BACKOFFICE_URL}/api/backoffice/payout-callback`;
const FAIL_API_URL = `${API_BACKOFFICE_URL}/api/backoffice/fail-transactions/tele`;

// Axios config
const axiosInstance = axios.create({ timeout: 45000 });
try {
  const axiosRetry = require("axios-retry").default;
  axiosRetry(axiosInstance, {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 2000,
    retryCondition: (error) =>
      axios.isCancel(error) ||
      error.code === "ECONNABORTED" ||
      (error.response && error.response.status >= 500),
  });
  console.log("axios-retry configured successfully");
} catch (error) {
  console.error("axios-retry configuration failed:", error.message);
}

// 🔁 Utility to send callback status
const sendStatusCallback = async ({ type, status, chatId, merchantTransactionId, txn_id }) => {
  const callbackUrl = type === "payout" ? PAYOUT_CALLBACK_API_URL : CALLBACK_API_URL;
  const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
  const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);

  try {
    const callbackResponse = await axiosInstance.post(callbackUrl, { transactionIds: [merchantTransactionId] });
    console.log("Callback API Response:", JSON.stringify(callbackResponse.data, null, 2));
    await bot.sendMessage(chatId, `${capitalizedType} ${merchantTransactionId}: ${capitalizedStatus}.\nTxnID: ${txn_id}`);
  } catch (error) {
    console.error(`Callback error for ${type}:`, error.response?.data || error.message);
    await bot.sendMessage(chatId, `${capitalizedType} ${merchantTransactionId} is ${capitalizedStatus}, TxnID: ${txn_id}`);
  }
};

// 🔄 Main handler
const handleTransactionAndPayout = async (chatId, order, type = "transaction") => {
  try {
    if (!order || typeof order !== "string" || order.trim() === "") {
      await bot.sendMessage(chatId, "Invalid order ID provided.");
      return;
    }

    let apiUrl = type === "transaction"
      ? `${API_BASE_URL}/api/transactions/tele?merchantTransactionId=${order}`
      : `${PAYOUT_API_URL}?merchantTransactionId=${order}`;

    let response;
    try {
      response = await axiosInstance.get(apiUrl);
    } catch (error) {
      if (error.response?.status === 500) {
        await bot.sendMessage(chatId, `${type} ${order} failed due to server error.`);
      } else if (error.code === "ECONNABORTED") {
        await bot.sendMessage(chatId, `${type} ${order} timed out. Try again.`);
      } else {
        await bot.sendMessage(chatId, `Error fetching ${type} ${order}`);
      }
      return;
    }

    const transaction = response.data.transactions?.[0];
    if (!transaction) {
      await bot.sendMessage(chatId, `${type} ${order} not found in Back-office.`);
      return;
    }

    const status = transaction.status?.trim().toLowerCase();
    const merchantTransactionId = transaction.merchant_transaction_id || transaction.merchant_custom_order_id;
    const txn_id = transaction.transaction_id;

    if (!merchantTransactionId) {
      await bot.sendMessage(chatId, `Invalid transaction ID for ${type} ${order}.`);
      return;
    }

    // Handle completed/failed
    if (status === "completed" || status === "failed") {
      await sendStatusCallback({ type, status, chatId, merchantTransactionId, txn_id });
      return;
    }

    // Perform status inquiry
    let provid = type === "payout"
      ? transaction.system_order_id || transaction.transaction_id
      : transaction.transaction_id || transaction.system_order_id;

    let inquiryUrl, inquiryResponse;
    const dalalmartuid = "8e81c7b7-b300-4cbe-99a5-3873ac70949b";
    const payinxuid = "8f30b115-39bb-4625-965b-dbde0b461527";

    try {
      if (provid.startsWith("DEV")) {
        inquiryUrl = `${API_BACKOFFICE_URL}/api/status-inquiry/${type}/${dalalmartuid}`;
        inquiryResponse = await axiosInstance.get(inquiryUrl, {
          params: { [type === "payout" ? "payment_id" : "ref"]: merchantTransactionId },
        });
      } else if (provid.startsWith("T")) {
        inquiryUrl = `${API_BASE_URL}/api/status-inquiry/${type}/${payinxuid}`;
        inquiryResponse = await axiosInstance.get(inquiryUrl, {
          params: { [type === "payout" ? "payment_id" : "ref"]: merchantTransactionId },
        });
      } else {
        return;
      }

      const inquiryStatus = inquiryResponse?.data?.data?.transactionStatus?.toLowerCase()
        || inquiryResponse?.data?.data?.data?.status?.toLowerCase()
        || inquiryResponse?.data?.data?.statusCode;

      if (inquiryStatus === "completed" || inquiryStatus === "failed" || inquiryStatus === "pending") {
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: ${inquiryStatus.charAt(0).toUpperCase() + inquiryStatus.slice(1)}.`);
      } else {
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: Unknown status.`);
      }
    } catch (error) {
      console.error(`Inquiry error for ${type} ${merchantTransactionId}:`, error.response?.data || error.message);
      await bot.sendMessage(chatId, `Error checking status for ${type} ${merchantTransactionId}.`);
    }
  } catch (error) {
    console.error(`Handler error:`, error.message);
    await bot.sendMessage(chatId, `Error processing ${type} ${order}`);
  }
};

// 🧠 Utility to handle multiple orders
const processOrders = (chatId, orders, type) => {
  if (!orders || orders.length === 0) {
    bot.sendMessage(chatId, "Please provide at least one order ID.");
    return;
  }
  orders.forEach(order => handleTransactionAndPayout(chatId, order.trim(), type));
};

// Handle /in command
bot.onText(/\/in (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const orders = match[1].trim().split(/\s+/);
  processOrders(chatId, orders, "transaction");
});

// Handle /out command
bot.onText(/\/out (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const orders = match[1].trim().split(/\s+/);
  processOrders(chatId, orders, "payout");
});

// Handle image message with caption
bot.on("photo", (msg) => {
  const chatId = msg.chat.id;
  if (msg.caption) {
    const parts = msg.caption.split(/\s+/);
    const command = parts[0];
    const orders = parts.slice(1);
    const type = command === "/out" ? "payout" : "transaction";
    processOrders(chatId, orders, type);
  }
});

// ✅ Ping check
bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, `✅ Bot is online. Time: ${new Date().toISOString()}`);
});

// Polling error handler
bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});

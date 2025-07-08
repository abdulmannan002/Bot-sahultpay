const axios = require("axios");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();
console.log("Environment variables loaded");

// Initialize Express app
const app = express();
const PORT = process.env.STATUS_PORT || 4015;
console.log(`Port set to ${PORT}`);

app.listen(PORT, () => {
  console.log(`Server started and running on port ${PORT}`);
});

app.get("/", (req, res) => {
  console.log("Received GET request on root endpoint");
  res.status(200).json({ status: "success" });
  console.log("Sent success response for root endpoint");
});

// Bot configuration
const BOT_TOKEN = process.env.BOT_TOKEN || "8022347739:AAFog5fGoF8stzKm44VUb3ut_sYb87mLrJY";
console.log("Bot token retrieved");
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
console.log("API URLs configured");

// Configure axios with timeouts
const axiosInstance = axios.create({
  timeout: 45000, // Increased to 45 seconds
});
console.log("Axios instance created with 45s timeout");

// Configure axios-retry
let axiosRetry;
try {
  axiosRetry = require("axios-retry").default;
  console.log("Attempting to configure axios-retry");
  axiosRetry(axiosInstance, {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 2000, // Increased delay to 2s, 4s, 6s
    retryCondition: (error) => {
      return (
        axios.isCancel(error) ||
        error.code === "ECONNABORTED" ||
        (error.response && error.response.status >= 500)
      );
    },
  });
  console.log("axios-retry configured successfully");
} catch (error) {
  console.error("Failed to configure axios-retry:", error.message);
  console.log("Continuing without retry logic");
}

// Function to handle transactions or payouts
const handleTransactionAndPayout = async (chatId, order, type = "transaction") => {
  try {
    console.log(`Starting ${type} handling for order: ${order}`);

    // Validate order ID
    if (!order || typeof order !== "string" || order.trim() === "") {
      console.log("Invalid order ID provided");
      await bot.sendMessage(chatId, "Invalid order ID provided.");
      console.log(`Sent invalid order ID message to chat ${chatId}`);
      return;
    }
    console.log("Order ID validated");

    // Determine API URL based on type
    let apiUrl;
    if (type === "transaction") {
      apiUrl = `${API_BASE_URL}/api/transactions/tele?merchantTransactionId=${order}`;
      console.log(`Transaction API URL set: ${apiUrl}`);
    } else if (type === "payout") {
      apiUrl = `${PAYOUT_API_URL}?merchantTransactionId=${order}`;
      console.log(`Payout API URL set: ${apiUrl}`);
    } else {
      console.error("Invalid type specified");
      await bot.sendMessage(chatId, "Invalid transaction type.");
      console.log(`Sent invalid transaction type message to chat ${chatId}`);
      return;
    }

    // Make API request
    let response;
    try {
      console.log(`Making API request to ${apiUrl}`);
      response = await axiosInstance.get(apiUrl);
      console.log("API Response received:", JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error(`Error fetching ${type} data for order ${order}:`, error.message);
      if (error.response?.status === 500) {
        console.log("Server error (500) encountered");
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${order} failed due to a server error. Please try again later.`);
        console.log(`Sent server error message for ${type} ${order} to chat ${chatId}`);
      } else if (error.code === "ECONNABORTED") {
        console.log("Request timed out");
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${order} timed out. Please try again.`);
        console.log(`Sent timeout message for ${type} ${order} to chat ${chatId}`);
      } else {
        console.log("Other error occurred during API request");
        await bot.sendMessage(chatId, `Error processing ${type} ${order}`);
        console.log(`Sent general error message for ${type} ${order} to chat ${chatId}`);
      }
      return;
    }

    // Extract transaction data
    const transaction = type === "transaction" ? response.data.transactions?.[0] : response.data?.data?.transactions?.[0];
    if (!transaction) {
      console.log(`No ${type} found for order: ${order}`);
      await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${order} not found in Back-office. Please check the order ID.`);
      console.log(`Sent ${type} not found message for order ${order} to chat ${chatId}`);
      return;
    }
    console.log("Transaction data extracted:", JSON.stringify(transaction, null, 2));

    const status = transaction.status?.trim().toLowerCase();
    const merchantTransactionId = transaction.merchant_transaction_id || transaction.merchant_custom_order_id;
    const txn_id = transaction.transaction_id;
    console.log(`Transaction status: ${status}, merchantTransactionId: ${merchantTransactionId}, txn_id: ${txn_id}`);

    if (!merchantTransactionId) {
      console.error("Error: merchantTransactionId is undefined");
      await bot.sendMessage(chatId, `Error: Invalid transaction ID for ${type} ${order}.`);
      console.log(`Sent invalid transaction ID message for ${type} ${order} to chat ${chatId}`);
      return;
    }

    // Handle completed transactions or payouts
    if (status === "completed") {
      console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId} is already completed. TxnID: ${txn_id}`);
      const callbackUrl = type === "payout" ? PAYOUT_CALLBACK_API_URL : CALLBACK_API_URL;
      console.log(`Callback URL set: ${callbackUrl}`);

      try {
        console.log(`Calling callback API for ${type} ${merchantTransactionId}`);
        const callbackResponse = await axiosInstance.post(callbackUrl, { transactionIds: [merchantTransactionId] });
        console.log("Callback API Response:", JSON.stringify(callbackResponse.data, null, 2));
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: Completed.\nTxnID: ${txn_id}`);
        console.log(`Sent completed message for ${type} ${merchantTransactionId} to chat ${chatId}`);
      } catch (error) {
        console.error(`Error calling callback API for ${type}:`, error.response?.data || error.message);
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId} is completed, TxnID: ${txn_id}`);
        console.log(`Sent fallback completed message for ${type} ${merchantTransactionId} to chat ${chatId}`);
      }
      return;
    }

    // Perform status inquiry for both transactions and payouts
    const providerName = transaction.providerDetails?.name?.toLowerCase();
    console.log(`Provider name: ${providerName}`);
    let inquiryUrl, inquiryResponse;
    let uid = transaction.merchant?.uid || transaction.merchant?.groups?.[0]?.uid || transaction.merchant?.groups?.[0]?.merchant?.uid;
    console.log(`UID retrieved: ${uid}`);

    try {
      if (providerName === "bkash") {
        inquiryUrl = `${API_BACKOFFICE_URL}/api/status-inquiry/${type === "payout" ? "payout" : "payin"}/${uid}`;
        console.log(`bKash inquiry URL set: ${inquiryUrl}`);
        inquiryResponse = await axiosInstance.get(inquiryUrl, { params: { [type === "payout" ? "payment_id" : "ref"]: merchantTransactionId } });
      } else if (providerName === "nagad") {
        inquiryUrl = `${API_BASE_URL}/api/status-inquiry/${type === "payout" ? "payout" : "payin"}/${uid}`;
        console.log(`Nagad inquiry URL set: ${inquiryUrl}`);
        inquiryResponse = await axiosInstance.get(inquiryUrl, { params: { [type === "payout" ? "payment_id" : "ref"]: merchantTransactionId } });
      } else {
        console.error(`No UID found for ${type} ${merchantTransactionId}`);
        await bot.sendMessage(chatId, `No merchant mapping found for ${type} ${merchantTransactionId}.`);
        console.log(`Sent no merchant mapping message for ${type} ${merchantTransactionId} to chat ${chatId}`);
        return;
      }

      console.log("Inquiry API Response:", JSON.stringify(inquiryResponse.data, null, 2));
      const inquiryStatus = inquiryResponse?.data?.data?.transactionStatus?.toLowerCase()|| inquiryResponse?.data?.data?.data?.status.toLowerCase() || inquiryResponse?.data?.data?.statusCode;
      const inquiryStatusCode = inquiryResponse?.data?.data?.statusCode;
      console.log(`Inquiry status: ${inquiryStatus}, status code: ${inquiryStatusCode}`);

      if (inquiryStatus === "completed") {
        await retry(() => axios.post(SETTLE_API_URL, { transactionId: merchantTransactionId }));
        console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId} marked as completed`);
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: Completed.`);
        console.log(`Sent completed message for ${type} ${merchantTransactionId} to chat ${chatId}`);
      } else if (inquiryStatus === "failed") {
        await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));        console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId} marked as failed`);
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: Failed.`);
        console.log(`Sent failed message for ${type} ${merchantTransactionId} to chat ${chatId}`);
      } else if (inquiryStatus === "pending") {
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: Pending.`);
        console.log(`Sent Pending message for ${type} ${merchantTransactionId} to chat ${chatId}`);
      } else {
        console.log(`Unknown status for ${type} ${merchantTransactionId}`);
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: Unknown status. Please contact support.`);
        console.log(`Sent unknown status message for ${type} ${merchantTransactionId} to chat ${chatId}`);
      }
    } catch (error) {
      console.error(`Error during inquiry for ${type} ${merchantTransactionId}:`, error.response?.data || error.message);
      await bot.sendMessage(chatId, `Error checking status for ${type} ${merchantTransactionId}. Please try again later.`);
      console.log(`Sent inquiry error message for ${type} ${merchantTransactionId} to chat ${chatId}`);
    }
  } catch (error) {
    console.error(`Error handling ${type} for order ${order}:`, error.message);
    await bot.sendMessage(chatId, `Error processing ${type} ${order}`);
    console.log(`Sent general error message for ${type} ${order} to chat ${chatId}`);
  }
};

// Handle /in command for transactions
bot.onText(/\/in (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const orders = match[1].trim().split(/\s+/);
  console.log(`Received /in command with orders: ${orders}`);

  if (orders.length === 0) {
    console.log("No order IDs provided for /inB command");
    bot.sendMessage(chatId, "Please provide at least one order ID.");
    console.log(`Sent no order ID message to chat ${chatId}`);
    return;
  }

  orders.forEach(order => {
    console.log(`Processing transaction for order: ${order}`);
    handleTransactionAndPayout(chatId, order, "transaction");
  });
});

// Handle /out command for payouts
bot.onText(/\/out (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const orders = match[1].trim().split(/\s+/);
  console.log(`Received /out command with orders: ${orders}`);

  if (orders.length === 0) {
    console.log("No order IDs provided for /outB command");
    bot.sendMessage(chatId, "Please provide at least one order ID.");
    console.log(`Sent no order ID message to chat ${chatId}`);
    return;
  }

  orders.forEach(order => {
    console.log(`Processing payout for order: ${order}`);
    handleTransactionAndPayout(chatId, order, "payout");
  });
});

// Handle image messages with caption
bot.on("photo", (msg) => {
  const chatId = msg.chat.id;
  console.log("Received photo message");

  if (msg.caption) {
    console.log(`Photo caption: ${msg.caption}`);
    const parts = msg.caption.split(/\s+/);
    const command = parts[0];
    const orders = parts.slice(1);
    console.log(`Command: ${command}, Orders: ${orders}`);

    if (command === "/out" || command === "/in") {
      const type = command === "/out" ? "payout" : "transaction";
      console.log(`Processing ${type} from photo caption`);
      if (orders.length === 0) {
        console.log("No order IDs provided in photo caption");
        bot.sendMessage(chatId, "Please provide at least one order ID in the caption.");
        console.log(`Sent no order ID message to chat ${chatId}`);
        return;
      }
      orders.forEach(order => {
        console.log(`Processing ${type} for order: ${order}`);
        handleTransactionAndPayout(chatId, order.trim(), type);
      });
    }
  } else {
    console.log("No caption provided with photo");
  }
});

// Error handling for bot
bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});

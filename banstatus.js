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
const BOT_TOKEN = "8022347739:AAFog5fGoF8stzKm44VUb3ut_sYb87mLrJY";
console.log("Bot token retrieved");
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log("Telegram bot initialized with polling");

// API URLs
const API_URL = 'https://api5.assanpay.com';
const CALLBACK_API_URL = `${API_URL}/api/backoffice/payin-callback`;
const PAYOUT_API_URL = `${API_URL}/api/disbursement/tele`;
const PAYOUT_CALLBACK_API_URL = `${API_URL}/api/backoffice/payout-callback`;
console.log("API URLs configured");
// Configure axios with timeouts
const axiosInstance = axios.create({
  timeout: 45000,
});
console.log("Axios instance created with 45s timeout");

// Configure axios-retry
const axiosRetry = require("axios-retry").default;
console.log("Attempting to configure axios-retry");
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 2000,
  retryCondition: (error) => {
    return (
      axios.isCancel(error) ||
      error.code === "ECONNABORTED" ||
      (error.response && error.response.status >= 500)
    );
  },
});
console.log("axios-retry configured successfully");

// Provider UIDs
const providerUids = {
  DEV: "8e81c7b7-b300-4cbe-99a5-3873ac70949b", // dalalmartuid
  T: "8f30b115-39bb-4625-965b-dbde0b461527", // payinxuid
};

// Safe logging function
const safeLog = (data) => {
  const { transaction_id, merchant_transaction_id, ...safeData } = data;
  return JSON.stringify(safeData, null, 2);
};

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

    // Determine API URL
    let apiUrl;
    if (type === "transaction") {
      apiUrl = `${API_URL}/api/transactions/tele?merchantTransactionId=${order}`;
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
      console.log("API Response received:", safeLog(response.data));
    } catch (error) {
      console.error(`Error fetching ${type} data for order ${order}:`, error.message);
      if (error.response?.status === 500) {
        console.log("Server error (500) encountered");
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${order} failed due to a server error. Please try again later.`);
      } else if (error.code === "ECONNABORTED") {
        console.log("Request timed out");
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${order} timed out. Please try again.`);
      } else {
        console.log("Other error occurred during API request");
        await bot.sendMessage(chatId, `Error processing ${type} ${order}`);
      }
      console.log(`Sent error message for ${type} ${order} to chat ${chatId}`);
      return;
    }

    // Extract transaction data
    const transaction = type === "transaction" ? response.data.transactions?.[0] : response.data.transactions?.[0];
    if (!transaction) {
      console.log(`No ${type} found for order: ${order}`);
      await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${order} not found in Back-office. Please check the order ID.`);
      console.log(`Sent ${type} not found message for order ${order} to chat ${chatId}`);
      return;
    }
    console.log("Transaction data extracted:", safeLog(transaction));

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

    // Handle completed or failed transactions/payouts
    if (status === "completed" || status === "failed") {
      console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId} is already ${status}. TxnID: ${txn_id}`);
      const callbackUrl = type === "payout" ? PAYOUT_CALLBACK_API_URL : CALLBACK_API_URL;
      console.log(`Callback URL set: ${callbackUrl}`);
      try {
        console.log(`Calling callback API for ${type} ${merchantTransactionId}`);
        const callbackResponse = await axiosInstance.post(callbackUrl, { transactionIds: [merchantTransactionId] });
        console.log("Callback API Response:", safeLog(callbackResponse.data));
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: ${status.charAt(0).toUpperCase() + status.slice(1)}.\nTxnID: ${txn_id}`);
      } catch (error) {
        console.error(`Error calling callback API for ${type}:`, error.response?.data || error.message);
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId} is ${status.charAt(0).toUpperCase() + status.slice(1)}, TxnID: ${txn_id}`);
      }
      console.log(`Sent ${status} message for ${type} ${merchantTransactionId} to chat ${chatId}`);
      return;
    }

    // Perform status inquiry
    let provid = type === "payout" ? (transaction.system_order_id || transaction.transaction_id) : (transaction.transaction_id || transaction.system_order_id);
    console.log(`Provider transaction ID: ${provid}`);

    let inquiryUrl, inquiryResponse;
    const providerKey = Object.keys(providerUids).find(key => provid.startsWith(key));
    try {
      if (!providerKey) {
        console.error(`No UID found for ${type} ${merchantTransactionId}`);
        await bot.sendMessage(chatId, `No merchant mapping found for ${type} ${merchantTransactionId}.`);
        console.log(`Sent no merchant mapping message for ${type} ${merchantTransactionId} to chat ${chatId}`);
        return;
      }
      inquiryUrl = `${API_URL}/api/status-inquiry/${type === "payout" ? "payout" : "payin"}/${providerUids[providerKey]}`;
      console.log(`${providerKey} inquiry URL set: ${inquiryUrl}`);
      inquiryResponse = await axiosInstance.get(inquiryUrl, { params: { [type === "payout" ? "payment_id" : "ref"]: merchantTransactionId } });
      console.log("Inquiry API Response:", safeLog(inquiryResponse.data));

      const getInquiryStatus = (response) => {
        const data = response?.data?.data;
        return (
          data?.transactionStatus?.toLowerCase() ||
          data?.data?.status?.toLowerCase() ||
          data?.statusCode?.toLowerCase() ||
          "unknown"
        );
      };
      const inquiryStatus = getInquiryStatus(inquiryResponse);
      console.log(`Inquiry status: ${inquiryStatus}`);

      if (inquiryStatus === "completed" || inquiryStatus === "failed" || inquiryStatus === "pending") {
        await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: ${inquiryStatus.charAt(0).toUpperCase() + inquiryStatus.slice(1)}.`);
        console.log(`Sent ${inquiryStatus} message for ${type} ${merchantTransactionId} to chat ${chatId}`);
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
    console.log("No order IDs provided for /in command");
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
    console.log("No order IDs provided for /out command");
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

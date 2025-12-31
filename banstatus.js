// const axios = require("axios");
// const express = require("express");
// const TelegramBot = require("node-telegram-bot-api");
// const dotenv = require("dotenv");

// // Load environment variables
// dotenv.config();
// console.log("Environment variables loaded");

// // Initialize Express app
// const app = express();
// const PORT = 4019;
// console.log(`Port set to ${PORT}`);

// app.listen(PORT, () => {
//   console.log(`Server started and running on port ${PORT}`);
// });

// app.get("/", (req, res) => {
//   console.log("Received GET request on root endpoint");
//   res.status(200).json({ status: "success" });
//   console.log("Sent success response for root endpoint");
// });

// // Bot configuration
// const BOT_TOKEN = "8022347739:AAFog5fGoF8stzKm44VUb3ut_sYb87mLrJY";
// console.log("Bot token retrieved");
// const bot = new TelegramBot(BOT_TOKEN, { polling: true });
// console.log("Telegram bot initialized with polling");

// // API URLs
// const API_URL = 'https://api5.assanpay.com';
// const CALLBACK_API_URL = `${API_URL}/api/backoffice/payin-callback`;
// const PAYOUT_API_URL = `${API_URL}/api/disbursement/tele`;
// const PAYOUT_CALLBACK_API_URL = `${API_URL}/api/backoffice/payout-callback`;
// console.log("API URLs configured");
// // Configure axios with timeouts
// const axiosInstance = axios.create({
//   timeout: 45000,
// });
// console.log("Axios instance created with 45s timeout");

// // Configure axios-retry
// const axiosRetry = require("axios-retry").default;
// console.log("Attempting to configure axios-retry");
// axiosRetry(axiosInstance, {
//   retries: 3,
//   retryDelay: (retryCount) => retryCount * 2000,
//   retryCondition: (error) => {
//     return (
//       axios.isCancel(error) ||
//       error.code === "ECONNABORTED" ||
//       (error.response && error.response.status >= 500)
//     );
//   },
// });
// console.log("axios-retry configured successfully");

// // Provider UIDs
// const providerUids = {
//   DEV: "8e81c7b7-b300-4cbe-99a5-3873ac70949b", // dalalmartuid
//   T: "8f30b115-39bb-4625-965b-dbde0b461527",// payinxuid
//   SP: "8e81c7b7-b300-4cbe-99a5-3873ac70949b",
//   BK: "8e81c7b7-b300-4cbe-99a5-3873ac70949b",
// };

// // Safe logging function
// const safeLog = (data) => {
//   const { transaction_id, merchant_transaction_id, ...safeData } = data;
//   return JSON.stringify(safeData, null, 2);
// };

// // Function to handle transactions or payouts
// const handleTransactionAndPayout = async (chatId, order, type = "transaction") => {
//   try {
//     console.log(`Starting ${type} handling for order: ${order}`);

//     // Validate order ID
//     if (!order || typeof order !== "string" || order.trim() === "") {
//       console.log("Invalid order ID provided");
//       await bot.sendMessage(chatId, "Invalid order ID provided.");
//       console.log(`Sent invalid order ID message to chat ${chatId}`);
//       return;
//     }
//     console.log("Order ID validated");

//     // Determine API URL
//     let apiUrl;
//     if (type === "transaction") {
//       apiUrl = `${API_URL}/api/transactions/tele?merchantTransactionId=${order}`;
//       console.log(`Transaction API URL set: ${apiUrl}`);
//     } else if (type === "payout") {
//       apiUrl = `${PAYOUT_API_URL}?merchantTransactionId=${order}`;
//       console.log(`Payout API URL set: ${apiUrl}`);
//     } else {
//       console.error("Invalid type specified");
//       await bot.sendMessage(chatId, "Invalid transaction type.");
//       console.log(`Sent invalid transaction type message to chat ${chatId}`);
//       return;
//     }

//     // Make API request
//     let response;
//     try {
//       console.log(`Making API request to ${apiUrl}`);
//       response = await axiosInstance.get(apiUrl);
//       console.log("API Response received:", safeLog(response.data));
//     } catch (error) {
//       console.error(`Error fetching ${type} data for order ${order}:`, error.message);
//       if (error.response?.status === 500) {
//         console.log("Server error (500) encountered");
//         await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${order} failed due to a server error. Please try again later.`);
//       } else if (error.code === "ECONNABORTED") {
//         console.log("Request timed out");
//         await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${order} timed out. Please try again.`);
//       } else {
//         console.log("Other error occurred during API request");
//         await bot.sendMessage(chatId, `Error processing ${type} ${order}`);
//       }
//       console.log(`Sent error message for ${type} ${order} to chat ${chatId}`);
//       return;
//     }

//     // Extract transaction data
//     const transaction = type === "transaction" ? response.data.transactions?.[0] : response.data.transactions?.[0];
//     if (!transaction) {
//       console.log(`No ${type} found for order: ${order}`);
//       await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${order} not found in Back-office. Please check the order ID.`);
//       console.log(`Sent ${type} not found message for order ${order} to chat ${chatId}`);
//       return;
//     }
//     console.log("Transaction data extracted:", safeLog(transaction));

//     const status = transaction.status?.trim().toLowerCase();
//     const merchantTransactionId = transaction.merchant_transaction_id || transaction.merchant_custom_order_id;
//     const txn_id = transaction.transaction_id;
//     console.log(`Transaction status: ${status}, merchantTransactionId: ${merchantTransactionId}, txn_id: ${txn_id}`);

//     if (!merchantTransactionId) {
//       console.error("Error: merchantTransactionId is undefined");
//       await bot.sendMessage(chatId, `Error: Invalid transaction ID for ${type} ${order}.`);
//       console.log(`Sent invalid transaction ID message for ${type} ${order} to chat ${chatId}`);
//       return;
//     }

//     // Handle completed or failed transactions/payouts
//     if (status === "completed" || status === "failed") {
//       console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId} is already ${status}. TxnID: ${txn_id}`);
//       const callbackUrl = type === "payout" ? PAYOUT_CALLBACK_API_URL : CALLBACK_API_URL;
//       console.log(`Callback URL set: ${callbackUrl}`);
//       try {
//         console.log(`Calling callback API for ${type} ${merchantTransactionId}`);
//         const callbackResponse = await axiosInstance.post(callbackUrl, { transactionIds: [merchantTransactionId] });
//         console.log("Callback API Response:", safeLog(callbackResponse.data));
//         await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: ${status.charAt(0).toUpperCase() + status.slice(1)}.\nTxnID: ${txn_id}`);
//       } catch (error) {
//         console.error(`Error calling callback API for ${type}:`, error.response?.data || error.message);
//         await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId} is ${status.charAt(0).toUpperCase() + status.slice(1)}, TxnID: ${txn_id}`);
//       }
//       console.log(`Sent ${status} message for ${type} ${merchantTransactionId} to chat ${chatId}`);
//       return;
//     }

//     // Perform status inquiry
//     let provid = type === "payout" ? (transaction.system_order_id || transaction.transaction_id) : (transaction.transaction_id || transaction.system_order_id);
//     console.log(`Provider transaction ID: ${provid}`);

//     let inquiryUrl, inquiryResponse;
//     const providerKey = Object.keys(providerUids).find(key => provid.startsWith(key));
//     try {
//       if (!providerKey) {
//         console.error(`No UID found for ${type} ${merchantTransactionId}`);
//         await bot.sendMessage(chatId, `No merchant mapping found for ${type} ${merchantTransactionId}.`);
//         console.log(`Sent no merchant mapping message for ${type} ${merchantTransactionId} to chat ${chatId}`);
//         return;
//       }
//       inquiryUrl = `${API_URL}/api/status-inquiry/${type === "payout" ? "payout" : "payin"}/${providerUids[providerKey]}`;
//       console.log(`${providerKey} inquiry URL set: ${inquiryUrl}`);
//       inquiryResponse = await axiosInstance.get(inquiryUrl, { params: { [type === "payout" ? "payment_id" : "ref"]: merchantTransactionId } });
//       console.log("Inquiry API Response:", safeLog(inquiryResponse.data));

//       const getInquiryStatus = (response) => {
//         const data = response?.data?.data;
//         return (
//           data?.transactionStatus?.toLowerCase() ||
//           data?.data?.status?.toLowerCase() ||
//           data?.statusCode?.toLowerCase() ||
//           "unknown"
//         );
//       };
//       const inquiryStatus = getInquiryStatus(inquiryResponse);
//       console.log(`Inquiry status: ${inquiryStatus}`);

//       if (inquiryStatus === "completed" || inquiryStatus === "failed" || inquiryStatus === "pending") {
//         await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: ${inquiryStatus.charAt(0).toUpperCase() + inquiryStatus.slice(1)}.`);
//         console.log(`Sent ${inquiryStatus} message for ${type} ${merchantTransactionId} to chat ${chatId}`);
//       } else {
//         console.log(`Unknown status for ${type} ${merchantTransactionId}`);
//         await bot.sendMessage(chatId, `${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId}: Unknown status. Please contact support.`);
//         console.log(`Sent unknown status message for ${type} ${merchantTransactionId} to chat ${chatId}`);
//       }
//     } catch (error) {
//       console.error(`Error during inquiry for ${type} ${merchantTransactionId}:`, error.response?.data || error.message);
//       await bot.sendMessage(chatId, `Error checking status for ${type} ${merchantTransactionId}. Please try again later.`);
//       console.log(`Sent inquiry error message for ${type} ${merchantTransactionId} to chat ${chatId}`);
//     }
//   } catch (error) {
//     console.error(`Error handling ${type} for order ${order}:`, error.message);
//     await bot.sendMessage(chatId, `Error processing ${type} ${order}`);
//     console.log(`Sent general error message for ${type} ${order} to chat ${chatId}`);
//   }
// };

// // Handle /in command for transactions
// bot.onText(/\/in (.+)/, (msg, match) => {
//   const chatId = msg.chat.id;
//   const orders = match[1].trim().split(/\s+/);
//   console.log(`Received /in command with orders: ${orders}`);

//   if (orders.length === 0) {
//     console.log("No order IDs provided for /in command");
//     bot.sendMessage(chatId, "Please provide at least one order ID.");
//     console.log(`Sent no order ID message to chat ${chatId}`);
//     return;
//   }

//   orders.forEach(order => {
//     console.log(`Processing transaction for order: ${order}`);
//     handleTransactionAndPayout(chatId, order, "transaction");
//   });
// });

// // Handle /out command for payouts
// bot.onText(/\/out (.+)/, (msg, match) => {
//   const chatId = msg.chat.id;
//   const orders = match[1].trim().split(/\s+/);
//   console.log(`Received /out command with orders: ${orders}`);

//   if (orders.length === 0) {
//     console.log("No order IDs provided for /out command");
//     bot.sendMessage(chatId, "Please provide at least one order ID.");
//     console.log(`Sent no order ID message to chat ${chatId}`);
//     return;
//   }

//   orders.forEach(order => {
//     console.log(`Processing payout for order: ${order}`);
//     handleTransactionAndPayout(chatId, order, "payout");
//   });
// });

// // Handle image messages with caption
// bot.on("photo", (msg) => {
//   const chatId = msg.chat.id;
//   console.log("Received photo message");

//   if (msg.caption) {
//     console.log(`Photo caption: ${msg.caption}`);
//     const parts = msg.caption.split(/\s+/);
//     const command = parts[0];
//     const orders = parts.slice(1);
//     console.log(`Command: ${command}, Orders: ${orders}`);

//     if (command === "/out" || command === "/in") {
//       const type = command === "/out" ? "payout" : "transaction";
//       console.log(`Processing ${type} from photo caption`);
//       if (orders.length === 0) {
//         console.log("No order IDs provided in photo caption");
//         bot.sendMessage(chatId, "Please provide at least one order ID in the caption.");
//         console.log(`Sent no order ID message to chat ${chatId}`);
//         return;
//       }
//       orders.forEach(order => {
//         console.log(`Processing ${type} for order: ${order}`);
//         handleTransactionAndPayout(chatId, order.trim(), type);
//       });
//     }
//   } else {
//     console.log("No caption provided with photo");
//   }
// });

// // Error handling for bot
// bot.on("polling_error", (error) => {
//   console.error("Polling error:", error.message);
// });

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
const bot = new TelegramBot(BOT_TOKEN, {
  polling: { interval: 2000, autoStart: true, params: { timeout: 10 } },
  request: { timeout: 20000 },
});
console.log("Telegram bot initialized with polling");

// API URLs
const API_URL = "https://api5.assanpay.com";
const PAYIN_CALLBACK_URL = process.env.PAYIN_CALLBACK_URL || `${API_URL}/api/backoffice/payin-callback`;
const PAYIN_SETTLE_URL = `${API_URL}/api/backoffice/settle-transactions/tele`;
const PAYIN_FAIL_URL = process.env.PAYIN_FAIL_URL || ""; // TODO: fill fail URL
const PAYOUT_API_URL = `${API_URL}/api/disbursement/tele`;
const PAYOUT_CALLBACK_API_URL = `${API_URL}/api/backoffice/payout-callback`;
console.log("API URLs configured");
// Configure axios with timeouts
const axiosInstance = axios.create({
  timeout: 45000,
  validateStatus: () => true,
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

// Prefix based inquiry config (all GET)
const prefixInquiryConfig = {
  BKN: {
    flow: "p2c",
    method: "get",
    buildUrl: (order, transaction) => {
      const base = process.env.BKN_INQUIRY_BASE || "https://bkash.assanpay.com/api/query-payment";
      const providerTxnId =
        transaction?.providerDetails?.transactionId ||
        transaction?.transaction_id ||
        order;
      return `${base}/${providerTxnId}`;
    },
  },
  SPN: {
    flow: "p2c",
    method: "get",
    buildUrl: (order) => {
      const base = process.env.SPN_INQUIRY_BASE || "https://api5.assanpay.com/api/status-inquiry/shurjoPay/4888d2eb-ef2b-4eeb-b77d-a876798768c6";
      return `${base}?ref=${encodeURIComponent(order)}`;
    },
  },
  STP: {
    flow: "p2p",
    method: "get",
    buildUrl: (order) => {
      const base = process.env.STARPAGO_INQUIRY_BASE || "https://api5.assanpay.com/api/status-inquiry/starpago";
      return `${base}/${order}`;
    },
  },
  KLI: {
    flow: "p2p",
    method: "get",
    buildUrl: (order) => {
      const base = process.env.STARPAGO_INQUIRY_BASE || "https://bkash.assanpay.com/api/paypro/query-payin";
      return `${base}/${order}`;
    },
  },
};

// Safe logging function
const safeLog = (data) => {
  const { transaction_id, merchant_transaction_id, ...safeData } = data;
  return JSON.stringify(safeData, null, 2);
};

const parseInquiryStatus = (data) => {
  const status =
    data?.data?.transactionStatus ||
    data?.data?.status ||
    data?.transactionStatus ||
    data?.status ||
    "";
  return typeof status === "string" ? status.toLowerCase() : "";
};

const isSuccessStatus = (status) =>
  status === "completed" || status === "success" || status === "paid";

const postIfUrl = async (url, payload) => {
  if (!url) {
    console.warn("postIfUrl: URL missing, skipping call", payload);
    return { skipped: true };
  }
  console.log(`postIfUrl: calling ${url} with payload ${JSON.stringify(payload)}`);
  return axiosInstance.post(url, payload);
};

const handlePayinSuccess = async (merchantTransactionId, txnId, chatId, dateStr, skipSettle = false) => {
  if (skipSettle) {
    console.log("Settle skipped (already completed in backoffice)");
  } else {
    try {
      const settleResp = await postIfUrl(PAYIN_SETTLE_URL, { transactionId: merchantTransactionId });
      if (settleResp?.data) console.log("Settle API Response:", safeLog(settleResp.data));
    } catch (err) {
      console.error("Settle API error:", err.response?.data || err.message);
    }
  }

  try {
    const cbResp = await postIfUrl(PAYIN_CALLBACK_URL, { transactionIds: [merchantTransactionId] });
    if (cbResp?.data) console.log("Callback API Response (success):", safeLog(cbResp.data));
  } catch (err) {
    console.error("Callback API error (success):", err.response?.data || err.message);
  }

  await bot.sendMessage(
    chatId,
    `Transaction ${merchantTransactionId}: Completed.\nTxnID: ${txnId || "N/A"}\nDate: ${dateStr || "N/A"}`
  );
};

const handlePayinFail = async (merchantTransactionId, chatId, dateStr) => {
  try {
    const failResp = await postIfUrl(PAYIN_FAIL_URL, { transactionIds: [merchantTransactionId] });
    if (failResp?.data) console.log("Fail API Response:", safeLog(failResp.data));
  } catch (err) {
    console.error("Fail API error:", err.response?.data || err.message);
  }

  try {
    const cbResp = await postIfUrl(PAYIN_CALLBACK_URL, { transactionIds: [merchantTransactionId] });
    if (cbResp?.data) console.log("Callback API Response (fail):", safeLog(cbResp.data));
  } catch (err) {
    console.error("Callback API error (fail):", err.response?.data || err.message);
  }

  await bot.sendMessage(
    chatId,
    `Transaction ${merchantTransactionId}: Failed.\nDate: ${dateStr || "N/A"}`
  );
};

const formatDhakaDate = (dateInput) => {
  try {
    if (!dateInput) return "N/A";
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    // Format parts to yyyy-MM-dd HH:mm:ss
    const parts = fmt.formatToParts(new Date(dateInput)).reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  } catch (err) {
    console.error("Date format error:", err.message);
    return "N/A";
  }
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
    } else if (type === "payout") {
      apiUrl = `${PAYOUT_API_URL}?merchantTransactionId=${order}`;
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
    const txn_id = transaction.transaction_id || transaction.system_order_id;
    const dateStr = formatDhakaDate(
      transaction.date_time || transaction.transactionDateTime || transaction.createdAt
    );
    console.log(`Transaction status: ${status}, merchantTransactionId: ${merchantTransactionId}, txn_id: ${txn_id}, date: ${dateStr}`);

    if (!merchantTransactionId) {
      console.error("Error: merchantTransactionId is undefined");
      await bot.sendMessage(chatId, `Error: Invalid transaction ID for ${type} ${order}.`);
      console.log(`Sent invalid transaction ID message for ${type} ${order} to chat ${chatId}`);
      return;
    }

    if (type === "transaction") {
      // If already completed/failed from backoffice
      if (status === "completed") {
        await handlePayinSuccess(merchantTransactionId, txn_id, chatId, dateStr, true);
        return;
      }
      if (status === "initiated") {
        await bot.sendMessage(
          chatId,
          `Transaction ${merchantTransactionId}: Failed (initiated state).\nDate: ${dateStr || "N/A"}`
        );
        return;
      }

      // Prefix-based inquiry
      const rawTxId =
        transaction.transaction_id ||
        transaction.system_order_id ||
        transaction.providerDetails?.transactionId ||
        "";
      const prefix = rawTxId.slice(0, 3).toUpperCase();
      const config = prefixInquiryConfig[prefix];

      if (!config) {
        console.error(`No prefix config for ${prefix} (${merchantTransactionId})`);
        await bot.sendMessage(chatId, `No inquiry config for transaction ${merchantTransactionId}.`);
        return;
      }

      try {
        const inquiryUrl = config.buildUrl(order, transaction);
        const payload = config.buildPayload ? config.buildPayload(order, transaction) : {};
        console.log(`Inquiry prep -> prefix: ${prefix}, flow: ${config.flow}, url: ${inquiryUrl}, params: ${JSON.stringify(payload)}`);
        let inquiryResponse;
        if (config.method === "get") {
          inquiryResponse = await axiosInstance.get(inquiryUrl, { params: payload });
        } else {
          inquiryResponse = await axiosInstance.post(inquiryUrl, payload);
        }

        console.log("Inquiry API Response:", safeLog(inquiryResponse.data));
        const inquiryStatus = parseInquiryStatus(inquiryResponse.data);
        const inquiryStatusCode = inquiryResponse.data?.statusCode;

        if (isSuccessStatus(inquiryStatus)) {
          await handlePayinSuccess(merchantTransactionId, txn_id, chatId, dateStr);
        } else if (inquiryStatus === "initiated") {
          await bot.sendMessage(
            chatId,
            `Transaction ${merchantTransactionId}: Failed (initiated state).\nDate: ${dateStr || "N/A"}`
          );
        } else if (
          config.flow === "p2c" &&
          (!inquiryStatus ||
            inquiryStatus === "failed" ||
            inquiryStatus === "pending" ||
            inquiryStatus === "cancelled" ||
            inquiryStatusCode === 500)
        ) {
          await handlePayinFail(merchantTransactionId, chatId, dateStr);
        } else {
          await bot.sendMessage(
            chatId,
            `Transaction ${merchantTransactionId}: ${inquiryStatus || "pending"} (no fail for p2p).\nDate: ${dateStr || "N/A"}`
          );
        }
      } catch (error) {
        console.error(
          `Error during inquiry for ${merchantTransactionId}:`,
          error.response?.data || error.message
        );
        await bot.sendMessage(
          chatId,
          `Error checking status for transaction ${merchantTransactionId}. Please try again later.`
        );
      }
    } else if (type === "payout") {
      // Payouts: keep existing behavior (no new prefix map provided)
      if (status === "completed" || status === "failed") {
        console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} ${merchantTransactionId} is already ${status}. TxnID: ${txn_id}`);
        const callbackUrl = PAYOUT_CALLBACK_API_URL;
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
        return;
      }

      await bot.sendMessage(chatId, `Payout ${merchantTransactionId}: Pending.`);
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

// Ignore any other commands
bot.onText(/^\/(?!in\b|out\b|pin\b|pout\b).+/, (msg) => {
  console.log(`Ignoring unsupported command: ${msg.text}`);
});

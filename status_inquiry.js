const axios = require("axios");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.STATUS_PORT || 4007;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.status(200).json({ status: "success" });
});

// Bot configuration
const BOT_TOKEN = process.env.BOT_TOKEN || "7974668426:AAGVRkkxj0JD9RKrpmb2PUCxJdBWGS3fA-k";
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// API URLs
const API_BASE_URL = process.env.API_BASE_URL || "https://server.sahulatpay.com";
const API_BACKOFFICE_URL = process.env.API_BACKOFFICE_URL || "https://server.sahulatpay.com";
const CALLBACK_API_URL = `${API_BASE_URL}/backoffice/payin-callback`;
const SETTLE_API_URL = `${API_BASE_URL}/backoffice/settle-transactions/tele`;
const PAYOUT_API_URL = `${API_BASE_URL}/disbursement/tele`;
const PAYOUT_CALLBACK_API_URL = `${API_BACKOFFICE_URL}/backoffice/payout-callback`;
const FAIL_API_URL = `${API_BACKOFFICE_URL}/backoffice/fail-transactions/tele`;

// Configure axios with timeouts
const axiosInstance = axios.create({
  timeout: 30000, // 10-second timeout
});

// Configure axios-retry
let axiosRetry;
try {
  axiosRetry = require("axios-retry").default; // Use .default for CommonJS
  axiosRetry(axiosInstance, {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 1000,
    retryCondition: (error) => {
      return axios.isCancel(error) || error.code === "ECONNABORTED" || (error.response && error.response.status >= 500);
    },
  });
  console.log("axios-retry configured successfully");
} catch (error) {
  console.error("Failed to configure axios-retry:", error.message);
  console.log("Continuing without retry logic");
}

// Merchant ID to UUID mapping
const uidMap = {
  87: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  88: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  89: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  90: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  91: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  92: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  93: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  94: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  96: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  97: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  98: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  99: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  100: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  101: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  103: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  104: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  105: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  106: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  107: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  108: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  109: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  110: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  111: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  112: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  113: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  114: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  115: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  119: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  126: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  127: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  128: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  129: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  130: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  131: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  132: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  133: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  134: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  135: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  136: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  137: "cc961e51-8c0e-44d4-9c25-56e39e992b88",
  138: "cc961e51-8c0e-44d4-9c25-56e39e992b88",
  139: "cc961e51-8c0e-44d4-9c25-56e39e992b88",
  140: "cc961e51-8c0e-44d4-9c25-56e39e992b88",
  7: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  11: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  32: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  27: "cc961e51-8c0e-44d4-9c25-56e39e992b88",
};

// Function to handle transactions or payouts


const handleTransactionAndPayout = async (chatId, order, type = "transaction") => {
  try {
    console.log(`Starting ${type} handling for order: ${order}`);

    // Validate order ID
    if (!order || typeof order !== "string" || order.trim() === "") {
      await bot.sendMessage(chatId, "Invalid order ID provided.");
      return;
    }

    // Determine API URL based on type
    let apiUrl;
    if (type === "transaction") {
      apiUrl = `https://server.sahulatpay.com/transactions/tele?merchantTransactionId=${order}`;
    } else if (type === "payout") {
      apiUrl = `${PAYOUT_API_URL}?merchantTransactionId=${order}`;
    } else {
      console.error("Invalid type specified.");
      await bot.sendMessage(chatId, "Invalid transaction type.");
      return;
    }

    // Make API request
    let response;
    try {
      response = await axiosInstance.get(apiUrl);
      console.log("API Response:", response.data);
    } catch (error) {
      console.error(`Error fetching ${type} data for order ${order}:`, error.message);
      if (error.response?.status === 500) {
        await bot.sendMessage(chatId, `Transaction ${order} failed due to a server error. Please try again later.`);
      } else if (error.code === "ECONNABORTED") {
        await bot.sendMessage(chatId, `Transaction ${order} timed out. Please try again.`);
      } else {
        await bot.sendMessage(chatId, `Error processing transaction ${order}. Please contact support.`);
      }
      return;
    }

    // Extract transaction data
    const transaction = type === "transaction" ? response.data.transactions?.[0] : response.data?.data?.transactions?.[0];
    if (!transaction) {
      console.log(`No ${type} found for order: ${order}`);
      await bot.sendMessage(chatId, `Transaction ${order} not found. Please check the order ID.`);
      return;
    }

    console.log("Transaction Details:", JSON.stringify(transaction, null, 2));

    const status = transaction.status?.trim().toLowerCase();
    const merchantTransactionId = transaction.merchant_transaction_id || transaction.merchant_custom_order_id;
    const txn_id = transaction.transaction_id;

    if (!merchantTransactionId) {
      console.error("Error: merchantTransactionId is undefined.");
      await bot.sendMessage(chatId, `Error: Invalid transaction ID for ${order}.`);
      return;
    }

    // Handle completed transactions
    if (status === "completed") {
      console.log(`Transaction ${merchantTransactionId} is already completed. TxnID: ${txn_id}`);
      const callbackUrl = type === "payout" ? PAYOUT_CALLBACK_API_URL : CALLBACK_API_URL;

      try {
        const callbackResponse = await axiosInstance.post(callbackUrl, { transactionIds: [merchantTransactionId] });
        console.log("Callback API Response:", callbackResponse.data);
        await bot.sendMessage(chatId, `Transaction ${merchantTransactionId}: Completed.\nTxnID: ${txn_id}`);
      } catch (error) {
        console.error("Error calling callback API:", error.response?.data || error.message);
        await bot.sendMessage(chatId, `Transaction ${merchantTransactionId} is completed,  TxnID: ${txn_id}`);
      }
      return;
    }

    // Perform status inquiry for transactions (not payouts)
    if (type === "transaction") {
      const providerName = transaction.providerDetails?.name?.toLowerCase();
      let inquiryUrl, inquiryResponse;

      try {
        if (providerName === "easypaisa") {
          const easyPaisaMerchantId = transaction.providerDetails?.id;
          const mappedId = uidMap[easyPaisaMerchantId];

          if (mappedId) {
            inquiryUrl = `${API_BACKOFFICE_URL}/payment/inquiry-ep/${mappedId}?orderId=${order}`;
            inquiryResponse = await axiosInstance.get(inquiryUrl, { params: { transaction_id: merchantTransactionId } });
          } else {
            const uid = transaction.merchant?.uid || transaction.merchant?.groups?.[0]?.uid || transaction.merchant?.groups?.[0]?.merchant?.uid;
            if (uid) {
              inquiryUrl = `${API_BACKOFFICE_URL}/payment/inquiry-ep/${uid}?orderId=${order}`;
              inquiryResponse = await axiosInstance.get(inquiryUrl, { params: { transaction_id: merchantTransactionId } });
            } else {
              console.error(`No UID found for transaction ${merchantTransactionId}`);
              await bot.sendMessage(chatId, `No merchant mapping found for transaction ${merchantTransactionId}.`);
              return;
            }
          }
        } else if (providerName === "jazzcash") {
          const jazzCashMerchantId = transaction.providerDetails?.id;
          const mappedId = uidMap[jazzCashMerchantId];

          if (mappedId) {
            inquiryUrl = `${API_BASE_URL}/payment/simple-status-inquiry/${mappedId}?transactionId=${order}`;
            inquiryResponse = await axiosInstance.get(inquiryUrl, { params: { transaction_id: merchantTransactionId } });
          } else {
            const uid = transaction.merchant?.uid || transaction.merchant?.groups?.[0]?.uid || transaction.merchant?.groups?.[0]?.merchant?.uid;
            if (uid) {
              inquiryUrl = `${API_BACKOFFICE_URL}/payment/status-inquiry/${uid}`;
              inquiryResponse = await axiosInstance.post(inquiryUrl, { transactionId: merchantTransactionId });
            } else {
              console.error(`No UID found for transaction ${merchantTransactionId}`);
              await bot.sendMessage(chatId, `Nomerchant mapping found for transaction ${merchantTransactionId}.`);
              return;
            }
          }
        } else {
          await bot.sendMessage(chatId, `Unsupported provider for transaction ${merchantTransactionId}.`);
          return;
        }

        console.log("Inquiry API Response:", inquiryResponse.data);
        const inquiryStatus = inquiryResponse?.data?.data?.transactionStatus?.toLowerCase();
        const inquiryStatusCode = inquiryResponse?.data?.data?.statusCode;

        if (inquiryStatus === "completed") {
          await axiosInstance.post(SETTLE_API_URL, { transactionId: merchantTransactionId });
          console.log(`Transaction ${merchantTransactionId} marked as completed.`);
          await bot.sendMessage(chatId, `Transaction ${merchantTransactionId}: Completed.`);
        } else if (!inquiryStatus || inquiryStatus === "failed" || inquiryStatusCode === 500) {
          await axiosInstance.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] });
          console.log(`Transaction ${merchantTransactionId} marked as failed.`);
          await bot.sendMessage(chatId, `Transaction ${merchantTransactionId}: Failed.`);
        } else {
          await bot.sendMessage(chatId, `Transaction ${merchantTransactionId}: Unknown status. Please contact support.`);
        }
      } catch (error) {
        console.error(`Error during inquiry for ${merchantTransactionId}:`, error.response?.data || error.message);
        await bot.sendMessage(chatId, `Error checking status for transaction ${merchantTransactionId}. Please try again later.`);
      }
    } else {
      // Handle payout status
      if (status === "failed") {
        //await axiosInstance.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] });
        console.log(`Payout ${merchantTransactionId} marked as failed.`);
        await bot.sendMessage(chatId, `Payout status ${merchantTransactionId}: Failed`);
      } else if (status === "pending") {
        console.log(`Payout ${merchantTransactionId} is pending.`);
        await bot.sendMessage(chatId, `Payout status ${merchantTransactionId}: Pending`);
      } else {
        //await axiosInstance.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] });
        console.log(`Payout ${merchantTransactionId} marked as failed due to unknown status.`);
        await bot.sendMessage(chatId, `Payout ${merchantTransactionId}: Failed.`);
      }
    }
  } catch (error) {
    console.error(`Error handling ${type} for order ${order}:`, error.message);
    await bot.sendMessage(chatId, `Error processing ${type} ${order}. Please contact support.`);
  }
};

// Handle /in command for transactions
bot.onText(/\/in (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const orders = match[1].trim().split(/\s+/);

  if (orders.length === 0) {
    bot.sendMessage(chatId, "Please provide at least one order ID.");
    return;
  }

  orders.forEach(order => handleTransactionAndPayout(chatId, order, "transaction"));
});

// Handle /out command for payouts
bot.onText(/\/out (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const orders = match[1].trim().split(/\s+/);

  if (orders.length === 0) {
    bot.sendMessage(chatId, "Please provide at least one order ID.");
    return;
  }

  orders.forEach(order => handleTransactionAndPayout(chatId, order, "payout"));
});

// Handle image messages with caption
bot.on("photo", (msg) => {
  const chatId = msg.chat.id;

  if (msg.caption) {
    const parts = msg.caption.split(/\s+/);
    const command = parts[0];
    const orders = parts.slice(1);

    if (command === "/out" || command === "/in") {
      const type = command === "/out" ? "payout" : "transaction";
      if (orders.length === 0) {
        bot.sendMessage(chatId, "Please provide at least one order ID in the caption.");
        return;
      }
      orders.forEach(order => handleTransactionAndPayout(chatId, order.trim(), type));
    }
  }
});

// Error handling for bot
bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});

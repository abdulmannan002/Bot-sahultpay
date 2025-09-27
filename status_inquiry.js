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
  timeout: 45000, // Increased to 45 seconds
});

// Configure axios-retry
let axiosRetry;
try {
  axiosRetry = require("axios-retry").default;
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
  160: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  161: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  162: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  163: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  164: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  165: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  166: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  167: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  168: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  169: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  170: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  171: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  172: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  173: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  174: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  175: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  176: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  177: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  178: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  179: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  180: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  181: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  182: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  183: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  184: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  185: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  186: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  119: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  149: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  150: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  151: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  152: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  153: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  154: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  155: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  156: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  157: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  158: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  159: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
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
  143: "cc961e51-8c0e-44d4-9c25-56e39e992b88",
  // JazzCash UIDs
  7: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  65: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3",
  27: "3c0ba58b-5a69-4376-b40d-4d497d561ba2",
  // animatrix
  46: "cc961e51-8c0e-44d4-9c25-56e39e992b88",
  32: "f2e2586e-d17b-4fe6-a905-2148f5e4bf15",
  // Payfast UIDs
  5: "22943823-9a2d-4ab2-8d13-9b684ba8058d",
  6: "2f1bc400-ee52-4091-9e3a-be4de8ecd9b3",
  //7: "2cf2052d-8582-4c92-8482-785df897d523",
  8: "a32508c3-f480-4bd2-9c8e-76bb3c6ad747",
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
        await bot.sendMessage(chatId, `Error processing transaction ${order}`);
      }
      return;
    }

    // Extract transaction data
    const transaction = type === "transaction" ? response.data.transactions?.[0] : response.data?.data?.transactions?.[0];
    if (!transaction) {
      console.log(`No ${type} found for order: ${order}`);
      await bot.sendMessage(chatId, `Transaction ${order} not found in Back-office. Please check the order ID.`);
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
  // Perform status inquiry for transactions (not payouts)
if (type === "transaction" && uidMap) {
  const providerName = transaction.providerDetails?.name?.toLowerCase();
  let inquiryUrl, inquiryResponse, inquiryUid;

  try {
    // Function to perform inquiry with a given UID
    const performInquiry = async (uid, merchantId, transactionId) => {
      if (providerName === "easypaisa") {
        if ([5, 6, 8].includes(parseInt(merchantId))) {
          return await axiosInstance.get(
            `https://server.sahulatpay.com/payment/inquiry-pf/${uid}?transactionId=${transactionId}`,
            { params: { transaction_id: merchantTransactionId } }
          );
        } else {
          return await axiosInstance.get(
            `${API_BACKOFFICE_URL}/payment/inquiry-ep/${uid}?orderId=${transactionId}`,
            { params: { transaction_id: merchantTransactionId } }
          );
        }
      } else if (providerName === "jazzcash") {
        return await axiosInstance.get(
          `${API_BASE_URL}/payment/simple-status-inquiry/${uid}?transactionId=${transactionId}`,
          { params: { transaction_id: merchantTransactionId } }
        );
      }
      throw new Error("Unsupported provider");
    };

    // Get merchant ID and mapped UUID
    const merchantId = transaction.providerDetails?.id;
    let mappedId = uidMap[merchantId];

    // First attempt with mapped UUID
    if (mappedId) {
      console.log(`Performing ${providerName} inquiry with UUID: ${mappedId}`);
      inquiryUid = mappedId;
      inquiryResponse = await performInquiry(mappedId, merchantId, order);

      // Check if inquiry response indicates "Transaction Not Found" with statusCode 500
      if (
        inquiryResponse.data?.success === true &&
        inquiryResponse.data?.message === "Transaction Not Found" &&
        inquiryResponse.data?.data?.statusCode === 500
      ) {
        console.log(`Transaction Not Found for mappedId ${mappedId}, attempting fallback with transaction UID`);
        // Fallback to transaction UID
        const fallbackUid =
          transaction.merchant?.uid ||
          transaction.merchant?.groups?.[0]?.uid ||
          transaction.merchant?.groups?.[0]?.merchant?.uid;
        if (fallbackUid) {
          console.log(`Performing ${providerName} inquiry with transaction UID: ${fallbackUid}`);
          inquiryUid = fallbackUid;
          inquiryResponse = await performInquiry(fallbackUid, merchantId, order);
        } else {
          console.error(`No fallback UID found for transaction ${merchantTransactionId}`);
          await bot.sendMessage(chatId, `No merchant UID found for transaction ${merchantTransactionId}.`);
          return;
        }
      }
    } else {
      // No mapped ID, try transaction UID directly
      const uid =
        transaction.merchant?.uid ||
        transaction.merchant?.groups?.[0]?.uid ||
        transaction.merchant?.groups?.[0]?.merchant?.uid;
      if (uid) {
        console.log(`Performing ${providerName} inquiry with transaction UID: ${uid}`);
        inquiryUid = uid;
        inquiryResponse = await performInquiry(uid, merchantId, order);
      } else {
        console.error(`No UID found for transaction ${merchantTransactionId}`);
        await bot.sendMessage(chatId, `No merchant mapping or UID found for transaction ${merchantTransactionId}.`);
        return;
      }
    }

    console.log("Inquiry API Response:", inquiryResponse.data);
    const inquiryStatus = inquiryResponse?.data?.data?.transactionStatus?.toLowerCase();
    const inquiryStatusCode = inquiryResponse?.data?.data?.statusCode;

    if (inquiryStatus === "completed") {
      await axiosInstance.post(SETTLE_API_URL, { transactionId: merchantTransactionId });
      console.log(`Transaction ${merchantTransactionId} marked as completed.`);
      await bot.sendMessage(chatId, `Transaction ${merchantTransactionId}: Completed.`);
    } else if (!inquiryStatus || inquiryStatus === "failed" || inquiryStatus === "pending" || inquiryStatusCode === 500) {
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
    console.log(`Payout ${merchantTransactionId} marked as failed.`);
    await bot.sendMessage(chatId, `Payout status ${merchantTransactionId}: Failed`);
  } else if (status === "pending") {
    console.log(`Payout ${merchantTransactionId} is pending.`);
    await bot.sendMessage(chatId, `Payout status ${merchantTransactionId}: Pending`);
  } else {
    console.log(`Payout ${merchantTransactionId} marked as failed.`);
    await bot.sendMessage(chatId, `Payout ${merchantTransactionId}: Failed.`);
  }
}
    //await axiosInstance.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] });
    console.log(`Payout ${merchantTransactionId} marked as failed.`);
    await bot.sendMessage(chatId, `Payout ${merchantTransactionId}: Failed.`);
      
    
  } catch (error) {
    console.error(`Error handling ${type} for order ${order}:`, error.message);
    await bot.sendMessage(chatId, `Error processing ${type} ${order}`);
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

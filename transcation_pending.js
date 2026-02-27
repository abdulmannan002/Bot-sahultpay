const axios = require("axios");
const express = require('express');
const dotenv = require('dotenv')
dotenv.config();

const app = express();
const PORT = process.env.PENDING_PORT || 4002;

app.listen(PORT, (req,res) => {
    console.log(`Example app listening on port ${PORT}`)
})

app.get("/", (req, res) => {
    return res.status(200).json({status: "success"})
})

// API URLs for transactions
const CALLBACK_API_URL = "https://server.sahulatpay.com/backoffice/payin-callback";
const SETTLE_API_URL = "https://server.sahulatpay.com/backoffice/settle-transactions/tele";
const FAIL_API_URL = "https://server.sahulatpay.com/backoffice/fail-transactions/tele";
const FETCH_API_URL = "https://server.sahulatpay.com/transactions/tele/last-15-3-mins?status=pending";
const uidMap = {
  // DEVINERA TECHNOLOGIES PRIVATE LIMITED (devinara)
  119: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  149: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  150: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  151: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  152: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  153: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  154: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  155: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  156: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  157: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  158: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  159: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  239: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  240: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  241: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  242: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  243: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  244: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  245: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  246: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara (corrected from c0c10)
  247: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara (corrected from c0c11)
  248: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara (corrected from c0c12)
  249: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara (corrected from c0c13)
  45: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara (JazzCash)

  // EVOLVICA SOLUTIONS PRIVATE LIMITED (evolivica)
  32: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica (JazzCash)
  87: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  88: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  89: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  90: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  91: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  92: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  93: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  94: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  96: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  97: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  98: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  99: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  100: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  101: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  103: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  104: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  105: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  106: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  107: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  108: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  109: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  110: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  111: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  112: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  113: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  114: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  115: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  160: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  161: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  162: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  163: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  164: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  165: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  166: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  167: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  168: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  169: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  170: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  171: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  172: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  173: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  174: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  175: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  176: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  177: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  178: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  179: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  180: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  181: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  182: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  183: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  184: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  185: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  186: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  195: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  196: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  197: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  200: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  201: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  202: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  203: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica
  204: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica

  // NEXTERA SPHERE (nextra)
  46: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra (Animatrix)
  137: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra
  138: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra
  139: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra
  140: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra
  143: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra

  // DEVTECTS PRIVATE LIMITED
  263: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  264: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  265: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  266: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  267: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  268: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  269: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  270: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  271: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  272: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  273: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  274: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  275: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  276: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  277: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  278: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  279: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  280: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  281: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  282: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  283: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  284: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  285: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  286: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  287: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  288: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  289: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  290: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  291: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  292: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  293: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  295: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  296: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  297: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  298: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  299: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  300: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",

  // DIGIFYTIVE PRIVATE LIMITED
  219: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  220: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  221: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  223: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  224: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  225: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  226: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  227: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  228: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  229: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  230: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  231: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  232: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  233: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  234: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  235: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  236: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  237: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",
  238: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e",

  // DOVANTIS SOLUTIONS PRIVATE LIMITED
  205: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a",
  206: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a",
  207: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a",
  208: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a",
  209: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a",
  210: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a",

  // MONIC TECH PRIVATE LIMITED
  250: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  251: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  252: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  253: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  254: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  255: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  256: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  257: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  258: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  259: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  260: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  261: "05ac708a-2a63-49f1-a77d-dd040c850e14",
  262: "05ac708a-2a63-49f1-a77d-dd040c850e14",

  // SASTA TECH SOLUTIONS & SASTA TECH SOLUTIONS PRIVATE LIMITED
  7: "6d612b47-6405-4237-9b0c-7d639eb960ee", // JazzCash
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
  211: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  212: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  213: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  215: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  217: "6d612b47-6405-4237-9b0c-7d639eb960ee",
  218: "6d612b47-6405-4237-9b0c-7d639eb960ee",

  // Animatrix
  27: "f2e2586e-d17b-4fe6-a905-2148f5e4bf15",

  // Payfast UIDs
  5: "22943823-9a2d-4ab2-8d13-9b684ba8058d",
  6: "2f1bc400-ee52-4091-9e3a-be4de8ecd9b3",
  8: "a32508c3-f480-4bd2-9c8e-76bb3c6ad747",
};

// List for transactions
let transaction = [];

// Set to track processed orders and prevent duplicates
const processedOrders = new Set();

// Retry function for API calls
const retry = async (fn, retries = 1, delay = 20) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === retries - 1) throw lastError;
      console.log(`Retry ${i + 1}/${retries} after error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Delay function to avoid rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to log messages
const logMessage = (message) => {
  console.log(`[LOG] ${new Date().toISOString()} ${message}`);
};

const logPayload = (label, payload) => {
  const ts = new Date().toISOString();
  console.log(`[LOG] ${ts} ${label}`);
  try {
    console.log(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.log(String(payload));
  }
};

// Fetch transactions
const fetchTransactions = async () => {
  try {
    const response = await retry(() => axios.get(FETCH_API_URL, { timeout: 10000 }));
    if (!response.data || typeof response.data !== "object") return;

    let transactions = response.data.transactions || response.data;
    if (!Array.isArray(transactions)) return;

    let newTransactions = transactions
      .filter((tx) => !transaction.includes(tx.merchant_transaction_id) && !processedOrders.has(tx.merchant_transaction_id))
      .map((tx) => tx.merchant_transaction_id);

    transaction = [...transaction, ...newTransactions];
    console.log(`Fetched: ${newTransactions.length}, Total in transaction list: ${transaction.length}`);
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
  }
};

// Function to handle the transaction
const handleTransaction = async (order) => {
  try {
    if (processedOrders.has(order)) {
      return;
    }
    processedOrders.add(order);
    setTimeout(() => processedOrders.delete(order), 30000); // Clear after 30s

    const apiUrl = `https://server.sahulatpay.com/transactions/tele?merchantTransactionId=${order}`;
    const response = await retry(() => axios.get(apiUrl));
    //console.log(`[${commandId}] API Response:`, response.data);

    let transaction = response.data.transactions?.[0];
    if (!transaction) {
      logMessage(`Transaction "${order}" not found in back-office.`);
      return;
    }

    //console.log(`[${commandId}] Transaction Details:`, JSON.stringify(transaction, null, 2));
    let providerName = transaction.providerDetails?.name?.toLowerCase();
    let status = transaction.status.trim().toLowerCase();
    let merchantTransactionId = transaction.merchant_transaction_id || transaction.merchant_custom_order_id;
    let txn_id = transaction.transaction_id;
    //let uid = transaction.merchant?.uid || transaction.merchant?.groups?.[0]?.uid || transaction.merchant?.groups?.[0]?.merchant?.uid;

    if (status === "completed") {
      try {
        await retry(() => axios.post(CALLBACK_API_URL, { transactionIds: [merchantTransactionId] }));
        //console.log(`[${commandId}] Transaction ${merchantTransactionId} marked as completed. TxnID: ${txn_id}`);
        logMessage(`Transaction Status ${merchantTransactionId} : Completed.\n\nTxnID: ${txn_id}`);
      } catch (error) {
        logMessage(`Error updating transaction status for ${merchantTransactionId}.`);
      }
      return;
    }

    // If provider name is missing, fail only when transaction is at least 14 minutes old.
    if (!providerName) {
      const fourteenMinutesMs = 10 * 60 * 1000;
      const transactionDateRaw =
        transaction.date_time ||
        transaction.transactionDateTime ||
        transaction.createdAt ||
        transaction.updatedAt;
      const transactionTimestamp = Date.parse(transactionDateRaw);
      const hasValidTimestamp = Number.isFinite(transactionTimestamp);
      const ageMs = hasValidTimestamp ? Date.now() - transactionTimestamp : 0;

      if (!hasValidTimestamp) {
        logMessage(
          `${merchantTransactionId} provider name missing but transaction date is invalid (${transactionDateRaw}). Skipping fail action.`
        );
        return;
      }

      if (ageMs < fourteenMinutesMs) {
        const ageMinutes = (ageMs / 60000).toFixed(2);
        logMessage(
          `${merchantTransactionId} provider name missing and only ${ageMinutes} minutes old. Skipping fail action for now.`
        );
        return;
      }

      await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));
      logMessage(`${merchantTransactionId} Status: Failed (provider name missing and older than 14 minutes).`);
      return;
    }

    // Status inquiry for transactions (aligned with status_inquiry.js)
    const performInquiry = async (transactionId) => {
      if (providerName === "easypaisa") {
        const url = `https://easypaisa-setup-server.assanpay.com/api/transactions/status-inquiry?orderId=${transactionId}`;
        logMessage(`Using new EasyPaisa inquiry URL: ${url}`);
        return retry(() => axios.get(url));
      }
      if (providerName === "jazzcash") {
        const url = `https://easypaisa-setup-server.assanpay.com/api/jazzcash/transactions/status-inquiry?orderId=${transactionId}`;
        logMessage(`Using new JazzCash inquiry URL: ${url}`);
        return retry(() => axios.get(url));
      }
      if (providerName === "qr") {
        const url = `https://easypaisa-setup-server.assanpay.com/api/bankislami/transactions/status-inquiry-external?orderId=${transactionId}`;
        logMessage(`Using new QR inquiry URL: ${url}`);
        return retry(() => axios.get(url));
      }
      throw new Error(`Unsupported provider for inquiry: ${providerName}`);
    };

    const performLegacyInquiry = async (uid, transactionId) => {
      if (providerName === "easypaisa") {
        const url = `https://server.sahulatpay.com/payment/inquiry-ep/${uid}?orderId=${transactionId}`;
        logMessage(`Using legacy EasyPaisa inquiry URL: ${url}`);
        return retry(() => axios.get(url));
      }
      if (providerName === "jazzcash") {
        const url = `https://server.sahulatpay.com/payment/simple-status-inquiry/${uid}?transactionId=${transactionId}`;
        logMessage(`Using legacy JazzCash inquiry URL: ${url}`);
        return retry(() => axios.get(url));
      }
      throw new Error(`Unsupported provider for legacy inquiry: ${providerName}`);
    };

    const isEasyPaisaNotFoundResponse = (responseData) =>
      providerName === "easypaisa" &&
      responseData?.success === false &&
      ["Transaction not found", "invalid inputs", "Something went wrong"].includes(responseData?.message) &&
      responseData?.data?.statusCode === 404;

    const isJazzCashInvalidResponse = (responseData, inquiryFailed) =>
      providerName === "jazzcash" &&
      (
        inquiryFailed ||
        (!responseData?.data?.transactionStatus &&
          !responseData?.transactionStatus &&
          !responseData?.data?.paymentStatus &&
          !responseData?.paymentStatus) ||
        (responseData?.statusCode && responseData.statusCode >= 500) ||
        responseData?.success === false ||
        !responseData
      );

    const merchantId = transaction.providerDetails?.id;
    let mappedId = uidMap[merchantId];
    let inquiryUid = null;
    let inquiryResponse = null;

    if (mappedId) {
      logMessage(`Performing ${providerName} inquiry with mapped UID: ${mappedId}`);
      inquiryUid = mappedId;
      let inquiryFailed = false;

      try {
        inquiryResponse = await performInquiry(order);
        logPayload(`Mapped inquiry response for ${merchantTransactionId}`, inquiryResponse?.data);
      } catch (err) {
        inquiryFailed = true;
        logMessage(`Mapped inquiry failed for ${merchantTransactionId}: ${err.message}`);
      }

      const responseData = inquiryResponse?.data;
      const shouldFallback =
        isEasyPaisaNotFoundResponse(responseData) ||
        isJazzCashInvalidResponse(responseData, inquiryFailed);

      if (shouldFallback) {
        const fallbackUid =
          transaction.merchant?.uid ||
          transaction.merchant?.groups?.[0]?.uid ||
          transaction.merchant?.groups?.[0]?.merchant?.uid;

        if (!fallbackUid) {
          logMessage(`No fallback UID found for ${merchantTransactionId}. Marking failed.`);
          await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));
          return;
        }

        inquiryUid = fallbackUid;
        try {
          inquiryResponse = await performLegacyInquiry(fallbackUid, order);
          logPayload(`Fallback inquiry response for ${merchantTransactionId}`, inquiryResponse?.data);
        } catch (err) {
          logMessage(`Fallback inquiry failed for ${merchantTransactionId}: ${err.message}`);
          await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));
          return;
        }
      }
    } else {
      const uid =
        transaction.merchant?.uid ||
        transaction.merchant?.groups?.[0]?.uid ||
        transaction.merchant?.groups?.[0]?.merchant?.uid;

      if (!uid) {
        logMessage(`No mapped UID or merchant UID for ${merchantTransactionId}. Marking failed.`);
        await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));
        return;
      }

      inquiryUid = uid;
      try {
        inquiryResponse = await performInquiry(order);
        logPayload(`Direct inquiry response for ${merchantTransactionId}`, inquiryResponse?.data);

        const responseData = inquiryResponse?.data;
        if (
          isEasyPaisaNotFoundResponse(responseData) ||
          isJazzCashInvalidResponse(responseData, false)
        ) {
          inquiryResponse = await performLegacyInquiry(uid, order);
          logPayload(`Direct legacy fallback response for ${merchantTransactionId}`, inquiryResponse?.data);
        }
      } catch (err) {
        logMessage(`Direct inquiry failed for ${merchantTransactionId}: ${err.message}`);
        await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));
        return;
      }
    }

    if (!inquiryResponse) {
      logMessage(`No inquiry response for ${merchantTransactionId} (uid: ${inquiryUid}). Marking failed.`);
      await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));
      return;
    }

    const inquiryRawStatus =
      inquiryResponse?.data?.data?.transactionStatus ||
      inquiryResponse?.data?.transactionStatus ||
      inquiryResponse?.data?.data?.paymentStatus ||
      inquiryResponse?.data?.paymentStatus ||
      inquiryResponse?.data?.data?.responseMessage;
    const inquiryStatus = typeof inquiryRawStatus === "string" ? inquiryRawStatus.toLowerCase() : undefined;
    const inquiryStatusCode = inquiryResponse?.data?.statusCode || inquiryResponse?.data?.data?.statusCode;

    logPayload(`Final inquiry response for ${merchantTransactionId}`, inquiryResponse?.data);
    logMessage(`Parsed inquiry status for ${merchantTransactionId}: ${inquiryStatus} (code: ${inquiryStatusCode}, inquiryUid: ${inquiryUid})`);

    if (!inquiryStatus || inquiryStatus === "failed" || inquiryStatusCode === 500) {
      logMessage(`Marking ${merchantTransactionId} as FAILED via ${FAIL_API_URL}`);
      await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));
      return;
    }

    if (inquiryStatus === "completed" || inquiryStatus === "paid") {
      logMessage(`Marking ${merchantTransactionId} as COMPLETED via ${SETTLE_API_URL}`);
      await retry(() => axios.post(SETTLE_API_URL, { transactionId: merchantTransactionId }));
      return;
    }

    if (inquiryStatus === "pending") {
      // Existing bot behavior keeps pending inquiries as failed.
      logMessage(`Inquiry status pending for ${merchantTransactionId}; marking FAILED via ${FAIL_API_URL}`);
      await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));
      return;
    }

    logMessage(`Unknown inquiry status for ${merchantTransactionId}: ${inquiryStatus}. No action taken.`);
    } catch (error) {
    console.error(`Error handling transaction ${order}:`, error.message);
    logMessage(`Error handling transaction ${order}: ${error.message}`);
    return {
      order,
      status: "error",
      message: `Error handling transaction ${order}: ${error.message}`,
      apiStatus: "unknown",
      inquiryUid: "N/A"
    };
  }
}; 
// Function to process transaction list
const processTransactionList = async () => {
  console.log("Processing transaction list:", transaction);
  while (transaction.length > 0) {
    const order = transaction[0]; // Peek at the first order
    transaction.shift(); // Remove it immediately to prevent reprocessing
    await handleTransaction(order);
    await delay(10); // Delay between transactions
  }
};

// Main loop to fetch and process every 10 minutes
const main = async () => {
  while (true) {
    console.log("Starting fetch cycle...");
    await fetchTransactions();
    await processTransactionList();
    console.log("Waiting 10 minutes for next fetch...");
    await delay(120000); // Wait 2 minutes (600,000 ms)
  }
};

// Run the script
main().catch((error) => {
  console.error("Error in main loop:", error);
});

// Handle uncaught exceptions and rejections to prevent crashes
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

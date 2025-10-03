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
  //console.log(`[LOG]: ${message}`);
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
    let inquiryUrl, inquiryResponse;
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

    // Status inquiry for transactions
   if (providerName === "easypaisa") {
           let easyPaisaMerchantId = transaction.providerDetails?.id;
           logMessage(`Retrieved easyPaisaMerchantId: ${easyPaisaMerchantId}`);
   
           let mappedId = uidMap[easyPaisaMerchantId];
           logMessage(`Mapped ID for easyPaisaMerchantId ${easyPaisaMerchantId}: ${mappedId}`);
   
           if (mappedId) {
             logMessage(`Performing Easypaisa inquiry with UUID: ${mappedId}`);
             inquiryUid = mappedId;
             inquiryUrl = `https://server.sahulatpay.com/payment/inquiry-ep/${mappedId}?orderId=${order}`;
             inquiryResponse = await axios.get(inquiryUrl, { params: { transaction_id: merchantTransactionId } });
           } else {
             let uid = transaction.merchant?.uid || transaction.merchant?.groups?.[0]?.uid || transaction.merchant?.groups?.[0]?.merchant?.uid;
             if (uid) {
               logMessage(`Performing Easypaisa inquiry with fallback UID: ${uid}`);
               inquiryUid = uid;
               inquiryUrl = `https://server.sahulatpay.com/payment/inquiry-ep/${uid}?orderId=${order}`;
               inquiryResponse = await axios.get(inquiryUrl, { params: { transaction_id: merchantTransactionId } });
             } else {
                logMessage(`No UID found for transaction ${merchantTransactionId}`);
              return {
              order,
              status: "error",
              message: `No merchant mapping found for transaction ${merchantTransactionId}.`,
              apiStatus: status,
              inquiryUid: "N/A"
            };
          }
        }
      } else if (providerName === "jazzcash") {
        let jazzCashMerchantId = transaction.providerDetails?.id;
        let mappedId = uidMap[jazzCashMerchantId];

        logMessage(`Retrieved jazzCashMerchantId: ${jazzCashMerchantId}`);
        logMessage(`Mapped ID for jazzCashMerchantId ${jazzCashMerchantId}: ${mappedId}`);

        if (mappedId) {
          logMessage(`Performing JazzCash inquiry with UUID: ${mappedId}`);
          inquiryUid = mappedId;
          inquiryUrl = `https://server.sahulatpay.com/payment/simple-status-inquiry/${mappedId}?transactionId=${order}`;
          inquiryResponse = await axios.get(inquiryUrl, { params: { transaction_id: merchantTransactionId } });
        } else {
          let uid = transaction.merchant?.uid || transaction.merchant?.groups?.[0]?.uid || transaction.merchant?.groups?.[0]?.merchant?.uid;
          if (uid) {
            logMessage(`Performing JazzCash inquiry with fallback UID: ${uid}`);
            inquiryUid = uid;
            inquiryUrl = `https://server.sahulatpay.com/payment/status-inquiry/${uid}`;
            inquiryResponse = await axios.post(inquiryUrl, { transactionId: merchantTransactionId });
          } else {
            logMessager(`No UID found for transaction ${merchantTransactionId}`);
            return {
              order,
              status: "error",
              message: `No merchant mapping found for transaction ${merchantTransactionId}.`,
              apiStatus: status,
              inquiryUid: "N/A"
            };
          }
        }
      }
      if (inquiryResponse) {
        //console.log(`[${commandId}] Inquiry API Response:`, inquiryResponse.data);
        let inquiryStatus = inquiryResponse?.data?.data?.transactionStatus?.toLowerCase();
        let inquiryStatusCode = inquiryResponse?.data?.statusCode;
        let inquiryrrUid = inquiryResponse?.data;
        logMessage(`Inquiry Response for ${merchantTransactionId}: ${JSON.stringify(inquiryrrUid, null, 2)}`);
        logMessage(`Inquiry Status for ${merchantTransactionId}: ${inquiryStatus}(Code: ${inquiryStatusCode})`);
        if (!inquiryStatus || inquiryStatus === "failed" || inquiryStatusCode === 500) {
          await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));
          //console.log(`[${commandId}] Transaction ${merchantTransactionId} marked as failed.`);
          logMessage(`${merchantTransactionId} Status: Failed.`);
          return;
        } else if (inquiryStatus === "completed") {
          await retry(() => axios.post(SETTLE_API_URL, { transactionId: merchantTransactionId }));
          //console.log(`[${commandId}] Transaction ${merchantTransactionId} marked as completed.`);
          logMessage(`Transaction Status ${merchantTransactionId} : Completed.`);
          return;
        }
        else if (inquiryStatus === "pending") {
         await retry(() => axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] }));
          //console.log(`[${commandId}] Transaction ${merchantTransactionId} marked as failed.`);
          logMessage(`${merchantTransactionId} Status: Failed.`);
          return;
        } else {
          logMessage(`Unknown status for transaction ${merchantTransactionId}: ${inquiryStatus}`);
          return;
        }
      }
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
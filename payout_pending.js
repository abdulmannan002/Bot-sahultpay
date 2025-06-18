const axios = require('axios');
const schedule = require('node-schedule');
const express = require('express')
const app = express()
const port = process.env.CALLBACK_PORT || 4000;

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
app.get('/', (req, res) => {
  res.send('Payout Pending Service is running.');
});
// API URLs for transactions
const CALLBACK_API_URL = "https://server.sahulatpay.com/backoffice/payout-callback";
const SETTLE_API_URL = "https://server.sahulatpay.com/backoffice/settle-disbursements/tele";
const FAIL_API_URL = "https://server.sahulatpay.com/backoffice/fail-disbursements-account-invalid/tele";
const FETCH_API_URL = "https://server.sahulatpay.com/disbursement/tele/last-15-10-mins?status=pending";
const uidMap = {
  5: "6d612b47-6405-4237-9b0c-7d639eb960ee", // SASTA TECH SOLUTIONS
  7: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // DEVINERA TECHNOLOGIES
};

// List for transactions
let transaction = [];

// Set to track processed orders and prevent duplicates
const processedOrders = new Set();

// Delay function to avoid rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to log messages
const logMessage = (message) => {
  console.log(`[LOG]: ${message}`);
};

// Fetch transactions
const fetchTransactions = async () => {
  try {
    const response = await axios.get(FETCH_API_URL, { timeout: 10000 });
    if (!response.data?.data?.transactions || typeof response.data !== "object") return;

    let transactions = response.data?.data?.transactions || response.data;
    if (!Array.isArray(transactions)) return;

    let newTransactions = transactions
      .filter((tx) => !transaction.includes(tx.merchant_custom_order_id) && !processedOrders.has(tx.merchant_custom_order_id))
      .map((tx) => tx.merchant_custom_order_id);

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

    const apiUrl = `https://server.sahulatpay.com/disbursement/tele?merchantTransactionId=${order}`;
    const response = await axios.get(apiUrl);

    let transaction = response.data?.data?.transactions?.[0];
    if (!transaction) {
      logMessage(`Transaction "${order}" not found in back-office.`);
      return;
    }

    let status = transaction.status.trim().toLowerCase();
    let merchantTransactionId = transaction.merchant_custom_order_id;
    let txn_id = transaction.transaction_id;
    let Id = transaction.providerDetails?.id;

    if (status === "completed") {
      try {
        await axios.post(CALLBACK_API_URL, { transactionIds: [merchantTransactionId] });
        logMessage(`Transaction Status ${merchantTransactionId} : Completed.\n\nTxnID: ${txn_id}`);
      } catch (error) {
        logMessage(`Error updating transaction status for ${merchantTransactionId}.`);
      }
      return;
    }

    // Status inquiry for transactions
    //let inquiryUrl, inquiryResponse;
    if (status === "failed" && Id === 5 || (status === "pending" && Id === 5)) {
      await axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] });
      // const randomBigInt = generateRandomBigInt(100000000000);
      // logMessage(`Processing transaction ${merchantTransactionId} with status ${status}`);
      // logMessage(randomBigInt);
      // inquiryUrl = `https://server.sahulatpay.com/payment/sjz-disburse-status/${uidMap[Id]}`;
      //   logMessage(`Inquiry URL: ${inquiryUrl}`);
      // inquiryResponse = await axios.post(inquiryUrl,  { originalReferenceId: merchantTransactionId, referenceID: randomBigInt });
    } else if (status === "pending" && Id === 7 || (status === "failed" && Id === 7)) {
      await axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] });
      // const randomBigInt = generateRandomBigInt(100000000000);
      // logMessage(`Processing transaction ${merchantTransactionId} with status ${status}`);
      // logMessage(randomBigInt);
      // inquiryUrl = `https://server.sahulatpay.com/payment/sjz-disburse-status/${uidMap[Id]}`;
      // logMessage(`Inquiry URL: ${inquiryUrl}`);
      // inquiryResponse = await axios.post(inquiryUrl, { originalReferenceId: merchantTransactionId, referenceID: randomBigInt } );
    }

    // if (inquiryResponse) {
    //   let inquiryStatus = inquiryResponse?.data?.data?.transactionStatus?.toLowerCase();
    //   let inquiryStatusCode = inquiryResponse?.data?.statusCode;
    //   let inquiryrrUid = inquiryResponse?.data;
    //   logMessage(`Inquiry Response for ${merchantTransactionId}: ${JSON.stringify(inquiryrrUid, null, 2)}`);
    //   logMessage(`Inquiry Status for ${merchantTransactionId}: ${inquiryStatus}(Code: ${inquiryStatusCode})`);
    //   if (!inquiryStatus || inquiryStatus === "failed" || inquiryStatusCode === 500) {
    //     ////await axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] });
    //     logMessage(`${merchantTransactionId} Status: Failed.`);
    //     return;
    //   } else if (inquiryStatus === "completed") {
    //     //await axios.post(SETTLE_API_URL, { transactionId: merchantTransactionId });
    //     logMessage(`Transaction Status ${merchantTransactionId} : Completed.`);
    //     return;
    //   } else if (inquiryStatus === "pending") {
    //     //await axios.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] });
    //     logMessage(`${merchantTransactionId} Status: Failed.`);
    //     return;
    //   } else {
    //     logMessage(`Unknown status for transaction ${merchantTransactionId}: ${inquiryStatus}`);
    //     return;
    //   }
    // }
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
    await delay(600000); // Wait 10 minutes (600,000 ms)
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
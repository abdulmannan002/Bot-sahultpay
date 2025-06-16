const axios = require('axios');
const dotenv = require('dotenv');
const express = require('express');

dotenv.config();

const app = express();
const PORT = process.env.ALERT_PORT || 4005;

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`);
});

app.get("/", (req, res) => {
    return res.status(200).json({ status: "success" });
});

// Telegram configuration
const TELEGRAM_BOT_TOKEN = "8125987558:AAHcWxHEqTkqJIoZestOeWY3kOYKGgFVTSU";
const TELEGRAM_USER_ID = '-1002662637300';

// API endpoints
const API_URL_ALL = 'https://server.sahulatpay.com/transactions/tele/last-15-mins';
const MERCHANTS = {
    51: 'https://server.sahulatpay.com/transactions/tele/last-15-mins?merchantId=51', // Monetix
    5: 'https://server.sahulatpay.com/transactions/tele/last-15-mins?merchantId=5',
    16: 'https://server.sahulatpay.com/transactions/tele/last-15-mins?merchantId=16',
    451: 'https://server.sahulatpay.com/transactions/tele/last-4-mins?merchantId=451'   // First pay
};

// Validate Telegram configuration at startup
function validateTelegramConfig() {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_BOT_TOKEN.includes(':')) {
        console.error('❌ Invalid TELEGRAM_BOT_TOKEN. Please check your .env file or configuration.');
        process.exit(1);
    }
    if (!TELEGRAM_USER_ID || !TELEGRAM_USER_ID.startsWith('-')) {
        console.error('❌ Invalid TELEGRAM_USER_ID. It should start with "-". Please check your .env file or configuration.');
        process.exit(1);
    }
    console.log('✅ Telegram configuration validated successfully.');
}

// Start Express server
app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`);
    validateTelegramConfig();
});

app.get("/", (req, res) => {
    return res.status(200).json({ status: "success" });
});

// Function to fetch transactions
async function fetchTransactions(url) {
    try {
        const response = await axios.get(url);
        return response.data.transactions || [];
    } catch (error) {
        console.error(`Error fetching transactions from ${url}: ${error.message}`);
        return null;
    }
}

// Function to filter Easypaisa transactions
// Function to filter Easypaisa transactions
function filterEasypaisaTransactions(transactions) {
    return transactions.filter(txn => txn.providerDetails?.name === "Easypaisa");
}

// Function to filter JazzCash transactions
function filterJazzCashTransactions(transactions) {
    return transactions.filter(txn => txn.providerDetails?.name === "JazzCash");
}

// Function to calculate transaction stats
function calculateTransactionStats(transactions) {
    const total = transactions.length;
    const completed = transactions.filter(txn => txn.status === "completed").length;
    const failed = transactions.filter(txn => txn.status === "failed").length;
    const pending = transactions.filter(txn => txn.status === "pending").length;
    const successRate = total === 0 ? 0 : (completed / total) * 100;
    return { total, completed, failed, pending, successRate };
}

// Function to fetch transactions
async function sendTelegramMessage(message) {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    // Truncate message to avoid exceeding Telegram's 4096-character limit
    const truncatedMessage = message.length > 4000 ? message.slice(0, 4000) + '...' : message;
    
    try {
        await axios.post(telegramUrl, {
            chat_id: TELEGRAM_USER_ID,
            text: truncatedMessage,
            parse_mode: 'Markdown'
        });
        console.log('✅ Telegram alert sent successfully!');
    } catch (error) {
        console.error('❌ Failed to send Telegram message:');
        console.error('Error details:', {
            message: error.message,
            response: error.response ? {
                status: error.response.status,
                data: error.response.data
            } : null,
            request: error.request ? 'Request was made but no response received' : null
        });
    }
});

// Function to send consolidated Telegram alerts
async function sendConsolidatedAlerts(data) {
    let message = '🚨 Transaction Success Rate Report (15-min window) 📊\n';
    message += `Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })}\n\n`;

    for (const [type, stats] of Object.entries(data)) {
        const { total, completed, failed, pending, successRate } = stats;
        if (successRate === 0 && total === 0) {
            message += `⚠️ *${type}*: Server may be down (no transactions)\n`;
        } else if (successRate < 60) {
            message += `*${type}* (Below 60%):\n` +
                       `📊 Success Rate: ${successRate.toFixed(2)}%\n` +
                       `✅ Completed: ${completed}\n` +
                       `❌ Failed: ${failed}\n` +
                       `⏳ Pending: ${pending}\n` +
                       `Total: ${total}\n\n`;
        } else {
            message += `*${type}*:\n` +
                       `📊 Success Rate: ${successRate.toFixed(2)}%\n` +
                       `✅ Completed: ${completed}\n` +
                       `❌ Failed: ${failed}\n` +
                       `⏳ Pending: ${pending}\n` +
                       `Total: ${total}\n\n`;
        }
    }

    await sendTelegramMessage(message);
}

// Main monitoring function
async function monitorTransactions() {
    // Initialize global timing variables
    if (!global.firstAlertTime) {
        global.firstAlertTime = Date.now();
        global.lastAlertSent = Date.now();
    }

    while (true) {
        const data = {};

        // Fetch all transactions
        const allTransactions = await fetchTransactions(API_URL_ALL);
        if (allTransactions) {
            data["All Transactions"] = calculateTransactionStats(allTransactions);
        }

        // All Easypaisa transactions
        const allEasypaisaTransactions = filterEasypaisaTransactions(allTransactions || []);
        data["All Easypaisa"] = calculateTransactionStats(allEasypaisa);
        data.transactions;

        // All JazzCash transactions
        const allJazzCashTransactions = filterJazzCashTransactions(allTransactions || []));
        data["All JazzCash"] = calculateTransactionStats(allJazzCashTransactions);

        // Merchant-specific transactions
        for (const [merchantId, url] of Object.entries(MERCHANTS)) {
            const merchantTransactions = await fetchTransactions(url);
            if (merchantTransactions) {
                const merchantEasypaisaTransactions = filterEasypaisaTransactions(merchantTransactions);
                const merchantJazzCashTransactions = filterJazzCashTransactions(merchantTransactions);

                let merchantName = merchantId === '51' ? 'Monetix' : merchantId === '451' ? 'First pay' : `Merchant ${merchantId}`;
                if (merchantEasypaisaTransactions.length > 0) {
                    data[`${merchantName} Easypaisa`] = calculateTransactionStats(merchantEasypaisaTransactions);
                }
                if (merchantJazzCashTransactions.length > 0) {
                    data[`${merchantName} JazzCash`] = calculateTransactionStats(merchantJazzCashTransactions);
                }
            }
        }

        // Log successful transaction success rates
        console.log('Transaction Success Rates:');
        for (const [type, { successRate, total, completed, failed, pending }] of Object.entries(data)) {
            console.log(`${type}: Success Rate = ${successRate.toFixed(2)}%, Total = ${total}, Completed = ${completed}, Failed = ${failed}, Pending = ${pending}`);
        }

        // Send alert every 15 minutes
        const now = Date.now();
        const minutesSinceFirst = (now - global.firstAlertTime) / (60 * 1000);
        const minutesSinceLast = (now - global.lastAlertSent) / (60 * 1000);

        if (minutesSinceFirst >= 15 && minutesSinceLast >= 15) {
            await sendConsolidatedAlerts(data);
            global.lastAlertSent = Date.now();
        }

        // Wait 15 minutes
        await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000));
    }
}

// Start monitoring
async function startMonitoring() {
    console.log("Starting transaction monitoring...");
    try {
        await monitorTransactions();
    } catch (error) {
        console.error("Error in monitoring tasks:", error);
    }
};

// Start the bot
startMonitoring();

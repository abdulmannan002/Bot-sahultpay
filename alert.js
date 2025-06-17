const axios = require('axios');
const pRetry = require('p-retry').default || require('p-retry');
const Bottleneck = require('bottleneck');
const winston = require('winston');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const FormData = require('form-data');

// Configuration
const config = {
    telegram: {
        botToken: "8125987558:AAHcWxHEqTkqJIoZestOeWY3kOYKGgFVTSU",
        userId: '-1002662637300'
    },
    api: {
        baseUrl: 'https://server.sahulatpay.com/transactions/tele/last-15-mins',
        merchants: {
            51: '?merchantId=51',
            451: '?merchantId=451',
            16: '?merchantId=16'
        }
    },
    monitorInterval: 600000, // 10 minutes
    retryInterval: 60000, // 1 minute for server down retries
    acknowledgment: {
        retries: 3,
        timeout: 120000 // 2 minutes
    }
};

// Initialize logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'monitor.log' }),
        new winston.transports.Console()
    ]
});

// Initialize rate limiters
const apiLimiter = new Bottleneck({ minTime: 1000 }); // API requests
const telegramLimiter = new Bottleneck({ minTime: 1000 }); // Telegram requests

// Initialize chart renderer
const canvas = new ChartJSNodeCanvas({ width: 800, height: 600 });

// Global offset for Telegram message polling
let lastUpdateId = 0;

// Delete Telegram webhook
async function deleteWebhook() {
    try {
        const res = await telegramLimiter.schedule(() =>
            axios.get(`https://api.telegram.org/bot${config.telegram.botToken}/deleteWebhook`)
        );
        logger.info("Webhook deleted", { response: res.data });
    } catch (err) {
        logger.error("Error deleting webhook", {
            error: { message: err.message, code: err.code, response: err.response?.data }
        });
    }
}

// Fetch transactions from API
async function fetchTransactions(url) {
    try {
        const res = await apiLimiter.schedule(() =>
            pRetry(() => axios.get(url), { retries: 3, minTimeout: 1000 }).catch(err => {
                logger.error(`Retry failed for ${url}`, { error: err.message });
                throw err;
            })
        );
        const transactions = res.data.transactions || [];
        if (!transactions.length) {
            logger.warn(`No transactions returned from ${url}`, { response: res.data });
        }
        return { transactions, isSuccess: true };
    } catch (err) {
        logger.error(`Error fetching from ${url}`, {
            error: { message: err.message, code: err.code, status: err.response?.status }
        });
        return { transactions: [], isSuccess: false };
    }
}

// Check if server is stable
async function checkServerStatus() {
    const result = await fetchTransactions(config.api.baseUrl);
    return result.isSuccess && result.transactions.length > 0;
}

// Filter transactions by provider
const filterTransactionsByProvider = (transactions, providerName) =>
    transactions.filter(txn => txn.providerDetails?.name === providerName);

// Calculate success stats
function calculateStats(transactions) {
    const total = transactions.length;
    const completed = transactions.filter(txn => txn.status === "completed").length;
    const failed = transactions.filter(txn => txn.status === "failed").length;
    const pending = transactions.filter(txn => txn.status === "pending").length;
    const successRate = total === 0 ? 0 : (completed / total) * 100;
    return { total, completed, failed, pending, successRate };
}

// Send message to Telegram
async function sendTelegramMessage(text) {
    try {
        await telegramLimiter.schedule(() =>
            pRetry(() =>
                axios.post(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
                    chat_id: config.telegram.userId,
                    text,
                    parse_mode: 'Markdown'
                }),
                { retries: 2, minTimeout: 2000 }
            )
        );
        logger.info("Telegram message sent", { text });
    } catch (err) {
        logger.error("Telegram message failed", {
            error: { message: err.message, code: err.code, response: err.response?.data }
        });
    }
}

// Generate and send chart
async function sendChart(statsMap) {
    try {
        const chartConfig = {
            type: 'bar',
            data: {
                labels: Object.keys(statsMap),
                datasets: [{
                    label: 'Success Rate (%)',
                    data: Object.values(statsMap).map(stat => stat.successRate),
                    backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#4CAF50'],
                    borderColor: ['#2A87D0', '#E05570', '#E6B800', '#3AA8A8', '#7A52CC', '#E68A00', '#388E3C'],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, max: 100, title: { display: true, text: 'Success Rate (%)' } },
                    x: { title: { display: true, text: 'Transaction Type' } }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Transaction Success Rates (Last 15 Minutes)' }
                }
            }
        };
        const buffer = await canvas.renderToBuffer(chartConfig, 'image/png');
        const form = new FormData();
        form.append('chat_id', config.telegram.userId);
        form.append('photo', buffer, { filename: 'chart.png', contentType: 'image/png' });
        form.append('caption', 'Transaction Success Rates');
        await telegramLimiter rhino.schedule(() =>
            pRetry(() =>
                axios.post(`https://api.telegram.org/bot${config.telegram.botToken}/sendPhoto`, form, {
                    headers: form.getHeaders()
                }),
                { retries: 2, minTimeout: 2000 }
            )
        );
        logger.info("Chart sent to Telegram");
    } catch (err) {
        logger.error("Error sending chart", {
            error: { message: err.message, code: err.code, response: err.response?.data }
        });
    }
}

// Generate report message
function generateReportMessage(data, serverDown = false) {
    let message = "🚨 *Transaction Success Rate Report* 🚨\n\n";
    if (serverDown) {
        message += "⚠️ *Server Down*: API is unreachable. Retrying every 1 minute.\n\n";
    }
    let hasApiError = Object.values(data).every(s => s.total === 0 && s.successRate === 0);
    for (const [type, stats] of Object.entries(data)) {
        const { total, completed, failed, pending, successRate } = stats;
        if (total === 0 && successRate === 0) {
            message += `⚠️ *${type}*: No data (Possible API issue)\n`;
        } else {
            const alertEmoji = successRate < 60 ? "🔻" : "✅";
            message += `*${type}* ${alertEmoji}:\n` +
                `📊 Success Rate: ${successRate.toFixed(2)}%\n` +
                `✅ Completed: ${completed}\n❌ Failed: ${failed}\n` +
                `⏳ Pending: ${pending}\n📈 Total: ${total}\n\n`;
        }
    }
    if (hasApiError && !serverDown) {
        message += "⚠️ *Note*: No data received. This may indicate a script error. Check logs for details.\n";
    }
    message += "Reply with `/check` to acknowledge.";
    return message;
}

// Send consolidated alert
async function sendAlert(data, serverDown = false) {
    const message = generateReportMessage(data, serverDown);
    await sendTelegramMessage(message);
    if (!serverDown) await sendChart(data); // Skip chart if server is down
    let acknowledged = false;
    for (let i = 0; i < config.acknowledgment.retries && !acknowledged; i++) {
        await new Promise(r => setTimeout(r, config.acknowledgment.timeout));
        acknowledged = await checkUserCommands();
    }
    if (acknowledged) {
        await sendTelegramMessage("✅ Alerts acknowledged by user.");
    } else {
        logger.info("No response from user. Stopping alerts until next cycle");
    }
}

// Handle update commands
async function handleUpdateCommand(label, url, provider = null) {
    const { transactions } = await fetchTransactions(url);
    const filteredTxns = provider ? filterTransactionsByProvider(transactions, provider) : transactions;
    const stats = calculateStats(filteredTxns);
    const msg = `📊 *${label}*:\n` +
        `✅ Completed: ${stats.completed}\n❌ Failed: ${stats.failed}\n` +
        `⏳ Pending: ${stats.pending}\n📈 Total: ${stats.total}\n` +
        `📊 Success Rate: ${stats.successRate.toFixed(2)}%`;
    await sendTelegramMessage(msg);
}

// Listen for Telegram commands
async function checkUserCommands() {
    const url = `https://api.telegram.org/bot${config.telegram.botToken}/getUpdates?offset=${lastUpdateId + 1}`;
    try {
        const res = await telegramLimiter.schedule(() =>
            pRetry(() => axios.get(url), { retries: 2, minTimeout: 2000 })
        );
        const updates = res.data.result;
        let stopAlerts = false;

        for (const update of updates) {
            lastUpdateId = update.update.update_id;
            const text = update.message?.text?.trim();
            const userChat = update.message?.chat?.id;
            if (userChat != config.telegram.userId || !text) continue;

            if (text === "/check" || text === "/check@Devtectalertbot") {
                logger.info("Alert acknowledged by user");
                stopAlerts = true;
            } else if (text.startsWith("/update ")) {
                const merchantId = text.split(" ")[1];
                const url = config.api.baseUrl + (config.api.merchants[merchantId] || "");
                if (config.api.merchants[merchantId]) {
                    const label = merchantId === "51" ? "Monetix Easypaisa" : `Merchant ${merchantId} Easypaisa`;
                    await handleUpdateCommand(label, url, "Easypaisa");
                } else {
                    await sendTelegramMessage(`❌ Invalid Merchant ID.\nAvailable: ${Object.keys(config.api.merchants).join(", ")}`);
                }
            } else if (text === "/updateeasy") {
                await handleUpdateCommand("All Easypaisa", config.api.baseUrl, "Easypaisa");
            } else if (text === "/updatejazz") {
                await handleUpdateCommand("All JazzCash", config.api.baseUrl, "JazzCash");
            } else if (text === "/updateall") {
                await handleUpdateCommand("All Transactions", config.api.baseUrl);
            }
        }

        return stopAlerts;
    } catch (err) {
        if (err.response?.status === 409) {
            logger.warn("Conflict detected. Retrying...");
            await new Promise(r => setTimeout(r, 5000));
            return await checkUserCommands();
        }
        logger.error("Telegram error", {
            error: { message: err.message, code: err.code, response: err.response?.data }
        });
        return false;
    }
}

// Main monitoring loop
async function startMonitoring() {
    logger.info("Starting monitoring");
    await deleteWebhook();

    while (true) {
        logger.info("Checking server status");
        let serverStable = await checkServerStatus();
        if (!serverStable) {
            await sendTelegramMessage("⚠️ *Server Down*: API is unreachable or returned no data. Retrying every 1 minute...");
            while (!serverStable) {
                await new Promise(r => setTimeout(r, config.retryInterval)); // Wait 1 minute
                logger.info("Retrying server status check");
                serverStable = await checkServerStatus();
            }
            await sendTelegramMessage("✅ *Server Recovered*: API is stable. Resuming normal monitoring.");
        }

        const statsMap = {};
        const { transactions: allTxns } = await fetchTransactions(config.api.baseUrl);
        statsMap["All Transactions"] = calculateStats(allTxns);
        statsMap["All Easypaisa"] = calculateStats(filterTransactionsByProvider(allTxns, "Easypaisa"));
        statsMap["All JazzCash"] = calculateStats(filterTransactionsByProvider(allTxns, "JazzCash"));

        const merchantTxns = await Promise.all(
            Object.entries(config.api.merchants).map(([id, query]) => fetchTransactions(config.api.baseUrl + query))
        );

        Object.entries(config.api.merchants).forEach(([id, query], index) => {
            const { transactions: txns } = merchantTxns[index];
            const name = id === "51" ? "Monetix" : id === "451" ? "First Pay" : `Merchant ${id}`;
            const easypaisa = filterTransactionsByProvider(txns, "Easypaisa");
            const jazzcash = filterTransactionsByProvider(txns, "JazzCash");
            if (easypaisa.length) statsMap[`${name} Easypaisa`] = calculateStats(easypaisa);
            if (jazzcash.length) statsMap[`${name} JazzCash`] = calculateStats(jazzcash);
        });

        logger.info("Stats calculated", { statsMap });

        const shouldAlert = Object.values(statsMap).some(s => s.successRate < 100 || (s.successRate === 0 && s.total === 0));
        if (shouldAlert) await sendAlert(statsMap, !serverStable);

        logger.info("Monitoring cycle completed. Waiting 10 minutes...");
        await new Promise(r => setTimeout(r, config.monitorInterval));
    }
}

startMonitoring().catch(err => logger.error("Monitoring error", {
    error: { message: err.message, code: err.code }
}));

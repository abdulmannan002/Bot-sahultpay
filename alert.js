const axios = require('axios');
// Fix: Correct p-retry import
const pRetry = require('p-retry').default || require('p-retry');
const Bottleneck = require('bottleneck');
const winston = require('winston');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
// Fix: Add FormData for chart sending
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

// Initialize rate limiter
const limiter = new Bottleneck({ minTime: 1000 });

// Initialize chart renderer
const canvas = new ChartJSNodeCanvas({ width: 800, height: 600 });

// Global offset for Telegram message polling
let lastUpdateId = 0;

// Delete Telegram webhook
async function deleteWebhook() {
    try {
        const res = await axios.get(`https://api.telegram.org/bot${config.telegram.botToken}/deleteWebhook`);
        logger.info("Webhook deleted", { response: res.data });
    } catch (err) {
        logger.error("Error deleting webhook", { error: err.response?.data || err.message });
    }
}

// Fetch transactions from API
async function fetchTransactions(url) {
    try {
        const res = await limiter.schedule(() =>
            // Fix: Use pRetry correctly with fallback
            pRetry(() => axios.get(url), { retries: 3, minTimeout: 1000 }).catch(err => {
                logger.error(`Retry failed for ${url}`, { error: err.message });
                throw err;
            })
        );
        return res.data.transactions || [];
    } catch (err) {
        logger.error(`Error fetching from ${url}`, { error: err.message, status: err.response?.status });
        return [];
    }
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
        await axios.post(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
            chat_id: config.telegram.userId,
            text,
            parse_mode: 'Markdown'
        });
        logger.info("Telegram message sent", { text });
    } catch (err) {
        logger.error("Telegram message failed", { error: err.response?.data || err.message });
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
                    backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                    borderColor: ['#2A87D0', '#E05570', '#E6B800', '#3AA8A8', '#7A52CC', '#E68A00'],
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
        // Fix: Use FormData for proper file upload
        const form = new FormData();
        form.append('chat_id', config.telegram.userId);
        form.append('photo', buffer, { filename: 'chart.png', contentType: 'image/png' });
        form.append('caption', 'Transaction Success Rates');
        await axios.post(`https://api.telegram.org/bot${config.telegram.botToken}/sendPhoto`, form, {
            headers: form.getHeaders()
        });
        logger.info("Chart sent to Telegram");
    } catch (err) {
        logger.error("Error sending chart", { error: err.response?.data || err.message });
    }
}

// Generate report message
function generateReportMessage(data) {
    let message = "🚨 *Transaction Success Rate Report* 🚨\n\n";
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
    // Fix: Add note for potential script errors
    if (hasApiError) {
        message += "⚠️ *Note*: No data received. This may indicate a script error. Check logs for details.\n";
    }
    message += "Reply with `/check` to acknowledge.";
    return message;
}

// Send consolidated alert
async function sendAlert(data) {
    const message = generateReportMessage(data);
    await sendTelegramMessage(message);
    await sendChart(data);
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
    const allTxns = await fetchTransactions(url);
    const filteredTxns = provider ? filterTransactionsByProvider(allTxns, provider) : allTxns;
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
        const res = await axios.get(url);
        const updates = res.data.result;
        let stopAlerts = false;

        for (const update of updates) {
            lastUpdateId = update.update_id;
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
        logger.error("Telegram error", { error: err.response?.data || err.message });
        return false;
    }
}

// Main monitoring loop
async function startMonitoring() {
    logger.info("Starting monitoring");
    await deleteWebhook();

    while (true) {
        const statsMap = {};
        const allTxns = await fetchTransactions(config.api.baseUrl);
        statsMap["All Transactions"] = calculateStats(allTxns);
        statsMap["All Easypaisa"] = calculateStats(filterTransactionsByProvider(allTxns, "Easypaisa"));
        statsMap["All JazzCash"] = calculateStats(filterTransactionsByProvider(allTxns, "JazzCash"));

        const merchantTxns = await Promise.all(
            Object.entries(config.api.merchants).map(([id, query]) => fetchTransactions(config.api.baseUrl + query))
        );

        Object.entries(config.api.merchants).forEach(([id, query], index) => {
            const txns = merchantTxns[index];
            const name = id === "51" ? "Monetix" : id === "451" ? "First Pay" : `Merchant ${id}`;
            const easypaisa = filterTransactionsByProvider(txns, "Easypaisa");
            const jazzcash = filterTransactionsByProvider(txns, "JazzCash");
            if (easypaisa.length) statsMap[`${name} Easypaisa`] = calculateStats(easypaisa);
            if (jazzcash.length) statsMap[`${name} JazzCash`] = calculateStats(jazzcash);
        });

        logger.info("Stats calculated", { statsMap });

        const shouldAlert = Object.values(statsMap).some(s => s.successRate < 100 || (s.successRate === 0 && s.total === 0));
        if (shouldAlert) await sendAlert(statsMap);

        logger.info("Monitoring cycle completed. Waiting 10 minutes...");
        await new Promise(r => setTimeout(r, config.monitorInterval));
    }
}

startMonitoring().catch(err => logger.error("Monitoring error", { error: err.message }));

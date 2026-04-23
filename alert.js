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
            444: '?merchantId=444',
            451: '?merchantId=451',
            655: '?merchantId=655',
            672: '?merchantId=672',
            70: '?merchantId=70',
            603: '?merchantId=603',
            805: '?merchantId=805',
            848: '?merchantId=848',
            47: '?merchantId=47',
            621:'?merchantId=621',
            49: '?merchantId=49',
            1050: '?merchantId=1050',
            1223: '?merchantId=1223',
            2049: '?merchantId=2049',
        }
    },
    monitorInterval: 300000, // 5 minutes
    monitorWindowMinutes: 15,
    retryInterval: 60000, // 1 minute for server down retries
    serviceBeacon: {
        endpoints: [
            {
                label: 'Sahulatpay Domain',
                url: 'https://api.sahulatpay.com/service-beacon'
            },
            {
                label: 'Assanpay Domain',
                url: 'https://api.assanpay.com/service-beacon'
            }
        ],
        healthyInterval: 60000,
        incidentInterval: 60000,
        incidentMessageInterval: 30000,
        alertDelay: 10000,
        timeout: 10000
    },
    webhook: {
        successRateUrl: "https://tg-notify-bot.vercel.app/api/success-rate-webhook",
        key: "A_Kmf-sW69DS3sNBG0XQzhmhqxOkeU8pkjuFlqVz"
    },
    acknowledgment: {
        retries: 1,
        timeout: 60000 // 1 minute
    },
    telegramRetry: {
        maxRetries: 5,
        delay: 10000 // 10 seconds for conflict retries
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

// Global offset for Telegram message polling
let lastUpdateId = 0;
const serviceBeaconStatus = {};
const merchantNameMap = {
    "672": "ABC 1",
    "444": "Monetix",
    "655": "PAY GAMES",
    "451": "First Pay",
    "49": "UNITY FINANCE",
    "47": "DZEN PAY",
    "70": "ABC 2",
    "603": "ABC 3",
    "805": "ABC 4",
    "848": "ABC PAY",
    "621": "SETTLE PAY",
    "1050": "PAYPRO",
    "1223": "PAY PRO",
    "2049": "OK PAY",
};

// Delete and verify Telegram webhook
async function deleteWebhook() {
    try {
        // Delete webhook
        const deleteRes = await telegramLimiter.schedule(() =>
            axios.get(`https://api.telegram.org/bot${config.telegram.botToken}/deleteWebhook`)
        );
        logger.info("Webhook deleted", { response: deleteRes.data });

        // Verify webhook status
        const infoRes = await telegramLimiter.schedule(() =>
            axios.get(`https://api.telegram.org/bot${config.telegram.botToken}/getWebhookInfo`)
        );
        if (infoRes.data.result.url) {
            logger.warn("Webhook still active after deletion", { webhookInfo: infoRes.data.result });
            await sendTelegramMessage("⚠️ *Warning*: Telegram webhook is still active. Please check bot configuration or contact admin.");
        } else {
            logger.info("Webhook verified as deleted", { webhookInfo: infoRes.data.result });
        }
    } catch (err) {
        logger.error("Error managing webhook", {
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
    transactions.filter(
        txn => txn.providerDetails?.name?.trim().toLowerCase() === providerName.trim().toLowerCase()
    );

// Calculate success stats
function calculateStats(transactions) {
    const total = transactions.length;
    const completed = transactions.filter(txn => txn.status === "completed").length;
    const failed = transactions.filter(txn => txn.status === "failed").length;
    const pending = transactions.filter(txn => txn.status === "pending").length;
    const successRate = total === 0 ? 0 : (completed / total) * 100;
    return { total, completed, failed, pending, successRate };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getServiceBeaconRetryText = () =>
    `Retrying every ${Math.round(config.serviceBeacon.incidentMessageInterval / 1000)} seconds.`;

async function sendDelayedServiceBeaconMessage(serviceConfig, expectedStatus, text) {
    await delay(config.serviceBeacon.alertDelay);

    if (expectedStatus) {
        const currentStatus = serviceBeaconStatus[serviceConfig.label];
        if (currentStatus !== expectedStatus) {
            logger.info("Skipping stale service beacon alert", {
                label: serviceConfig.label,
                expectedStatus,
                currentStatus
            });
            return;
        }
    }

    const messageId = await sendTelegramMessage(text);
    if (messageId) {
        await pinTelegramMessage(messageId);
    }
}

async function fetchServiceBeaconStatus(serviceConfig) {
    try {
        const response = await apiLimiter.schedule(() =>
            axios.get(serviceConfig.url, {
                timeout: config.serviceBeacon.timeout,
                validateStatus: () => true
            })
        );
        const payload = response.data || {};
        const isHealthy =
            payload.success === true &&
            payload.data?.ok === true &&
            payload.statusCode === 200;
        const isDegraded =
            payload.success === false &&
            payload.statusCode === 503;

        if (isHealthy) {
            logger.info("Service beacon healthy", { label: serviceConfig.label, payload });
            return { status: 'healthy', payload };
        }

        if (isDegraded) {
            logger.warn("Service beacon degraded", { label: serviceConfig.label, payload });
            return { status: 'degraded', payload };
        }

        logger.warn("Service beacon returned unexpected response", {
            label: serviceConfig.label,
            payload,
            httpStatus: response.status
        });
        return { status: 'degraded', payload };
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            logger.warn("Service beacon request timed out", {
                label: serviceConfig.label,
                timeoutMs: config.serviceBeacon.timeout,
                error: { message: error.message, code: error.code }
            });
            return {
                status: 'timeout',
                error
            };
        }

        logger.error("Service beacon request failed", {
            label: serviceConfig.label,
            error: { message: error.message, code: error.code, response: error.response?.data }
        });
        return {
            status: 'down',
            error
        };
    }
}

async function handleServiceBeaconTransition(serviceConfig, nextStatus, details = {}) {
    if (nextStatus === 'timeout') {
        sendDelayedServiceBeaconMessage(
            serviceConfig,
            null,
            `\u{1F7E0} *Service Timeout*: ${serviceConfig.label} service beacon request timed out.\n` +
                `Error: ${details.error?.message || 'Request timed out'}\n` +
                getServiceBeaconRetryText()
        ).catch((error) =>
            logger.error("Failed to send delayed service beacon alert", {
                label: serviceConfig.label,
                expectedStatus: nextStatus,
                error: { message: error.message, code: error.code }
            })
        );
        return;
    }

    const previousStatus = serviceBeaconStatus[serviceConfig.label] || 'unknown';
    const isRepeatIncident =
        nextStatus === previousStatus &&
        (nextStatus === 'down' || nextStatus === 'degraded');

    if (nextStatus === previousStatus && nextStatus === 'healthy') return;

    serviceBeaconStatus[serviceConfig.label] = nextStatus;

    if (nextStatus === 'healthy') {
        logger.info("Service beacon recovered", {
            label: serviceConfig.label,
            previousStatus
        });
        if (previousStatus !== 'unknown' && previousStatus !== 'healthy') {
            await sendTelegramMessage(
                `\u{1F7E2} *Service Up*: ${serviceConfig.label} is healthy again.\n` +
                `Previous status: ${previousStatus}`
            );
        }
        return;
    }

    if (nextStatus === 'degraded') {
        sendDelayedServiceBeaconMessage(
            serviceConfig,
            nextStatus,
            `\u{1F7E0} *Service Degraded*: ${serviceConfig.label} machine is up but database connection is lost.\n` +
                `Message: ${details.payload?.message || 'Service is degraded'}\n` +
                getServiceBeaconRetryText()
        ).catch((error) =>
            logger.error("Failed to send delayed service beacon alert", {
                label: serviceConfig.label,
                expectedStatus: nextStatus,
                isRepeatIncident,
                error: { message: error.message, code: error.code }
            })
        );
        return;
    }

    if (nextStatus === 'down') {
        sendDelayedServiceBeaconMessage(
            serviceConfig,
            nextStatus,
            `\u{1F534} *Server Down*: ${serviceConfig.label} requests are not reaching service.\n` +
                `Error: ${details.error?.message || 'Unknown network error'}\n` +
                getServiceBeaconRetryText()
        ).catch((error) =>
            logger.error("Failed to send delayed service beacon alert", {
                label: serviceConfig.label,
                expectedStatus: nextStatus,
                isRepeatIncident,
                error: { message: error.message, code: error.code }
            })
        );
    }
}

async function startServiceBeaconMonitoring() {
    return startServiceBeaconDomainMonitoring(config.serviceBeacon.endpoints[0]);
}

async function notifyServiceBeaconDomainTransition(serviceConfig, nextStatus, details = {}) {
    if (nextStatus === 'timeout') {
        sendDelayedServiceBeaconMessage(
            serviceConfig,
            null,
            `\u{1F7E0} *Service Timeout*: ${serviceConfig.label} service beacon request timed out.\n` +
                `Error: ${details.error?.message || 'Request timed out'}\n` +
                getServiceBeaconRetryText()
        ).catch((error) =>
            logger.error("Failed to send delayed service beacon alert", {
                label: serviceConfig.label,
                expectedStatus: nextStatus,
                error: { message: error.message, code: error.code }
            })
        );
        return;
    }

    const previousStatus = serviceBeaconStatus[serviceConfig.label] || 'unknown';
    const isRepeatIncident =
        nextStatus === previousStatus &&
        (nextStatus === 'down' || nextStatus === 'degraded');

    if (nextStatus === previousStatus && nextStatus === 'healthy') return;

    serviceBeaconStatus[serviceConfig.label] = nextStatus;

    if (nextStatus === 'healthy') {
        logger.info("Service beacon recovered", {
            label: serviceConfig.label,
            previousStatus
        });
        if (previousStatus !== 'unknown' && previousStatus !== 'healthy') {
            await sendTelegramMessage(
                `\u{1F7E2} *Service Up*: ${serviceConfig.label} is healthy again.\n` +
                `Previous status: ${previousStatus}`
            );
        }
        return;
    }

    if (nextStatus === 'degraded') {
        sendDelayedServiceBeaconMessage(
            serviceConfig,
            nextStatus,
            `\u{1F7E0} *Service Degraded*: ${serviceConfig.label} machine is up but database connection is lost.\n` +
                `Message: ${details.payload?.message || 'Service is degraded'}\n` +
                getServiceBeaconRetryText()
        ).catch((error) =>
            logger.error("Failed to send delayed service beacon alert", {
                label: serviceConfig.label,
                expectedStatus: nextStatus,
                isRepeatIncident,
                error: { message: error.message, code: error.code }
            })
        );
        return;
    }

    if (nextStatus === 'down') {
        sendDelayedServiceBeaconMessage(
            serviceConfig,
            nextStatus,
            `\u{1F534} *Server Down*: ${serviceConfig.label} requests are not reaching service.\n` +
                `Error: ${details.error?.message || 'Unknown network error'}\n` +
                getServiceBeaconRetryText()
        ).catch((error) =>
            logger.error("Failed to send delayed service beacon alert", {
                label: serviceConfig.label,
                expectedStatus: nextStatus,
                isRepeatIncident,
                error: { message: error.message, code: error.code }
            })
        );
    }
}

async function startServiceBeaconDomainMonitoring(serviceConfig) {
    logger.info("Starting service beacon monitoring", {
        label: serviceConfig.label,
        url: serviceConfig.url
    });

    while (true) {
        const result = await fetchServiceBeaconStatus(serviceConfig);
        await notifyServiceBeaconDomainTransition(serviceConfig, result.status, result);

        const waitMs =
            result.status === 'healthy'
                ? config.serviceBeacon.healthyInterval
                : config.serviceBeacon.incidentInterval;

        logger.info("Service beacon next poll scheduled", {
            label: serviceConfig.label,
            status: result.status,
            waitMs
        });

        await delay(waitMs);
    }
}

async function sendSuccessRateWebhook(payload) {
    console.log("Success-rate webhook request payload:", payload);
    try {
        const webhookResponse = await apiLimiter.schedule(() =>
            pRetry(
                () =>
                    axios.post(config.webhook.successRateUrl, payload, {
                        timeout: 10000,
                        headers: {
                            'X-Webhook-Key': config.webhook.key,
                            'Content-Type': 'application/json'
                        }
                    }),
                { retries: 2, minTimeout: 1000 }
            )
        );
        console.log("Success-rate webhook sent", {
            status: webhookResponse.status,
            response: webhookResponse.data,
            payload
        });
    } catch (err) {
        console.error("Success-rate webhook failed", {
            error: { message: err.message, code: err.code, response: err.response?.data },
            payload
        });
    }
}

async function sendProviderSuccessRateWebhooks(statsMap) {
    const timestamp = new Date().toISOString();
    const easypaisaStats = statsMap["All Easypaisa"] || { total: 0, completed: 0, failed: 0, pending: 0, successRate: 0 };
    const jazzcashStats = statsMap["All JazzCash"] || { total: 0, completed: 0, failed: 0, pending: 0, successRate: 0 };

    const payload = {
        type: "payin",
        windowMinutes: config.monitorWindowMinutes,
        timestamp,
        easypaisa: {
            successRate: Number((easypaisaStats.successRate || 0).toFixed(2)),
            total: easypaisaStats.total,
            completed: easypaisaStats.completed,
            failed: easypaisaStats.failed,
            pending: easypaisaStats.pending
        },
        jazzcash: {
            successRate: Number((jazzcashStats.successRate || 0).toFixed(2)),
            total: jazzcashStats.total,
            completed: jazzcashStats.completed,
            failed: jazzcashStats.failed,
            pending: jazzcashStats.pending
        }
    };

    await sendSuccessRateWebhook(payload);
}

// Send message to Telegram
async function sendTelegramMessage(text) {
    try {
        const res = await telegramLimiter.schedule(() =>
            pRetry(() =>
                axios.post(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
                    chat_id: config.telegram.userId,
                    text,
                    parse_mode: 'Markdown'
                }),
                { retries: 2, minTimeout: 2000 }
            )
        );
        const messageId = res?.data?.result?.message_id;
        logger.info("Telegram message sent", { text, messageId });
        return messageId;
    } catch (err) {
        logger.error("Telegram message failed", {
            error: { message: err.message, code: err.code, response: err.response?.data }
        });
        return null;
    }
}

async function pinTelegramMessage(messageId) {
    try {
        await telegramLimiter.schedule(() =>
            pRetry(
                () =>
                    axios.post(`https://api.telegram.org/bot${config.telegram.botToken}/pinChatMessage`, {
                        chat_id: config.telegram.userId,
                        message_id: messageId,
                        disable_notification: true
                    }),
                { retries: 2, minTimeout: 2000 }
            )
        );
        logger.info("Telegram message pinned", { messageId });
    } catch (err) {
        logger.error("Telegram pin failed", {
            messageId,
            error: { message: err.message, code: err.code, response: err.response?.data }
        });
    }
}

function buildProviderChartStats(allTxns, merchantTransactions) {
    const providerLabels = ["Easypaisa", "JazzCash", "QR"];
    const providerCharts = {};

    for (const providerLabel of providerLabels) {
        const chartStats = {};
        chartStats[`All ${providerLabel}`] = calculateStats(filterTransactionsByProvider(allTxns, providerLabel));

        merchantTransactions.forEach(({ name, transactions }) => {
            const providerTransactions = filterTransactionsByProvider(transactions, providerLabel);
            if (providerTransactions.length) {
                chartStats[`${name} ${providerLabel}`] = calculateStats(providerTransactions);
            }
        });

        providerCharts[providerLabel] = chartStats;
    }

    return providerCharts;
}

async function sendSingleProviderChart(providerLabel, statsMap) {
    try {
        const labels = Object.keys(statsMap);
        const successRates = Object.values(statsMap).map(stat => stat.successRate);
        const chartWidth = Math.max(900, labels.length * 110);
        const providerCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: 600 });
        const chartConfig = {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Success Rate (%)',
                    data: successRates,
                    backgroundColor: labels.map((_, index) => ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#4CAF50'][index % 7]),
                    borderColor: labels.map((_, index) => ['#2A87D0', '#E05570', '#E6B800', '#3AA8A8', '#7A52CC', '#E68A00', '#388E3C'][index % 7]),
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
                    title: { display: true, text: `${providerLabel} Success Rates (Last 15 Minutes)` }
                }
            }
        };
        const buffer = await providerCanvas.renderToBuffer(chartConfig, 'image/png');
        const form = new FormData();
        form.append('chat_id', config.telegram.userId);
        form.append('photo', buffer, { filename: `${providerLabel.toLowerCase()}-chart.png`, contentType: 'image/png' });
        form.append('caption', `${providerLabel} Transaction Success Rates`);
        await telegramLimiter.schedule(() =>
            pRetry(() =>
                axios.post(`https://api.telegram.org/bot${config.telegram.botToken}/sendPhoto`, form, {
                    headers: form.getHeaders()
                }),
                { retries: 2, minTimeout: 2000 }
            )
        );
        logger.info("Provider chart sent to Telegram", { provider: providerLabel });
    } catch (err) {
        logger.error("Error sending provider chart", {
            provider: providerLabel,
            error: { message: err.message, code: err.code, response: err.response?.data }
        });
    }
}

// Generate and send charts per provider
async function sendChart(providerCharts) {
    for (const providerLabel of ["Easypaisa", "JazzCash", "QR"]) {
        await sendSingleProviderChart(providerLabel, providerCharts[providerLabel]);
    }
}

// Generate report message
function generateReportMessage(data, serverDown = false) {
    let message = "🚨 *Transaction Success Rate Report* 🚨\n\n";
    if (serverDown) {
        message += "⚠️ *Server Down*: API is unreachable or returned no data. Retrying every 1 minute.\n\n";
    }
    let hasApiError = Object.values(data).every(s => s.total === 0 && s.successRate === 0);
    for (const [type, stats] of Object.entries(data)) {
        const { total, completed, failed, pending, successRate } = stats;
        if (total === 0 && successRate === 0) {
            message += `ℹ️ *${type}*: No transactions in last 10 minutes\n`;
        } else {
            const alertEmoji = successRate < 60 ? "🔻" : "✅";
            message += `*${type}* ${alertEmoji}:\n` +
                `📊 Success Rate: ${successRate.toFixed(2)}%\n` +
                `✅ Completed: ${completed}\n❌ Failed: ${failed}\n` +
                `⏳ Pending: ${pending}\n📈 Total: ${total}\n\n`;
        }
    }
    if (hasApiError && !serverDown) {
        message += "ℹ️ *Note*: No transactions were returned in the last 10 minutes.\n";
    }
    message += "Reply with `/check` to acknowledge.";
    return message;
}

// Send consolidated alert
async function sendAlert(data, providerCharts, serverDown = false) {
    const message = generateReportMessage(data, serverDown);
    await sendTelegramMessage(message);
    if (!serverDown) await sendChart(providerCharts); // Skip chart if server is down
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
    let retryCount = 0;
    while (retryCount < config.telegramRetry.maxRetries) {
        try {
            const res = await telegramLimiter.schedule(() =>
                pRetry(() => axios.get(url, { timeout: 10000 }), { 
                    retries: 2, 
                    minTimeout: 5000,
                    onFailedAttempt: err => {
                        if (err.error.code === 'ETIMEDOUT') {
                            logger.warn("Telegram request timed out. Retrying...", {
                                attempt: err.attemptNumber
                            });
                        }
                    }
                })
            );
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
                retryCount++;
                logger.warn("Conflict detected. Retrying...", { retryCount, maxRetries: config.telegramRetry.maxRetries });
                if (retryCount >= config.telegramRetry.maxRetries) {
                    logger.error("Max retries reached for Telegram conflict. Possible multiple bot instances.", {
                        error: { message: err.message, code: err.code, response: err.response?.data }
                    });
                    await sendTelegramMessage("⚠️ *Error*: Telegram conflicts detected. Multiple bot instances may be running. Please check bot configuration.");
                    return false;
                }
                await new Promise(r => setTimeout(r, config.telegramRetry.delay));
                continue;
            }
            logger.error("Telegram error", {
                error: { message: err.message, code: err.code, response: err.response?.data, request: err.request?.path }
            });
            return false;
        }
    }
    return false;
}

// Main monitoring loop
async function startMonitoring() {
    logger.info("Starting monitoring");
    await deleteWebhook();
    config.serviceBeacon.endpoints.forEach((serviceConfig) => {
        serviceBeaconStatus[serviceConfig.label] = 'unknown';
        startServiceBeaconDomainMonitoring(serviceConfig).catch((err) =>
            logger.error("Service beacon monitoring crashed", {
                label: serviceConfig.label,
                error: { message: err.message, code: err.code }
            })
        );
    });

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
        const allEasypaisaStats = calculateStats(filterTransactionsByProvider(allTxns, "Easypaisa"));
        const allJazzCashStats = calculateStats(filterTransactionsByProvider(allTxns, "JazzCash"));
        const allQrStats = calculateStats(filterTransactionsByProvider(allTxns, "QR"));
        statsMap["All Easypaisa"] = allEasypaisaStats;
        statsMap["All JazzCash"] = allJazzCashStats;
        statsMap["All QR"] = allQrStats;

        const merchantTxns = await Promise.all(
            Object.entries(config.api.merchants).map(([id, query]) => fetchTransactions(config.api.baseUrl + query))
        );
        const merchantTransactions = [];

        Object.entries(config.api.merchants).forEach(([id, query], index) => {
            const { transactions: txns } = merchantTxns[index];
            const name = merchantNameMap[id] || `Merchant ${id}`;
            merchantTransactions.push({ name, transactions: txns });
            const easypaisa = filterTransactionsByProvider(txns, "Easypaisa");
            const jazzcash = filterTransactionsByProvider(txns, "JazzCash");
            if (easypaisa.length) statsMap[`${name} Easypaisa`] = calculateStats(easypaisa);
            if (jazzcash.length) statsMap[`${name} JazzCash`] = calculateStats(jazzcash);
        });

        const providerCharts = buildProviderChartStats(allTxns, merchantTransactions);

        logger.info("Stats calculated", { statsMap });

        const allTransactionsTotal = statsMap["All Transactions"]?.total || 0;
        if (allTransactionsTotal > 0) {
            await sendProviderSuccessRateWebhooks(statsMap);
        } else {
            logger.info("Skipping success-rate webhook because total transactions is 0");
        }

        const shouldAlert = Object.values(statsMap).some(s => s.successRate < 100 || (s.successRate === 0 && s.total === 0));
        if (shouldAlert) await sendAlert(statsMap, providerCharts, !serverStable);

        logger.info("Monitoring cycle completed. Waiting 5 minutes...");
        await new Promise(r => setTimeout(r, config.monitorInterval));
    }
}

startMonitoring().catch(err => logger.error("Monitoring error", {
    error: { message: err.message, code: err.code }
}));

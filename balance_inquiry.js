const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.BALANCE_PORT || 4004;

app.listen(PORT, () => {
  console.log(`[Server] Example app listening on port ${PORT}`);
});

app.get("/", (req, res) => {
  console.log("[HealthCheck] Health check received");
  return res.status(200).json({ status: "success" });
});

function formatNumber(value) {
  console.log(`[FormatNumber] Formatting value: ${value}`);
  if (typeof value === 'undefined' || value === null) {
    console.log("[FormatNumber] Value is undefined or null, returning '0.00'");
    return '0.00';
  }
  const formatted = Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  console.log(`[FormatNumber] Formatted result: ${formatted}`);
  return formatted;
}

const messageQueue = [];
async function sendMessageWithQueue(chatId, message, options = {}) {
  console.log(`[MessageQueue] Queueing message to chatId: ${chatId}, message: ${message}`);
  messageQueue.push({ chatId, message, options });
  console.log(`[MessageQueue] Current queue length: ${messageQueue.length}`);
  if (messageQueue.length === 1) {
    console.log("[MessageQueue] Starting queue processing");
    processQueue();
  }
}

async function processQueue() {
  if (messageQueue.length === 0) {
    console.log("[ProcessQueue] Queue is empty, stopping processing");
    return;
  }
  const { chatId, message, options } = messageQueue[0];
  console.log(`[ProcessQueue] Processing message for chatId: ${chatId}`);
  try {
    console.log(`[ProcessQueue] Sending message to chatId: ${chatId}`);
    await bot.sendMessage(chatId, message, options);
    console.log(`[ProcessQueue] Message sent successfully to chatId: ${chatId}`);
  } catch (error) {
    console.error(`[ProcessQueue] Error sending message to chatId: ${chatId}: ${error.message}`);
  }
  messageQueue.shift();
  console.log(`[ProcessQueue] Message removed from queue, remaining length: ${messageQueue.length}`);
  setTimeout(processQueue, 1000);
}

const DASHBOARD_API_URLS = [
  'https://server.sahulatpay.com/dashboard/merchant-details',
  'https://api5.assanpay.com/api/dashboard/merchant-details',
];

async function fetchDashboardData(merchantUUID) {
  console.log(`[FetchDashboardData] Starting data fetch for merchantUUID: ${merchantUUID}`);
  for (const url of DASHBOARD_API_URLS) {
    try {
      console.log(`[FetchDashboardData] Attempting to fetch from URL: ${url}/${merchantUUID}`);
      const response = await Promise.race([
        axios.get(`${url}/${merchantUUID}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 120000)),
      ]);

      console.log(`[FetchDashboardData] API response received from ${url}, status: ${response.status}`);
      console.log(`[FetchDashboardData] Response data: ${JSON.stringify(response.data)}`);
      return response;
    } catch (error) {
      console.error(`[FetchDashboardData] Error fetching from ${url}: ${error.message}`);
    }
  }
  console.error("[FetchDashboardData] All API endpoints failed");
  throw new Error('All API endpoints failed');
}

function getStateKey(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const stateKey color: #00ff00; = msg.chat.type === 'private' ? `${chatId}` : `${chatId}:${userId}`;
  console.log(`[GetStateKey] Generated state key: ${stateKey} for chatId: ${chatId}, userId: ${userId}`);
  return stateKey;
}

const TELEGRAM_BOT_TOKEN = '7239638999:AAH2hu1KFc1xdnU6yISqcpFjhNEhcm66LWs';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: { interval: 1000 } });
console.log("[Bot] Initialized Telegram bot with polling interval: 1000ms");

const userState = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const stateKey = getStateKey(msg);
  console.log(`[Command] Received /start command from stateKey: ${stateKey}`);
  sendMessageWithQueue(chatId, `Welcome to the SahulatPay Bot! Please provide a merchant UUID.`, {
    reply_to_message_id: msg.message_id,
  });
  userState[stateKey] = { step: 'awaiting_merchant', retryCount: 0 };
  console.log(`[Command] Set user state for ${stateKey}: ${JSON.stringify(userState[stateKey])}`);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const stateKey = getStateKey(msg);
  console.log(`[Message] Received message from ${stateKey}: ${text}`);

  if (text && text.startsWith('/')) {
    console.log("[Message] Ignoring command message (handled by specific handler)");
    return;
  }

  const state = userState[stateKey];
  if (!text || !state) {
    console.log(`[Message] Invalid state or text for ${stateKey}, text: ${text}, state: ${JSON.stringify(state)}`);
    return;
  }

  if (state.step === 'awaiting_merchant') {
    state.retryCount = (state.retryCount || 0) + 1;
    console.log(`[Message] Processingintregration retry count: ${state.retryCount}`);

    sendMessageWithQueue(chatId, 'Fetching dashboard data, please wait...', {
      reply_to_message_id: msg.message_id,
    });

    console.log(`[Message] Fetching dashboard data for UUID: ${text}`);

    try {
      const dashboardResponse = await fetchDashboardData(text);
      console.log(`[Message] Dashboard data fetch successful for UUID: ${text}`);

      if (dashboardResponse.data.success) {
        const data = dashboardResponse.data.valdata;
        console.log(`[Message] API returned success, data: ${JSON.stringify(data)}`);
        const message = `
*📊 Balance Inquiry *  
━━━━━━━━━━━━━━━━━━━━━  
*   MERCHANT NAME*: ${data.full_name} 
*💰 Available Balance*: ${formatNumber(data.availableBalance)}  
*📈 Success Rate*: ${formatNumber(data.transactionSuccessRate)}%  
*🏦 Disbursement Balance*: ${formatNumber(data.disbursementBalance)}  
━━━━━━━━━━━━━━━━━━━━━━  
_Powered by SahulatPay_
        `;
        console.log(`[Message] Sending formatted dashboard data to user: ${chatId}`);
        sendMessageWithQueue(chatId, message, {
          parse_mode: 'Markdown',
          reply_to_message_id: msg.message_id,
        });
      } else {
        console.warn(`[Message] Dashboard API returned failure: ${dashboardResponse.data.message}`);
        sendMessageWithQueue(chatId, `Failed to fetch data: ${dashboardResponse.data.message || 'Unknown error'}`, {
          reply_to_message_id: msg.message_id,
        });
      }
    } catch (error) {
      let errorMessage = 'Error fetching dashboard data from all endpoints. ';
      if (error.response) {
        errorMessage += `Status: ${error.response.status}, Message: ${error.response.data.message || 'No details provided'}`;
      } else if (error.request) {
        errorMessage += 'No response from any server. Please check the API endpoints or network.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      console.error(`[Message] Error in dashboard data fetch: ${errorMessage}`);
      sendMessageWithQueue(chatId, errorMessage, {
        reply_to_message_id: msg.message_id,
      });
    } finally {
      console.log(`[Message] Completed handling message for merchant UUID: ${text}`);
    }
  }
});

bot.on('polling_error', (error) => {
  console.error(`[Bot] Polling error occurred: ${error.message}`);
});

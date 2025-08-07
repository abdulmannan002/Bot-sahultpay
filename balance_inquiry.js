const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.BALANCE_PORT || 4004;

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

app.get("/", (req, res) => {
  console.log("Health check received");
  return res.status(200).json({ status: "success" });
});

function formatNumber(value) {
  if (typeof value === 'undefined' || value === null) return '0.00';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const messageQueue = [];
async function sendMessageWithQueue(chatId, message, options = {}) {
  console.log(`Queueing message to ${chatId}: ${message}`);
  messageQueue.push({ chatId, message, options });
  if (messageQueue.length === 1) {
    processQueue();
  }
}

async function processQueue() {
  if (messageQueue.length === 0) return;
  const { chatId, message, options } = messageQueue[0];
  try {
    console.log(`Sending message to ${chatId}`);
    await bot.sendMessage(chatId, message, options);
  } catch (error) {
    console.error(`Error sending message to ${chatId}:`, error.message);
  }
  messageQueue.shift();
  setTimeout(processQueue, 1000);
}

const DASHBOARD_API_URLS = [
  'https://server.sahulatpay.com/dashboard/merchant-details',
  'https://api5.assanpay.com/dashboard/merchant-details',
];

async function fetchDashboardData(merchantUUID) {
  for (const url of DASHBOARD_API_URLS) {
    try {
      console.log(`Attempting to fetch data from ${url}/${merchantUUID}`);
      const response = await Promise.race([
        axios.get(`${url}/${merchantUUID}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 10000)),
      ]);

      console.log(`API response received from ${url}`);
      return response; // Return the successful response
    } catch (error) {
      console.error(`Error fetching from ${url}: ${error.message}`);
      // Continue to the next URL if this one fails
    }
  }
  throw new Error('All API endpoints failed');
}

function getStateKey(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  return msg.chat.type === 'private' ? `${chatId}` : `${chatId}:${userId}`;
}

const TELEGRAM_BOT_TOKEN = '7239638999:AAH2hu1KFc1xdnU6yISqcpFjhNEhcm66LWs';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: { interval: 1000 } });

const userState = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const stateKey = getStateKey(msg);
  console.log(`Received /start from ${stateKey}`);
  sendMessageWithQueue(chatId, `Welcome to the SahulatPay Bot! Please provide a merchant UUID.`, {
    reply_to_message_id: msg.message_id,
  });
  userState[stateKey] = { step: 'awaiting_merchant', retryCount: 0 };
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const stateKey = getStateKey(msg);
  console.log(`Message from ${stateKey}: ${text}`);

  if (text && text.startsWith('/')) {
    console.log("Command ignored (already handled elsewhere).");
    return;
  }

  const state = userState[stateKey];
  if (!text || !state) {
    console.log(`No valid state found for ${stateKey}`);
    return;
  }

  if (state.step === 'awaiting_merchant') {
    state.retryCount = (state.retryCount || 0) + 1;

    sendMessageWithQueue(chatId, 'Fetching dashboard data, please wait...', {
      reply_to_message_id: msg.message_id,
    });

    console.log(`Fetching dashboard data for UUID: ${text}`);

    try {
      const dashboardResponse = await fetchDashboardData(text);

      if (dashboardResponse.data.success) {
        const data = dashboardResponse.data.data;
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
        console.log("Sending dashboard data to user");
        sendMessageWithQueue(chatId, message, {
          parse_mode: 'Markdown',
          reply_to_message_id: msg.message_id,
        });
      } else {
        console.warn("Dashboard API returned failure");
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
      console.error(errorMessage);
      sendMessageWithQueue(chatId, errorMessage, {
        reply_to_message_id: msg.message_id,
      });
    } finally {
      console.log("Completed handling message for merchant UUID");
    }
  }
});

bot.on('polling_error', (error) => {
  console.error("Polling error occurred:", error.message);
});

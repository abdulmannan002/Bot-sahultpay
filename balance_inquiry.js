const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const dotenv = require('dotenv')
dotenv.config();

const app = express();
const PORT = process.env.BALANCE_PORT || 4004;

app.listen(PORT, (req,res) => {
    console.log(`Example app listening on port ${PORT}`)
})

app.get("/", (req, res) => {
    return res.status(200).json({status: "success"})
})

// Function to format numbers with commas and 2 decimal places
function formatNumber(value) {
  if (typeof value === 'undefined' || value === null) return '0.00';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Message queue to handle Telegram rate limits
const messageQueue = [];
async function sendMessageWithQueue(chatId, message, options = {}) {
  messageQueue.push({ chatId, message, options });
  if (messageQueue.length === 1) {
    processQueue();
  }
}
async function processQueue() {
  if (messageQueue.length === 0) return;
  const { chatId, message, options } = messageQueue[0];
  try {
    await bot.sendMessage(chatId, message, options);
  } catch (error) {
    // Silent
  }
  messageQueue.shift();
  setTimeout(processQueue, 1000);
}

// API endpoint
const DASHBOARD_API = 'https://api.sahulatpay.com/dashboard/merchant-details';

// Get state key for user
function getStateKey(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  return msg.chat.type === 'private' ? `${chatId}` : `${chatId}:${userId}`;
}

// Initialize bot
const TELEGRAM_BOT_TOKEN =  '7612180485:AAH6oc0pINwT3g9aP5VWdJcGoAafTiFB_7E';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: { interval: 1000 } });

// Store user state
const userState = {};

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const stateKey = getStateKey(msg);
  sendMessageWithQueue(chatId, `Welcome to the SahulatPay Bot! Please provide a merchant UUID.`, {
    reply_to_message_id: msg.message_id,
  });
  userState[stateKey] = { step: 'awaiting_merchant', retryCount: 0 };
});

// Handle user messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const stateKey = getStateKey(msg);

  // Ignore all commands except /start (handled by bot.onText(/\/start/))
  if (text && text.startsWith('/')) {
    return;
  }

  // Ignore non-text messages or messages when no state exists
  const state = userState[stateKey];
  if (!text || !state) {
    return;
  }

  // Handle messages only when in awaiting_merchant state
  if (state.step === 'awaiting_merchant') {
    state.retryCount = (state.retryCount || 0) + 1;

    sendMessageWithQueue(chatId, 'Fetching dashboard data, please wait...', {
      reply_to_message_id: msg.message_id,
    });

    try {
      const dashboardResponse = await Promise.race([
        axios.get(`${DASHBOARD_API}/${text}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Dashboard API timeout')), 10000)),
      ]);

      if (dashboardResponse.data.success) {
        const data = dashboardResponse.data.data;
        const message = `
*📊 Balance Inquiry *  
━━━━━━━━━━━━━━━━━━━━━  
*💰 Available Balance*: ${formatNumber(data.availableBalance)}  
*📈 Success Rate*: ${formatNumber(data.transactionSuccessRate)}%  
*🏦 Disbursement Balance*: ${formatNumber(data.disbursementBalance)}  
━━━━━━━━━━━━━━━━━━━━━━  
_Powered by SahulatPay_
        `;
        sendMessageWithQueue(chatId, message, {
          parse_mode: 'Markdown',
          reply_to_message_id: msg.message_id,
        });
      } else {
        sendMessageWithQueue(chatId, `Failed to fetch data: ${dashboardResponse.data.message || 'Unknown error'}`, {
          reply_to_message_id: msg.message_id,
        });
      }
    } catch (error) {
      let errorMessage = 'Error fetching dashboard data. ';
      if (error.response) {
        errorMessage += `Status: ${error.response.status}, Message: ${error.response.data.message || 'No details provided'}`;
      } else if (error.request) {
        errorMessage += 'No response from the server. Please check the API endpoint or network.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      sendMessageWithQueue(chatId, errorMessage, {
        reply_to_message_id: msg.message_id,
      });
    } finally {
      // delete userState[stateKey];
      console.log("Peeka Boo")
    }
  }
});

// Handle errors silently
bot.on('polling_error', () => {
  // Silent
});

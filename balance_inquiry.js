const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Log bot initialization
console.log('Starting Telegram bot...');

// Function to format numbers with commas and 2 decimal places
function formatNumber(value) {
  console.log(`Formatting number: ${value}`);
  if (typeof value === 'undefined' || value === null) return '0.00';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// API endpoints
const DASHBOARD_APIS = [
  'https://server.sahulatpay.com/dashboard/merchant-details',
  'https://api5.assanpay.com/api/dashboard/merchant-details',
];

// Function to fetch and display dashboard data for a given merchant UUID
async function fetchAndDisplayData(merchantUuid, chatId, messageId) {
  console.log(`Starting fetchAndDisplayData for merchant UUID: ${merchantUuid}, chatId: ${chatId}, messageId: ${messageId}`);
  let success = false;
  let message = '';

  for (const apiUrl of DASHBOARD_APIS) {
    console.log(`Attempting to fetch data from ${apiUrl}...`);
    try {
      const dashboardResponse = await Promise.race([
        axios.get(`${apiUrl}/${merchantUuid}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ConsoleBot/1.0)',
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Dashboard API timeout')), 60000)),
      ]);

      console.log(`Received response from ${apiUrl}:`, dashboardResponse.data);

      if (dashboardResponse.data.success) {
        const data = dashboardResponse.data.data;
        console.log(`Successfully fetched data:`, data);
        message = `
*📊 Balance Inquiry *  
━━━━━━━━━━━━━━━━━━━━━  
*💰 Merchant Name*: ${data.full_name}
*💰 Available Balance*: ${formatNumber(data.availableBalance)}  
*📈 Success Rate*: ${formatNumber(data.transactionSuccessRate)}%  
*🏦 Disbursement Balance*: ${formatNumber(data.disbursementBalance)}  
━━━━━━━━━━━━━━━━━━━━━━  
_Powered by SahulatPay_
        `;
        success = true;
        console.log(`Formatted success message: ${message}`);
        break; // Exit loop on success
      } else {
        console.log(`Failed to fetch data from ${apiUrl}: ${dashboardResponse.data.message || 'Unknown error'}`);
        message = `Failed to fetch data: ${dashboardResponse.data.message || 'Unknown error'}`;
      }
    } catch (error) {
      message = `Error fetching from ${apiUrl}. `;
      if (error.response) {
        message += `Status: ${error.response.status}, Message: ${error.response.data.message || 'No details provided'}`;
        console.log(`Error with response from ${apiUrl}: Status ${error.response.status}, Message: ${error.response.data.message || 'No details provided'}`);
      } else if (error.request) {
        message += 'No response from the server. Please check the API endpoint or network.';
        console.log(`Error from ${apiUrl}: No response from server`);
      } else {
        message += `Error: ${error.message}`;
        console.log(`Error from ${apiUrl}: ${error.message}`);
      }
    }
  }

  if (!success) {
    message = 'Failed to fetch data from all APIs. Please check the merchant UUID or API availability.';
    console.log('Failed to fetch data from all APIs');
  }

  console.log(`Sending response message to chatId ${chatId}: ${message}`);
  await sendMessageWithQueue(chatId, message, {
    parse_mode: 'Markdown',
    reply_to_message_id: messageId,
  });
  console.log(`Response sent to chatId ${chatId}`);
}

// Message queue to handle Telegram rate limits
const messageQueue = [];
async function sendMessageWithQueue(chatId, message, options = {}) {
  console.log(`Adding message to queue for chatId ${chatId}: ${message}`);
  const queueItem = { chatId, message, options };
  messageQueue.push(queueItem);
  if (messageQueue.length === 1) {
    console.log('Starting to process message queue');
    const sentMessage = await processQueue();
    return sentMessage; // Return sent message for ID tracking
  }
  return null; // Return null if queue is not processed immediately
}
async function processQueue() {
  if (messageQueue.length === 0) {
    console.log('Message queue is empty, stopping processing');
    return null;
  }
  const { chatId, message, options } = messageQueue[0];
  console.log(`Processing message for chatId ${chatId}: ${message}`);
  try {
    const sentMessage = await bot.sendMessage(chatId, message, options);
    console.log(`Successfully sent message to chatId ${chatId}, messageId: ${sentMessage.message_id}`);
    return sentMessage; // Return sent message for ID tracking
  } catch (error) {
    console.log(`Error sending message to chatId ${chatId}: ${error.message}`);
    return null;
  } finally {
    messageQueue.shift();
    console.log(`Removed message from queue, remaining: ${messageQueue.length}`);
    if (messageQueue.length > 0) {
      console.log('Continuing to process next message in queue');
      setTimeout(processQueue, 1000);
    }
  }
}

// Get state key for user
function getStateKey(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const stateKey = msg.chat.type === 'private' ? `${chatId}` : `${chatId}:${userId}`;
  console.log(`Generated state key: ${stateKey} for chatId: ${chatId}, userId: ${userId}`);
  return stateKey;
}

// Initialize bot
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7239638999:AAH2hu1KFc1xdnU6yISqcpFjhNEhcm66LWs';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: { interval: 1000 } });
console.log(`Bot initialized with token: ${TELEGRAM_BOT_TOKEN}`);

// Store user state
const userState = {};

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const stateKey = getStateKey(msg);
  console.log(`Received /start command from chatId ${chatId}, stateKey: ${stateKey}`);
  const promptMessage = `Welcome to the SahulatPay Bot! Please reply to this message with a merchant UUID.`;
  const sentMessage = await sendMessageWithQueue(chatId, promptMessage, {
    reply_to_message_id: msg.message_id,
  });
  userState[stateKey] = { step: 'awaiting_merchant', promptMessageId: sentMessage?.message_id || null };
  console.log(`Set user state for ${stateKey}:`, userState[stateKey]);
});

// Handle /stop command
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  const stateKey = getStateKey(msg);
  console.log(`Received /stop command from chatId ${chatId}, stateKey: ${stateKey}`);
  delete userState[stateKey]; // Clear user state
  console.log(`Cleared user state for ${stateKey}`);
  sendMessageWithQueue(chatId, 'Bot stopped. Use /start to begin again.', {
    reply_to_message_id: msg.message_id,
  });
});

// Handle user messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  let text = msg.text;
  const replyToMessageId = msg.reply_to_message_id;
  const stateKey = getStateKey(msg);
  console.log(`Received message from chatId ${chatId}, userId: ${userId}, text: ${text}, replyToMessageId: ${replyToMessageId}, full message: ${JSON.stringify(msg)}`);

  // Check if the message starts with '/' but resembles a UUID
  if (text && text.startsWith('/')) {
    const potentialUUID = text.slice(1); // Remove the leading '/'
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(potentialUUID)) {
      console.log(`Detected UUID-like command: ${potentialUUID}, treating as regular message`);
      text = potentialUUID; // Treat as regular UUID
    } else {
      console.log(`Ignoring command message: ${text}`);
      return;
    }
  }

  // Ignore non-text messages or messages when no state exists
  const state = userState[stateKey];
  if (!text || !state) {
    console.log(`Ignoring message: no text or no state for ${stateKey}`);
    return;
  }

  // Handle messages only when in awaiting_merchant state
  if (state.step === 'awaiting_merchant') {
    console.log(`Checking UUID: ${text}, replyToMessageId: ${replyToMessageId}, promptMessageId: ${state.promptMessageId}`);
    // Temporarily relax reply check for debugging
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
      console.log(`Processing valid merchant UUID: ${text}`);
      sendMessageWithQueue(chatId, 'Fetching dashboard data, please wait...', {
        reply_to_message_id: msg.message_id,
      });
      await fetchAndDisplayData(text, chatId, msg.message_id);
      console.log(`Clearing user state for ${stateKey} after processing`);
      delete userState[stateKey]; // Clear state after processing
    } else {
      console.log(`Ignoring invalid UUID format: ${text}`);
      sendMessageWithQueue(chatId, 'Invalid UUID format. Please send a valid merchant UUID.', {
        reply_to_message_id: msg.message_id,
      });
    }
  } else {
    console.log(`Ignoring message: invalid state for ${stateKey}`);
  }
});

// Handle errors
bot.on('polling_error', (error) => {
  console.log(`Polling error: ${error.message}`);
});

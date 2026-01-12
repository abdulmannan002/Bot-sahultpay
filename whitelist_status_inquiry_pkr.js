const axios = require("axios");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv");
const { toZonedTime, format } = require("date-fns-tz");
// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
// const PORT = process.env.STATUS_PORT || 4007;

app.listen(9000, () => {
  console.log(`Server running on port ${9000}`);
});

app.get("/", (req, res) => {
  res.status(200).json({ status: "success" });
});

// Bot configuration
const BOT_TOKEN = "8354780248:AAGpZy1P5omuVw7_7WycrKXRDI7l8k5hLEk";
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// API URLs
const API_BASE_URL = "https://sp-server.assanpay.com";
const API_BACKOFFICE_URL = "https://sp-server.assanpay.com";
const CALLBACK_API_URL = `${API_BASE_URL}/backoffice/payin-callback`;
const SETTLE_API_URL = `${API_BASE_URL}/backoffice/settle-transactions/tele`;
const PAYOUT_API_URL = `${API_BASE_URL}/disbursement/tele`;
const PAYOUT_CALLBACK_API_URL = `${API_BACKOFFICE_URL}/backoffice/payout-callback`;
const FAIL_API_URL = `${API_BACKOFFICE_URL}/backoffice/fail-transactions/tele`;

// Configure axios with timeouts
const axiosInstance = axios.create({
  timeout: 600000, // Increased to 45 seconds
  validateStatus: () => true
});

// Configure axios-retry
let axiosRetry;
try {
  axiosRetry = require("axios-retry").default;
  axiosRetry(axiosInstance, {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 2000, // Increased delay to 2s, 4s, 6s
    retryCondition: (error) => {
      return (
        axios.isCancel(error) ||
        error.code === "ECONNABORTED" ||
        (error.response && error.response.status >= 500)
      );
    },
  });
  console.log("axios-retry configured successfully");
} catch (error) {
  console.error("Failed to configure axios-retry:", error.message);
  console.log("Continuing without retry logic");
}
// Merchant ID to UUID mapping
// Merchant ID to UUID mapping
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
  246: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  247: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  248: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  249: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara
  45: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara (JazzCash)
  303: "a0eb8ba1-8962-4766-8acb-945fce7dc0c3", // devinara

  // EVOLVICA SOLUTIONS PRIVATE LIMITED (evolivica)
  27: "3c0ba58b-5a69-4376-b40d-4d497d561ba2", // evolivica (JazzCash)
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
  65: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra (Learningrization)
  137: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra
  138: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra
  139: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra
  140: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra
  143: "cc961e51-8c0e-44d4-9c25-56e39e992b88", // nextra

  // DEVTECTS PRIVATE LIMITED
  136: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  263: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  264: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  265: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  266: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  267: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  268: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  269: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  270: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  271: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  272: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  273: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  274: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  275: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  276: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  277: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  278: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  279: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  280: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  281: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  282: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  283: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  284: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  285: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  286: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  287: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  288: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  289: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  290: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  291: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  292: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  293: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  294: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  295: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  296: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  297: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  298: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  299: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  300: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  302: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects
  309: "7e3a599a-1841-44d1-ba8d-52fb8f249acf",
  78: "7e3a599a-1841-44d1-ba8d-52fb8f249acf", // devtects Jazz cash

  // DIGIFYTIVE PRIVATE LIMITED
  219: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  220: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  221: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  223: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  224: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  225: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  226: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  227: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  228: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  229: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  230: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  231: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  232: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  233: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  234: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  235: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  236: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  237: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  238: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  301: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  304: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  305: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive
  79: "463d5be4-0b43-400a-ba0b-d77c9ce7ff3e", // digifytive Jazz cash

  // DOVANTIS SOLUTIONS PRIVATE LIMITED
  205: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a", // dovantis
  206: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a", // dovantis
  207: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a", // dovantis
  208: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a", // dovantis
  209: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a", // dovantis
  210: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a", // dovantis
  74: "f9e13fe5-0f4a-4768-bce3-bc318aa08b7a", // dovantis Jazz cash

  // MONIC TECH PRIVATE LIMITED
  250: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  251: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  252: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  253: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  254: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  255: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  256: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  257: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  258: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  259: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  260: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  261: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  262: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  306: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  307: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic
  80: "05ac708a-2a63-49f1-a77d-dd040c850e14", // monic Jazz cash

  // SASTA TECH SOLUTIONS & SASTA TECH SOLUTIONS PRIVATE LIMITED
  7: "6d612b47-6405-4237-9b0c-7d639eb960ee", // JazzCash
  126: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  127: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  128: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  129: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  130: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  131: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  132: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  133: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  134: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  135: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  211: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  212: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  213: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  215: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  217: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta
  218: "6d612b47-6405-4237-9b0c-7d639eb960ee", // sasta

  // Animatrix
  85: "f2e2586e-d17b-4fe6-a905-2148f5e4bf15",
  //Marketing motion
  84: "a37a6b7c-32f3-423b-968e-9fd709b6ccc3",

  // Payfast UIDs
  5: "22943823-9a2d-4ab2-8d13-9b684ba8058d",
  6: "2f1bc400-ee52-4091-9e3a-be4de8ecd9b3",
  8: "a32508c3-f480-4bd2-9c8e-76bb3c6ad747",
};

// Function to handle transactions or payouts


const handleTransactionAndPayout = async (chatId, order, type = "transaction") => {
  try {
    console.log(`Starting ${type} handling for order: ${order}`);

    // Validate order ID
    if (!order || typeof order !== "string" || order.trim() === "") {
      await bot.sendMessage(chatId, "Invalid order ID provided.");
      return;
    }

    // Determine API URL based on type
    let apiUrl;
    if (type === "transaction") {
      apiUrl = `https://sp-server.assanpay.com/transactions/tele?merchantTransactionId=${order}`;
    } else if (type === "payout") {
      apiUrl = `${PAYOUT_API_URL}?merchantTransactionId=${order}`;
    } else {
      console.error("Invalid type specified.");
      await bot.sendMessage(chatId, "Invalid transaction type.");
      return;
    }

    // Make API request
    let response;
    try {
      response = await axiosInstance.get(apiUrl);
      console.log(apiUrl + "||||||||")
      console.log("API Response:", response.data);
    } catch (error) {
      console.error(`Error fetching ${type} data for order ${order}:`, error.message);
      if (error.response?.status === 500) {
        await bot.sendMessage(chatId, `Transaction ${order} failed due to a server error. Please try again later.`);
      } else if (error.code === "ECONNABORTED") {
        await bot.sendMessage(chatId, `Transaction ${order} timed out. Please try again.`);
      } else {
        await bot.sendMessage(chatId, `Error processing transaction ${order}`);
      }
      return;
    }

    // Extract transaction data
    const transaction = type === "transaction" ? response.data.transactions?.[0] : response.data?.data?.transactions?.[0];
    if (!transaction) {
      console.log(`No ${type} found for order: ${order}`);
      await bot.sendMessage(chatId, `Transaction ${order} not found in Back-office. Please check the order ID.`);
      return;
    }

    console.log("Transaction Details:", JSON.stringify(transaction, null, 2));

    const status = transaction.status?.trim().toLowerCase();
    const merchantTransactionId = transaction.merchant_transaction_id || transaction.merchant_custom_order_id;
    const timeZone = "Asia/Karachi";
    // Extract the date from transaction
    let date;

    if (type === "payout") {
      date = transaction.disbursementDate;
    } else {
      date = transaction.date_time
        ? transaction.date_time
        : transaction.transactionDateTime;
    }
    // Convert to Pakistan timezone
    const zonedDate = toZonedTime(new Date(date), timeZone);
    // Format as compact string, e.g. "20251007221004"
    const formattedDate = format(zonedDate, "yyyy-MM-dd HH:mm:ss", { timeZone });
    const date_time = formattedDate;

    let txn_id;

    if (type === "payout") {
      txn_id = transaction.transaction_id;
    } else {
      txn_id = transaction.providerDetails.transactionId
        ? transaction.providerDetails.transactionId
        : transaction.transaction_id;
    }

    if (!merchantTransactionId) {
      console.error("Error: merchantTransactionId is undefined.");
      await bot.sendMessage(chatId, `Error: Invalid transaction ID for ${order}.`);
      return;
    }

    // Handle completed transactions
    if (status === "completed") {
      console.log(`Transaction ${merchantTransactionId} is already completed. TxnID: ${txn_id}. Date: ${date_time}`);
      const callbackUrl = type === "payout" ? PAYOUT_CALLBACK_API_URL : CALLBACK_API_URL;

      try {
        const callbackResponse = await axiosInstance.post(callbackUrl, { transactionIds: [merchantTransactionId] });
        console.log("Callback API Response:", callbackResponse.data);
        await bot.sendMessage(chatId, `Transaction ${merchantTransactionId}: Completed.\nTxnID: ${txn_id}.\nDate: ${date_time}`);
      } catch (error) {
        console.error("Error calling callback API:", error.response?.data || error.message);
        await bot.sendMessage(chatId, `Transaction ${merchantTransactionId} is completed,  TxnID: ${txn_id}.\nDate: ${date_time} `);
      }
      return;
    }

    // Perform status inquiry for transactions (not payouts)
    if (type === "transaction" && uidMap) {
      const providerName = transaction.providerDetails?.name?.toLowerCase();
      let inquiryUrl, inquiryUid;

      try {
        const performInquiry = async (uid, merchantId, transactionId) => {
          if (providerName === "easypaisa") {
            console.log(`Using new EasyPaisa API for order ${transactionId} (has account_name)`);
            return await axiosInstance.get(
              `https://easypaisa-setup-server.assanpay.com/api/transactions/status-inquiry?orderId=${transactionId}`
            );
          } else if (providerName === "jazzcash") {
            return await axiosInstance.get(
              `${API_BASE_URL}/payment/simple-status-inquiry/${uid}?transactionId=${transactionId}`
            );
          } else {
            throw new Error("Unsupported provider");
          }
        };

        const performOldInquiry = async (uid, merchantId, transactionId) => {
          return await axiosInstance.get(
            `${API_BACKOFFICE_URL}/payment/inquiry-ep/${uid}?orderId=${transactionId}`
          );
        };

        // Get merchant ID and mapped UUID
        const merchantId = transaction.providerDetails?.id;
        let mappedId = uidMap[merchantId];
        let inquiryResponse = null
        // First attempt with mapped UUID
        if (mappedId) {
          console.log(`Performing ${providerName} inquiry with UUID: ${mappedId}`);
          inquiryUid = mappedId;
          let inquiryFailed = false;
          inquiryResponse = null;

          try {
            inquiryResponse = await performInquiry(mappedId, merchantId, order);
            console.log("Inquiry Response:", inquiryResponse.data);
          } catch (err) {
            console.log(`Inquiry API call failed for mappedId ${mappedId}:`, err.message);
            inquiryFailed = true;
          }

          // === Only proceed if we have a response OR it failed ===
          const responseData = inquiryResponse?.data;

          const isEasyPaisaNotFound =
            providerName === "easypaisa" &&
            responseData?.success === false &&
            ["Transaction not found", "invalid inputs", "Something went wrong"].includes(responseData?.message) &&
            responseData?.data?.statusCode === 404;

          const isJazzCashInvalid =
            providerName === "jazzcash" &&
            (
              inquiryFailed ||
              (!responseData?.data?.transactionStatus && !responseData?.transactionStatus) ||
              (responseData?.statusCode && responseData.statusCode >= 500) ||
              responseData?.success === false ||
              !responseData
            );

          if (isEasyPaisaNotFound || isJazzCashInvalid) {
            console.log(`Fallback triggered for ${providerName}. Using transaction UID.`);

            const fallbackUid =
              transaction.merchant?.uid ||
              transaction.merchant?.groups?.[0]?.uid ||
              transaction.merchant?.groups?.[0]?.merchant?.uid;

            if (!fallbackUid) {
              console.error(`No fallback UID found for transaction ${merchantTransactionId}`);
              await bot.sendMessage(chatId, `No merchant UID found for transaction ${merchantTransactionId}.`);
              return;
            }

            console.log(`Falling back to transaction UID: ${fallbackUid}`);
            inquiryUid = fallbackUid;

            try {
              if (providerName === "easypaisa") {
                inquiryResponse = await performOldInquiry(fallbackUid, merchantId, order);
              } else {
                inquiryResponse = await performInquiry(fallbackUid, merchantId, order);
              }
              console.log("Fallback Inquiry Response:", inquiryResponse.data);
            } catch (err) {
              console.error(`Fallback inquiry also failed:`, err.message);
              await bot.sendMessage(chatId, `Inquiry failed for ${merchantTransactionId} (even with fallback).`);
              return;
            }
          } else {
            console.log("Mapped UID inquiry succeeded. No fallback needed.");
          }
        } else {
          // No mapped ID — use transaction UID directly
          const uid =
            transaction.merchant?.uid ||
            transaction.merchant?.groups?.[0]?.uid ||
            transaction.merchant?.groups?.[0]?.merchant?.uid;

          if (!uid) {
            console.error(`No UID found for transaction ${merchantTransactionId}`);
            await bot.sendMessage(chatId, `No merchant mapping or UID found for transaction ${merchantTransactionId}.`);
            return;
          }

          console.log(`No mapped UID. Using transaction UID: ${uid}`);
          inquiryUid = uid;
          try {
            inquiryResponse = await performInquiry(uid, merchantId, order);
            console.log("Direct UID Inquiry Response:", inquiryResponse.data);
          } catch (err) {
            console.error(`Direct inquiry failed:`, err.message);
            await bot.sendMessage(chatId, `Inquiry failed for ${merchantTransactionId}.`);
            return;
          }
        }

        // === Final status processing (after mapped or fallback) ===
        console.log("Final Inquiry API Response:", inquiryResponse?.data);

        let inquiryStatus, inquiryStatusCode;

        if (providerName === "easypaisa") {
          // EasyPaisa: data.data.transactionStatus
          inquiryStatus = (inquiryResponse?.data?.data?.transactionStatus || inquiryResponse?.data?.transactionStatus)?.toLowerCase();
          inquiryStatusCode = inquiryResponse?.data?.statusCode;
        } else if (providerName === "jazzcash") {
          // JazzCash: data.transactionStatus (not data.data)
          inquiryStatus = (inquiryResponse?.data?.data?.transactionStatus || inquiryResponse?.data?.transactionStatus)?.toLowerCase();
          inquiryStatusCode = inquiryResponse?.data?.statusCode;
        }

        console.log("Parsed Status:", inquiryStatus, "| Code:", inquiryStatusCode);

        if (inquiryStatus === "completed" || inquiryStatus == 'paid') {
          await axiosInstance.post(SETTLE_API_URL, { transactionId: merchantTransactionId });
          console.log(`Transaction ${merchantTransactionId} marked as Completed.\nTxnID: ${txn_id}.\nDate: ${date_time}`);
          await bot.sendMessage(chatId, `Transaction ${merchantTransactionId}: Completed.\nTxnID: ${txn_id}.\nDate: ${date_time}`);
        } else if (!inquiryStatus || inquiryStatus === "failed" || inquiryStatus === "pending" || inquiryStatusCode === 500) {
          await axiosInstance.post(FAIL_API_URL, { transactionIds: [merchantTransactionId] });
          console.log(`Transaction ${merchantTransactionId} marked as failed.`);
          await bot.sendMessage(chatId, `Transaction ${merchantTransactionId}: Failed.`);
        } else {
          await bot.sendMessage(chatId, `Transaction ${merchantTransactionId}: Unknown status. Please contact support.`);
        }
      } catch (error) {
        console.error(`Error during inquiry for ${merchantTransactionId}:`, error.response?.data || error.message);
        await bot.sendMessage(chatId, `Error checking status for transaction ${merchantTransactionId}. Please try again later.`);
      }
    } else if (type === "payout") {
      // Handle payout status
      if (status === "failed") {
        console.log(`Payout ${merchantTransactionId} marked as failed.`);
        await bot.sendMessage(chatId, `Payout status ${merchantTransactionId}: Failed`);
      } else if (status === "pending") {
        console.log(`Payout ${merchantTransactionId} is pending.`);
        await bot.sendMessage(chatId, `Payout status ${merchantTransactionId}: Pending`);
      } else {
        console.log(`Payout ${merchantTransactionId} status unknown or not handled.`);
        await bot.sendMessage(chatId, `Payout ${merchantTransactionId}: Unknown status. Please contact support.`);
      }
    }
  } catch (error) {
    console.error(`Error handling ${type} for order ${order}:`, error.message);
    await bot.sendMessage(chatId, `Error processing ${type} ${order}`);
  }
};

bot.onText(/\/pendingout/, (msg) => {
  const chatId = msg.chat.id;
  const removepend = `https://sp-server.assanpay.com/backoffice/upd-disb`;
  axios
    .post(removepend)
    .then((response) => {
      if (response.data && response.data.statusCode === 200) {
        console.log("Pending payouts removed:", response.data);
        bot.sendMessage(chatId, `PAYOUT PENDING: ${response.data.data} removed successfully.`);
      } else {
        bot.sendMessage(chatId, `Failed to remove pending payouts.`);
      }
    })
    .catch((error) => {
      console.error("Error removing pending payouts:", error.message);
      bot.sendMessage(chatId, `Error removing pending payouts: ${error.message}`);
    });
});

bot.onText(/\/pendingin/, (msg) => {
  const chatId = msg.chat.id;
  const removepend = `https://sp-server.assanpay.com/backoffice/upd-txn`;
  axios
    .post(removepend)
    .then((response) => {
      if (response.data && response.data.statusCode === 200) {
        console.log("Pending payin removed:", response.data);
        bot.sendMessage(chatId, `PAYIN PENDING: ${response.data.data} removed successfully.`);
      } else {
        bot.sendMessage(chatId, `Failed to remove pending payin.`);
      }
    })
    .catch((error) => {
      console.error("Error removing pending payin:", error.message);
      bot.sendMessage(chatId, `Error removing pending payin: ${error.message}`);
    });
});

// Handle /pending command for pending payouts
bot.onText(/\/pending (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const merchantUids = match[1].trim().split(/\s+/);

  if (merchantUids.length === 0) {
    bot.sendMessage(chatId, "Please provide at least one order ID.");
    return;
  }

  let payoutCount = 0;

  for (const merchantUid of merchantUids) {
    const payCount = await pendingStatus(chatId, merchantUid);
    payoutCount += payCount;
  }

  bot.sendMessage(chatId, `Pending Payouts: ${payoutCount}`);
});

const pendingStatus = async (chatId, merchantUid) => {
  try {
    console.log(`Fetching pending payout status for: ${merchantUid}`);

    if (!merchantUid || typeof merchantUid !== "string" || merchantUid.trim() === "") {
      await bot.sendMessage(chatId, `Invalid UID provided: ${merchantUid}`);
      return 0;
    }

    const pendingUrl = `https://sp-server.assanpay.com/disbursement/tele?status=pending&uid=${merchantUid}`;

    let response;
    try {
      response = await axiosInstance.get(pendingUrl);
      console.log("API Response (payout):", response.data);
    } catch (error) {
      console.error(`Error fetching payout data for UID ${merchantUid}:`, error.message);
      await bot.sendMessage(chatId, `Error fetching payout for UID ${merchantUid}: ${error.message}`);
      return 0;
    }

    const items = response.data?.data?.transactions || [];
    const pendingItems = items.filter(item => item.status === "pending");

    return pendingItems.length;

  } catch (error) {
    console.error(`Unexpected error for UID ${merchantUid}:`, error.message);
    await bot.sendMessage(chatId, `Unexpected error for UID ${merchantUid}: ${error.message}`);
    return 0;
  }
};

// Handle /in command for transactions
bot.onText(/\/win (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const orders = match[1].trim().split(/\s+/);

  if (orders.length === 0) {
    bot.sendMessage(chatId, "Please provide at least one order ID.");
    return;
  }

  orders.forEach(order => handleTransactionAndPayout(chatId, order, "transaction"));
});

// Handle /out command for payouts
bot.onText(/\/wout (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const orders = match[1].trim().split(/\s+/);

  if (orders.length === 0) {
    bot.sendMessage(chatId, "Please provide at least one order ID.");
    return;
  }

  orders.forEach(order => handleTransactionAndPayout(chatId, order, "payout"));
});

// Handle image messages with caption
bot.on("photo", (msg) => {
  const chatId = msg.chat.id;

  if (msg.caption) {
    const parts = msg.caption.split(/\s+/);
    const command = parts[0];
    const orders = parts.slice(1);

    if (command === "/wout" || command === "/win") {
      const type = command === "/wout" ? "payout" : "transaction";
      if (orders.length === 0) {
        bot.sendMessage(chatId, "Please provide at least one order ID in the caption.");
        return;
      }
      orders.forEach(order => handleTransactionAndPayout(chatId, order.trim(), type));
    }
  }
});

// Error handling for bot
bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});

// Ignore any other commands (log only)
bot.on("message", (msg) => {
  const text = msg.text || "";
  if (!text.startsWith("/")) return;
  const allowed = [/^\/in\b/i, /^\/out\b/i, /^\/pin\b/i, /^\/pout\b/i];
  if (!allowed.some((re) => re.test(text))) {
    console.log(`Ignoring unsupported command: ${text}`);
  }
});

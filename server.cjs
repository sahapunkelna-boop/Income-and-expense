var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");

// src/firebase.ts
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var firebaseConfig = {
  projectId: "gen-lang-client-0334361765",
  appId: "1:170737440346:web:e5347dc18a41aa2ea9ea63",
  apiKey: "AIzaSyCrn6_drT2G57S_a5YoZPvWC_FdEnnMMq0",
  authDomain: "gen-lang-client-0334361765.firebaseapp.com",
  firestoreDatabaseId: "default",
  storageBucket: "gen-lang-client-0334361765.firebasestorage.app",
  messagingSenderId: "170737440346",
  measurementId: ""
};
var app = (0, import_app.getApps)().length === 0 ? (0, import_app.initializeApp)(firebaseConfig) : (0, import_app.getApp)();
var db = (0, import_firestore.getFirestore)(app);

// server.ts
var import_firestore2 = require("firebase/firestore");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app2 = (0, import_express.default)();
var PORT = 3e3;
app2.use(import_express.default.json());
app2.use(import_express.default.urlencoded({ extended: true }));
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
function isLastDayOfMonth(date) {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  return tomorrow.getMonth() !== date.getMonth();
}
async function sendLineMessage(channelAccessToken, userId, message) {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: "text",
            text: message
          }
        ]
      })
    });
    if (!response.ok) {
      console.error("LINE Messaging API response error:", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending LINE Message via Messaging API:", error);
    return false;
  }
}
async function generateMonthlySummaryReport(yearMonth, transactions) {
  let incomeTotal = 0;
  let expenseTotal = 0;
  const categoryTotals = {};
  const categoryLabels = {
    salary: "\u{1F4BC} \u0E40\u0E07\u0E34\u0E19\u0E40\u0E14\u0E37\u0E2D\u0E19",
    investment: "\u{1F4C8} \u0E25\u0E07\u0E17\u0E38\u0E19/\u0E1B\u0E31\u0E19\u0E1C\u0E25",
    business: "\u{1F3EA} \u0E18\u0E38\u0E23\u0E01\u0E34\u0E08\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E31\u0E27",
    allowance: "\u{1F381} \u0E04\u0E48\u0E32\u0E02\u0E19\u0E21/\u0E02\u0E2D\u0E07\u0E02\u0E27\u0E31\u0E0D",
    other_income: "\u2795 \u0E2D\u0E37\u0E48\u0E19\u0E46 (\u0E23\u0E32\u0E22\u0E23\u0E31\u0E1A)",
    food: "\u{1F354} \u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E41\u0E25\u0E30\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E14\u0E37\u0E48\u0E21",
    transport: "\u{1F697} \u0E01\u0E32\u0E23\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07/\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C",
    shopping: "\u{1F6CD}\uFE0F \u0E0A\u0E49\u0E2D\u0E1B\u0E1B\u0E34\u0E49\u0E07",
    entertainment: "\u{1F3AE} \u0E04\u0E27\u0E32\u0E21\u0E1A\u0E31\u0E19\u0E40\u0E17\u0E34\u0E07/\u0E1E\u0E31\u0E01\u0E1C\u0E48\u0E2D\u0E19",
    housing: "\u{1F3E0} \u0E1A\u0E49\u0E32\u0E19/\u0E17\u0E35\u0E48\u0E1E\u0E31\u0E01/\u0E19\u0E49\u0E33\u0E44\u0E1F",
    health: "\u{1F48A} \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E/\u0E22\u0E32",
    education: "\u{1F393} \u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32",
    other_expense: "\u{1F4DD} \u0E2D\u0E37\u0E48\u0E19\u0E46 (\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22)"
  };
  transactions.forEach((t) => {
    const amount = Number(t.amount) || 0;
    if (t.type === "income") {
      incomeTotal += amount;
    } else {
      expenseTotal += amount;
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;
    }
  });
  const netBalance = incomeTotal - expenseTotal;
  const savingsRate = incomeTotal > 0 ? (netBalance / incomeTotal * 100).toFixed(1) : "0.0";
  let breakdownStr = "";
  const sortedExpenses = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  if (sortedExpenses.length > 0) {
    breakdownStr = "\n\u{1F4CA} \u0E2A\u0E23\u0E38\u0E1B\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E22\u0E48\u0E2D\u0E22:\n";
    sortedExpenses.forEach(([catId, amount]) => {
      const percentage = expenseTotal > 0 ? amount / expenseTotal * 100 : 0;
      const barLength = Math.round(percentage / 10);
      const progressBar = "\u2593".repeat(barLength) + "\u2591".repeat(10 - barLength);
      const label = categoryLabels[catId] || catId;
      breakdownStr += `${label}: ${amount.toLocaleString()} \u0E3F (${percentage.toFixed(0)}%)
[${progressBar}]
`;
    });
  }
  let aiInsight = "\u0E02\u0E2D\u0E2D\u0E20\u0E31\u0E22 \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1A\u0E17\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E40\u0E07\u0E34\u0E19\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49";
  try {
    const transactionSummaryForAI = transactions.map((t) => ({
      type: t.type,
      category: categoryLabels[t.category] || t.category,
      amount: t.amount,
      description: t.description
    }));
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `\u0E01\u0E23\u0E38\u0E13\u0E32\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E1E\u0E24\u0E15\u0E34\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E40\u0E07\u0E34\u0E19\u0E08\u0E32\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E23\u0E38\u0E1B\u0E19\u0E35\u0E49\u0E14\u0E49\u0E27\u0E22\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E01\u0E31\u0E19\u0E40\u0E2D\u0E07 \u0E2A\u0E38\u0E20\u0E32\u0E1E \u0E21\u0E35\u0E1E\u0E25\u0E31\u0E07\u0E1A\u0E27\u0E01 \u0E41\u0E25\u0E30\u0E43\u0E2B\u0E49\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E40\u0E07\u0E34\u0E19\u0E17\u0E35\u0E48\u0E01\u0E23\u0E30\u0E0A\u0E31\u0E1A 1-2 \u0E1B\u0E23\u0E30\u0E42\u0E22\u0E04\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E2A\u0E34\u0E49\u0E19\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E19\u0E35\u0E49:
\u0E23\u0E32\u0E22\u0E23\u0E31\u0E1A\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14: ${incomeTotal} \u0E1A\u0E32\u0E17, \u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14: ${expenseTotal} \u0E1A\u0E32\u0E17, \u0E22\u0E2D\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D: ${netBalance} \u0E1A\u0E32\u0E17
\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E15\u0E32\u0E21\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48: ${JSON.stringify(sortedExpenses.map(([id, val]) => `${categoryLabels[id] || id}: ${val} \u0E1A\u0E32\u0E17`))}
\u0E2A\u0E48\u0E07\u0E1A\u0E17\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E01\u0E23\u0E30\u0E0A\u0E31\u0E1A\u0E46 \u0E44\u0E21\u0E48\u0E43\u0E2A\u0E48 markdown \u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 150 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23`
    });
    if (response.text) {
      aiInsight = response.text.trim();
    }
  } catch (error) {
    console.error("Failed to generate AI financial advice:", error);
  }
  const [year, month] = yearMonth.split("-");
  const monthNamesTh = [
    "\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21",
    "\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C",
    "\u0E21\u0E35\u0E19\u0E32\u0E04\u0E21",
    "\u0E40\u0E21\u0E29\u0E32\u0E22\u0E19",
    "\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21",
    "\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19",
    "\u0E01\u0E23\u0E01\u0E0E\u0E32\u0E04\u0E21",
    "\u0E2A\u0E34\u0E07\u0E2B\u0E32\u0E04\u0E21",
    "\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19",
    "\u0E15\u0E38\u0E25\u0E32\u0E04\u0E21",
    "\u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19",
    "\u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21"
  ];
  const displayMonth = `${monthNamesTh[parseInt(month) - 1]} ${parseInt(year) + 543}`;
  const report = `
\u{1F4CA} \u0E2A\u0E23\u0E38\u0E1B\u0E22\u0E2D\u0E14\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E23\u0E32\u0E22\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E1B\u0E23\u0E30\u0E08\u0E33 ${displayMonth}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4B0} \u0E23\u0E32\u0E22\u0E23\u0E31\u0E1A\u0E23\u0E27\u0E21: ${incomeTotal.toLocaleString()} \u0E3F
\u{1F4B8} \u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E23\u0E27\u0E21: ${expenseTotal.toLocaleString()} \u0E3F
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u2696\uFE0F \u0E22\u0E2D\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E2A\u0E38\u0E17\u0E18\u0E34: ${netBalance.toLocaleString()} \u0E3F
\u{1F4A1} \u0E2D\u0E31\u0E15\u0E23\u0E32\u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E21: ${savingsRate}%
${breakdownStr}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F916} \u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E01\u0E32\u0E23\u0E40\u0E07\u0E34\u0E19\u0E42\u0E14\u0E22 AI:
"${aiInsight}"

\u{1F517} \u0E40\u0E1B\u0E34\u0E14\u0E14\u0E39\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u0E2A\u0E23\u0E38\u0E1B\u0E1C\u0E25\u0E41\u0E1A\u0E1A\u0E01\u0E23\u0E32\u0E1F\u0E1F\u0E34\u0E01\u0E2A\u0E27\u0E22\u0E07\u0E32\u0E21\u0E40\u0E15\u0E47\u0E21\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E17\u0E35\u0E48:
${process.env.APP_URL || "https://ai.studio/build"}
`;
  return report;
}
app2.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app2.post("/api/parse-transaction", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text prompt is required" });
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E08\u0E14\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E32\u0E22\u0E23\u0E31\u0E1A\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22\u0E19\u0E35\u0E49 \u0E41\u0E25\u0E30\u0E23\u0E30\u0E1A\u0E38\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17 \u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14 \u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48 \u0E41\u0E25\u0E30\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            amount: {
              type: import_genai.Type.NUMBER,
              description: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02"
            },
            type: {
              type: import_genai.Type.STRING,
              description: "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 'income' \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E23\u0E31\u0E1A \u0E2B\u0E23\u0E37\u0E2D 'expense' \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22"
            },
            category: {
              type: import_genai.Type.STRING,
              description: "\u0E23\u0E2B\u0E31\u0E2A\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48: \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E23\u0E31\u0E1A\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01 'salary', 'investment', 'business', 'allowance' \u0E2B\u0E23\u0E37\u0E2D 'other_income' \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01 'food', 'transport', 'shopping', 'entertainment', 'housing', 'health', 'education' \u0E2B\u0E23\u0E37\u0E2D 'other_expense'"
            },
            description: {
              type: import_genai.Type.STRING,
              description: "\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E2B\u0E23\u0E37\u0E2D\u0E0A\u0E37\u0E48\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22 \u0E40\u0E0A\u0E48\u0E19 '\u0E0A\u0E32\u0E1A\u0E39', '\u0E40\u0E07\u0E34\u0E19\u0E40\u0E14\u0E37\u0E2D\u0E19', '\u0E04\u0E48\u0E32\u0E23\u0E16\u0E44\u0E1F'"
            }
          },
          required: ["amount", "type", "category", "description"]
        }
      }
    });
    const resultText = response.text?.trim();
    if (!resultText) {
      throw new Error("Empty response from Gemini");
    }
    const parsedData = JSON.parse(resultText);
    res.json(parsedData);
  } catch (error) {
    console.error("Gemini parse-transaction error:", error);
    res.status(500).json({ error: error.message || "Failed to parse transaction with AI" });
  }
});
app2.post("/api/line/test-notify", async (req, res) => {
  const { channelAccessToken, userId } = req.body;
  if (!channelAccessToken || !userId) {
    return res.status(400).json({ error: "Channel Access Token and User ID are required" });
  }
  const testMessage = `
\u{1F514} \u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E08\u0E32\u0E01 "\u0E23\u0E30\u0E1A\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E23\u0E32\u0E22\u0E23\u0E31\u0E1A-\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22 AI"
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u0E22\u0E34\u0E19\u0E14\u0E35\u0E14\u0E49\u0E27\u0E22! \u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E01\u0E31\u0E1A LINE Messaging API (LINE OA) \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 \u{1F389}
\u0E23\u0E30\u0E1A\u0E1A\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07\u0E2A\u0E23\u0E38\u0E1B\u0E22\u0E2D\u0E14\u0E01\u0E23\u0E32\u0E1F\u0E1F\u0E34\u0E01\u0E2A\u0E27\u0E22\u0E07\u0E32\u0E21\u0E41\u0E25\u0E30\u0E1A\u0E17\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E2D\u0E2D\u0E21\u0E40\u0E07\u0E34\u0E19\u0E23\u0E32\u0E22\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E43\u0E2B\u0E49\u0E04\u0E38\u0E13\u0E42\u0E14\u0E22\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E43\u0E19\u0E17\u0E38\u0E01\u0E2A\u0E34\u0E49\u0E19\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E04\u0E23\u0E31\u0E1A!

\u{1F517} \u0E40\u0E02\u0E49\u0E32\u0E40\u0E22\u0E35\u0E48\u0E22\u0E21\u0E0A\u0E21\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u0E01\u0E23\u0E32\u0E1F\u0E1F\u0E34\u0E01: ${process.env.APP_URL || "https://ai.studio/build"}
`;
  const success = await sendLineMessage(channelAccessToken, userId, testMessage);
  if (success) {
    res.json({ success: true, message: "Test notification sent successfully" });
  } else {
    res.status(500).json({ error: "Failed to send LINE notification. Please verify your Access Token and User ID." });
  }
});
app2.post("/api/line/trigger-monthly", async (req, res) => {
  const { yearMonth, channelAccessToken, userId } = req.body;
  if (!yearMonth || !channelAccessToken || !userId) {
    return res.status(400).json({ error: "yearMonth, channelAccessToken, and userId are required" });
  }
  try {
    const startRange = `${yearMonth}-01`;
    const endRange = `${yearMonth}-31`;
    const trRef = (0, import_firestore2.collection)(db, "transactions");
    const q = (0, import_firestore2.query)(trRef, (0, import_firestore2.where)("date", ">=", startRange), (0, import_firestore2.where)("date", "<=", endRange));
    const querySnapshot = await (0, import_firestore2.getDocs)(q);
    const transactions = [];
    querySnapshot.forEach((doc2) => {
      transactions.push({ id: doc2.id, ...doc2.data() });
    });
    if (transactions.length === 0) {
      return res.status(400).json({ error: `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E23\u0E32\u0E22\u0E23\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E40\u0E14\u0E37\u0E2D\u0E19 ${yearMonth} \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E48\u0E07\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19` });
    }
    const reportMessage = await generateMonthlySummaryReport(yearMonth, transactions);
    const success = await sendLineMessage(channelAccessToken, userId, reportMessage);
    if (success) {
      res.json({ success: true, message: `\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07\u0E2A\u0E23\u0E38\u0E1B\u0E22\u0E2D\u0E14\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E40\u0E14\u0E37\u0E2D\u0E19 ${yearMonth} \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27!` });
    } else {
      res.status(500).json({ error: "Failed to send LINE Messaging API report" });
    }
  } catch (error) {
    console.error("Trigger monthly summary error:", error);
    res.status(500).json({ error: error.message || "Failed to process monthly summary" });
  }
});
async function runEndOfMonthCheck() {
  try {
    const now = /* @__PURE__ */ new Date();
    const currentHour = now.getHours();
    if (isLastDayOfMonth(now) && currentHour === 20) {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const currentYearMonth = `${year}-${month}`;
      const settingsRef = (0, import_firestore2.doc)(db, "settings", "line");
      const settingsSnap = await (0, import_firestore2.getDoc)(settingsRef);
      if (settingsSnap.exists()) {
        const config = settingsSnap.data();
        if (config.channelAccessToken && config.userId && config.lineNotifyEnabled && config.autoMonthlySummaryEnabled && config.lastMonthlySummarySent !== currentYearMonth) {
          console.log(`Starting automated EOM report dispatch for: ${currentYearMonth}`);
          const startRange = `${currentYearMonth}-01`;
          const endRange = `${currentYearMonth}-31`;
          const trRef = (0, import_firestore2.collection)(db, "transactions");
          const q = (0, import_firestore2.query)(trRef, (0, import_firestore2.where)("date", ">=", startRange), (0, import_firestore2.where)("date", "<=", endRange));
          const querySnapshot = await (0, import_firestore2.getDocs)(q);
          const transactions = [];
          querySnapshot.forEach((doc2) => {
            transactions.push({ id: doc2.id, ...doc2.data() });
          });
          if (transactions.length > 0) {
            const reportMessage = await generateMonthlySummaryReport(currentYearMonth, transactions);
            const success = await sendLineMessage(config.channelAccessToken, config.userId, reportMessage);
            if (success) {
              await (0, import_firestore2.updateDoc)(settingsRef, {
                lastMonthlySummarySent: currentYearMonth
              });
              console.log(`Successfully dispatched automated EOM report for ${currentYearMonth}`);
            }
          } else {
            console.log(`No transactions logged for ${currentYearMonth}. Skipping automated report.`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in automated end-of-month scheduler check:", error);
  }
}
setInterval(runEndOfMonthCheck, 60 * 60 * 1e3);
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app2.use(import_express.default.static(distPath));
    app2.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app2.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map

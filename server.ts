import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { db } from "./src/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, query, where } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to get last day of month
function isLastDayOfMonth(date: Date): boolean {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  return tomorrow.getMonth() !== date.getMonth();
}

// Helper to send message to LINE Notify
async function sendLineNotify(token: string, message: string): Promise<boolean> {
  try {
    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`
      },
      body: new URLSearchParams({ message })
    });
    
    if (!response.ok) {
      console.error("LINE Notify response error:", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending LINE Notify:", error);
    return false;
  }
}

// Generate beautiful text-based report + Gemini AI Insight
async function generateMonthlySummaryReport(yearMonth: string, transactions: any[]): Promise<string> {
  let incomeTotal = 0;
  let expenseTotal = 0;
  const categoryTotals: Record<string, number> = {};

  const categoryLabels: Record<string, string> = {
    salary: "💼 เงินเดือน",
    investment: "📈 ลงทุน/ปันผล",
    business: "🏪 ธุรกิจส่วนตัว",
    allowance: "🎁 ค่าขนม/ของขวัญ",
    other_income: "➕ อื่นๆ (รายรับ)",
    food: "🍔 อาหารและเครื่องดื่ม",
    transport: "🚗 การเดินทาง/รถยนต์",
    shopping: "🛍️ ช้อปปิ้ง",
    entertainment: "🎮 ความบันเทิง/พักผ่อน",
    housing: "🏠 บ้าน/ที่พัก/น้ำไฟ",
    health: "💊 สุขภาพ/ยา",
    education: "🎓 การศึกษา",
    other_expense: "📝 อื่นๆ (รายจ่าย)"
  };

  transactions.forEach(t => {
    const amount = Number(t.amount) || 0;
    if (t.type === "income") {
      incomeTotal += amount;
    } else {
      expenseTotal += amount;
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;
    }
  });

  const netBalance = incomeTotal - expenseTotal;
  const savingsRate = incomeTotal > 0 ? ((netBalance / incomeTotal) * 100).toFixed(1) : "0.0";

  // Formulate text breakdown
  let breakdownStr = "";
  const sortedExpenses = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  
  if (sortedExpenses.length > 0) {
    breakdownStr = "\n📊 สรุปสัดส่วนรายจ่ายย่อย:\n";
    sortedExpenses.forEach(([catId, amount]) => {
      const percentage = expenseTotal > 0 ? (amount / expenseTotal) * 100 : 0;
      const barLength = Math.round(percentage / 10);
      const progressBar = "▓".repeat(barLength) + "░".repeat(10 - barLength);
      const label = categoryLabels[catId] || catId;
      breakdownStr += `${label}: ${amount.toLocaleString()} ฿ (${percentage.toFixed(0)}%)\n[${progressBar}]\n`;
    });
  }

  // Get AI Insight using Gemini
  let aiInsight = "ขออภัย ไม่สามารถสร้างบทวิเคราะห์ทางการเงินในขณะนี้ได้";
  try {
    const transactionSummaryForAI = transactions.map(t => ({
      type: t.type,
      category: categoryLabels[t.category] || t.category,
      amount: t.amount,
      description: t.description
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `กรุณาวิเคราะห์พฤติกรรมการใช้เงินจากรายการสรุปนี้ด้วยภาษาไทยที่เป็นกันเอง สุภาพ มีพลังบวก และให้คำแนะนำทางการเงินที่กระชับ 1-2 ประโยคสำหรับสิ้นเดือนนี้:
รายรับทั้งหมด: ${incomeTotal} บาท, รายจ่ายทั้งหมด: ${expenseTotal} บาท, ยอดคงเหลือ: ${netBalance} บาท
รายการใช้จ่ายตามหมวดหมู่: ${JSON.stringify(sortedExpenses.map(([id, val]) => `${categoryLabels[id] || id}: ${val} บาท`))}
ส่งบทวิเคราะห์กระชับๆ ไม่ใส่ markdown และไม่เกิน 150 ตัวอักษร`,
    });
    
    if (response.text) {
      aiInsight = response.text.trim();
    }
  } catch (error) {
    console.error("Failed to generate AI financial advice:", error);
  }

  // Parse Year-Month label
  const [year, month] = yearMonth.split("-");
  const monthNamesTh = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const displayMonth = `${monthNamesTh[parseInt(month) - 1]} ${parseInt(year) + 543}`;

  const report = `
📊 สรุปยอดบัญชีรายเดือนประจำ ${displayMonth}
━━━━━━━━━━━━━━━━━━
💰 รายรับรวม: ${incomeTotal.toLocaleString()} ฿
💸 รายจ่ายรวม: ${expenseTotal.toLocaleString()} ฿
━━━━━━━━━━━━━━━━━━
⚖️ ยอดคงเหลือสุทธิ: ${netBalance.toLocaleString()} ฿
💡 อัตราการออม: ${savingsRate}%
${breakdownStr}
━━━━━━━━━━━━━━━━━━
🤖 วิเคราะห์การเงินโดย AI:
"${aiInsight}"

🔗 เปิดดูหน้าแดชบอร์ดสรุปผลแบบกราฟฟิกสวยงามเต็มรูปแบบได้ที่:
${process.env.APP_URL || "https://ai.studio/build"}
`;

  return report;
}

// Endpoint: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint: AI Transaction Parser using Gemini 3.5 Flash
app.post("/api/parse-transaction", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text prompt is required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `วิเคราะห์ข้อความจดบันทึกรายรับหรือรายจ่ายภาษาไทยนี้ และระบุประเภท รายละเอียด หมวดหมู่ และจำนวนเงินอย่างแม่นยำ: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: {
              type: Type.NUMBER,
              description: "จำนวนเงินเป็นตัวเลข"
            },
            type: {
              type: Type.STRING,
              description: "ประเภทรายการ ต้องเป็น 'income' สำหรับรายรับ หรือ 'expense' สำหรับรายจ่าย"
            },
            category: {
              type: Type.STRING,
              description: "รหัสหมวดหมู่: สำหรับรายรับต้องเลือก 'salary', 'investment', 'business', 'allowance' หรือ 'other_income' สำหรับรายจ่ายต้องเลือก 'food', 'transport', 'shopping', 'entertainment', 'housing', 'health', 'education' หรือ 'other_expense'"
            },
            description: {
              type: Type.STRING,
              description: "คำอธิบายหรือชื่อรายการภาษาไทย เช่น 'ชาบู', 'เงินเดือน', 'ค่ารถไฟ'"
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
  } catch (error: any) {
    console.error("Gemini parse-transaction error:", error);
    res.status(500).json({ error: error.message || "Failed to parse transaction with AI" });
  }
});

// Endpoint: Test LINE Notify Connection
app.post("/api/line/test-notify", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "LINE token is required" });
  }

  const testMessage = `
🔔 ทดสอบการแจ้งเตือนจาก "ระบบบัญชีรายรับ-รายจ่าย AI"
━━━━━━━━━━━━━━━━━━━━━━
ยินดีด้วย! บัญชีของคุณเชื่อมต่อกับ LINE Notify เรียบร้อยแล้ว 🎉
ระบบพร้อมจัดส่งสรุปยอดกราฟฟิกสวยงามและบทวิเคราะห์ออมเงินรายเดือนให้คุณโดยอัตโนมัติในทุกสิ้นเดือนครับ!

🔗 เข้าเยี่ยมชมแดชบอร์ดกราฟฟิก: ${process.env.APP_URL || "https://ai.studio/build"}
`;

  const success = await sendLineNotify(token, testMessage);
  if (success) {
    res.json({ success: true, message: "Test notification sent successfully" });
  } else {
    res.status(500).json({ error: "Failed to send LINE notification. Please verify your token." });
  }
});

// Endpoint: Manually trigger monthly summary delivery
app.post("/api/line/trigger-monthly", async (req, res) => {
  const { yearMonth, token } = req.body;
  if (!yearMonth || !token) {
    return res.status(400).json({ error: "yearMonth (YYYY-MM) and token are required" });
  }

  try {
    // Query all transactions for this month
    const startRange = `${yearMonth}-01`;
    const endRange = `${yearMonth}-31`; // Simple range check
    
    const trRef = collection(db, "transactions");
    const q = query(trRef, where("date", ">=", startRange), where("date", "<=", endRange));
    const querySnapshot = await getDocs(q);
    const transactions: any[] = [];
    querySnapshot.forEach(doc => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    if (transactions.length === 0) {
      return res.status(400).json({ error: `ไม่พบข้อมูลรายรับรายจ่ายในเดือน ${yearMonth} เพื่อส่งรายงาน` });
    }

    const reportMessage = await generateMonthlySummaryReport(yearMonth, transactions);
    const success = await sendLineNotify(token, reportMessage);

    if (success) {
      res.json({ success: true, message: `จัดส่งสรุปยอดประจำเดือน ${yearMonth} เรียบร้อยแล้ว!` });
    } else {
      res.status(500).json({ error: "Failed to send LINE Notify report" });
    }
  } catch (error: any) {
    console.error("Trigger monthly summary error:", error);
    res.status(500).json({ error: error.message || "Failed to process monthly summary" });
  }
});

// Automatic check for End of Month Notification (runs hourly)
async function runEndOfMonthCheck() {
  try {
    const now = new Date();
    // We only trigger at 20:00 (8:00 PM) to ensure most transactions of the day are recorded
    const currentHour = now.getHours();
    
    // For testability and actual operation, we check if it is the last day of the month and hour is 20 (8 PM)
    if (isLastDayOfMonth(now) && currentHour === 20) {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const currentYearMonth = `${year}-${month}`;

      // Retrieve Settings / Config to find the token and see if it's already sent
      const settingsRef = doc(db, "settings", "line");
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const config = settingsSnap.data();
        
        if (
          config.lineNotifyToken &&
          config.lineNotifyEnabled &&
          config.autoMonthlySummaryEnabled &&
          config.lastMonthlySummarySent !== currentYearMonth
        ) {
          console.log(`Starting automated EOM report dispatch for: ${currentYearMonth}`);
          
          // Query current month transactions
          const startRange = `${currentYearMonth}-01`;
          const endRange = `${currentYearMonth}-31`;
          const trRef = collection(db, "transactions");
          const q = query(trRef, where("date", ">=", startRange), where("date", "<=", endRange));
          const querySnapshot = await getDocs(q);
          const transactions: any[] = [];
          querySnapshot.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() });
          });

          if (transactions.length > 0) {
            const reportMessage = await generateMonthlySummaryReport(currentYearMonth, transactions);
            const success = await sendLineNotify(config.lineNotifyToken, reportMessage);
            
            if (success) {
              await updateDoc(settingsRef, {
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

// Check every hour (3600000 ms)
setInterval(runEndOfMonthCheck, 60 * 60 * 1000);

// Initialize Vite and Start Server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

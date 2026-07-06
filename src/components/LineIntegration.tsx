import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LINEConfig } from "../types";
import { motion } from "motion/react";
import CategoryIcon from "./CategoryIcon";

interface LineIntegrationProps {
  selectedMonth: string; // YYYY-MM
}

export default function LineIntegration({ selectedMonth }: LineIntegrationProps) {
  const [config, setConfig] = useState<LINEConfig>({
    lineNotifyToken: "",
    lineNotifyEnabled: false,
    autoMonthlySummaryEnabled: false,
    lastMonthlySummarySent: ""
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load config on mount
  useEffect(() => {
    async function loadLineConfig() {
      try {
        const snap = await getDoc(doc(db, "settings", "line"));
        if (snap.exists()) {
          setConfig(snap.data() as LINEConfig);
        }
      } catch (err) {
        console.error("Failed to load LINE settings:", err);
      }
    }
    loadLineConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await setDoc(doc(db, "settings", "line"), config);
      setTestResult({ type: "success", message: "บันทึกการตั้งค่า LINE สำเร็จ 💾" });
    } catch (err) {
      console.error(err);
      setTestResult({ type: "error", message: "บันทึกการตั้งค่าล้มเหลว กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    if (!config.lineNotifyToken) {
      setTestResult({ type: "error", message: "กรุณากรอก LINE Notify Token ก่อนทดสอบการเชื่อมต่อ" });
      return;
    }
    
    setLoading(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/line/test-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: config.lineNotifyToken })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({
          type: "success",
          message: "ส่งข้อความทดสอบสำเร็จแล้ว! กรุณาเช็คแอป LINE ของคุณ 🟢"
        });
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการส่งการแจ้งเตือน");
      }
    } catch (err: any) {
      setTestResult({ type: "error", message: err.message || "ล้มเหลวในการเชื่อมต่อกับ LINE Notify" });
    } finally {
      setLoading(false);
    }
  };

  const handleManualDispatch = async () => {
    if (!config.lineNotifyToken) {
      setTestResult({ type: "error", message: "กรุณากรอก LINE Notify Token และบันทึกข้อมูลก่อนจัดส่งรายงาน" });
      return;
    }

    setLoading(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/line/trigger-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: config.lineNotifyToken,
          yearMonth: selectedMonth
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({
          type: "success",
          message: `รายงานสรุปยอดกราฟฟิก AI ประจำเดือน ${selectedMonth} ถูกส่งเข้า LINE ของคุณแล้ว! 📤`
        });
      } else {
        throw new Error(data.error || "ไม่สามารถส่งสรุปผลได้");
      }
    } catch (err: any) {
      setTestResult({ type: "error", message: err.message || "เกิดข้อผิดพลาดในการจัดส่งรายงาน" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm"
      id="line-integration-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center font-bold text-lg">
          💬
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">เชื่อมต่อระบบแจ้งเตือนผ่าน LINE</h3>
          <p className="text-xs text-slate-400">รับรายงานสรุปยอดประจำเดือนแบบกราฟฟิกสวยงามและบทวิเคราะห์ทางการเงินด้วย AI</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Token Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            LINE Notify Personal Token
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="กรอก LINE Notify Token (เช่น: dXo82H9D1...)"
              value={config.lineNotifyToken}
              onChange={(e) => setConfig({ ...config, lineNotifyToken: e.target.value })}
              className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-150 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
            />
            <button
              onClick={handleTestNotification}
              disabled={loading || !config.lineNotifyToken}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <span className="w-4.5 h-4.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
              ) : (
                "🔔 ทดสอบส่ง"
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            *วิธีรับ Token: 1. ไปที่เว็บไซต์{" "}
            <a
              href="https://notify-bot.line.me/my/"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-500 hover:underline font-semibold"
            >
              LINE Notify
            </a>{" "}
            และลงชื่อเข้าใช้งาน &gt; 2. คลิก <strong>ออก Token (Generate Token)</strong> &gt; 3. เลือกส่งแบบ
            1-on-1 (ส่วนตัว) หรือกลุ่มแชทที่ต้องการ &gt; 4. คัดลอกโทเค็นมาวางที่นี่
          </p>
        </div>

        {/* Toggles */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3.5">
          {/* Toggle EOM Summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700">ส่งรายงานสรุปยอดทุกสิ้นเดือนอัตโนมัติ</p>
              <p className="text-[10px] text-slate-400">ระบบ AI วิเคราะห์และจัดส่งรายงานเข้าแชท LINE เวลา 20:00 น. ของวันสุดท้ายในแต่ละเดือน</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoMonthlySummaryEnabled}
                onChange={(e) =>
                  setConfig({ ...config, autoMonthlySummaryEnabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          {/* Toggle Notify Active */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700 font-sans">เปิดการเชื่อมต่อ LINE Notify ทั้งหมด</p>
              <p className="text-[10px] text-slate-400">อนุญาตให้ส่งรายงานและระบบแจ้งเตือนความคืบหน้าทางการเงิน</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.lineNotifyEnabled}
                onChange={(e) => setConfig({ ...config, lineNotifyEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>
        </div>

        {/* Buttons Action Group */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {saving ? "กำลังบันทึก..." : "💾 บันทึกการตั้งค่า"}
          </button>
          
          <button
            onClick={handleManualDispatch}
            disabled={loading || !config.lineNotifyToken}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            📤 ส่งรายงานประจำเดือนนี้ทันที
          </button>
        </div>

        {/* Test Result Message Box */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-xl text-xs font-medium text-center ${
              testResult.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-rose-50 text-rose-700 border border-rose-100"
            }`}
          >
            {testResult.message}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

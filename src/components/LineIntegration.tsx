import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LINEConfig } from "../types";
import { motion } from "motion/react";

interface LineIntegrationProps {
  selectedMonth: string; // YYYY-MM
}

export default function LineIntegration({ selectedMonth }: LineIntegrationProps) {
  const [config, setConfig] = useState<LINEConfig>({
    channelAccessToken: "",
    userId: "",
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
      setTestResult({ type: "success", message: "บันทึกการตั้งค่า LINE สำเร็จ 💾 | LINE settings saved successfully." });
    } catch (err) {
      console.error(err);
      setTestResult({ type: "error", message: "บันทึกการตั้งค่าล้มเหลว กรุณาลองใหม่อีกครั้ง | Saving failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    if (!config.channelAccessToken || !config.userId) {
      setTestResult({ type: "error", message: "กรุณากรอก Channel Access Token และ User ID ก่อนทดสอบการเชื่อมต่อ" });
      return;
    }
    
    setLoading(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/line/test-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelAccessToken: config.channelAccessToken,
          userId: config.userId
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({
          type: "success",
          message: "ส่งข้อความทดสอบสำเร็จแล้ว! กรุณาเช็คแอป LINE ของคุณ 🟢 | Test message sent!"
        });
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการส่งการแจ้งเตือน");
      }
    } catch (err: any) {
      setTestResult({ type: "error", message: err.message || "ล้มเหลวในการเชื่อมต่อกับ LINE Messaging API" });
    } finally {
      setLoading(false);
    }
  };

  const handleManualDispatch = async () => {
    if (!config.channelAccessToken || !config.userId) {
      setTestResult({ type: "error", message: "กรุณากรอกรายละเอียด LINE และบันทึกข้อมูลก่อนจัดส่งรายงาน" });
      return;
    }

    setLoading(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/line/trigger-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelAccessToken: config.channelAccessToken,
          userId: config.userId,
          yearMonth: selectedMonth
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({
          type: "success",
          message: `รายงานสรุปยอดประจำเดือน ${selectedMonth} ถูกส่งเข้า LINE ของคุณแล้ว! 📤`
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
          <p className="text-xs text-slate-400">รับรายงานสรุปยอดประจำเดือนแบบกราฟฟิกสวยงามและบทวิเคราะห์ทางการเงินด้วย AI (LINE Messaging API)</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Token and User ID Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex justify-between">
              <span>Channel Access Token (LINE Official Account)</span>
              <span className="text-slate-400 font-mono text-[10px]">Required</span>
            </label>
            <input
              type="password"
              placeholder="กรอก LINE Channel Access Token (Long-lived)"
              value={config.channelAccessToken}
              onChange={(e) => setConfig({ ...config, channelAccessToken: e.target.value })}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-150 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex justify-between">
              <span>Your User ID (LINE User ID)</span>
              <span className="text-slate-400 font-mono text-[10px]">Starts with U...</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="กรอก LINE User ID ของคุณ (เช่น: U1234567890abcdef...)"
                value={config.userId}
                onChange={(e) => setConfig({ ...config, userId: e.target.value })}
                className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-150 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
              />
              <button
                onClick={handleTestNotification}
                disabled={loading || !config.channelAccessToken || !config.userId}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4.5 h-4.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  "🔔 ทดสอบส่ง"
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4.5 text-[11px] text-slate-500 space-y-2.5 border border-slate-100">
            <p className="font-bold text-slate-700 text-xs flex items-center gap-1">
              <span>🚀</span> วิธีการเชื่อมต่อ LINE Messaging API (แทน LINE Notify ที่ปิดตัว):
            </p>
            
            <div className="space-y-2">
              <div>
                <p className="font-semibold text-slate-600">🇹🇭 ภาษาไทย:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-500 leading-relaxed">
                  <li>ไปที่เว็บ <a href="https://developers.line.biz/" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline font-bold">LINE Developers Console</a> แล้วเข้าสู่ระบบ</li>
                  <li>สร้าง <strong>Provider</strong> และสร้าง <strong>Channel เป็นประเภท "Messaging API"</strong></li>
                  <li>เพิ่ม LINE Bot ตัวนี้เป็นเพื่อนในแอปมือถือของคุณ (สแกน QR Code ในแถบ "Messaging API")</li>
                  <li><strong>ค้นหา User ID ของคุณ:</strong> ในแถบ Messaging API เลื่อนลงมาล่างสุดจะพบหัวข้อ <strong>"Your user ID"</strong> (เริ่มต้นด้วยตัว U) นำมาวางช่องขวา</li>
                  <li><strong>ออก Token:</strong> เลื่อนลงล่างสุดในแถบ Messaging API เพื่อกด <strong>Issue</strong> ตรงหัวข้อ <strong>"Channel access token"</strong> คัดลอกมาวางช่องบนสุด</li>
                </ol>
              </div>

              <div className="border-t border-slate-200/60 pt-2">
                <p className="font-semibold text-slate-600">🇺🇸 English Guide:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-500 leading-relaxed">
                  <li>Go to <a href="https://developers.line.biz/" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline font-bold">LINE Developers Console</a> and log in.</li>
                  <li>Create a <strong>Provider</strong>, then create a Channel with type <strong>"Messaging API"</strong>.</li>
                  <li>Add your new LINE bot as a friend by scanning the QR code in the <strong>"Messaging API"</strong> tab.</li>
                  <li><strong>Get your User ID:</strong> In the Messaging API tab, scroll down to find <strong>"Your user ID"</strong> (starts with a 'U'), and paste it in the right field.</li>
                  <li><strong>Generate Token:</strong> Scroll to the bottom of the Messaging API tab and click <strong>Issue</strong> next to <strong>"Channel access token"</strong>, then paste it in the top field.</li>
                </ol>
              </div>
            </div>
          </div>
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
              <p className="text-xs font-bold text-slate-700 font-sans">เปิดการเชื่อมต่อ LINE Messaging API</p>
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
            {saving ? "กำลังบันทึก..." : "💾 บันทึกการตั้งค่า / Save Settings"}
          </button>
          
          <button
            onClick={handleManualDispatch}
            disabled={loading || !config.channelAccessToken || !config.userId}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            📤 ส่งรายงานทันที / Send Now
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

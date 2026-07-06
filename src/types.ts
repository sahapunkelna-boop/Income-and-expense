export interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
}

export interface LINEConfig {
  lineNotifyToken: string;
  lineNotifyEnabled: boolean;
  autoMonthlySummaryEnabled: boolean;
  lastMonthlySummarySent: string; // YYYY-MM
}

export const CATEGORIES = {
  income: [
    { id: "salary", label: "เงินเดือน", icon: "Briefcase", color: "#10B981" },
    { id: "investment", label: "ลงทุน/ปันผล", icon: "TrendingUp", color: "#059669" },
    { id: "business", label: "ธุรกิจส่วนตัว", icon: "Store", color: "#34D399" },
    { id: "allowance", label: "ค่าขนม/ของขวัญ", icon: "Gift", color: "#6EE7B7" },
    { id: "other_income", label: "อื่นๆ (รายรับ)", icon: "CirclePlus", color: "#A7F3D0" }
  ],
  expense: [
    { id: "food", label: "อาหารและเครื่องดื่ม", icon: "Utensils", color: "#EF4444" },
    { id: "transport", label: "การเดินทาง/รถยนต์", icon: "Car", color: "#3B82F6" },
    { id: "shopping", label: "ช้อปปิ้ง", icon: "ShoppingBag", color: "#F59E0B" },
    { id: "entertainment", label: "ความบันเทิง/พักผ่อน", icon: "Gamepad2", color: "#8B5CF6" },
    { id: "housing", label: "บ้าน/ที่พัก/น้ำไฟ", icon: "Home", color: "#EC4899" },
    { id: "health", label: "สุขภาพ/ยา", icon: "HeartPulse", color: "#14B8A6" },
    { id: "education", label: "การศึกษา", icon: "GraduationCap", color: "#6366F1" },
    { id: "other_expense", label: "อื่นๆ (รายจ่าย)", icon: "Receipt", color: "#6B7280" }
  ]
};

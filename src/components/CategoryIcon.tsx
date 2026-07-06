import * as Icons from "lucide-react";

interface CategoryIconProps {
  name: string;
  className?: string;
}

export default function CategoryIcon({ name, className = "w-5 h-5" }: CategoryIconProps) {
  const IconComponent = (Icons as any)[name] || Icons.Receipt;
  return <IconComponent className={className} />;
}

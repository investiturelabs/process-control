import {
  Building2,
  UtensilsCrossed,
  Fish,
  CakeSlice,
  Apple,
  Package,
  Milk,
  ShoppingCart,
  Pill,
  HelpCircle,
} from 'lucide-react';

const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Building2,
  UtensilsCrossed,
  Fish,
  CakeSlice,
  Apple,
  Package,
  Milk,
  ShoppingCart,
  Pill,
};

interface Props {
  name: string;
  size?: number;
  className?: string;
}

export function DeptIcon({ name, size = 20, className }: Props) {
  const Icon = iconMap[name] || HelpCircle;
  return <Icon size={size} className={className} />;
}

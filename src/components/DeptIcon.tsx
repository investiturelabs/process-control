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

export const DEPT_ICON_NAMES = Object.keys(iconMap);

interface Props {
  name: string;
  size?: number;
  className?: string;
}

export function DeptIcon({ name, size = 20, className }: Props) {
  const Icon = iconMap[name];
  if (!Icon) {
    if (import.meta.env.DEV) console.warn(`DeptIcon: unknown icon "${name}"`);
    return <HelpCircle size={size} className={className} />;
  }
  return <Icon size={size} className={className} />;
}

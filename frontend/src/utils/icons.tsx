import {
  Briefcase,
  Hammer,
  Home,
  LucideIcon,
  Paintbrush,
  Shield,
  Sparkles,
  Truck,
  Wrench,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  plumbing: Wrench,
  electrical: Hammer,
  cleaning: Sparkles,
  movers: Truck,
  painting: Paintbrush,
  security: Shield,
  handyman: Briefcase,
  home: Home,
  wrench: Wrench,
  hammer: Hammer,
  sparkles: Sparkles,
  truck: Truck,
  paintbrush: Paintbrush,
  shield: Shield,
  briefcase: Briefcase,
};

export const getCategoryIcon = (iconOrName?: string): LucideIcon => {
  if (!iconOrName) {
    return Briefcase;
  }

  const key = iconOrName.toLowerCase().replace(/[^a-z]/g, '');
  return iconMap[key] || Briefcase;
};

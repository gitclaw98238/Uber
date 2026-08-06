import { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: number;
}

interface BottomNavProps {
  items: NavItem[];
}

const BottomNav = ({ items }: BottomNavProps) => (
  <nav className="bottom-nav">
    {items.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
          <span className="icon-wrap">
            <Icon size={20} />
            {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
          </span>
          <span>{item.label}</span>
        </NavLink>
      );
    })}
  </nav>
);

export default BottomNav;

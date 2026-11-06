'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  Sparkles,
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Properties',
    href: '/properties',
    icon: Building2,
  },
  {
    title: 'Tenants',
    href: '/tenants',
    icon: Users,
  },
  {
    title: 'Smart Matchmaker',
    href: '/matching',
    icon: Sparkles,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-64">
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">
            BRICAURA
          </span>
          <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
            Property & Lead CRM
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              )}
            >
              <item.icon className={cn('w-4 h-4', isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400')} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Status / Bottom badge */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Supabase Connected
          </div>
          <p className="text-[11px] text-slate-400">PostgreSQL RLS Active</p>
        </div>
      </div>
    </div>
  );
}

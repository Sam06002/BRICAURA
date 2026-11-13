import Link from 'next/link';
import { getProperties } from '@/app/actions/properties';
import { getTenants } from '@/app/actions/tenants';
import { calculateMatchScore } from '@/lib/matching';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/utils';
import type { Property, Tenant } from '@/types';
import {
  Building2,
  Users,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  PlusCircle,
  UserPlus,
  Flame,
  MapPin,
  Check,
} from 'lucide-react';

interface AttentionItem {
  id: string;
  type: 'tenant' | 'property';
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColorClass: string;
  href: string;
  priority: number;
}

interface StrongMatchItem {
  tenant: Tenant;
  property: Property;
  score: number;
  tierLabel: string;
}

export default async function DashboardPage() {
  const [properties, tenants] = await Promise.all([
    getProperties(),
    getTenants(),
  ]);

  // --------------------------------------------------------------------------
  // 1. KPI Calculations (Logged-in user's data)
  // --------------------------------------------------------------------------
  const availableProps = properties.filter((p) => p.status === 'Available');
  const propsUnderDiscussion = properties.filter((p) => p.status === 'Under Discussion');
  const rentedProps = properties.filter((p) => p.status === 'Rented');

  const openTenants = tenants.filter((t) => t.status !== 'Closed' && t.status !== 'Lost');
  const negotiatingTenants = tenants.filter((t) => t.status === 'Negotiating');

  // Count strong tenant <-> property pairs (score >= 70, property Available, tenant not Closed/Lost)
  const strongMatches: StrongMatchItem[] = [];
  for (const tenant of openTenants) {
    for (const property of availableProps) {
      const matchResult = calculateMatchScore(tenant, property);
      if (matchResult.score >= 70) {
        strongMatches.push({
          tenant,
          property,
          score: matchResult.score,
          tierLabel: matchResult.tierLabel,
        });
      }
    }
  }

  // Sort matches descending by score
  strongMatches.sort((a, b) => b.score - a.score);
  const topMatches = strongMatches.slice(0, 5);

  // --------------------------------------------------------------------------
  // 2. Needs Attention List (Max 5 rows)
  // - Tenants with status New created > 3 days ago, or status Negotiating
  // - Available properties that are immediate or available_from is today or earlier
  // --------------------------------------------------------------------------
  const now = new Date();
  const threeDaysAgoMs = now.getTime() - 3 * 24 * 60 * 60 * 1000;
  const todayStr = now.toISOString().split('T')[0];

  const attentionItems: AttentionItem[] = [];

  // A. Check tenants
  for (const t of tenants) {
    if (t.status === 'Closed' || t.status === 'Lost') continue;

    const createdAtMs = new Date(t.created_at).getTime();
    const hasFollowUp = !!t.next_follow_up;
    const isOverdue = hasFollowUp && t.next_follow_up! < todayStr;
    const isDueToday = hasFollowUp && t.next_follow_up! === todayStr;

    if (isOverdue) {
      attentionItems.push({
        id: `tenant-${t.id}`,
        type: 'tenant',
        title: t.name,
        subtitle: `Follow-up overdue (${formatDate(t.next_follow_up!)}) • ${t.preferred_type.join(', ')}`,
        badgeText: 'Overdue',
        badgeColorClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
        href: `/tenants/${t.id}`,
        priority: 1, // Highest urgency: overdue follow-up
      });
    } else if (isDueToday) {
      attentionItems.push({
        id: `tenant-${t.id}`,
        type: 'tenant',
        title: t.name,
        subtitle: `Follow-up due today • Budget ${formatCurrency(Number(t.budget_min))} - ${formatCurrency(Number(t.budget_max))}`,
        badgeText: 'Due Today',
        badgeColorClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        href: `/tenants/${t.id}`,
        priority: 2, // Second: follow-up due today
      });
    } else if (t.status === 'Negotiating') {
      attentionItems.push({
        id: `tenant-${t.id}`,
        type: 'tenant',
        title: t.name,
        subtitle: `In negotiation • Budget ${formatCurrency(Number(t.budget_min))} - ${formatCurrency(Number(t.budget_max))}`,
        badgeText: 'Negotiating',
        badgeColorClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        href: `/tenants/${t.id}`,
        priority: 3, // Third: negotiating
      });
    } else if (t.status === 'New' && createdAtMs < threeDaysAgoMs) {
      const daysAgo = Math.max(3, Math.floor((now.getTime() - createdAtMs) / (24 * 60 * 60 * 1000)));
      attentionItems.push({
        id: `tenant-${t.id}`,
        type: 'tenant',
        title: t.name,
        subtitle: `New lead uncontacted for ${daysAgo} days • Looking for ${t.preferred_type.join(', ')}`,
        badgeText: `Untouched ${daysAgo}d`,
        badgeColorClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
        href: `/tenants/${t.id}`,
        priority: 4, // Fourth: old untouched lead
      });
    }
  }

  // B. Check properties
  for (const p of properties) {
    if (p.status === 'Available') {
      const isReadyNow = p.is_immediate || p.available_from <= todayStr;
      if (isReadyNow) {
        attentionItems.push({
          id: `property-${p.id}`,
          type: 'property',
          title: `${p.type} in ${p.location}`,
          subtitle: p.is_immediate
            ? `Immediate move-in vacancy • ${formatCurrency(Number(p.rent))}/mo`
            : `Available since ${formatDate(p.available_from)} • ${formatCurrency(Number(p.rent))}/mo`,
          badgeText: p.is_immediate ? 'Immediate' : 'Vacant Now',
          badgeColorClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
          href: `/properties/${p.id}`,
          priority: 5,
        });
      }
    }
  }

  // Sort by priority (1 -> 2 -> 3) and limit to max 5 items
  attentionItems.sort((a, b) => a.priority - b.priority);
  const needsAttention = attentionItems.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Broker Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Daily pipeline, high-priority actions, and strong tenant-property matches.
          </p>
        </div>

        {/* Quick Actions (3 buttons) */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/properties">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <PlusCircle className="w-3.5 h-3.5" />
              Add Property
            </Button>
          </Link>
          <Link href="/tenants">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <UserPlus className="w-3.5 h-3.5" />
              Add Tenant
            </Button>
          </Link>
          <Link href="/matching">
            <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Open Matchmaker
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards: Mobile in 2 columns (grid-cols-2), md in 3 columns, xl in 6 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Available Properties */}
        <Link href="/properties" className="group">
          <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-xs hover:shadow-sm transition-all">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Available
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Building2 className="w-3.5 h-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {availableProps.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>Vacant units</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 2. Properties Under Discussion */}
        <Link href="/properties" className="group">
          <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 shadow-xs hover:shadow-sm transition-all">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                In Discussion
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {propsUnderDiscussion.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>Under review</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 3. Rented Properties */}
        <Link href="/properties" className="group">
          <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Rented
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {rentedProps.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>Closed deals</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 4. Open Tenant Leads */}
        <Link href="/tenants" className="group">
          <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-xs hover:shadow-sm transition-all">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Open Leads
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <Users className="w-3.5 h-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {openTenants.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>Active seekers</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 5. Leads in Negotiating */}
        <Link href="/tenants" className="group">
          <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 shadow-xs hover:shadow-sm transition-all">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Negotiating
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Flame className="w-3.5 h-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {negotiatingTenants.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>High priority</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 6. Strong Matches Right Now */}
        <Link href="/matching" className="group">
          <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs hover:shadow-sm transition-all bg-gradient-to-br from-indigo-50/40 to-white dark:from-indigo-950/20 dark:to-slate-900">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider truncate">
                Strong Matches
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {strongMatches.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>Score ≥ 70%</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Two Lists: Mobile full width (grid-cols-1), Large 2 columns (lg:grid-cols-2), max 5 rows each */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LIST 1: Needs Attention */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Needs Attention</CardTitle>
                    <CardDescription className="text-xs">
                      Stale inquiries, active negotiations, and ready vacancies
                    </CardDescription>
                  </div>
                </div>
                {needsAttention.length > 0 && (
                  <Badge variant="outline" className="text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                    {needsAttention.length} urgent
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5">
              {needsAttention.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    All caught up!
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-0.5">
                    No urgent property vacancies, overdue move-ins, or stalled leads requiring attention today.
                  </p>
                </div>
              ) : (
                needsAttention.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group block p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                          {item.type === 'tenant' ? (
                            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.title}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${item.badgeColorClass}`}>
                          {item.badgeText}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </div>

          {needsAttention.length > 0 && (
            <div className="p-3 bg-slate-50/60 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Showing top {needsAttention.length} priority items</span>
              <div className="flex items-center gap-3">
                <Link href="/tenants" className="hover:text-indigo-600 font-medium">
                  Tenants →
                </Link>
                <Link href="/properties" className="hover:text-indigo-600 font-medium">
                  Properties →
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* LIST 2: Today's Best Matches */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Today&apos;s Best Matches</CardTitle>
                    <CardDescription className="text-xs">
                      Top tenant-property matches with score ≥ 70%
                    </CardDescription>
                  </div>
                </div>
                <Link href="/matching">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 px-2">
                    Open matchmaker <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5">
              {topMatches.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No 70%+ matches right now
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-0.5">
                    Add new available inventory or register tenant preferences to discover high-compatibility matches.
                  </p>
                </div>
              ) : (
                topMatches.map((match, idx) => (
                  <div
                    key={`match-${idx}-${match.tenant.id}-${match.property.id}`}
                    className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/tenants/${match.tenant.id}`}
                          className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="View tenant profile"
                        >
                          {match.tenant.name}
                        </Link>
                        <span className="text-xs text-slate-400">→</span>
                        <Link
                          href={`/properties/${match.property.id}`}
                          className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="View property details"
                        >
                          {match.property.type}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <Link
                          href={`/properties/${match.property.id}`}
                          className="truncate hover:text-indigo-600 transition-colors"
                          title="View property details"
                        >
                          {match.property.location}
                        </Link>
                        <span>•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">
                          {formatCurrency(Number(match.property.rent))}/mo
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          match.score >= 85
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                        }`}
                      >
                        {match.score}%
                      </span>
                      <Link
                        href={`/properties/${match.property.id}`}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                        title="View property details"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>

          {topMatches.length > 0 && (
            <div className="p-3 bg-slate-50/60 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Showing top {topMatches.length} matches of {strongMatches.length}</span>
              <Link href="/matching" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1">
                View all in Matchmaker →
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

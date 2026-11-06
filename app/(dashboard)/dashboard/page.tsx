import Link from 'next/link';
import { getProperties } from '@/app/actions/properties';
import { getTenants } from '@/app/actions/tenants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/utils';
import {
  Building2,
  Users,
  IndianRupee,
  Sparkles,
  ArrowUpRight,
  MapPin,
} from 'lucide-react';

export default async function DashboardPage() {
  const [properties, tenants] = await Promise.all([
    getProperties(),
    getTenants(),
  ]);

  const availableProperties = properties.filter((p) => p.status === 'Available');
  const rentedProperties = properties.filter((p) => p.status === 'Rented');
  const activeTenants = tenants.filter((t) => t.status === 'Negotiating' || t.status === 'Site Visit Done' || t.status === 'New');

  const totalMonthlyRentPotential = availableProperties.reduce((acc, curr) => acc + Number(curr.rent), 0);

  return (
    <div className="space-y-8">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Portfolio Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time properties, tenant pipeline, and potential revenue.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/properties">
            <Button variant="outline" size="sm" className="gap-2">
              <Building2 className="w-4 h-4" />
              Properties
            </Button>
          </Link>
          <Link href="/tenants">
            <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Users className="w-4 h-4" />
              Tenants
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Properties
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {availableProperties.length} Available
              </span>{' '}
              • {rentedProperties.length} Rented
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Tenant Pipeline
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {activeTenants.length} Active Leads
              </span>{' '}
              in progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Rent Pipeline
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyRentPotential)}</div>
            <p className="text-xs text-slate-500 mt-1">Monthly potential across vacancies</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Match Engine
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Ready</div>
            <Link href="/matching" className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline mt-1">
              Match tenants with properties <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Grid of Recent Properties and Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Properties */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Recent Properties</CardTitle>
              <CardDescription>Latest listings under your management</CardDescription>
            </div>
            <Link href="/properties">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {properties.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                No properties added yet.
              </div>
            ) : (
              properties.slice(0, 4).map((prop) => (
                <div
                  key={prop.id}
                  className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {prop.type}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {prop.location}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{prop.furnishing}</span>
                      <span>•</span>
                      <span>Avail: {formatDate(prop.available_from)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(Number(prop.rent))}/mo
                    </div>
                    <Badge
                      variant={prop.status === 'Available' ? 'default' : 'secondary'}
                      className="text-[10px] mt-1"
                    >
                      {prop.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Tenants */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Tenant Leads</CardTitle>
              <CardDescription>Recent tenant requirements and status</CardDescription>
            </div>
            <Link href="/tenants">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {tenants.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                No tenant inquiries recorded yet.
              </div>
            ) : (
              tenants.slice(0, 4).map((tenant) => (
                <div
                  key={tenant.id}
                  className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {tenant.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      Looking for: {tenant.preferred_type.join(', ')} in{' '}
                      {tenant.preferred_locations.slice(0, 2).join(', ')}
                    </div>
                    <div className="text-xs text-slate-400">
                      Move-in: {formatDate(tenant.move_in_date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {formatCurrency(Number(tenant.budget_min))} - {formatCurrency(Number(tenant.budget_max))}
                    </div>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {tenant.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

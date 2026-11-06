'use client';

import { useState, useTransition } from 'react';
import { Tenant, TenantStatus } from '@/types';
import { updateTenant, deleteTenant } from '@/app/actions/tenants';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils';
import {
  Users,
  MapPin,
  Phone,
  Trash2,
  Search,
  Loader2,
} from 'lucide-react';

interface TenantListProps {
  initialTenants: Tenant[];
}

export function TenantList({ initialTenants }: TenantListProps) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (tenants !== initialTenants && initialTenants.length !== tenants.length) {
    setTenants(initialTenants);
  }

  const handleStatusChange = (id: string, newStatus: TenantStatus) => {
    setLoadingId(id);
    startTransition(async () => {
      const res = await updateTenant(id, { status: newStatus });
      setLoadingId(null);
      if (res.success) {
        setTenants((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
        );
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;
    setLoadingId(id);
    startTransition(async () => {
      const res = await deleteTenant(id);
      setLoadingId(null);
      if (res.success) {
        setTenants((prev) => prev.filter((t) => t.id !== id));
      }
    });
  };

  const filtered = tenants.filter((t) => {
    const matchesSearch =
      search === '' ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.contact.toLowerCase().includes(search.toLowerCase()) ||
      t.preferred_locations.some((l) => l.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusTab === 'ALL' || t.status === statusTab;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Status Pipeline Tabs */}
      <div className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder="Search tenant by name, contact, or preferred locality..."
            className="pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 gap-1">
            <TabsTrigger value="ALL" className="text-xs py-1.5">All</TabsTrigger>
            <TabsTrigger value="New" className="text-xs py-1.5">New</TabsTrigger>
            <TabsTrigger value="Site Visit Done" className="text-xs py-1.5">Site Visit</TabsTrigger>
            <TabsTrigger value="Negotiating" className="text-xs py-1.5">Negotiating</TabsTrigger>
            <TabsTrigger value="Closed" className="text-xs py-1.5">Closed</TabsTrigger>
            <TabsTrigger value="Lost" className="text-xs py-1.5">Lost</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
          <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-500">No tenant leads found for this stage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tenant) => (
            <Card
              key={tenant.id}
              className="border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow"
            >
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg font-bold">{tenant.name}</CardTitle>
                    <Select
                      value={tenant.status}
                      onValueChange={(val) => {
                        if (val) handleStatusChange(tenant.id, val as TenantStatus);
                      }}
                    >
                      <SelectTrigger className="h-6 text-[11px] px-2 w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Site Visit Done">Site Visit Done</SelectItem>
                        <SelectItem value="Negotiating">Negotiating</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                    {formatCurrency(Number(tenant.budget_min))} - {formatCurrency(Number(tenant.budget_max))}
                    <span className="text-xs font-normal text-slate-500"> /mo</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400">Preferred Types:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {tenant.preferred_type.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-400">Target Locations:</span>
                    <div className="flex items-start gap-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{tenant.preferred_locations.join(', ')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400">Furnishing:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {tenant.furnishing_preference}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Move-in:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatDate(tenant.move_in_date)}
                      </span>
                    </div>
                  </div>

                  {tenant.special_requirements && (
                    <div className="text-xs text-slate-500 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded border border-amber-200/40 dark:border-amber-800/40">
                      <span className="font-medium text-amber-700 dark:text-amber-400">Req: </span>
                      {tenant.special_requirements}
                    </div>
                  )}
                </CardContent>
              </div>

              <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tenant.contact}</span>
                </div>
                <div className="flex items-center gap-2">
                  {loadingId === tenant.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDelete(tenant.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Delete tenant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

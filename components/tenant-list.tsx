'use client';

import { useState, useTransition } from 'react';
import { Tenant, TenantStatus, PropertyType } from '@/types';
import { updateTenant, deleteTenant } from '@/app/actions/tenants';
import { EditTenantDialog } from '@/components/edit-tenant-dialog';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils';
import {
  Users,
  MapPin,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Calendar,
  Sparkles,
  AlertCircle,
  Armchair,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

interface TenantListProps {
  initialTenants: Tenant[];
}

export function TenantList({ initialTenants }: TenantListProps) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

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
    if (!confirm('Are you sure you want to delete this tenant inquiry?')) return;
    setLoadingId(id);
    startTransition(async () => {
      const res = await deleteTenant(id);
      setLoadingId(null);
      if (res.success) {
        setTenants((prev) => prev.filter((t) => t.id !== id));
      }
    });
  };

  const handleTenantUpdated = (updated: Tenant) => {
    setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTenant(null);
  };

  const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');

  const getStatusColor = (status: TenantStatus) => {
    switch (status) {
      case 'New':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'Site Visit Done':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
      case 'Negotiating':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'Closed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'Lost':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filtered = tenants.filter((t) => {
    const query = search.toLowerCase();
    const matchesSearch =
      search === '' ||
      t.name.toLowerCase().includes(query) ||
      t.contact.toLowerCase().includes(query) ||
      t.preferred_locations.some((l) => l.toLowerCase().includes(query)) ||
      (t.special_requirements && t.special_requirements.toLowerCase().includes(query)) ||
      (t.notes && t.notes.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesType =
      typeFilter === 'ALL' || t.preferred_type.includes(typeFilter as PropertyType);

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder="Search tenant by name, contact, locality, or requirements..."
            className="pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
            <SelectTrigger className="w-[150px] text-xs">
              <SelectValue placeholder="Pipeline Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stages</SelectItem>
              <SelectItem value="New">New Lead</SelectItem>
              <SelectItem value="Site Visit Done">Site Visit Done</SelectItem>
              <SelectItem value="Negotiating">Negotiating</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(val) => { if (val) setTypeFilter(val); }}>
            <SelectTrigger className="w-[130px] text-xs">
              <SelectValue placeholder="Preferred Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {['1BHK', '2BHK', '3BHK', '4BHK', 'Shop', 'Office', 'Warehouse', 'Other'].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No tenant leads found</p>
          <p className="text-xs text-slate-500 mt-0.5">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tenant) => {
            const cleanPhone = getCleanPhone(tenant.contact);
            const waUrl = `https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(tenant.name)},%20I%20have%20an%20update%20regarding%20your%20property%20requirements%20(${encodeURIComponent(tenant.preferred_type.join(', '))})%20on%20BRICAURA.`;

            return (
              <Card
                key={tenant.id}
                className="border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-slate-900"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg font-bold truncate">
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="View tenant details"
                        >
                          {tenant.name}
                        </Link>
                      </CardTitle>

                      <Select
                        value={tenant.status}
                        onValueChange={(val) => {
                          if (val) handleStatusChange(tenant.id, val as TenantStatus);
                        }}
                      >
                        <SelectTrigger className={`h-6 text-[11px] px-2 w-[130px] font-medium border ${getStatusColor(tenant.status)}`}>
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

                  <CardContent className="space-y-3.5 text-sm">
                    {/* Preferred Property Types */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Preferred Types
                      </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {tenant.preferred_type.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Target Locations */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Target Localities
                      </span>
                      <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{tenant.preferred_locations.join(', ')}</span>
                      </div>
                    </div>

                    {/* Schedule & Furnishing Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Armchair className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-slate-400 block text-[10px]">Furnishing:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {tenant.furnishing_preference}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-slate-400 block text-[10px]">Move-in:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {formatDate(tenant.move_in_date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Special Requirements */}
                    {tenant.special_requirements && (
                      <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                        <div className="flex items-center gap-1 font-semibold text-[11px] mb-0.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Special Requirements:</span>
                        </div>
                        <p className="line-clamp-2 pl-4 text-[11px]">{tenant.special_requirements}</p>
                      </div>
                    )}

                    {/* Broker Notes */}
                    {tenant.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded line-clamp-2">
                        {tenant.notes}
                      </p>
                    )}
                  </CardContent>
                </div>

                {/* Footer with Quick Action Buttons: Call, WhatsApp, Match, Edit, Delete */}
                <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {/* Quick Contact Buttons */}
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${tenant.contact}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                      title="Call tenant"
                    >
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>Call</span>
                    </a>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-medium transition-colors"
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  {/* Actions: View, Match, Edit, Delete */}
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/tenants/${tenant.id}`}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="View tenant details"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      href="/matching"
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="View Matches"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setEditingTenant(tenant)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit tenant lead"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {loadingId === tenant.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 p-1" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDelete(tenant.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Delete tenant lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Tenant Dialog Modal */}
      {editingTenant && (
        <EditTenantDialog
          tenant={editingTenant}
          open={!!editingTenant}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingTenant(null);
          }}
          onTenantUpdated={handleTenantUpdated}
        />
      )}
    </div>
  );
}

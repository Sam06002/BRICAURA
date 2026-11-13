'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Tenant, Property, TenantStatus } from '@/types';
import type { MatchResult } from '@/lib/matching';
import { updateTenant, deleteTenant } from '@/app/actions/tenants';
import { EditTenantDialog } from '@/components/edit-tenant-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils';
import {
  MapPin,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  Calendar,
  IndianRupee,
  Armchair,
  Sparkles,
  ArrowLeft,
  Building2,
  ArrowUpRight,
  Loader2,
  User,
} from 'lucide-react';

interface TenantDetailViewProps {
  initialTenant: Tenant;
  matchingProperties: Array<{
    property: Property;
    result: MatchResult;
  }>;
}

export function TenantDetailView({
  initialTenant,
  matchingProperties,
}: TenantDetailViewProps) {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant>(initialTenant);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, startTransition] = useTransition();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string>(initialTenant.next_follow_up || '');
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);

  const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');
  const cleanPhone = getCleanPhone(tenant.contact);

  const todayStr = new Date().toISOString().split('T')[0];
  const followUp = tenant.next_follow_up;
  const isOverdue = !!followUp && followUp < todayStr;
  const isDueToday = !!followUp && followUp === todayStr;

  const handleSaveFollowUp = (dateValue: string | null) => {
    setIsUpdatingFollowUp(true);
    startTransition(async () => {
      const res = await updateTenant(tenant.id, { next_follow_up: dateValue });
      setIsUpdatingFollowUp(false);
      if (res.success) {
        setTenant((prev) => ({ ...prev, next_follow_up: dateValue }));
        setFollowUpDate(dateValue || '');
        router.refresh();
      } else {
        alert(res.error || 'Failed to update follow-up date');
      }
    });
  };

  // Status Colors
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

  // Status Change
  const handleStatusChange = (newStatus: TenantStatus) => {
    setIsUpdatingStatus(true);
    startTransition(async () => {
      const res = await updateTenant(tenant.id, { status: newStatus });
      setIsUpdatingStatus(false);
      if (res.success) {
        setTenant((prev) => ({ ...prev, status: newStatus }));
        router.refresh();
      }
    });
  };

  // Delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tenant inquiry? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    const res = await deleteTenant(tenant.id);
    if (res.success) {
      router.push('/tenants');
    } else {
      setIsDeleting(false);
      alert(res.error || 'Failed to delete tenant');
    }
  };

  // WhatsApp link with prefilled line using tenant name
  const tenantWaUrl = `https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(tenant.name)},%20I%20have%20an%20update%20regarding%20your%20property%20requirements%20on%20BRICAURA.`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/tenants"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Tenants
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={tenant.status}
                onValueChange={(val) => {
                  if (val) handleStatusChange(val as TenantStatus);
                }}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className={`h-7 text-xs px-2.5 w-[150px] font-medium border ${getStatusColor(tenant.status)}`}>
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
              {isOverdue && (
                <Badge variant="outline" className="text-xs font-semibold bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                  Follow-up Overdue ({formatDate(followUp!)})
                </Badge>
              )}
              {isDueToday && (
                <Badge variant="outline" className="text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                  Follow-up Due Today
                </Badge>
              )}
              <span className="text-xs text-slate-400">
                Created on {formatDate(tenant.created_at)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{tenant.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
              <span>Budget:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(Number(tenant.budget_min))} - {formatCurrency(Number(tenant.budget_max))}
              </span>
              <span>/month</span>
            </p>
          </div>

          {/* Action Buttons: Call, WhatsApp, Edit, Delete (Wrap on mobile) */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`tel:${tenant.contact}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              Call
            </a>

            <a
              href={tenantWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1.5 text-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900 dark:hover:bg-rose-950/50"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Main Details Grid: Mobile in 1 column, lg in 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Requirements & Locations (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Requirements & Budget */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold">Requirement Details</CardTitle>
              <CardDescription className="text-xs">
                Budget scope, preferred configurations, and timeline
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <IndianRupee className="w-3 h-3 text-slate-400" />
                  Budget Min
                </span>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(Number(tenant.budget_min))}
                </p>
                <span className="text-[11px] text-slate-400">minimum</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <IndianRupee className="w-3 h-3 text-slate-400" />
                  Budget Max
                </span>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(Number(tenant.budget_max))}
                </p>
                <span className="text-[11px] text-slate-400">maximum</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Armchair className="w-3 h-3 text-slate-400" />
                  Furnishing
                </span>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {tenant.furnishing_preference}
                </p>
                <span className="text-[11px] text-slate-400">preference</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Move-in Date
                </span>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {tenant.move_in_date ? formatDate(tenant.move_in_date) : 'Flexible'}
                </p>
                <span className="text-[11px] text-slate-400">target date</span>
              </div>
            </CardContent>
          </Card>

          {/* Preferences: Types & Localities */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold">Preferences & Search Scope</CardTitle>
              <CardDescription className="text-xs">
                Requested property types and target localities
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Preferred Property Types
                </span>
                <div className="flex flex-wrap gap-2">
                  {tenant.preferred_type.map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800"
                    >
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Preferred Localities
                </span>
                <div className="flex flex-wrap gap-2">
                  {tenant.preferred_locations.map((loc) => (
                    <span
                      key={loc}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Requirements & Notes */}
          {(tenant.special_requirements || tenant.notes) && (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold">Special Requirements & Notes</CardTitle>
                <CardDescription className="text-xs">
                  Specific criteria, pet policies, or internal observations
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {tenant.special_requirements && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Special Requirements
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 p-3 rounded-lg leading-relaxed">
                      {tenant.special_requirements}
                    </p>
                  </div>
                )}

                {tenant.notes && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Broker Notes
                    </span>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {tenant.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Contact & Lead Status (1 col on lg) */}
        <div className="space-y-6">
          {/* Tenant Contact Information */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold">Tenant Contact</CardTitle>
              <CardDescription className="text-xs">
                Lead communication channels
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {tenant.name}
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {tenant.contact}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <a
                  href={`tel:${tenant.contact}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </a>
                <a
                  href={tenantWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Next Follow-up Card & Quick Date Control */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Next Follow-up
                </CardTitle>
                {isOverdue && (
                  <Badge variant="outline" className="text-xs font-semibold bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                    Overdue
                  </Badge>
                )}
                {isDueToday && (
                  <Badge variant="outline" className="text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                    Due today
                  </Badge>
                )}
                {!followUp && (
                  <Badge variant="outline" className="text-xs text-slate-500 border-slate-200 dark:border-slate-700">
                    No follow-up set
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                {followUp ? (
                  <span>Scheduled for: <strong className="text-slate-800 dark:text-slate-200">{formatDate(followUp)}</strong></span>
                ) : (
                  <span>No follow-up set</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="quick-follow-up" className="text-xs font-medium text-slate-500 block">
                  Update Follow-up Date
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="quick-follow-up"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="h-8 text-xs"
                    disabled={isUpdatingFollowUp}
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                    disabled={isUpdatingFollowUp || followUpDate === (tenant.next_follow_up || '') || !followUpDate}
                    onClick={() => handleSaveFollowUp(followUpDate || null)}
                  >
                    {isUpdatingFollowUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Set'}
                  </Button>
                  {(tenant.next_follow_up || followUpDate) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900 shrink-0"
                      disabled={isUpdatingFollowUp}
                      onClick={() => handleSaveFollowUp(null)}
                      title="Clear follow-up date"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Matchmaker Link Card */}
          <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-50/40 to-white dark:from-indigo-950/20 dark:to-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Matchmaker Hub
              </CardTitle>
              <CardDescription className="text-xs">
                Search all inventory with fine-grained filters
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href="/matching">
                <Button className="w-full text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                  Open Interactive Matchmaker
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Matching Properties Section: Up to 5 available properties with score >= 50 */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Matching Properties</span>
                  {matchingProperties.length > 0 && (
                    <Badge variant="outline" className="text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200">
                      {matchingProperties.length} unit{matchingProperties.length > 1 ? 's' : ''} (≥ 50%)
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Available listings compatible with this tenant&apos;s budget and preferences
                </CardDescription>
              </div>
            </div>

            <Link href="/matching">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                See all in Matchmaker <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-3">
          {matchingProperties.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No matching available properties found
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                No active properties in your inventory match this tenant with a score of 50% or above.
              </p>
            </div>
          ) : (
            matchingProperties.map(({ property, result }) => {
              const ownerCleanPhone = getCleanPhone(property.owner_contact);
              const ownerWaUrl = `https://wa.me/${ownerCleanPhone}?text=Hi%20${encodeURIComponent(property.owner_name)},%20I%20have%20a%20prospective%20tenant%20(${encodeURIComponent(tenant.name)})%20interested%20in%20your%20${encodeURIComponent(property.type)}%20at%20${encodeURIComponent(property.location)}.`;

              return (
                <div
                  key={property.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/properties/${property.id}`}
                        className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 transition-colors flex items-center gap-1"
                      >
                        <span>{property.type} in {property.location}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </Link>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      >
                        {formatCurrency(Number(property.rent))}/mo
                      </Badge>
                      <span className="text-xs text-slate-400">
                        Deposit: {formatCurrency(Number(property.deposit))} • {property.furnishing}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{property.location}</span>
                      <span>•</span>
                      <span>Available: {property.is_immediate ? 'Immediate' : formatDate(property.available_from)}</span>
                      <span>•</span>
                      <span>Owner: {property.owner_name}</span>
                    </div>

                    {/* Reasons preview */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {result.reasons.slice(0, 3).map((r, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            r.positive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {r.text}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Score & Actions */}
                  <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold px-2.5 py-1 rounded-full border inline-block ${
                          result.score >= 80
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {result.score}%
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{result.tierLabel}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${property.owner_contact}`}
                        className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Call owner"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={ownerWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                        title="WhatsApp owner"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                      <Link href={`/properties/${property.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Edit Tenant Dialog Modal */}
      {isEditing && (
        <EditTenantDialog
          tenant={tenant}
          open={isEditing}
          onOpenChange={(isOpen) => setIsEditing(isOpen)}
          onTenantUpdated={(updated) => {
            setTenant(updated);
            setIsEditing(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

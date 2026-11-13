'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Property, Tenant, PropertyStatus } from '@/types';
import type { MatchResult } from '@/lib/matching';
import { updateProperty, deleteProperty } from '@/app/actions/properties';
import { EditPropertyDialog } from '@/components/edit-property-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils';
import {
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  Pencil,
  Trash2,
  Calendar,
  IndianRupee,
  ShieldCheck,
  Armchair,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Share2,
  FolderOpen,
  Globe,
  ImageOff,
  User,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';

interface PropertyDetailViewProps {
  initialProperty: Property;
  matchingTenants: Array<{
    tenant: Tenant;
    result: MatchResult;
  }>;
}

export function PropertyDetailView({
  initialProperty,
  matchingTenants,
}: PropertyDetailViewProps) {
  const router = useRouter();
  const [property, setProperty] = useState<Property>(initialProperty);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, startTransition] = useTransition();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');
  const cleanPhone = getCleanPhone(property.owner_contact);

  // Status Change
  const handleStatusChange = (newStatus: PropertyStatus) => {
    setIsUpdatingStatus(true);
    startTransition(async () => {
      const res = await updateProperty(property.id, { status: newStatus });
      setIsUpdatingStatus(false);
      if (res.success) {
        setProperty((prev) => ({ ...prev, status: newStatus }));
        router.refresh();
      }
    });
  };

  // Delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this property listing? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    const res = await deleteProperty(property.id);
    if (res.success) {
      router.push('/properties');
    } else {
      setIsDeleting(false);
      alert(res.error || 'Failed to delete property');
    }
  };

  // WhatsApp link for owner
  const isWhatsAppPhotoSource = property.photo_source_type === 'WhatsApp';
  const ownerWaUrl = isWhatsAppPhotoSource && property.photo_link && property.photo_link.startsWith('http')
    ? property.photo_link
    : `https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(property.owner_name)},%20inquiring%20about%20your%20${encodeURIComponent(property.type)}%20property%20at%20${encodeURIComponent(property.location)}.`;

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Facebook':
        return <Share2 className="w-4 h-4 text-blue-600" />;
      case 'Google Drive':
        return <FolderOpen className="w-4 h-4 text-amber-600" />;
      case 'Website':
        return <Globe className="w-4 h-4 text-emerald-600" />;
      case 'WhatsApp':
        return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      default:
        return <ExternalLink className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Properties
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
              >
                {property.type}
              </Badge>
              <Select
                value={property.status}
                onValueChange={(val) => {
                  if (val) handleStatusChange(val as PropertyStatus);
                }}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="h-7 text-xs px-2.5 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Under Discussion">Under Discussion</SelectItem>
                  <SelectItem value="Rented">Rented</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{property.type} in {property.location}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{property.location}</span>
            </p>
          </div>

          {/* Action Buttons: Call, WhatsApp, View Photos, Edit, Delete (Wrap on mobile) */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`tel:${property.owner_contact}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              Call Owner
            </a>

            <a
              href={ownerWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp Owner
            </a>

            {/* View Photos: only if photo_link is set */}
            {property.photo_link && (
              <a
                href={property.photo_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors"
              >
                {getSourceIcon(property.photo_source_type)}
                View Photos
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
              </a>
            )}

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
        {/* Left Column: Financials & Specs (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Financials & Availability */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold">Property Specifications</CardTitle>
              <CardDescription className="text-xs">
                Pricing, deposit, and move-in terms
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <IndianRupee className="w-3 h-3 text-slate-400" />
                  Monthly Rent
                </span>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(Number(property.rent))}
                </p>
                <span className="text-[11px] text-slate-400">per month</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-slate-400" />
                  Security Deposit
                </span>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(Number(property.deposit))}
                </p>
                <span className="text-[11px] text-slate-400">refundable</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Armchair className="w-3 h-3 text-slate-400" />
                  Furnishing
                </span>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {property.furnishing}
                </p>
                <span className="text-[11px] text-slate-400">status</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Availability
                </span>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {property.is_immediate ? 'Immediate' : formatDate(property.available_from)}
                </p>
                {property.is_immediate && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    Ready to move
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold">Amenities & Features</CardTitle>
              <CardDescription className="text-xs">
                Included comforts and building infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {property.amenities && property.amenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {amenity}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No amenities specified for this property.</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {property.notes && (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold">Broker Notes</CardTitle>
                <CardDescription className="text-xs">
                  Internal notes and property details
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {property.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Owner & Photo Reference (1 col on lg) */}
        <div className="space-y-6">
          {/* Owner Information */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold">Owner Contact</CardTitle>
              <CardDescription className="text-xs">
                Direct landlord details for negotiation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {property.owner_name}
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {property.owner_contact}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <a
                  href={`tel:${property.owner_contact}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </a>
                <a
                  href={ownerWaUrl}
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

          {/* Photo Reference Card */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold">Photo Reference</CardTitle>
              <CardDescription className="text-xs">
                External media repository
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Source Platform</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  {getSourceIcon(property.photo_source_type)}
                  {property.photo_source_type}
                </span>
              </div>

              {property.photo_link ? (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] text-slate-400 break-all font-mono line-clamp-2">
                    {property.photo_link}
                  </p>
                  <a
                    href={property.photo_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                  >
                    Open Photo Link
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 flex flex-col items-center gap-1">
                  <ImageOff className="w-5 h-5 text-slate-300" />
                  <span>No external photo link stored</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Matching Tenants Section: Up to 5 open tenants with score >= 50 */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Matching Tenants</span>
                  {matchingTenants.length > 0 && (
                    <Badge variant="outline" className="text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200">
                      {matchingTenants.length} match{matchingTenants.length > 1 ? 'es' : ''} (≥ 50%)
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Active tenant inquiries compatible with this property
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
          {matchingTenants.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No matching open tenants found
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                No active tenants currently match this property with a compatibility score of 50% or above.
              </p>
            </div>
          ) : (
            matchingTenants.map(({ tenant, result }) => {
              const tenantCleanPhone = getCleanPhone(tenant.contact);
              const tenantWaUrl = `https://wa.me/${tenantCleanPhone}?text=Hi%20${encodeURIComponent(tenant.name)},%20I%20found%20a%20great%20${encodeURIComponent(property.type)}%20property%20at%20${encodeURIComponent(property.location)}%20for%20${encodeURIComponent(formatCurrency(Number(property.rent)))}/mo%20that%20matches%20your%20requirements!`;

              return (
                <div
                  key={tenant.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 transition-colors flex items-center gap-1"
                      >
                        <span>{tenant.name}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </Link>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                      >
                        Budget: {formatCurrency(Number(tenant.budget_min))} - {formatCurrency(Number(tenant.budget_max))}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        Prefers: {tenant.preferred_type.join(', ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{tenant.preferred_locations.join(', ')}</span>
                      {tenant.move_in_date && (
                        <>
                          <span>•</span>
                          <span>Move-in: {formatDate(tenant.move_in_date)}</span>
                        </>
                      )}
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
                        href={`tel:${tenant.contact}`}
                        className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Call tenant"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={tenantWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                        title="WhatsApp tenant"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                      <Link href={`/tenants/${tenant.id}`}>
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

      {/* Edit Property Dialog Modal */}
      {isEditing && (
        <EditPropertyDialog
          property={property}
          open={isEditing}
          onOpenChange={(isOpen) => setIsEditing(isOpen)}
          onPropertyUpdated={(updated) => {
            setProperty(updated);
            setIsEditing(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { Property, Tenant } from '@/types';
import {
  getMatchesForTenant,
  getMatchesForProperty,
  MatchResult,
} from '@/lib/matching';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/utils';
import {
  Sparkles,
  Users,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Phone,
  MessageCircle,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';

interface MatchingViewProps {
  properties: Property[];
  tenants: Tenant[];
}

export function MatchingView({ properties, tenants }: MatchingViewProps) {
  const [mode, setMode] = useState<'tenant-to-property' | 'property-to-tenant'>('tenant-to-property');
  const [search, setSearch] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(50);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const availableProperties = properties.filter(
    (p) => p.status === 'Available' || p.status === 'Under Discussion'
  );
  const activeTenants = tenants.filter(
    (t) => t.status !== 'Closed' && t.status !== 'Lost'
  );

  const toggleExpanded = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getCleanPhone = (contact: string) => contact.replace(/\D/g, '');

  const getTierBadge = (result: MatchResult) => {
    switch (result.tier) {
      case 'EXCELLENT':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            {result.score}% {result.tierLabel}
          </span>
        );
      case 'GOOD':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {result.score}% {result.tierLabel}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            {result.score}% {result.tierLabel}
          </span>
        );
    }
  };

  // 1. Data for Tenant -> Properties mode
  const tenantMatches = activeTenants
    .map((tenant) => {
      const matches = getMatchesForTenant(tenant, availableProperties, minScoreFilter);
      return { tenant, matches };
    })
    .filter(({ tenant, matches }) => {
      if (matches.length === 0) return false;
      if (search === '') return true;
      const q = search.toLowerCase();
      return (
        tenant.name.toLowerCase().includes(q) ||
        tenant.contact.toLowerCase().includes(q) ||
        tenant.preferred_locations.some((l) => l.toLowerCase().includes(q)) ||
        matches.some((m) => m.property.location.toLowerCase().includes(q))
      );
    });

  // 2. Data for Property -> Tenants mode
  const propertyMatches = availableProperties
    .map((property) => {
      const matches = getMatchesForProperty(property, activeTenants, minScoreFilter);
      return { property, matches };
    })
    .filter(({ property, matches }) => {
      if (matches.length === 0) return false;
      if (search === '') return true;
      const q = search.toLowerCase();
      return (
        property.location.toLowerCase().includes(q) ||
        property.type.toLowerCase().includes(q) ||
        property.owner_name.toLowerCase().includes(q) ||
        matches.some((m) => m.tenant.name.toLowerCase().includes(q))
      );
    });

  return (
    <div className="space-y-6">
      {/* Mode Switcher Tabs & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Top row: Mode buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMode('tenant-to-property')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === 'tenant-to-property'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Find Properties for Tenants</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {activeTenants.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode('property-to-tenant')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === 'property-to-tenant'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Find Tenants for Properties</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {availableProperties.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Min Match Score:</span>
            <Select
              value={String(minScoreFilter)}
              onValueChange={(val) => {
                if (val) setMinScoreFilter(Number(val));
              }}
            >
              <SelectTrigger className="w-[125px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50%+ Match</SelectItem>
                <SelectItem value="70">70%+ Good</SelectItem>
                <SelectItem value="85">85%+ Excellent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder={
              mode === 'tenant-to-property'
                ? 'Filter by tenant name, contact, locality, or matching property location...'
                : 'Filter by property location, configuration, owner, or matching tenant name...'
            }
            className="pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content View */}
      {mode === 'tenant-to-property' ? (
        /* ==================================================================== */
        /* MODE 1: TENANT -> PROPERTIES                                         */
        /* ==================================================================== */
        tenantMatches.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 p-12 text-center bg-white/50 dark:bg-slate-900/50">
            <Users className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              No matching properties found
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
              None of your active tenants meet the {minScoreFilter}% compatibility threshold with current vacancies. Try lowering the threshold or adding new properties.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/properties">
                <Button size="sm" variant="outline" className="text-xs">
                  View Properties
                </Button>
              </Link>
              <Link href="/tenants">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Manage Tenants
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {tenantMatches.map(({ tenant, matches }) => {
              const isExpanded = expandedCards[tenant.id] || false;
              const displayMatches = isExpanded ? matches : matches.slice(0, 3);
              const cleanTenantPhone = getCleanPhone(tenant.contact);

              return (
                <Card
                  key={tenant.id}
                  className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900"
                >
                  {/* Tenant Header Banner */}
                  <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <CardTitle className="text-lg font-bold">{tenant.name}</CardTitle>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {tenant.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs mt-1.5 space-x-2 text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Budget: {formatCurrency(Number(tenant.budget_min))} - {formatCurrency(Number(tenant.budget_max))}
                          </span>
                          <span>•</span>
                          <span>Looking for: {tenant.preferred_type.join(', ')}</span>
                          <span>•</span>
                          <span>Localities: {tenant.preferred_locations.join(', ')}</span>
                        </CardDescription>
                      </div>

                      {/* Top Action & Badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {matches.length} {matches.length === 1 ? 'Compatible Unit' : 'Compatible Units'}
                        </span>
                        <a
                          href={`tel:${tenant.contact}`}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title="Call Tenant"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${cleanTenantPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400"
                          title="Chat with Tenant on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Matching Properties Grid */}
                  <CardContent className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayMatches.map(({ property, result }) => {
                        const cleanOwnerPhone = getCleanPhone(property.owner_contact);
                        const waMsg = `Hi ${property.owner_name}, I have an interested tenant (${tenant.name}) looking for a ${tenant.preferred_type.join('/')} with a budget of ${formatCurrency(Number(tenant.budget_min))}-${formatCurrency(Number(tenant.budget_max))} for your property at ${property.location}. Is it still available for a site visit?`;
                        const waUrl = `https://wa.me/${cleanOwnerPhone}?text=${encodeURIComponent(waMsg)}`;

                        return (
                          <div
                            key={property.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col justify-between space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                          >
                            <div className="space-y-2.5">
                              {/* Type and Score Tier */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                  {property.type}
                                </span>
                                {getTierBadge(result)}
                              </div>

                              {/* Rent & Deposit */}
                              <div>
                                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                                  {formatCurrency(Number(property.rent))}
                                  <span className="text-xs font-normal text-slate-500"> /mo</span>
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  Deposit: {formatCurrency(Number(property.deposit))} • {property.furnishing}
                                </span>
                              </div>

                              {/* Location */}
                              <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{property.location}</span>
                              </div>

                              {/* Matching Reasons */}
                              <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                {result.reasons.slice(0, 3).map((r, i) => (
                                  <div
                                    key={i}
                                    className={`flex items-start gap-1.5 text-[11px] ${
                                      r.positive ? 'text-slate-600 dark:text-slate-300' : 'text-amber-700 dark:text-amber-400'
                                    }`}
                                  >
                                    {r.positive ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                    ) : (
                                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                    )}
                                    <span className="line-clamp-1">{r.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Quick Action Buttons for Property Owner */}
                            <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                              <span className="text-[11px] text-slate-400 truncate max-w-[110px]">
                                Owner: {property.owner_name}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${property.owner_contact}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] transition-colors"
                                  title="Call Owner"
                                >
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>Call</span>
                                </a>

                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] transition-colors"
                                  title="Propose via WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>

                                {property.photo_link && (
                                  <a
                                    href={property.photo_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="View Photos"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Show more button if matches exceed 3 */}
                    {matches.length > 3 && (
                      <div className="text-center pt-4">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(tenant.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {isExpanded ? (
                            <>
                              Show fewer units <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              View all {matches.length} matching properties <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* ==================================================================== */
        /* MODE 2: PROPERTY -> TENANTS (REVERSE VIEW)                           */
        /* ==================================================================== */
        propertyMatches.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 p-12 text-center bg-white/50 dark:bg-slate-900/50">
            <Building2 className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              No matching tenant leads found
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
              None of your available properties currently have matching open tenant leads meeting {minScoreFilter}% criteria.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/tenants">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Register New Tenant
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {propertyMatches.map(({ property, matches }) => {
              const isExpanded = expandedCards[property.id] || false;
              const displayMatches = isExpanded ? matches : matches.slice(0, 3);

              return (
                <Card
                  key={property.id}
                  className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900"
                >
                  {/* Property Header Banner */}
                  <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <CardTitle className="text-lg font-bold">
                            {property.type} • {formatCurrency(Number(property.rent))}/mo
                          </CardTitle>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {property.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs mt-1.5 space-x-2 text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Location: {property.location}
                          </span>
                          <span>•</span>
                          <span>Deposit: {formatCurrency(Number(property.deposit))}</span>
                          <span>•</span>
                          <span>Furnishing: {property.furnishing}</span>
                          <span>•</span>
                          <span>Owner: {property.owner_name} ({property.owner_contact})</span>
                        </CardDescription>
                      </div>

                      {/* Top Action & Badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {matches.length} {matches.length === 1 ? 'Interested Lead' : 'Interested Leads'}
                        </span>
                        <a
                          href={`tel:${property.owner_contact}`}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title="Call Owner"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Matching Tenants Grid */}
                  <CardContent className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayMatches.map(({ tenant, result }) => {
                        const cleanTenantPhone = getCleanPhone(tenant.contact);
                        const waMsg = `Hi ${tenant.name}, I found an excellent ${property.type} rental match for you at ${property.location} for ${formatCurrency(Number(property.rent))}/month (${property.furnishing}). Would you like to schedule a site visit?`;
                        const waUrl = `https://wa.me/${cleanTenantPhone}?text=${encodeURIComponent(waMsg)}`;

                        return (
                          <div
                            key={tenant.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col justify-between space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                          >
                            <div className="space-y-2.5">
                              {/* Tenant Name and Match Score */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                  {tenant.name}
                                </span>
                                {getTierBadge(result)}
                              </div>

                              {/* Budget & Target Types */}
                              <div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  Budget: {formatCurrency(Number(tenant.budget_min))} - {formatCurrency(Number(tenant.budget_max))}
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  Looking for: {tenant.preferred_type.join(', ')} • {tenant.furnishing_preference}
                                </span>
                              </div>

                              {/* Preferred Localities */}
                              <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{tenant.preferred_locations.join(', ')}</span>
                              </div>

                              {/* Matching Reasons */}
                              <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                {result.reasons.slice(0, 3).map((r, i) => (
                                  <div
                                    key={i}
                                    className={`flex items-start gap-1.5 text-[11px] ${
                                      r.positive ? 'text-slate-600 dark:text-slate-300' : 'text-amber-700 dark:text-amber-400'
                                    }`}
                                  >
                                    {r.positive ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                    ) : (
                                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                    )}
                                    <span className="line-clamp-1">{r.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Quick Action Buttons for Tenant Lead */}
                            <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                {tenant.status}
                              </Badge>

                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${tenant.contact}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] transition-colors"
                                  title="Call Tenant"
                                >
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>Call</span>
                                </a>

                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] transition-colors"
                                  title="Propose Property on WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Show more button if matches exceed 3 */}
                    {matches.length > 3 && (
                      <div className="text-center pt-4">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(property.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {isExpanded ? (
                            <>
                              Show fewer leads <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              View all {matches.length} interested tenant leads <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

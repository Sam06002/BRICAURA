'use client';

import { useMemo, useState, useTransition } from 'react';
import { updateMatchInteraction, type MatchInteraction, type MatchStatus } from '@/app/actions/matches';
import type { Property, Tenant } from '@/types';
import { formatCurrency } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, MapPin, Phone, Sparkles } from 'lucide-react';

type Match = { property: Property; tenant: Tenant; score: number; reasons: string[] };

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, ' ');
}

function scoreMatch(tenant: Tenant, property: Property): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const rent = Number(property.rent);
  const min = Number(tenant.budget_min);
  const max = Number(tenant.budget_max);

  if (rent >= min && rent <= max) {
    score += 40;
    reasons.push('Within budget');
  } else if (rent > max && max > 0 && rent <= max * 1.05) {
    score += 25;
    reasons.push('Up to 5% above maximum budget');
  } else if (rent < min && min > 0 && rent >= min * 0.9) {
    score += 25;
    reasons.push('Up to 10% below minimum budget');
  }

  if (tenant.preferred_type?.includes(property.type)) {
    score += 30;
    reasons.push('Property type matches');
  }

  const propertyLocation = normalize(property.location);
  const locationMatch = (tenant.preferred_locations ?? []).find((area) => {
    const normalizedArea = normalize(area);
    return normalizedArea.length > 0 && propertyLocation.includes(normalizedArea);
  });
  if (locationMatch) {
    score += 20;
    reasons.push(`Location matches: ${locationMatch}`);
  }

  if (tenant.furnishing_preference === 'Any' || tenant.furnishing_preference === property.furnishing) {
    score += 10;
    reasons.push('Furnishing matches');
  }

  return { score, reasons };
}

function statusVariant(status: MatchStatus) {
  if (status === 'Contacted') return 'secondary';
  if (status === 'Site Visit Scheduled') return 'default';
  return 'outline';
}

export function MatchingWorkspace({
  properties,
  tenants,
  interactions,
}: {
  properties: Property[];
  tenants: Tenant[];
  interactions: MatchInteraction[];
}) {
  const [view, setView] = useState('tenants');
  const [records, setRecords] = useState(interactions);
  const [pending, startTransition] = useTransition();

  const availableProperties = useMemo(
    () => properties.filter((p) => p.status === 'Available'),
    [properties],
  );
  const activeTenants = useMemo(
    () => tenants.filter((t) => !['Closed', 'Lost'].includes(t.status)),
    [tenants],
  );

  const matches = useMemo<Match[]>(() => {
    const result: Match[] = [];
    for (const tenant of activeTenants) {
      for (const property of availableProperties) {
        const scored = scoreMatch(tenant, property);
        if (scored.score >= 50) result.push({ tenant, property, ...scored });
      }
    }
    return result.sort((a, b) => b.score - a.score);
  }, [activeTenants, availableProperties]);

  function interactionFor(tenantId: string, propertyId: string) {
    return records.find((r) => r.tenant_id === tenantId && r.property_id === propertyId);
  }

  function setStatus(match: Match, status: MatchStatus) {
    startTransition(async () => {
      const result = await updateMatchInteraction(match.tenant.id, match.property.id, status);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      setRecords((current) => {
        const existing = current.find((r) => r.tenant_id === match.tenant.id && r.property_id === match.property.id);
        if (existing) return current.map((r) => r === existing ? { ...r, status } : r);
        return [...current, {
          id: `${match.tenant.id}-${match.property.id}`,
          tenant_id: match.tenant.id,
          property_id: match.property.id,
          status,
          site_visit_at: null,
          notes: null,
        }];
      });
    });
  }

  function MatchCard({ match }: { match: Match }) {
    const interaction = interactionFor(match.tenant.id, match.property.id);
    const status = interaction?.status ?? 'New';
    return (
      <Card className="flex flex-col border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{match.property.type} · {formatCurrency(Number(match.property.rent))}/mo</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{match.property.location}</CardDescription>
            </div>
            <Badge variant={match.score >= 85 ? 'default' : 'secondary'}>{match.score}%</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <div className="text-sm">
            <p className="font-medium">{match.tenant.name}</p>
            <p className="text-muted-foreground">{formatCurrency(Number(match.tenant.budget_min))} – {formatCurrency(Number(match.tenant.budget_max))}</p>
          </div>
          <div className="space-y-1 border-t pt-3">
            {match.reasons.map((reason) => (
              <p key={reason} className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle className="h-3 w-3 text-emerald-600" />{reason}</p>
            ))}
          </div>
          <div className="mt-auto space-y-2 border-t pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Match activity</span>
              <Badge variant={statusVariant(status)}>{status}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={status === 'Contacted' ? 'default' : 'outline'} disabled={pending || status === 'Contacted'} onClick={() => setStatus(match, 'Contacted')}>Contacted</Button>
              <Button size="sm" variant={status === 'Site Visit Scheduled' ? 'default' : 'outline'} disabled={pending || status === 'Site Visit Scheduled'} onClick={() => setStatus(match, 'Site Visit Scheduled')}>Site visit</Button>
              {status !== 'New' && <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus(match, 'New')}>Reset</Button>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <a className="inline-flex items-center gap-1 hover:text-primary" href={`tel:${match.tenant.contact}`}><Phone className="h-3 w-3" />Tenant</a>
              <a className="inline-flex items-center gap-1 hover:text-primary" href={`tel:${match.property.owner_contact}`}><Phone className="h-3 w-3" />Owner</a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tenantMatches = (tenant: Tenant) => matches.filter((m) => m.tenant.id === tenant.id);
  const propertyMatches = (property: Property) => matches.filter((m) => m.property.id === property.id);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold tracking-tight">Smart Matching Engine</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Ranked compatibility across budget, property type, location and furnishing. Match activity is saved to your account.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active tenants</p><p className="text-2xl font-semibold">{activeTenants.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Available properties</p><p className="text-2xl font-semibold">{availableProperties.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Qualified matches</p><p className="text-2xl font-semibold">{matches.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Contacted / visits</p><p className="text-2xl font-semibold">{records.filter((r) => r.status !== 'New').length}</p></CardContent></Card>
      </div>
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="tenants">By tenant</TabsTrigger>
          <TabsTrigger value="properties">By property</TabsTrigger>
        </TabsList>
        <TabsContent value="tenants" className="mt-4 space-y-5">
          {activeTenants.map((tenant) => {
            const tenantItems = tenantMatches(tenant);
            return (
              <section key={tenant.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h2 className="font-semibold">{tenant.name}</h2><p className="text-xs text-muted-foreground">{tenantItems.length} matching available {tenantItems.length === 1 ? 'property' : 'properties'}</p></div>
                  <Badge variant="outline">{tenant.status}</Badge>
                </div>
                {tenantItems.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tenantItems.map((match) => <MatchCard key={match.property.id} match={match} />)}</div> : <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No qualified properties. Add listings or adjust tenant preferences.</p>}
              </section>
            );
          })}
          {!activeTenants.length && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No active tenant leads.</p>}
        </TabsContent>
        <TabsContent value="properties" className="mt-4 space-y-5">
          {availableProperties.map((property) => {
            const propertyItems = propertyMatches(property);
            return (
              <section key={property.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h2 className="font-semibold">{property.type} · {property.location}</h2><p className="text-xs text-muted-foreground">{formatCurrency(Number(property.rent))} · {propertyItems.length} matching {propertyItems.length === 1 ? 'tenant' : 'tenants'}</p></div>
                  <Badge variant="outline">Available</Badge>
                </div>
                {propertyItems.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{propertyItems.map((match) => <MatchCard key={match.tenant.id} match={match} />)}</div> : <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No qualified tenants for this property.</p>}
              </section>
            );
          })}
          {!availableProperties.length && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No available properties.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

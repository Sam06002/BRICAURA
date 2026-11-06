import { getProperties } from '@/app/actions/properties';
import { getTenants } from '@/app/actions/tenants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils';
import {
  Sparkles,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import type { Tenant, Property } from '@/types';

function calculateMatchScore(tenant: Tenant, property: Property): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const rent = Number(property.rent);
  const minBudget = Number(tenant.budget_min);
  const maxBudget = Number(tenant.budget_max);

  // 1. Budget Fit (40 points)
  if (rent >= minBudget && rent <= maxBudget) {
    score += 40;
    reasons.push('Rent fits budget perfectly');
  } else if (rent <= maxBudget * 1.05) {
    score += 25;
    reasons.push('Rent is slightly above max budget (~5%)');
  } else if (rent < minBudget) {
    score += 30;
    reasons.push('Rent is below minimum budget');
  }

  // 2. Property Type Fit (30 points)
  if (tenant.preferred_type.includes(property.type)) {
    score += 30;
    reasons.push(`Type matches ${property.type}`);
  }

  // 3. Location Fit (20 points)
  const locLower = property.location.toLowerCase();
  const matchedLoc = tenant.preferred_locations.find((l) =>
    locLower.includes(l.toLowerCase().trim())
  );
  if (matchedLoc) {
    score += 20;
    reasons.push(`Location matches area: ${matchedLoc}`);
  }

  // 4. Furnishing Fit (10 points)
  if (
    tenant.furnishing_preference === 'Any' ||
    tenant.furnishing_preference === property.furnishing
  ) {
    score += 10;
    reasons.push(`Furnishing matches (${property.furnishing})`);
  }

  return { score, reasons };
}

export default async function MatchingPage() {
  const [properties, tenants] = await Promise.all([
    getProperties(),
    getTenants(),
  ]);

  const availableProperties = properties.filter((p) => p.status === 'Available');

  // Compute matches for active tenants
  const tenantMatches = tenants.map((tenant) => {
    const scored = availableProperties.map((property) => {
      const { score, reasons } = calculateMatchScore(tenant, property);
      return { property, score, reasons };
    });

    // Sort by highest match score
    scored.sort((a, b) => b.score - a.score);

    return {
      tenant,
      matches: scored.filter((s) => s.score >= 50),
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Smart Tenant-Property Matchmaker
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Automated compatibility scoring comparing tenant budget, target locations, unit types, and furnishing preferences with available properties.
        </p>
      </div>

      {tenants.length === 0 || availableProperties.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Not enough data to calculate matches
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Ensure you have at least one tenant lead and one available property listing.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {tenantMatches.map(({ tenant, matches }) => (
            <Card key={tenant.id} className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold">{tenant.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {tenant.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Budget: {formatCurrency(Number(tenant.budget_min))} - {formatCurrency(Number(tenant.budget_max))} • Types: {tenant.preferred_type.join(', ')} • Target Areas: {tenant.preferred_locations.join(', ')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {matches.length} Compatible {matches.length === 1 ? 'Property' : 'Properties'}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {matches.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No available properties meet the 50% compatibility threshold for this tenant.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matches.slice(0, 3).map(({ property, score, reasons }) => (
                      <div
                        key={property.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {property.type}
                            </span>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                score >= 85
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              }`}
                            >
                              {score}% Match
                            </span>
                          </div>

                          <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(Number(property.rent))}
                            <span className="text-xs font-normal text-slate-500"> /mo</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{property.location}</span>
                          </div>

                          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                            {reasons.map((r, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                          <span className="text-[11px]">Contact: {property.owner_contact}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium text-xs">
                            {property.furnishing}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

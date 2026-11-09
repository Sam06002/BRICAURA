import type { Tenant, Property } from '@/types';
import { formatCurrency, formatDate } from '@/utils';

export interface MatchReason {
  text: string;
  positive: boolean;
  category: 'budget' | 'location' | 'type' | 'furnishing' | 'timeline';
}

export interface MatchResult {
  score: number;
  tier: 'EXCELLENT' | 'GOOD' | 'FAIR';
  tierLabel: string;
  reasons: MatchReason[];
  scoreBreakdown: {
    budget: number;
    location: number;
    type: number;
    furnishing: number;
    timeline: number;
  };
}

export interface TenantWithMatches {
  tenant: Tenant;
  matches: Array<{
    property: Property;
    result: MatchResult;
  }>;
}

export interface PropertyWithMatches {
  property: Property;
  matches: Array<{
    tenant: Tenant;
    result: MatchResult;
  }>;
}

/**
 * Enhanced compatibility calculation between a tenant requirement and a property listing
 */
export function calculateMatchScore(tenant: Tenant, property: Property): MatchResult {
  const reasons: MatchReason[] = [];

  const rent = Number(property.rent);
  const minBudget = Number(tenant.budget_min);
  const maxBudget = Number(tenant.budget_max);

  // --------------------------------------------------------------------------
  // 1. Budget Fit (Max 35 points)
  // --------------------------------------------------------------------------
  let budgetScore = 0;
  if (rent >= minBudget && rent <= maxBudget) {
    budgetScore = 35;
    reasons.push({
      text: `Rent (${formatCurrency(rent)}) fits budget (${formatCurrency(minBudget)} - ${formatCurrency(maxBudget)})`,
      positive: true,
      category: 'budget',
    });
  } else if (rent <= maxBudget * 1.05) {
    budgetScore = 25;
    reasons.push({
      text: `Rent (${formatCurrency(rent)}) is within 5% above budget limit`,
      positive: true,
      category: 'budget',
    });
  } else if (rent <= maxBudget * 1.10) {
    budgetScore = 15;
    reasons.push({
      text: `Rent (${formatCurrency(rent)}) is within 10% above budget limit`,
      positive: false,
      category: 'budget',
    });
  } else if (rent < minBudget) {
    budgetScore = 30;
    reasons.push({
      text: `Rent is ${formatCurrency(minBudget - rent)} below minimum budget (cost saving)`,
      positive: true,
      category: 'budget',
    });
  } else {
    budgetScore = 0;
    reasons.push({
      text: `Rent (${formatCurrency(rent)}) exceeds max budget (${formatCurrency(maxBudget)})`,
      positive: false,
      category: 'budget',
    });
  }

  // --------------------------------------------------------------------------
  // 2. Location Compatibility (Max 30 points)
  // --------------------------------------------------------------------------
  let locationScore = 0;
  const propLocClean = property.location.toLowerCase().trim();

  // Check if tenant has 'Any' in preferred locations
  const hasAnyLocation = tenant.preferred_locations.some(
    (l) => l.trim().toLowerCase() === 'any'
  );

  if (hasAnyLocation) {
    locationScore = 20;
    reasons.push({
      text: 'Tenant is open to any locality',
      positive: true,
      category: 'location',
    });
  } else {
    // Check exact or partial matches
    let matchedArea: string | null = null;
    let isExact = false;

    for (const pref of tenant.preferred_locations) {
      const cleanPref = pref.toLowerCase().trim();
      if (!cleanPref) continue;

      if (propLocClean === cleanPref) {
        matchedArea = pref;
        isExact = true;
        break;
      } else if (propLocClean.includes(cleanPref) || cleanPref.includes(propLocClean)) {
        matchedArea = pref;
      }
    }

    if (isExact && matchedArea) {
      locationScore = 30;
      reasons.push({
        text: `Exact locality match: ${matchedArea}`,
        positive: true,
        category: 'location',
      });
    } else if (matchedArea) {
      locationScore = 24;
      reasons.push({
        text: `Direct area match: ${matchedArea}`,
        positive: true,
        category: 'location',
      });
    } else {
      locationScore = 0;
      reasons.push({
        text: `Location (${property.location}) is outside preferred areas`,
        positive: false,
        category: 'location',
      });
    }
  }

  // --------------------------------------------------------------------------
  // 3. Property Type Compatibility (Max 25 points)
  // --------------------------------------------------------------------------
  let typeScore = 0;
  if (tenant.preferred_type.includes(property.type)) {
    typeScore = 25;
    reasons.push({
      text: `Configuration matches requested ${property.type}`,
      positive: true,
      category: 'type',
    });
  } else {
    typeScore = 0;
    reasons.push({
      text: `Looking for ${tenant.preferred_type.join(' / ')} instead of ${property.type}`,
      positive: false,
      category: 'type',
    });
  }

  // --------------------------------------------------------------------------
  // 4. Furnishing Compatibility (Max 10 points)
  // --------------------------------------------------------------------------
  let furnishingScore = 0;
  if (
    tenant.furnishing_preference === 'Any' ||
    tenant.furnishing_preference === property.furnishing
  ) {
    furnishingScore = 10;
    reasons.push({
      text: `Furnishing aligns with preference (${property.furnishing})`,
      positive: true,
      category: 'furnishing',
    });
  } else if (
    tenant.furnishing_preference === 'Semi-furnished' &&
    property.furnishing === 'Fully-furnished'
  ) {
    furnishingScore = 8;
    reasons.push({
      text: 'Higher furnishing available (Fully-furnished)',
      positive: true,
      category: 'furnishing',
    });
  } else if (
    tenant.furnishing_preference === 'Fully-furnished' &&
    property.furnishing === 'Unfurnished'
  ) {
    furnishingScore = 0;
    reasons.push({
      text: 'Unfurnished does not meet fully-furnished requirement',
      positive: false,
      category: 'furnishing',
    });
  } else {
    furnishingScore = 5;
    reasons.push({
      text: `Partial furnishing match (${property.furnishing} vs ${tenant.furnishing_preference})`,
      positive: false,
      category: 'furnishing',
    });
  }

  // --------------------------------------------------------------------------
  // 5. Timeline / Availability Alignment (-10 to 0 points)
  // --------------------------------------------------------------------------
  let timelineScore = 0;
  try {
    if (property.is_immediate) {
      timelineScore = 0;
      reasons.push({
        text: 'Ready for immediate move-in',
        positive: true,
        category: 'timeline',
      });
    } else {
      const moveIn = new Date(tenant.move_in_date).getTime();
      const avail = new Date(property.available_from).getTime();
      const diffDays = Math.round((avail - moveIn) / (1000 * 60 * 60 * 24));

      if (diffDays > 30) {
        timelineScore = -10;
        reasons.push({
          text: `Property available only on ${formatDate(property.available_from)} (${diffDays} days after move-in)`,
          positive: false,
          category: 'timeline',
        });
      } else if (diffDays <= 0) {
        timelineScore = 0;
        reasons.push({
          text: `Available on or before target date (${formatDate(property.available_from)})`,
          positive: true,
          category: 'timeline',
        });
      } else {
        timelineScore = -5;
        reasons.push({
          text: `Available ${diffDays} days after preferred move-in`,
          positive: false,
          category: 'timeline',
        });
      }
    }
  } catch {
    timelineScore = 0;
  }

  // --------------------------------------------------------------------------
  // Total Score & Tier
  // --------------------------------------------------------------------------
  const rawScore = budgetScore + locationScore + typeScore + furnishingScore + timelineScore;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let tier: 'EXCELLENT' | 'GOOD' | 'FAIR';
  let tierLabel: string;

  if (score >= 85) {
    tier = 'EXCELLENT';
    tierLabel = 'Excellent Match';
  } else if (score >= 70) {
    tier = 'GOOD';
    tierLabel = 'Good Match';
  } else {
    tier = 'FAIR';
    tierLabel = 'Fair Match';
  }

  return {
    score,
    tier,
    tierLabel,
    reasons,
    scoreBreakdown: {
      budget: budgetScore,
      location: locationScore,
      type: typeScore,
      furnishing: furnishingScore,
      timeline: timelineScore,
    },
  };
}

/**
 * Find matching properties for an active tenant
 */
export function getMatchesForTenant(
  tenant: Tenant,
  properties: Property[],
  minScore = 50
): Array<{ property: Property; result: MatchResult }> {
  return properties
    .filter((p) => p.status === 'Available' || p.status === 'Under Discussion')
    .map((property) => ({
      property,
      result: calculateMatchScore(tenant, property),
    }))
    .filter((item) => item.result.score >= minScore)
    .sort((a, b) => b.result.score - a.result.score);
}

/**
 * Find matching open tenants for an available property
 */
export function getMatchesForProperty(
  property: Property,
  tenants: Tenant[],
  minScore = 50
): Array<{ tenant: Tenant; result: MatchResult }> {
  return tenants
    .filter((t) => t.status !== 'Closed' && t.status !== 'Lost')
    .map((tenant) => ({
      tenant,
      result: calculateMatchScore(tenant, property),
    }))
    .filter((item) => item.result.score >= minScore)
    .sort((a, b) => b.result.score - a.result.score);
}

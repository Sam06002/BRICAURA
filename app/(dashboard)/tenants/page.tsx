import { getTenants } from '@/app/actions/tenants';
import { AddTenantDialog } from '@/components/add-tenant-dialog';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/utils';
import {
  Users,
  MapPin,
  Phone,
} from 'lucide-react';

export default async function TenantsPage() {
  const tenants = await getTenants();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tenant Leads & Pipeline
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track inquiries, budgets, preferences, and deal stages.
          </p>
        </div>
        <AddTenantDialog />
      </div>

      {/* Tenants Grid */}
      {tenants.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No tenant leads recorded
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Add your active client inquiries to start matching them against available properties automatically.
          </p>
          <AddTenantDialog />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow"
            >
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg font-bold">{tenant.name}</CardTitle>
                    <Badge
                      variant={
                        tenant.status === 'Closed'
                          ? 'default'
                          : tenant.status === 'Negotiating'
                          ? 'secondary'
                          : tenant.status === 'Lost'
                          ? 'destructive'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {tenant.status}
                    </Badge>
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
                <span className="text-[11px] text-slate-400">
                  Added {formatDate(tenant.created_at)}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

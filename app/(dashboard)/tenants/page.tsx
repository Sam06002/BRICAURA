import { getTenants } from '@/app/actions/tenants';
import { AddTenantDialog } from '@/components/add-tenant-dialog';
import { TenantList } from '@/components/tenant-list';

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

      {/* Tenant List with pipeline tabs, search, status switching, and deletion */}
      <TenantList initialTenants={tenants} />
    </div>
  );
}

import { getProperties } from '@/app/actions/properties';
import { AddPropertyDialog } from '@/components/add-property-dialog';
import { PropertyList } from '@/components/property-list';

export default async function PropertiesPage() {
  const properties = await getProperties();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Properties
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your rental listings, units, and commercial spaces.
          </p>
        </div>
        <AddPropertyDialog />
      </div>

      {/* Property List with filters, real-time status update, and delete */}
      <PropertyList initialProperties={properties} />
    </div>
  );
}

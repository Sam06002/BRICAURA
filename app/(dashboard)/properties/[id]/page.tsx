import Link from 'next/link';
import { getPropertyById } from '@/app/actions/properties';
import { getTenants } from '@/app/actions/tenants';
import { getMatchesForProperty } from '@/lib/matching';
import { PropertyDetailView } from '@/components/property-detail-view';
import { Button } from '@/components/ui/button';
import { Building2, ArrowLeft } from 'lucide-react';

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;

  const [property, tenants] = await Promise.all([
    getPropertyById(id),
    getTenants(),
  ]);

  // Not found or not owned by user (Supabase RLS filters out unowned records)
  if (!property) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <Building2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Property Not Found
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          The requested property listing does not exist, has been deleted, or you do not have permission to view it.
        </p>
        <div className="pt-2">
          <Link href="/properties">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Properties
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate up to 5 open tenant matches with score >= 50
  const matchingTenants = getMatchesForProperty(property, tenants, 50).slice(0, 5);

  return (
    <PropertyDetailView
      initialProperty={property}
      matchingTenants={matchingTenants}
    />
  );
}

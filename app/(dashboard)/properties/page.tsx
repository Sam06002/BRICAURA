import { getProperties } from '@/app/actions/properties';
import { AddPropertyDialog } from '@/components/add-property-dialog';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/utils';
import {
  Building2,
  MapPin,
  Phone,
} from 'lucide-react';

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

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No properties added yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Get started by adding your first residential or commercial listing with rent and owner details.
          </p>
          <AddPropertyDialog />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card
              key={property.id}
              className="border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow"
            >
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                      {property.type}
                    </Badge>
                    <Badge
                      variant={
                        property.status === 'Available'
                          ? 'default'
                          : property.status === 'Rented'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {property.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold mt-2">
                    {formatCurrency(Number(property.rent))}
                    <span className="text-xs font-normal text-slate-500"> /month</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="font-medium line-clamp-1">{property.location}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400">Deposit:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(Number(property.deposit))}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Furnishing:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {property.furnishing}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Available:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatDate(property.available_from)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Owner:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {property.owner_name}
                      </span>
                    </div>
                  </div>

                  {property.notes && (
                    <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded line-clamp-2">
                      {property.notes}
                    </p>
                  )}
                </CardContent>
              </div>

              <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{property.owner_contact}</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Added {formatDate(property.created_at)}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

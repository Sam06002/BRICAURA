'use client';

import { useState, useTransition } from 'react';
import { Property, PropertyStatus } from '@/types';
import { updateProperty, deleteProperty } from '@/app/actions/properties';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils';
import {
  MapPin,
  Phone,
  Trash2,
  Search,
  Loader2,
  Building2,
} from 'lucide-react';

interface PropertyListProps {
  initialProperties: Property[];
}

export function PropertyList({ initialProperties }: PropertyListProps) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Keep state synced with server props
  if (properties !== initialProperties && initialProperties.length !== properties.length) {
    setProperties(initialProperties);
  }

  const handleStatusChange = (id: string, newStatus: PropertyStatus) => {
    setLoadingId(id);
    startTransition(async () => {
      const res = await updateProperty(id, { status: newStatus });
      setLoadingId(null);
      if (res.success) {
        setProperties((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
        );
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    setLoadingId(id);
    startTransition(async () => {
      const res = await deleteProperty(id);
      setLoadingId(null);
      if (res.success) {
        setProperties((prev) => prev.filter((p) => p.id !== id));
      }
    });
  };

  const filtered = properties.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || p.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder="Search by location, owner name, or type..."
            className="pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
            <SelectTrigger className="w-[140px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Rented">Rented</SelectItem>
              <SelectItem value="Under Discussion">Under Discussion</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(val) => { if (val) setTypeFilter(val); }}>
            <SelectTrigger className="w-[130px] text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {['1BHK', '2BHK', '3BHK', '4BHK', 'Shop', 'Office', 'Warehouse', 'Other'].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
          <Building2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-500">No properties match your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((property) => (
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
                    <Select
                      value={property.status}
                      onValueChange={(val) => {
                        if (val) handleStatusChange(property.id, val as PropertyStatus);
                      }}
                    >
                      <SelectTrigger className="h-6 text-[11px] px-2 w-[125px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Rented">Rented</SelectItem>
                        <SelectItem value="Under Discussion">Discussion</SelectItem>
                      </SelectContent>
                    </Select>
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
                <div className="flex items-center gap-2">
                  {loadingId === property.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDelete(property.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Delete property"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Property, PropertyStatus } from '@/types';
import { updateProperty, deleteProperty } from '@/app/actions/properties';
import { EditPropertyDialog } from '@/components/edit-property-dialog';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils';
import {
  MapPin,
  Phone,
  Trash2,
  Pencil,
  Search,
  Loader2,
  Building2,
  ExternalLink,
  MessageCircle,
  ImageOff,
  FolderOpen,
  Globe,
  Share2,
  ArrowUpRight,
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
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Sync state if initialProperties changes from server
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
    if (!confirm('Are you sure you want to delete this property listing?')) return;
    setLoadingId(id);
    startTransition(async () => {
      const res = await deleteProperty(id);
      setLoadingId(null);
      if (res.success) {
        setProperties((prev) => prev.filter((p) => p.id !== id));
      }
    });
  };

  const handlePropertyUpdated = (updated: Property) => {
    setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingProperty(null);
  };

  const filtered = properties.filter((p) => {
    const query = search.toLowerCase();
    const matchesSearch =
      search === '' ||
      p.location.toLowerCase().includes(query) ||
      p.owner_name.toLowerCase().includes(query) ||
      p.type.toLowerCase().includes(query) ||
      (p.notes && p.notes.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || p.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Facebook':
        return <Share2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'Google Drive':
        return <FolderOpen className="w-3.5 h-3.5 text-amber-600" />;
      case 'Website':
        return <Globe className="w-3.5 h-3.5 text-emerald-600" />;
      case 'WhatsApp':
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder="Search by location, owner, type, or notes..."
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
              <SelectItem value="Under Discussion">Discussion</SelectItem>
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
        <div className="text-center py-12 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <Building2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No properties found</p>
          <p className="text-xs text-slate-500 mt-0.5">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((property) => {
            const hasPhotos = property.photo_source_type && property.photo_source_type !== 'None';
            const isWhatsApp = property.photo_source_type === 'WhatsApp';
            const cleanPhone = getCleanPhone(property.owner_contact);
            const waUrl = isWhatsApp
              ? property.photo_link && property.photo_link.startsWith('http')
                ? property.photo_link
                : `https://wa.me/${cleanPhone}?text=Hi,%20could%20you%20please%20share%20the%20photos%20for%20the%20${property.type}%20property%20at%20${encodeURIComponent(property.location)}?`
              : null;

            return (
              <Card
                key={property.id}
                className="border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-slate-900"
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

                  <CardContent className="space-y-3.5 text-sm">
                    {/* Location */}
                    <Link
                      href={`/properties/${property.id}`}
                      className="flex items-start gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                      title="View property details"
                    >
                      <MapPin className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5 transition-colors" />
                      <span className="font-medium line-clamp-1 group-hover:underline">{property.location}</span>
                    </Link>

                    {/* Photo Reference Indicator */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {hasPhotos ? (
                        isWhatsApp ? (
                          <a
                            href={waUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Photos via WhatsApp (Owner)</span>
                          </a>
                        ) : property.photo_link ? (
                          <a
                            href={property.photo_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {getSourceIcon(property.photo_source_type)}
                            <span>View Photos ({property.photo_source_type})</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            {getSourceIcon(property.photo_source_type)}
                            <span>Source: {property.photo_source_type}</span>
                          </span>
                        )
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <ImageOff className="w-3.5 h-3.5" />
                          <span>No photos linked</span>
                        </div>
                      )}

                      {hasPhotos && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {property.photo_source_type}
                        </span>
                      )}
                    </div>

                    {/* Details Table */}
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
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                          {property.owner_name}
                        </span>
                      </div>
                    </div>

                    {/* Amenities list */}
                    {property.amenities && property.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {property.amenities.slice(0, 3).map((amenity) => (
                          <span
                            key={amenity}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {amenity}
                          </span>
                        ))}
                        {property.amenities.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                            +{property.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {property.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded line-clamp-2">
                        {property.notes}
                      </p>
                    )}
                  </CardContent>
                </div>

                {/* Footer with Edit, Delete, and Contact */}
                <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <a
                    href={`tel:${property.owner_contact}`}
                    className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{property.owner_contact}</span>
                  </a>

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/properties/${property.id}`}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="View details"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setEditingProperty(property)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit property"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {loadingId === property.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 p-1" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDelete(property.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Delete property"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Property Dialog Modal */}
      {editingProperty && (
        <EditPropertyDialog
          property={editingProperty}
          open={!!editingProperty}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingProperty(null);
          }}
          onPropertyUpdated={handlePropertyUpdated}
        />
      )}
    </div>
  );
}

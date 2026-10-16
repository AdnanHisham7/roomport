import { useState } from 'react';
import { Plus, FileText, Download, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Select } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useGetDocumentsQuery, useDeleteDocumentMutation } from '@/store/api/documentApi';
import { formatDate, titleCase, formatFileSize } from '@/utils/format';
import { resolvePdfUrl } from '@/utils/pdfUrl';
import type { DocumentType } from '@/types/tenancy';

const typeOptions = [
  { value: '', label: 'All types' },
  ...['rental_agreement','building_license','insurance','lease_document','tenant_id','maintenance_invoice','police_verification','noc','tax_document','other'].map(t => ({ value: t, label: titleCase(t) })),
];

export default function DocumentsPage() {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading } = useGetDocumentsQuery(filter ? { type: filter as DocumentType } : undefined);
  const [deleteDoc, { isLoading: deleting }] = useDeleteDocumentMutation();

  const docs = (data?.data ?? []).filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(deleteTarget).unwrap();
      toast.success('Document removed.');
      setDeleteTarget(null);
    } catch {
      toast.error('Could not delete document.');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Documents</h1>
          <p className="mt-1 text-sm text-ink-soft">Leases, IDs, licenses and other records.</p>
        </div>
        <Button icon={<Plus className="size-4" />} disabled>Upload document</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input placeholder="Search..." leftIcon={<Search className="size-4" />} value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select options={typeOptions} value={filter} onChange={e => setFilter(e.target.value)} className="w-44" />
      </div>

      <Card padding="none">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        {!isLoading && !docs.length && (
          <EmptyState icon={<FileText className="size-6" />} title="No documents yet" description="Documents uploaded via lease agreements or direct upload will appear here." />
        )}
        <div className="divide-y divide-line">
          {docs.map(d => (
            <div key={d._id} className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <div className="min-w-0 flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-crimson-50 text-crimson-500"><FileText className="size-4.5" /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{d.title}</p>
                  <p className="text-xs text-ink-faint">{titleCase(d.type)} · {formatDate(d.expiryDate)} · {formatFileSize(d.fileSize)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a href={resolvePdfUrl(d.fileUrl)} target="_blank" rel="noreferrer" className="flex size-8 items-center justify-center rounded-lg text-ink-faint hover:bg-paper-dim hover:text-ink"><Download className="size-4" /></a>
                <button onClick={() => setDeleteTarget(d._id)} className="flex size-8 items-center justify-center rounded-lg text-crimson-500 hover:bg-crimson-50"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={onDelete} loading={deleting} title="Delete this document?" confirmLabel="Delete" />
    </div>
  );
}

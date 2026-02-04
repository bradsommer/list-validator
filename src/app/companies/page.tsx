'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { CrmRecordList } from '@/components/crm/CrmRecordList';

export default function CompaniesPage() {
  return (
    <AdminLayout>
      <CrmRecordList
        objectType="companies"
        title="Companies"
        dedupLabel="Domain"
      />
    </AdminLayout>
  );
}

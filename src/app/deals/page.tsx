'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { CrmRecordList } from '@/components/crm/CrmRecordList';

export default function DealsPage() {
  return (
    <AdminLayout>
      <CrmRecordList
        objectType="deals"
        title="Deals"
        dedupLabel="Deal Name"
      />
    </AdminLayout>
  );
}

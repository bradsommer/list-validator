'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { CrmRecordList } from '@/components/crm/CrmRecordList';
import { useAuth } from '@/contexts/AuthContext';

export default function DealsPage() {
  const { user } = useAuth();
  return (
    <AdminLayout>
      <CrmRecordList
        objectType="deals"
        title="Deals"
        dedupLabel="Deal Name"
        accountId={user?.accountId || null}
      />
    </AdminLayout>
  );
}

'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { CrmRecordList } from '@/components/crm/CrmRecordList';
import { useAuth } from '@/contexts/AuthContext';

export default function CompaniesPage() {
  const { user } = useAuth();
  return (
    <AdminLayout>
      <CrmRecordList
        objectType="companies"
        title="Companies"
        dedupLabel="Domain"
        accountId={user?.accountId || null}
      />
    </AdminLayout>
  );
}

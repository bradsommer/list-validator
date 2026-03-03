'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { CrmRecordList } from '@/components/crm/CrmRecordList';
import { useAuth } from '@/contexts/AuthContext';

export default function ContactsPage() {
  const { user } = useAuth();
  return (
    <AdminLayout>
      <CrmRecordList
        objectType="contacts"
        title="Contacts"
        dedupLabel="Email"
        accountId={user?.accountId || null}
      />
    </AdminLayout>
  );
}

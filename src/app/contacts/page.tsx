'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { CrmRecordList } from '@/components/crm/CrmRecordList';

export default function ContactsPage() {
  return (
    <AdminLayout>
      <CrmRecordList
        objectType="contacts"
        title="Contacts"
        dedupLabel="Email"
      />
    </AdminLayout>
  );
}

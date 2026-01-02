import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import styles from './layout.module.scss';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className={styles.layout}>
      <Sidebar user={{ name: session.name, email: session.email }} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}


'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from './Modal';
import styles from './Sidebar.module.scss';

interface NavItem {
  name: string;
  path: string;
  icon: string;
}

interface SidebarProps {
  user: {
    name?: string | null;
    email: string;
  };
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Calls', path: '/calls', icon: '📞' },
  { name: 'Prompts', path: '/prompts', icon: '📝' },
  { name: 'Integrations', path: '/integrations', icon: '🔗' },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    setErrorMessage(null);
  };

  const handleLogoutConfirm = async () => {
    setLoggingOut(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to logout');
      }

      router.push('/login');
      router.refresh();
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred');
      setLoggingOut(false);
    }
  };

  const displayName = user.name || user.email.split('@')[0];
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>✨</span>
            <div className={styles.logoText}>
              <h1>CallInsight</h1>
              <p>AI Call Analytics</p>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${pathname?.startsWith(item.path) ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.user} onClick={handleLogoutClick}>
            <div className={styles.userAvatar}>{avatarInitial}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
          </div>
        </div>
      </aside>

      <Modal
        isOpen={showLogoutModal}
        onClose={() => {
          setShowLogoutModal(false);
          setErrorMessage(null);
        }}
        onConfirm={handleLogoutConfirm}
        title="Logout"
        message={errorMessage || "Are you sure you want to logout?"}
        confirmText="Logout"
        confirmType="danger"
        isLoading={loggingOut}
      />
    </>
  );
}


import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from './detail.module.scss';
import { CallActions } from '@/components/CallActions';
import { CallDetailTabs } from '@/components/CallDetailTabs';

async function getCall(id: string) {
  const call = await prisma.call.findUnique({
    where: { id },
  });

  if (!call) {
    notFound();
  }

  return call;
}

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await getCall(id);

  return (
    <div className={styles.detailPage}>
      <Link href="/calls" className={styles.backLink}>
        ← Back to Calls
      </Link>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{call.clientName}</h1>
          <div className={styles.meta}>
            <span>
              📅 {new Date(call.callDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })} at {new Date(call.callDate).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
            <span>👤 {call.organizer}</span>
          </div>
        </div>
        {call.aiRating && (
          <div className={styles.ratingBox}>
            <div className={styles.ratingLabel}>AI Rating</div>
            <div className={styles.ratingValue}>{call.aiRating.toFixed(1)}</div>
          </div>
        )}
      </div>

      <div className={styles.layout}>
        <div className={styles.mainContent}>
          <CallDetailTabs call={call} />
        </div>

        <div className={styles.sidebar}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>👤 Organizer</h3>
            <div className={styles.organizerInfo}>
              <div className={styles.avatar}>{call.organizer.charAt(0).toUpperCase()}</div>
              <div>
                <div className={styles.organizerName}>{call.organizer}</div>
                <div className={styles.organizerRole}>Account Manager</div>
              </div>
            </div>
          </div>

          {call.participants.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>👥 Participants ({call.participants.length})</h3>
              <div className={styles.participantsList}>
                {call.participants.map((p, i) => (
                  <div key={i} className={styles.participantItem}>
                    <div className={styles.participantAvatar}>{p.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className={styles.participantName}>{p}</div>
                      <div className={styles.participantRole}>
                        {i === 0 ? 'CTO' : i === 1 ? 'Engineering Lead' : 'Participant'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <CallActions call={call} />
        </div>
      </div>
    </div>
  );
}


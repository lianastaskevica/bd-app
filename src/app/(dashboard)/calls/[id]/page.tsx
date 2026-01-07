import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from './detail.module.scss';
import { CallActions } from '@/components/CallActions';
import { CallDetailTabs } from '@/components/CallDetailTabs';
import { CategoryOverride } from '@/components/CategoryOverride';

async function getCall(id: string) {
  const call = await prisma.call.findUnique({
    where: { id },
    include: {
      category: true,
      predictedCategory: true,
      categoryFinal: true,
    },
  });

  if (!call) {
    notFound();
  }

  return call;
}

async function getCategories() {
  return await prisma.category.findMany({
    where: { isFixed: true },
    orderBy: { name: 'asc' },
  });
}

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await getCall(id);
  const categories = await getCategories();

  return (
    <div className={styles.detailPage}>
      <Link href="/calls" className={styles.backLink}>
        ← Back to Calls
      </Link>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{call.callTitle}</h1>
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
          {call.isExternal !== null && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                {call.isExternal ? '🌐 External Call' : '🏢 Internal Call'}
              </h3>
              <div className={styles.classificationInfo}>
                <div className={styles.classificationStatus}>
                  <span className={call.isExternal ? styles.externalBadge : styles.internalBadge}>
                    {call.isExternal ? 'External Meeting' : 'Internal Meeting'}
                  </span>
                </div>
                {call.isExternal && call.externalDomains.length > 0 && (
                  <div className={styles.externalDomains}>
                    <div className={styles.domainsLabel}>External Domains:</div>
                    {call.externalDomains.map((domain, i) => (
                      <div key={i} className={styles.domainTag}>{domain}</div>
                    ))}
                  </div>
                )}
                {call.classificationSource && (
                  <div className={styles.classificationSource}>
                    Source: {call.classificationSource === 'calendar' ? '📅 Google Calendar' : call.classificationSource}
                  </div>
                )}
              </div>
            </div>
          )}

          {call.predictedCategory && (
            <CategoryOverride call={call} categories={categories} />
          )}

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


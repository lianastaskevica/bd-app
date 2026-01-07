import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import styles from './calls.module.scss';
import { CallFilters } from '@/components/CallFilters';
import { CalendarImport } from '@/components/CalendarImport';

interface SearchParams {
  client?: string;
  organizer?: string;
  search?: string;
  callType?: string; // 'external', 'internal', or 'unknown'
  category?: string; // category ID
}

async function getCalls(searchParams: SearchParams) {
  const where: any = {};

  if (searchParams.client) {
    where.clientName = searchParams.client;
  }

  if (searchParams.organizer) {
    where.organizer = searchParams.organizer;
  }

  if (searchParams.search) {
    where.OR = [
      { clientName: { contains: searchParams.search, mode: 'insensitive' } },
      { organizer: { contains: searchParams.search, mode: 'insensitive' } },
      { transcript: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }

  if (searchParams.callType) {
    if (searchParams.callType === 'external') {
      where.isExternal = true;
    } else if (searchParams.callType === 'internal') {
      where.isExternal = false;
    } else if (searchParams.callType === 'unknown') {
      where.isExternal = null;
    }
  }

  if (searchParams.category) {
    where.categoryFinalId = searchParams.category;
  }

  const [calls, clients, organizers, categories] = await Promise.all([
    prisma.call.findMany({
      where,
      orderBy: {
        callDate: 'desc',
      },
    }),
    prisma.call.findMany({
      select: { clientName: true },
      distinct: ['clientName'],
      orderBy: { clientName: 'asc' },
    }),
    prisma.call.findMany({
      select: { organizer: true },
      distinct: ['organizer'],
      orderBy: { organizer: 'asc' },
    }),
    prisma.category.findMany({
      where: { isFixed: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    calls,
    clients: clients.map((c) => c.clientName),
    organizers: organizers.map((o) => o.organizer),
    categories,
  };
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { calls, clients, organizers, categories } = await getCalls(params);

  return (
    <div className={styles.callsPage}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Client Calls</h1>
          <p className={styles.subtitle}>Browse and analyze call transcripts</p>
        </div>
        <Link href="/calls/upload" className="btn btn-primary">
          + Upload Call
        </Link>
      </div>

      <CalendarImport />

      <CallFilters
        clients={clients}
        organizers={organizers}
        categories={categories}
        currentFilters={params}
      />

      <div className={styles.stats}>
        Showing {calls.length} of {calls.length} calls
      </div>

      <div className={styles.callsList}>
        {calls.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📞</div>
            <h3>No calls found</h3>
            <p>Upload a call transcript to get started</p>
            <Link href="/calls/upload" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Upload Call
            </Link>
          </div>
        ) : (
          calls.map((call) => (
            <Link href={`/calls/${call.id}`} key={call.id} className={styles.callCard}>
              <div className={styles.callHeader}>
                <h3 className={styles.callClient}>{call.clientName}</h3>
                {call.aiRating && (
                  <div className={styles.rating}>
                    <span className={styles.ratingValue}>{call.aiRating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className={styles.callMeta}>
                <span>📅 {new Date(call.callDate).toLocaleDateString()}</span>
                <span>👤 {call.organizer}</span>
                <span>👥 {call.participants.length} participants</span>
                {call.isExternal !== null && (
                  <span className={call.isExternal ? styles.externalBadge : styles.internalBadge}>
                    {call.isExternal ? '🌐 External' : '🏢 Internal'}
                  </span>
                )}
              </div>

              <p className={styles.callSummary}>
                {call.aiAnalysis
                  ? call.aiAnalysis.slice(0, 200) + (call.aiAnalysis.length > 200 ? '...' : '')
                  : call.transcript.slice(0, 200) + (call.transcript.length > 200 ? '...' : '')}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}


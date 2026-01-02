import { prisma } from '@/lib/prisma';
import styles from './dashboard.module.scss';
import { RatingByClient, RatingByOrganizer } from '@/components/Charts';

async function getDashboardStats() {
  const [totalCalls, calls] = await Promise.all([
    prisma.call.count(),
    prisma.call.findMany(),
  ]);

  const analyzedCalls = calls.filter((call) => call.aiAnalysis).length;
  const avgRating =
    calls.length > 0
      ? calls.reduce((sum, call) => sum + (call.aiRating || 0), 0) / calls.length
      : 0;

  const uniqueClients = new Set(calls.map((call) => call.clientName)).size;

  // Rating by client
  const clientRatings = new Map<string, { total: number; count: number }>();
  calls.forEach((call) => {
    if (call.aiRating) {
      const existing = clientRatings.get(call.clientName) || { total: 0, count: 0 };
      clientRatings.set(call.clientName, {
        total: existing.total + call.aiRating,
        count: existing.count + 1,
      });
    }
  });

  const ratingByClient = Array.from(clientRatings.entries())
    .map(([name, { total, count }]) => ({
      name,
      rating: total / count,
    }))
    .sort((a, b) => b.rating - a.rating);

  // Rating by organizer
  const organizerRatings = new Map<string, { total: number; count: number }>();
  calls.forEach((call) => {
    if (call.aiRating) {
      const existing = organizerRatings.get(call.organizer) || { total: 0, count: 0 };
      organizerRatings.set(call.organizer, {
        total: existing.total + call.aiRating,
        count: existing.count + 1,
      });
    }
  });

  const ratingByOrganizer = Array.from(organizerRatings.entries())
    .map(([name, { total, count }]) => ({
      name,
      rating: total / count,
    }))
    .sort((a, b) => b.rating - a.rating);

  return {
    totalCalls,
    analyzedCalls,
    avgRating,
    uniqueClients,
    ratingByClient,
    ratingByOrganizer,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Call analytics overview</p>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{ background: 'var(--accent-primary)' }}>
            📞
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Total Calls</div>
            <div className={styles.metricValue}>{stats.totalCalls}</div>
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{ background: 'var(--info)' }}>
            📊
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Analyzed</div>
            <div className={styles.metricValue}>{stats.analyzedCalls}</div>
            <div className={styles.metricSubtext}>
              {stats.totalCalls > 0
                ? Math.round((stats.analyzedCalls / stats.totalCalls) * 100)
                : 0}
              % of total
            </div>
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{ background: 'var(--success)' }}>
            📈
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Avg Rating</div>
            <div className={styles.metricValue}>{stats.avgRating.toFixed(1)}</div>
            <div className={styles.metricSubtext}>out of 10</div>
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{ background: 'var(--purple)' }}>
            👥
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Clients</div>
            <div className={styles.metricValue}>{stats.uniqueClients}</div>
          </div>
        </div>
      </div>

      <div className={styles.charts}>
        <div className={styles.chart}>
          <RatingByClient data={stats.ratingByClient} />
        </div>

        <div className={styles.chart}>
          <RatingByOrganizer data={stats.ratingByOrganizer} />
        </div>
      </div>
    </div>
  );
}


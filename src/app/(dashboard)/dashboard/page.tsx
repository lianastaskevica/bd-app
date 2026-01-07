import { prisma } from '@/lib/prisma';
import styles from './dashboard.module.scss';
import { RatingByCategory } from '@/components/Charts';

async function getDashboardStats() {
  const totalCalls = await prisma.call.count();
  
  const calls = await prisma.call.findMany({
    select: {
      aiRating: true,
    },
  });

  const avgRating =
    calls.length > 0
      ? calls.reduce((sum, call) => sum + (call.aiRating || 0), 0) / calls.length
      : 0;

  // Rating by category
  const categoryRatings = new Map<string, { total: number; count: number; name: string }>();
  const callsWithCategories = await prisma.call.findMany({
    where: { categoryFinalId: { not: null } },
    include: { categoryFinal: true },
  });

  callsWithCategories.forEach((call) => {
    if (call.aiRating && call.categoryFinal) {
      const existing = categoryRatings.get(call.categoryFinal.id) || {
        total: 0,
        count: 0,
        name: call.categoryFinal.name,
      };
      categoryRatings.set(call.categoryFinal.id, {
        total: existing.total + call.aiRating,
        count: existing.count + 1,
        name: existing.name,
      });
    }
  });

  const ratingByCategory = Array.from(categoryRatings.values())
    .map(({ name, total, count }) => ({
      name,
      rating: total / count,
      count,
    }))
    .sort((a, b) => b.rating - a.rating);

  return {
    totalCalls,
    avgRating,
    ratingByCategory,
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
          <div className={styles.metricIcon} style={{ background: 'var(--success)' }}>
            📈
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Average Rating</div>
            <div className={styles.metricValue}>{stats.avgRating.toFixed(1)}</div>
            <div className={styles.metricSubtext}>out of 10</div>
          </div>
        </div>
      </div>

      <div className={styles.charts}>
        <div className={styles.chart}>
          <RatingByCategory data={stats.ratingByCategory} />
        </div>
      </div>
    </div>
  );
}


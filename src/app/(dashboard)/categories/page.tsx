import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import styles from './categories.module.scss';
import { CategoryManagement } from '@/components/CategoryManagement';

async function getCategories() {
  const categories = await prisma.category.findMany({
    where: { isFixed: true },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          calls: true,
          predictedCalls: true,
        },
      },
    },
  });

  return categories;
}

async function getCategoriesWithStats() {
  const categories = await prisma.category.findMany({
    where: { isFixed: true },
    orderBy: { name: 'asc' },
    include: {
      calls: {
        select: {
          aiRating: true,
          confidenceScore: true,
        },
      },
      predictedCalls: {
        select: {
          id: true,
        },
      },
    },
  });

  return categories.map((cat) => {
    const assignedCalls = cat.calls.length;
    const predictedCalls = cat.predictedCalls.length;
    const ratings = cat.calls.map((c) => c.aiRating).filter((r): r is number => r !== null);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const confidences = cat.calls
      .map((c) => c.confidenceScore)
      .filter((c): c is number => c !== null);
    const avgConfidence =
      confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null;

    return {
      ...cat,
      stats: {
        assignedCalls,
        predictedCalls,
        avgRating,
        avgConfidence,
      },
      calls: undefined,
      predictedCalls: undefined,
    };
  });
}

export default async function CategoriesPage() {
  const categories = await getCategoriesWithStats();

  return (
    <div className={styles.categoriesPage}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Category Management</h1>
          <p className={styles.subtitle}>
            Manage the 8 fixed categories and their AI classification playbooks
          </p>
        </div>
      </div>

      <div className={styles.overview}>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>📊</div>
          <div className={styles.overviewInfo}>
            <div className={styles.overviewValue}>{categories.length}</div>
            <div className={styles.overviewLabel}>Fixed Categories</div>
          </div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>📞</div>
          <div className={styles.overviewInfo}>
            <div className={styles.overviewValue}>
              {categories.reduce((sum, cat) => sum + cat.stats.assignedCalls, 0)}
            </div>
            <div className={styles.overviewLabel}>Categorized Calls</div>
          </div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>🤖</div>
          <div className={styles.overviewInfo}>
            <div className={styles.overviewValue}>
              {categories.reduce((sum, cat) => sum + cat.stats.predictedCalls, 0)}
            </div>
            <div className={styles.overviewLabel}>AI Predictions</div>
          </div>
        </div>
      </div>

      <CategoryManagement categories={categories} />
    </div>
  );
}


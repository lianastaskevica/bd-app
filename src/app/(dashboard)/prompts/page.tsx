import { prisma } from '@/lib/prisma';
import styles from './prompts.module.scss';
import { PromptCard } from '@/components/PromptCard';
import Link from 'next/link';

async function getPrompts() {
  const prompts = await prisma.prompt.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });

  return { prompts };
}

export default async function PromptsPage() {
  const { prompts } = await getPrompts();

  const activePrompt = prompts.find((p) => p.isActive);

  return (
    <div className={styles.promptsPage}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Prompts</h1>
          <p className={styles.subtitle}>Manage prompts used for call analysis</p>
        </div>
        <Link href="/prompts/new" className="btn btn-primary">
          + Create Prompt
        </Link>
      </div>

      {activePrompt && (
        <div className={styles.activePromptCard}>
          <div className={styles.activeIcon}>✨</div>
          <div className={styles.activeInfo}>
            <div className={styles.activeLabel}>Currently active prompt:</div>
            <div className={styles.activeName}>{activePrompt.name}</div>
          </div>
        </div>
      )}

      <div className={styles.promptsList}>
        {prompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} />
        ))}
      </div>

      {prompts.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📝</div>
          <h3>No prompts yet</h3>
          <p>Create your first prompt to start analyzing calls</p>
          <Link href="/prompts/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Create Prompt
          </Link>
        </div>
      )}
    </div>
  );
}


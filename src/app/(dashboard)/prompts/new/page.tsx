import { PromptForm } from '@/components/PromptForm';

export default async function NewPromptPage() {
  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px' }}>Create Prompt</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Define a new AI analysis prompt
        </p>
      </div>
      <PromptForm />
    </div>
  );
}


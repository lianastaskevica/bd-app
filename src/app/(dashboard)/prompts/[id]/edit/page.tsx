import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PromptForm } from '@/components/PromptForm';

async function getPrompt(id: string) {
  const prompt = await prisma.prompt.findUnique({
    where: { id },
  });

  if (!prompt) {
    notFound();
  }

  return prompt;
}

export default async function EditPromptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prompt = await getPrompt(id);

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px' }}>Edit Prompt</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Update prompt settings and content
        </p>
      </div>
      <PromptForm prompt={prompt} />
    </div>
  );
}


import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Category playbooks for heuristic scoring
const CATEGORY_PLAYBOOKS = {
  'Intro (Diagnostic) Call': {
    intent: 'early-stage relationship and context discovery',
    timeframe: 'present understanding + immediate next steps',
    strongSignals: ['introductions', 'initial call', 'get to know', 'understand your business', 'exploratory'],
    weakSignals: ['proposal', 'pricing', 'delivery', 'payment', 'contract'],
  },
  'Problem & Requirements Discovery': {
    intent: 'gather and clarify requirements',
    timeframe: 'present to near future',
    strongSignals: ['requirements', 'discovery', 'systems', 'workflows', 'integrations', 'constraints', 'clarifying'],
    weakSignals: ['proposal', 'contract', 'payment'],
  },
  'Ballpark Proposal': {
    intent: 'provide indicative scope and cost ranges',
    timeframe: 'near future, exploratory',
    strongSignals: ['proposal', 'estimate', 'ballpark', 'range', 'assumptions', 'approximately', 'rough'],
    weakSignals: ['fixed price', 'contract', 'signed'],
  },
  'Post Solution Discovery Proposal': {
    intent: 'present refined proposal after discovery',
    timeframe: 'near-term execution readiness',
    strongSignals: ['discovery outcomes', 'refined', 'scope changed', 'optimization', 'phasing', 'roadmap'],
    weakSignals: ['procurement', 'legal', 'contract signing'],
  },
  'Decision & Commercial Alignment Call': {
    intent: 'finalize commercial terms',
    timeframe: 'immediate commitment',
    strongSignals: ['payment', 'invoicing', 'contract', 'procurement', 'legal', 'approval', 'ready to sign'],
    weakSignals: ['discovery', 'proposal explanation'],
  },
  'Delivery Health & Feedback Loop': {
    intent: 'maintain relationship health and delivery quality',
    timeframe: 'past and present',
    strongSignals: ['feedback', 'retrospective', 'collaboration', 'communication', 'monthly', 'quarterly', 'check-in'],
    weakSignals: ['escalation', 'crisis', 'contract'],
  },
  'Roadmap Planning Session (Quarterly, bi-annual, or annual)': {
    intent: 'strategic prioritization and sequencing',
    timeframe: 'medium to long-term future',
    strongSignals: ['roadmap', 'quarterly', 'annual', 'priorities', 'sequencing', 'H1', 'H2', 'strategic'],
    weakSignals: ['retrospective', 'payment', 'contract'],
  },
  'Escalation & Recovery Session': {
    intent: 'resolve serious conflict or relationship risk',
    timeframe: 'immediate crisis resolution',
    strongSignals: ['escalation', 'problem', 'crisis', 'dispute', 'conflict', 'issue', 'concern', 'urgent'],
    weakSignals: ['routine', 'planning', 'roadmap'],
  },
};

interface HeuristicScore {
  category: string;
  score: number;
  matchedSignals: string[];
}

interface CategoryPrediction {
  predictedCategory: string;
  confidence: number;
  reasoning: string[];
  topCandidates: Array<{ category: string; score: number }>;
  needsReview: boolean;
}

/**
 * Step 1: Generate condensed transcript summary (400-800 words)
 */
export async function generateTranscriptSummary(
  title: string,
  transcript: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at condensing meeting transcripts into focused summaries.
Generate a summary of 400-800 words that focuses on:
1. Stated purpose of the call
2. Main topics discussed  
3. Decisions vs open questions
4. Any mentions of money, scope, delivery, or risk
5. Next steps

Be concise but capture all key information needed for classification.`,
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nTranscript:\n${transcript.slice(0, 15000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error generating transcript summary:', error);
    throw error;
  }
}

/**
 * Step 2: Heuristic scoring to identify top 3 candidates
 */
function scoreCategories(title: string, summary: string): HeuristicScore[] {
  const textLower = `${title} ${summary}`.toLowerCase();
  const scores: HeuristicScore[] = [];

  for (const [category, playbook] of Object.entries(CATEGORY_PLAYBOOKS)) {
    let score = 0;
    const matchedSignals: string[] = [];

    // Score strong signals (positive)
    for (const signal of playbook.strongSignals) {
      if (textLower.includes(signal.toLowerCase())) {
        score += 2;
        matchedSignals.push(`+${signal}`);
      }
    }

    // Score weak signals (negative)
    for (const signal of playbook.weakSignals) {
      if (textLower.includes(signal.toLowerCase())) {
        score -= 1;
        matchedSignals.push(`-${signal}`);
      }
    }

    scores.push({ category, score, matchedSignals });
  }

  // Sort by score descending and return top 3
  return scores.sort((a, b) => b.score - a.score).slice(0, 3);
}

/**
 * Step 3: LLM adjudication for final category selection
 */
async function llmAdjudicate(
  title: string,
  summary: string,
  topCandidates: HeuristicScore[]
): Promise<CategoryPrediction> {
  const categoryDefinitions = Object.entries(CATEGORY_PLAYBOOKS)
    .map(([name, playbook]) => {
      return `${name}:\n  Intent: ${playbook.intent}\n  Timeframe: ${playbook.timeframe}`;
    })
    .join('\n\n');

  const candidatesList = topCandidates
    .map((c) => `${c.category} (heuristic score: ${c.score})`)
    .join(', ');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at classifying business calls into exact categories.

Available categories (you MUST choose exactly one):
${categoryDefinitions}

You MUST respond with valid JSON in this exact format:
{
  "category": "exact category name",
  "confidence": 0.85,
  "reasoning": [
    "Clear statement this is [intent]",
    "Timeframe is [timeframe]",
    "Strong signals: [signals]"
  ]
}

Confidence rules:
- ≥ 0.75: High confidence, clear match
- 0.50-0.75: Medium confidence, some ambiguity  
- < 0.50: Low confidence, unclear

Provide 2-5 specific reasoning bullets referencing observed signals.`,
        },
        {
          role: 'user',
          content: `Classify this call into ONE category.

Title: ${title}

Summary: ${summary}

Top 3 candidate categories from heuristic analysis:
${candidatesList}

Provide your classification with confidence score and reasoning.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    const result = JSON.parse(content);

    // Validate result
    if (!result.category || typeof result.confidence !== 'number' || !Array.isArray(result.reasoning)) {
      throw new Error('Invalid LLM response format');
    }

    // Ensure category is one of the valid ones
    if (!CATEGORY_PLAYBOOKS.hasOwnProperty(result.category)) {
      console.warn(`LLM returned invalid category: ${result.category}, using top candidate`);
      result.category = topCandidates[0].category;
    }

    const needsReview = result.confidence >= 0.50 && result.confidence < 0.75;

    return {
      predictedCategory: result.category,
      confidence: result.confidence,
      reasoning: result.reasoning,
      topCandidates: topCandidates.map((c) => ({
        category: c.category,
        score: c.score,
      })),
      needsReview,
    };
  } catch (error) {
    console.error('LLM adjudication error:', error);

    // Fallback to highest heuristic score
    return {
      predictedCategory: topCandidates[0].category,
      confidence: 0.45, // Below threshold
      reasoning: ['Fallback to heuristic scoring due to LLM error'],
      topCandidates: topCandidates.map((c) => ({
        category: c.category,
        score: c.score,
      })),
      needsReview: true,
    };
  }
}

/**
 * Main classification pipeline
 */
export async function classifyCall(
  title: string,
  transcript: string
): Promise<{
  transcriptSummary: string;
  prediction: CategoryPrediction;
}> {
  // Step 1: Generate summary
  const transcriptSummary = await generateTranscriptSummary(title, transcript);

  // Step 2: Heuristic scoring
  const topCandidates = scoreCategories(title, transcriptSummary);

  // Step 3: LLM adjudication
  const prediction = await llmAdjudicate(title, transcriptSummary, topCandidates);

  return {
    transcriptSummary,
    prediction,
  };
}


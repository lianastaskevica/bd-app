import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface CallAnalysisResult {
  summary: string;
  rating: number;
  category: string;
  sentiment: string;
  strengths: string[];
  areasForImprovement: string[];
}

export async function analyzeCall(
  transcript: string,
  promptContent: string
): Promise<CallAnalysisResult> {
  const systemPrompt = `You are a professional call analyst. Your task is to analyze call transcripts and provide structured feedback.
  
Always respond with valid JSON in this exact format:
{
  "summary": "A brief 2-3 sentence summary of the call",
  "rating": 8.5,
  "category": "Proposal Call",
  "sentiment": "Positive",
  "strengths": [
    "Clear and structured presentation of the proposal",
    "Proactive addressing of client concerns",
    "Transparent communication about team composition"
  ],
  "areasForImprovement": [
    "Could have provided specific cost estimates",
    "Consider preparing case studies for similar projects"
  ]
}

The rating should be a number between 1 and 10.
The sentiment should be one of: "Positive", "Neutral", or "Negative".
Provide 2-4 specific strengths and 1-3 areas for improvement.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${promptContent}\n\nTranscript:\n${transcript}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(content) as CallAnalysisResult;
}


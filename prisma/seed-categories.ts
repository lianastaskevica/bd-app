import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIXED_CATEGORIES = [
  {
    name: 'Intro (Diagnostic) Call',
    description: `Intent: Early-stage relationship and context discovery.
Dominant Timeframe: Present understanding + immediate next steps.
Strong Signals:
- Introductions dominate early
- Exploratory questions about business and goals
- Language like "initial call", "get to know", "understand your business"
- Clear statement that proposal/discovery comes later
Must NOT include: Deep requirements, Pricing negotiation, Delivery issues`,
    color: '#60A5FA', // Blue
  },
  {
    name: 'Problem & Requirements Discovery',
    description: `Intent: Gather and clarify requirements to enable estimation or solution design.
Dominant Timeframe: Present → near future.
Strong Signals:
- Explicit framing: "this session is for requirements"
- Deep dives into systems, workflows, integrations, constraints
- Many clarifying questions
- Outputs are inputs for later estimation
Must NOT include: Proposal presentation, Contract or payment discussion`,
    color: '#34D399', // Green
  },
  {
    name: 'Ballpark Proposal',
    description: `Intent: Provide indicative scope and cost ranges based on assumptions.
Dominant Timeframe: Near future, exploratory commitment.
Strong Signals:
- Proposal or estimate is presented
- Numbers discussed as ranges
- Heavy use of assumptions and uncertainty language
- Feature/module-level scope discussion
- Discovery still referenced as incomplete or future
Must NOT include: Fixed pricing, Contract mechanics`,
    color: '#FBBF24', // Yellow
  },
  {
    name: 'Post Solution Discovery Proposal',
    description: `Intent: Present a refined proposal after discovery.
Dominant Timeframe: Near-term execution readiness.
Strong Signals:
- Explicit references to discovery outcomes
- Explanation of why scope or price changed
- More fixed or tightly bounded numbers
- Optimization and phasing discussions
- Clear delivery roadmap
Must NOT include: Procurement/legal negotiation as primary topic`,
    color: '#F59E0B', // Orange
  },
  {
    name: 'Decision & Commercial Alignment Call',
    description: `Intent: Finalize commercial terms so work can proceed.
Dominant Timeframe: Immediate commitment.
Strong Signals:
- Payment schedules, invoicing, contract structure
- Risk ownership discussions
- Internal approvals, procurement, legal references
- Scope trimming to enable approval
- "Ready to sign" tone
Must NOT include: Discovery, Proposal explanation`,
    color: '#8B5CF6', // Purple
  },
  {
    name: 'Delivery Health & Feedback Loop',
    description: `Intent: Maintain relationship health and delivery quality.
Dominant Timeframe: Past & present.
Strong Signals:
- Explicit "feedback loop" framing
- Retrospective language
- Process, communication, collaboration focus
- Constructive tone
- Regular cadence (monthly/quarterly)
Must NOT include: Crisis escalation, Contract negotiation`,
    color: '#10B981', // Teal
  },
  {
    name: 'Roadmap Planning Session (Quarterly, bi-annual, or annual)',
    description: `Intent: Strategic prioritization and sequencing.
Dominant Timeframe: Medium to long-term future.
Strong Signals:
- Time horizons: quarters, year, H1/H2
- Discussion of priorities, initiatives, themes
- Sequencing and trade-offs
- Leadership-level participation
Must NOT include: Delivery retrospectives, Scope locking or payment approval`,
    color: '#3B82F6', // Indigo
  },
  {
    name: 'Escalation & Recovery Session',
    description: `Intent: Resolve serious conflict or relationship risk.
Dominant Timeframe: Immediate crisis resolution.
Strong Signals:
- Triggered by problems (delivery, billing, trust)
- Tense or defensive language
- Responsibility disputes
- Legal, financial, or access issues
- Senior stakeholders involved
- Relationship itself discussed explicitly
Must NOT include: Routine feedback tone, Normal planning cadence`,
    color: '#EF4444', // Red
  },
  {
    name: 'Other',
    description: `Intent: Catch-all category for calls that do not fit any other category.
Use this category when:
- Call content is unclear or ambiguous
- Call does not match intent of any specific category
- Call is administrative, scheduling, or logistics focused
- Call is social or relationship building without business purpose
- Call topic is outside normal client engagement patterns
Important: This should be the LAST choice - only use if no other category fits`,
    color: '#6B7280', // Gray
  },
];

async function main() {
  console.log('🌱 Seeding fixed categories...');

  for (const category of FIXED_CATEGORIES) {
    const result = await prisma.category.upsert({
      where: { name: category.name },
      update: {
        description: category.description,
        color: category.color,
        isFixed: true,
      },
      create: {
        name: category.name,
        description: category.description,
        color: category.color,
        isFixed: true,
      },
    });
    console.log(`✅ ${result.name}`);
  }

  console.log('✨ Done seeding categories!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


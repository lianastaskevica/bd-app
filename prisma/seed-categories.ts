import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIXED_CATEGORIES = [
  {
    name: 'Intro (Diagnostic) Call',
    description: `Core Purpose:
An Intro (Diagnostic) Call is an early-stage conversation whose goal is to establish context and assess fit, not to define solutions or make commitments.

The call exists to:
• Introduce participants and roles
• Understand the client's business at a high level
• Surface goals, motivations, and constraints
• Determine whether and how to proceed (e.g. discovery, NDA, follow-up)

Typical Characteristics:
• Long introductions at the start
• Client explains their business, market, history, and challenges
• Agency asks open-ended, exploratory questions
• No structured agenda beyond "getting to know each other"
• Repeated framing like "initial call", "first conversation", "before we go deeper"

What is Discussed:
• Business context
• Why the client is exploring change
• Rough goals or pain points
• High-level platforms or technologies (without depth)
• Possible next steps (discovery, proposal later)

What is Explicitly NOT Done:
• No deep requirements
• No scoped solution
• No pricing negotiation
• No delivery or contractual discussion

Key Discriminator:
If the call's success metric is clarity of context and next steps, not outputs or decisions → this category.`,
    color: '#60A5FA', // Blue
  },
  {
    name: 'Problem & Requirements Discovery',
    description: `Core Purpose:
A Problem & Requirements Discovery call is a structured working session whose goal is to extract, clarify, and document what needs to be built and why, so that scope and estimation can be produced later.

Typical Characteristics:
• Clear framing: "this session is for requirements / discovery"
• Consultant-led questioning
• Deep dives into systems, workflows, integrations, and constraints
• Many clarifying and follow-up questions
• Information flows primarily from client to agency

What is Discussed:
• Current-state ("as-is") processes
• Pain points and limitations
• Target-state ("to-be") needs
• Data sources, integrations, platforms
• Constraints (budget, time, compliance, resources)
• Open questions and unknowns

What is Explicitly NOT Done:
• No proposal presentation
• No pricing or only mentioned as future output
• No contract or approval discussion

Key Discriminator:
If the dominant activity is asking questions to gather inputs, and the outcome is knowledge, not a decision → this category.`,
    color: '#34D399', // Green
  },
  {
    name: 'Ballpark Proposal',
    description: `Core Purpose:
A Ballpark Proposal call presents an initial solution direction with indicative scope and cost ranges, based on assumptions and partial understanding.

The goal is to help the client decide:
• Whether the initiative is feasible
• Whether it is worth deeper investment
• Whether to proceed to discovery or refinement

Typical Characteristics:
• Proposal or estimate is presented
• Numbers are given as ranges or rough orders of magnitude
• Assumptions and uncertainties are emphasized
• Scope is discussed at module/feature level
• Trade-offs are explored to influence cost

What is Discussed:
• High-level solution approach
• Cost drivers
• What increases or decreases budget
• Risks and unknowns
• Phasing options

What is Explicitly NOT Done:
• No fixed scope
• No final price commitment
• No legal or payment mechanics

Key Discriminator:
If the call answers "roughly what would this look like and cost?" → Ballpark Proposal.`,
    color: '#FBBF24', // Yellow
  },
  {
    name: 'Post Solution Discovery Proposal',
    description: `Core Purpose:
A Post Solution Discovery Proposal call presents a refined, discovery-backed proposal, explaining how validated findings translate into concrete scope, timeline, and near-final investment.

This is the transition from exploration to commitment.

Typical Characteristics:
• Discovery outcomes are explicitly referenced
• Changes from the ballpark estimate are explained
• Scope is mostly defined and justified
• Numbers are tighter and more confident
• Multiple optimized options may be shown

What is Discussed:
• Confirmed scope and architecture
• Adjusted assumptions
• Refined cost and timeline
• Delivery phases
• Risk mitigation strategies

What is Explicitly NOT Done:
• No detailed payment schedule negotiation
• No legal review as primary topic

Key Discriminator:
If the call explains why the proposal is now more accurate and prepares for commitment → this category.`,
    color: '#F59E0B', // Orange
  },
  {
    name: 'Decision & Commercial Alignment Call',
    description: `Core Purpose:
A Decision & Commercial Alignment Call exists to finalize commercial terms and governance so the project can formally proceed.

This is where intent turns into obligation.

Typical Characteristics:
• Focus on money mechanics, not just price
• Payment schedules, invoicing, and milestones discussed
• Scope is trimmed or optimized to fit approval constraints
• Risk ownership is explicitly debated
• Internal approval chains are referenced

What is Discussed:
• Payment structure
• Fixed vs variable cost models
• Contractual boundaries
• Legal or procurement constraints
• Final go/no-go readiness

What is Explicitly NOT Done:
• No requirements discovery
• No solution ideation
• No delivery retrospectives

Key Discriminator:
If the call's success is measured by "are we ready to sign and proceed?" → this category.`,
    color: '#8B5CF6', // Purple
  },
  {
    name: 'Delivery Health & Feedback Loop',
    description: `Core Purpose:
A Delivery Health & Feedback Loop is a recurring session focused on how the collaboration and delivery are going, with the aim of continuous improvement and trust maintenance.

Typical Characteristics:
• Calm, constructive tone
• Retrospective focus
• Regular cadence
• Relationship-oriented discussion
• Collaborative problem-solving

What is Discussed:
• What worked and what didn't
• Communication effectiveness
• Process improvements
• Minor delivery issues
• Near-term adjustments

What is Explicitly NOT Done:
• No crisis escalation
• No contract renegotiation
• No long-term strategic planning

Key Discriminator:
If the dominant question is "how are we working together?" → this category.`,
    color: '#10B981', // Teal
  },
  {
    name: 'Roadmap Planning Session (Quarterly, bi-annual, or annual)',
    description: `Core Purpose:
A Roadmap Planning Session aligns stakeholders on future priorities and sequencing over a defined planning horizon.

Typical Characteristics:
• Strong future orientation
• Strategic rather than tactical
• Discussion of "big rocks"
• Sequencing and trade-offs
• Leadership participation

What is Discussed:
• Quarterly or annual priorities
• Initiatives and themes
• Dependencies and capacity
• Directional timelines

What is Explicitly NOT Done:
• No delivery retrospectives
• No scope locking
• No payment or contract approval

Key Discriminator:
If the main output is "what we focus on next and when", not execution or approval → this category.`,
    color: '#3B82F6', // Indigo
  },
  {
    name: 'Escalation & Recovery Session',
    description: `Core Purpose:
An Escalation & Recovery Session is a non-routine, high-stakes meeting triggered by serious issues that threaten delivery success or the partnership itself.

Typical Characteristics:
• Elevated tension
• Defensive or emotionally charged language
• Senior stakeholders involved
• Repeated clarification of facts
• Focus on responsibility and fairness

What is Discussed:
• Delivery failures or prolonged issues
• Financial disputes
• Contractual interpretation
• Trust breakdowns
• Temporary recovery actions

What is Explicitly NOT Done:
• Routine feedback
• Long-term planning
• Sales or discovery activities

Key Discriminator:
If the call exists because "something is seriously wrong and must be fixed" → this category.`,
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


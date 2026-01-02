import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Get admin credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@scandiweb.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'option123!';
  const adminName = process.env.ADMIN_NAME || 'Admin User';

  // Create default user
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
    },
  });
  console.log('✓ Created user:', user.email);

  // Create categories
  const categories = [
    'Proposal Call',
    'Strategic Planning',
    'Requirements Gathering',
    'Feedback / Review',
    'Status Update',
  ];

  for (const categoryName of categories) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
  }
  console.log('✓ Created categories');

  // Create default prompt
  const defaultPrompt = await prisma.prompt.upsert({
    where: { id: 'default-prompt' },
    update: {},
    create: {
      id: 'default-prompt',
      name: 'Default Call Analysis',
      content: `Analyze this client call transcript and provide:

1. A brief summary of how the call went (2-3 sentences)
2. An overall rating from 1-10 based on:
   - Communication clarity
   - Client engagement
   - Problem resolution
   - Professionalism
   - Outcome achievement`,
      isActive: true,
    },
  });
  console.log('✓ Created active prompt');

  // Create sample calls
  const sampleCalls = [
    {
      clientName: 'Acme Corporation',
      callDate: new Date('2024-01-15'),
      organizer: 'Sarah Chen',
      participants: ['John Smith', 'Emily Johnson'],
      transcript: `Sarah: Good morning everyone, thanks for joining. Let's discuss the project scope and timeline.

John: Thanks Sarah. We're looking to implement a comprehensive solution that covers our main pain points.

Sarah: Excellent. Based on our previous conversations, I've prepared a detailed proposal that addresses your requirements. The timeline would be approximately 3 months for full implementation.

John: That sounds reasonable. Can you walk us through the methodology?

Sarah: Absolutely. We'll follow an agile approach with bi-weekly sprints. Each sprint will have clear deliverables and review sessions with your team.

Emily: That works well with our internal processes. What about the technical architecture?

Sarah: We're proposing a cloud-based solution with high availability and scalability. I'll send over the technical documentation after this call.

John: Perfect. This looks very promising. Let's schedule a follow-up technical session next week.

Sarah: Wonderful. I'll send out calendar invites and the documentation by end of day. Thanks everyone!`,
      category: 'Proposal Call',
      aiAnalysis:
        'Highly productive proposal discussion with clear communication of project scope, timeline, and methodology. Client showed strong interest and requested a follow-up technical session.',
      aiRating: 9.0,
      aiSentiment: 'Positive',
      aiStrengths: [
        'Clear and structured presentation of the proposal',
        'Proactive addressing of client concerns about downtime',
        'Transparent communication about team composition and processes'
      ],
      aiAreasForImprovement: [
        'Could have provided specific cost estimates when discussing scope changes',
        'Consider preparing case studies for similar migrations'
      ],
    },
    {
      clientName: 'TechCorp Industries',
      callDate: new Date('2024-01-14'),
      organizer: 'Michael Ross',
      participants: ['Alice Brown', 'David Lee'],
      transcript: `Michael: Hi team, let's gather the requirements for the new feature set.

Alice: We need to focus on the user authentication module first. It's critical for our launch.

Michael: Agreed. What specific requirements do we have?

Alice: We need multi-factor authentication, single sign-on, and role-based access control.

David: From a technical perspective, we should also consider OAuth integration for third-party logins.

Michael: Good point. Let's document all of these. Any concerns about implementation complexity?

David: The OAuth piece might take extra time, but it's valuable for user experience.

Alice: We can make it a phase 2 feature if needed. Let's prioritize the core authentication first.

Michael: That's pragmatic. I'll update the requirements document and share it for review.`,
      category: 'Requirements Gathering',
      aiAnalysis:
        'Effective requirements gathering session with good technical-product collaboration. Team made pragmatic decisions about architecture trade-offs.',
      aiRating: 8.0,
      aiSentiment: 'Positive',
      aiStrengths: [
        'Comprehensive coverage of authentication requirements',
        'Good balance between product and technical perspectives',
        'Pragmatic prioritization of features'
      ],
      aiAreasForImprovement: [
        'Could have discussed timeline expectations',
        'Should have addressed security compliance requirements'
      ],
    },
    {
      clientName: 'Globex Systems',
      callDate: new Date('2024-01-13'),
      organizer: 'Emma Williams',
      participants: ['Robert Taylor', 'Linda Martinez'],
      transcript: `Emma: Thanks for joining the feedback session. We'd like to hear your thoughts on the recent release.

Robert: Overall, it's been positive. The new dashboard is much more intuitive.

Linda: I agree, but we've had some concerns about the support ticket feature. It's not as responsive as we'd like.

Emma: I appreciate that feedback. Can you elaborate on the responsiveness issue?

Linda: Sometimes it takes 3-4 seconds to load, which feels slow for our support team.

Emma: That's valuable feedback. We'll investigate the performance issue. Any other concerns?

Robert: The reporting features are excellent. Our management team loves the new analytics.

Emma: That's great to hear. We'll prioritize the performance fix and have it in the next patch.

Linda: Thank you. We're looking forward to continued improvements.`,
      category: 'Feedback / Review',
      aiAnalysis:
        'Challenging but constructive feedback session. Client raised valid concerns about support and features. Account manager handled criticism professionally and proposed concrete solutions.',
      aiRating: 6.0,
      aiSentiment: 'Neutral',
      aiStrengths: [
        'Professional handling of critical feedback',
        'Quick acknowledgment of performance issues',
        'Commitment to concrete action items'
      ],
      aiAreasForImprovement: [
        'More proactive communication about known issues would help',
        'Consider providing interim solutions while working on fixes'
      ],
    },
    {
      clientName: 'Initech Solutions',
      callDate: new Date('2024-01-12'),
      organizer: 'James Peterson',
      participants: ['Susan Clark', 'Mark Wilson'],
      transcript: `James: Good afternoon everyone. Let's discuss our transformation priorities and investment scope.

Susan: We're planning a significant digital transformation over the next 18 months.

James: That's ambitious. What are your key priorities?

Susan: We need to modernize our legacy systems, improve customer experience, and enable data-driven decision making.

Mark: From a budget perspective, we're looking at a substantial investment. We need to ensure strong ROI.

James: Absolutely. I recommend we break this into phases with clear success metrics for each phase.

Susan: That makes sense. What would phase 1 look like?

James: Phase 1 would focus on customer experience improvements with high visibility and quick wins. This builds momentum and proves value.

Mark: I like that approach. It demonstrates results to our board and builds confidence.

James: Exactly. I'll prepare a detailed roadmap with investment estimates for each phase.

Susan: Perfect. This has been very helpful. Strong executive buy-in achieved.`,
      category: 'Strategic Planning',
      aiAnalysis:
        'Excellent strategic planning session that established clear alignment on transformation priorities and investment scope. Strong executive buy-in achieved.',
      aiRating: 10.0,
      aiSentiment: 'Positive',
      aiStrengths: [
        'Clear articulation of transformation roadmap',
        'Excellent stakeholder alignment',
        'Phased approach with measurable success metrics',
        'Strong focus on ROI and quick wins'
      ],
      aiAreasForImprovement: [
        'Could have discussed risk mitigation strategies in more detail'
      ],
    },
  ];

  for (const callData of sampleCalls) {
    const category = await prisma.category.findFirst({
      where: { name: callData.category },
    });

    await prisma.call.create({
      data: {
        clientName: callData.clientName,
        callDate: callData.callDate,
        organizer: callData.organizer,
        participants: callData.participants,
        transcript: callData.transcript,
        categoryId: category?.id,
        aiAnalysis: callData.aiAnalysis,
        aiRating: callData.aiRating,
      },
    });
  }
  console.log('✓ Created sample calls');

  console.log('\n✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


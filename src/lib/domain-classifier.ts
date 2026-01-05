import { INTERNAL_DOMAINS, IGNORE_EMAILS } from './config';

export interface ClassificationResult {
  isExternal: boolean;
  internalEmails: string[];
  externalEmails: string[];
  externalDomains: string[];
  ignoredEmails: string[];
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string | null {
  const match = email.toLowerCase().match(/@(.+)$/);
  return match ? match[1] : null;
}

/**
 * Check if an email should be ignored (rooms, resources, bots)
 */
export function shouldIgnoreEmail(email: string): boolean {
  const lowercaseEmail = email.toLowerCase();
  return IGNORE_EMAILS.some(pattern => pattern.test(lowercaseEmail));
}

/**
 * Check if a domain is internal
 */
export function isInternalDomain(domain: string): boolean {
  const lowerDomain = domain.toLowerCase();
  return INTERNAL_DOMAINS.some(internalDomain => 
    lowerDomain === internalDomain.toLowerCase() || 
    lowerDomain.endsWith('.' + internalDomain.toLowerCase())
  );
}

/**
 * Classify a list of email addresses as internal/external
 */
export function classifyEmails(emails: string[]): ClassificationResult {
  const internalEmails: string[] = [];
  const externalEmails: string[] = [];
  const externalDomains: Set<string> = new Set();
  const ignoredEmails: string[] = [];

  for (const email of emails) {
    if (!email || typeof email !== 'string') continue;

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) continue;

    // Check if should ignore
    if (shouldIgnoreEmail(trimmedEmail)) {
      ignoredEmails.push(trimmedEmail);
      continue;
    }

    // Extract domain
    const domain = extractDomain(trimmedEmail);
    if (!domain) {
      // Invalid email format, treat as external for safety
      externalEmails.push(trimmedEmail);
      continue;
    }

    // Check if internal or external
    if (isInternalDomain(domain)) {
      internalEmails.push(trimmedEmail);
    } else {
      externalEmails.push(trimmedEmail);
      externalDomains.add(domain);
    }
  }

  return {
    isExternal: externalEmails.length > 0,
    internalEmails,
    externalEmails,
    externalDomains: Array.from(externalDomains),
    ignoredEmails,
  };
}

/**
 * Classify a meeting based on participants
 */
export function classifyMeeting(
  organizer: string | null,
  attendees: string[]
): {
  isExternal: boolean | null; // null = unknown
  externalDomains: string[];
  classificationSource: string;
  reason?: string;
} {
  const allEmails = [
    ...(organizer ? [organizer] : []),
    ...attendees,
  ].filter(Boolean);

  if (allEmails.length === 0) {
    return {
      isExternal: null,
      externalDomains: [],
      classificationSource: 'unknown',
      reason: 'No participants found',
    };
  }

  const classification = classifyEmails(allEmails);

  return {
    isExternal: classification.isExternal,
    externalDomains: classification.externalDomains,
    classificationSource: 'calendar',
  };
}



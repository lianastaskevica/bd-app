// Configuration for external call classification

export const INTERNAL_DOMAINS = [
  'scandiweb.com',
  'scandipwa.com',
  // Add more internal domains here
];

export const IGNORE_EMAILS = [
  // Meeting room resources
  /^.*\.resource\.calendar@.*$/,
  // No-reply emails
  /^noreply@.*$/,
  /^no-reply@.*$/,
  // Calendar resources
  /^.*@resource\.calendar\.google\.com$/,
  // Common bots
  /^bot@.*$/,
  /^calendar@.*$/,
];

export const CALENDAR_CONFIG = {
  // Time window to match calendar events to Drive files (in minutes)
  TIME_MATCH_WINDOW_MINUTES: 120,
  
  // How far back to sync calendar events (in days)
  SYNC_WINDOW_DAYS: 30,
  
  // Maximum number of calendar events to fetch per request
  MAX_RESULTS_PER_PAGE: 100,
};

export const DRIVE_CONFIG = {
  // Time tolerance for matching transcript files to meetings (in minutes)
  TIME_MATCH_TOLERANCE_MINUTES: 120,
};



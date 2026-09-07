/*
 * Guess a usable first name from a recipient email address so outreach
 * can open with "Hi Thomson," instead of a flat "Hi,".
 *
 * Rules:
 *   - local part is split on . - _ +
 *   - first token is the name; if it is shorter than 2 chars (an
 *     initial, e.g. j.thomson) the second token is used instead
 *   - no separator at all  -> use the whole local part
 *   - the result is capitalised (first letter upper, rest as-is)
 *   - role / team inboxes (hr, admin, careers, info, ...) return null
 *     so the caller falls back to a generic greeting
 */

const ROLE_WORDS = new Set([
  'hr', 'hrteam', 'humanresources', 'people', 'peopleops',
  'talent', 'talentacquisition', 'ta', 'staffing',
  'recruiting', 'recruitment', 'recruiter', 'recruiters', 'hiring',
  'careers', 'career', 'jobs', 'job', 'apply', 'application',
  'applications', 'resume', 'resumes', 'cv',
  'admin', 'administrator', 'administration', 'office',
  'info', 'information', 'contact', 'contactus', 'hello', 'hi',
  'team', 'group', 'dept', 'department',
  'sales', 'marketing', 'support', 'help', 'helpdesk', 'desk',
  'enquiries', 'enquiry', 'inquiries', 'inquiry',
  'noreply', 'donotreply', 'do-not-reply', 'mail', 'mailer',
  'mailbox', 'postmaster', 'webmaster', 'billing', 'accounts',
  'finance', 'legal', 'privacy', 'security', 'notifications'
]);

function deriveFirstName(email) {
  const local = String(email || '')
    .split('@')[0]
    .toLowerCase()
    .trim();

  if (!local) {
    return null;
  }

  const lettersOnly = local.replace(/[^a-z]/g, '');

  if (!lettersOnly || ROLE_WORDS.has(lettersOnly)) {
    return null;
  }

  const tokens = local
    .split(/[.\-_+]+/)
    .map(token => token.replace(/[^a-z]/g, ''))
    .filter(Boolean);

  if (tokens.length === 0 || ROLE_WORDS.has(tokens[0])) {
    return null;
  }

  let candidate;

  if (tokens.length === 1) {
    candidate = tokens[0];
  } else {
    candidate = tokens[0];

    if (candidate.length < 2) {
      candidate = tokens[1] || '';
    }
  }

  if (
    !candidate ||
    candidate.length < 2 ||
    candidate.length > 14 ||
    ROLE_WORDS.has(candidate)
  ) {
    return null;
  }

  return (
    candidate.charAt(0).toUpperCase() +
    candidate.slice(1)
  );
}

/*
 * Replace {{firstName}} / {{name}} tokens and, when no token is present,
 * personalise a leading "Hi," / "Hello," / "Hey," greeting.
 */
function personalizeText(text, email) {
  const name = deriveFirstName(email);
  const display = name || 'there';

  let out = String(text || '');

  out = out.replace(
    /\{\{\s*(first[_ ]?name|name|greeting[_ ]?name)\s*\}\}/gi,
    display
  );

  out = out.replace(
    /^(\s*)(hi|hello|hey)\s*,/i,
    (match, lead, word) => {
      const capitalised =
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase();

      return `${lead}${capitalised} ${display},`;
    }
  );

  return out;
}

module.exports = {
  deriveFirstName,
  personalizeText
};

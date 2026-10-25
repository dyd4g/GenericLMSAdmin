import { connection, queryString } from './read-api';

// What an admin can attach to a user, one kind per tab on the user page. Paths and bodies are the old admin's.
// Every request here is about a user, not a group, so it is allowed only where the whole environment is editable.
const MAX_CANDIDATES = 100;
const userLevel = { service: 'learning', userLevel: true };
const bookService = { service: 'books' };
const analyticsService = { service: 'analytics' };
function uid(id) { const n = Number(id); if (!Number.isInteger(n) || n <= 0) throw new Error('Unknown user.'); return n; }
function aid(id, what = 'item') { const n = Number(id); if (!Number.isInteger(n) || n <= 0) throw new Error(`Unknown ${what}.`); return n; }
function bookId(id) { const s = String(id ?? '').trim(); if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('Unknown book.'); return s; }

export const assetKinds = {
  groups: { title: 'Groups', add: 'Add to groups', noun: 'group', search: 'Search groups the admin can manage' },
  courses: { title: 'Courses', add: 'Enroll in courses', noun: 'course', search: 'Search courses' },
  adminCourses: { title: 'Administered courses', add: 'Make administrator of courses', noun: 'course', search: 'Search courses' },
  books: { title: 'Books', add: 'Assign books', noun: 'book', search: 'Search books' },
  certifications: { title: 'Certifications', add: 'Enroll in certifications', noun: 'certification', search: 'Search certifications' },
  referrals: { title: 'Referrals', add: 'Add to referrals', noun: 'referral', search: 'Search referrals' },
};

// Candidates the admin can still add (reads). The group list is the groups this admin manages.
export function candidatesUrl(kind, userId, search = '') {
  const id = uid(userId);
  const list = { search, page: 0, resultsPerPage: MAX_CANDIDATES };
  const learning = `${connection.learning}/api/Users/${id}`;
  switch (kind) {
    case 'groups': return `${connection.learning}/api/myAdminGroups?${queryString({ search, isAdmin: true, page: 0, resultsPerPage: MAX_CANDIDATES })}`;
    case 'courses': return `${learning}/traineeCourseCandidates?${queryString(list)}`;
    case 'adminCourses': return `${learning}/adminCourseCandidates?${queryString(list)}`;
    case 'certifications': return `${learning}/traineeCertificationCandidates?${queryString(list)}`;
    case 'books': return `${connection.books}/Users/${id}/bookCandidates?${queryString(list)}`;
    case 'referrals': return `${connection.analytics}/partners/byReps/${id}/candidates?${queryString(list)}`;
    default: throw new Error(`Unknown kind: ${kind}`);
  }
}
export const candidateRows = data => (Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);

export function addAssetRequest(kind, userId, assetId) {
  const id = uid(userId);
  switch (kind) {
    case 'groups': return { path: `/api/Users/${id}/groups`, method: 'POST', body: aid(assetId, 'group'), options: userLevel };
    case 'courses': return { path: `/api/Users/${id}/traineeCourses`, method: 'POST', body: aid(assetId, 'course'), options: userLevel };
    case 'adminCourses': return { path: `/api/Users/${id}/adminCourses`, method: 'POST', body: aid(assetId, 'course'), options: userLevel };
    case 'certifications': return { path: `/api/Users/${id}/traineeCertifications`, method: 'POST', body: aid(assetId, 'certification'), options: userLevel };
    case 'books': return { path: `/Users/${id}/books/${bookId(assetId)}`, method: 'POST', body: undefined, options: bookService };
    case 'referrals': return { path: `/partners/${aid(assetId, 'referral')}/reps`, method: 'POST', body: { userId: id }, options: analyticsService };
    default: throw new Error(`Unknown kind: ${kind}`);
  }
}
export function removeAssetRequest(kind, userId, assetId) {
  const id = uid(userId);
  switch (kind) {
    case 'groups': return { path: `/api/Users/${id}/groups/${aid(assetId, 'group')}`, method: 'DELETE', body: undefined, options: userLevel };
    case 'courses': return { path: `/api/Users/${id}/traineeCourses/${aid(assetId, 'course')}`, method: 'DELETE', body: undefined, options: userLevel };
    case 'adminCourses': return { path: `/api/Users/${id}/adminCourses/${aid(assetId, 'course')}`, method: 'DELETE', body: undefined, options: userLevel };
    case 'certifications': return { path: `/api/Users/${id}/traineeCertifications/${aid(assetId, 'certification')}`, method: 'DELETE', body: undefined, options: userLevel };
    case 'books': return { path: `/Users/${id}/books/${bookId(assetId)}`, method: 'DELETE', body: undefined, options: bookService };
    case 'referrals': return { path: `/partners/${aid(assetId, 'referral')}/reps/${id}`, method: 'DELETE', body: undefined, options: analyticsService };
    default: throw new Error(`Unknown kind: ${kind}`);
  }
}

// Group role ("permission"): Admin or Member of that group.
export function groupRoleRequest(groupId, userId, role) {
  if (!['Admin', 'Member'].includes(role)) throw new Error('A group role is Admin or Member.');
  return { path: `/api/groups/${aid(groupId, 'group')}/members/${uid(userId)}/role`, method: 'PUT', body: role, options: userLevel };
}

// Coach of a coach-assisted course, for one trainee.
export const coachesUrl = courseId => `${connection.learning}/api/courses/${aid(courseId, 'course')}/coaches`;
export function assignCoachRequest(courseId, userId, coachId) {
  return { path: `/api/courses/${aid(courseId, 'course')}/trainees/${uid(userId)}/coach`, method: 'POST', body: aid(coachId, 'coach'), options: userLevel };
}
export function unassignCoachRequest(courseId, userId, coachId) {
  return { path: `/api/courses/${aid(courseId, 'course')}/trainees/${uid(userId)}/coach/${aid(coachId, 'coach')}`, method: 'DELETE', body: undefined, options: userLevel };
}

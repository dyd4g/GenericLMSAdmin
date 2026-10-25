// Existing service endpoints. No credentials are stored in this configuration.
// NEXT_PUBLIC_LMS_ENV selects the environment when the dev server starts; the default is RSTI.
const environments = {
  rsti: {
    name: 'RSTI',
    learning: 'https://api.rsti-dev.dyd.solutions/learning',
    identity: 'https://api.rsti-dev.dyd.solutions/identity',
    books: 'https://api.rsti-dev.dyd.solutions/books',
    alerts: 'https://api.rsti-dev.dyd.solutions/alerts',
    analytics: 'https://api.rsti-dev.dyd.solutions/analytics',
    licenses: 'https://api.rsti-dev.dyd.solutions/licenses',
    referralLink: 'https://rsti-dev.dyd.solutions/go',
    clientId: '1',
    existingAdmin: 'http://localhost:3001',
    login: 'http://localhost:3002/login',
    readOnly: false,
    languages: ['en'],
    showCategories: true,
  },
  // Galilee test environment (admin.galilee-test.dyd.solutions): fully editable, like RSTI dev.
  'galilee-test': {
    name: 'Galilee Test',
    learning: 'https://api.learning-dev.dyd.solutions',
    identity: 'https://api.identity-dev.dyd.solutions',
    books: 'https://api.books-dev.dyd.solutions',
    alerts: 'https://api.alerts-dev.dyd.solutions',
    analytics: 'https://api.analytics-dev.dyd.solutions',
    licenses: 'https://api.licenses-dev.dyd.solutions',
    referralLink: 'https://galilee-test.dyd.solutions/go',
    clientId: '1',
    existingAdmin: 'https://admin.galilee-test.dyd.solutions',
    login: 'http://127.0.0.1:3012/login',
    readOnly: false,
    languages: ['en', 'es', 'pt', 'zh-Hans', 'zh-Hant'],
    showCategories: true,
  },
  // Production data: writes are allowed only for courses in one group (RSTI, ID 1003); every other group is read-only.
  'galilee-prod': {
    name: 'Galilee Prod',
    learning: 'https://api.learning.dyd.solutions',
    identity: 'https://api.identity.dyd.solutions',
    books: 'https://api.books.dyd.solutions',
    alerts: 'https://api.alerts.dyd.solutions',
    analytics: 'https://api.analytics.dyd.solutions',
    licenses: 'https://api.licenses.dyd.solutions',
    referralLink: 'https://www.galileeone.com/go',
    clientId: '1',
    existingAdmin: '',
    login: 'http://127.0.0.1:3012/login',
    readOnly: false,
    writableGroupId: 1003,
    writableGroupName: 'RSTI',
    languages: ['en', 'es', 'pt', 'zh-Hans', 'zh-Hant'],
    showCategories: false,
  },
};
export const connection = Object.freeze(environments[process.env.NEXT_PUBLIC_LMS_ENV] || environments.rsti);
// The group of the course currently open for editing. Set by the course view and cleared when it closes.
export const writeScope = { groupId: null };
// Fails closed: on a scoped environment a write needs a known group that matches the allowed one.
export function canWrite(groupId = writeScope.groupId) {
  if (connection.readOnly) return false;
  if (connection.writableGroupId == null) return true;
  return groupId != null && Number(groupId) === connection.writableGroupId;
}
// Users are global (not tied to a group), so they can only be changed where the whole environment is editable.
export function canWriteUsers() {
  return !connection.readOnly && connection.writableGroupId == null;
}
export function writeBlockedMessage(service = 'learning') {
  if (service === 'identity') return `User changes are not available in ${connection.name}. Nothing was sent.`;
  if (service === 'alerts') return `Alert changes are not available in ${connection.name}. Nothing was sent.`;
  if (service === 'books') return `Book changes are not available in ${connection.name}. Nothing was sent.`;
  if (service === 'analytics') return `Referral changes are not available in ${connection.name}. Nothing was sent.`;
  return connection.writableGroupId == null
    ? `${connection.name} is read-only in this app. Nothing was sent.`
    : `${connection.name} changes are limited to the ${connection.writableGroupName} group. Nothing was sent.`;
}
export const sessionKey = 'learning-admin-session:' + connection.identity;
export function saveAdminSession(accessToken,expiresIn){
 sessionStorage.setItem(sessionKey,JSON.stringify({accessToken,expiresAt:Date.now()+expiresIn*1000}));
}
export function clearAdminSession(){sessionStorage.setItem(sessionKey,JSON.stringify({signedOut:true}));}
export function readAccessToken() {
  try{const stored=sessionStorage.getItem(sessionKey);if(stored){const session=JSON.parse(stored);return !session.signedOut&&session.expiresAt>Date.now()?session.accessToken||'':'';}}catch{return '';}

  const entry = document.cookie.split('; ').find(value => value.startsWith('dydBearer='));
  return entry ? decodeURIComponent(entry.slice('dydBearer='.length)) : '';
}
export class SessionError extends Error {}
export async function readApi(url, signal) {
  const token = readAccessToken();
  if (!token) throw new SessionError('Sign in to view your administration workspace.');
  const response = await fetch(url, {
    method: 'GET', credentials: 'omit', signal,
    headers: { 'Client-Id': connection.clientId, authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw new SessionError('Your session has expired. Sign in again.');
  if (response.status === 403) throw new Error('Your account does not have permission to view this information.');
  if (!response.ok) throw new Error(`Unable to load information (HTTP ${response.status}). Please retry.`);
  return response.json();
}
export function groupsUrl(page, resultsPerPage, search) {
  // Same parameter order and encoding as the existing qs.stringify call for scalar values.
  return `${connection.learning}/api/myAdminGroups?page=${page}&resultsPerPage=${resultsPerPage}&search=${encodeURIComponent(search)}&isAdmin=true`;
}
export function loginUrl() {
  return '/login';
}
export function queryString(values) {
  const encode = value => encodeURIComponent(String(value)).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return Object.entries(values).flatMap(([key,value]) => value === undefined ? [] : Array.isArray(value) ? value.map((v,i)=>`${encode(`${key}[${i}]`)}=${encode(v)}`) : [`${encode(key)}=${encode(value)}`]).join('&');
}
export function courseListUrl(groupId, {page, resultsPerPage, search, status, type}) {
  const base = groupId ? `${connection.learning}/api/groups/${encodeURIComponent(groupId)}/courses` : `${connection.learning}/api/myAdminCourses`;
  return `${base}?${groupId ? queryString({search,categoryId:undefined,language:undefined,page,resultsPerPage,type:type?[type]:[],status:status?[status]:[]}) : queryString({page,resultsPerPage,search})}`;
}

// Users live in the identity service. Same parameter order and filter encoding as the old admin
// (qs.stringify for search, sortBy, page, resultsPerPage; then each filter as key=value).
export function usersUrl({ search = '', sortBy = 'creationDate', page = 0, resultsPerPage = 10, filters = [] } = {}) {
  const filterString = filters.length ? `&${filters.map(f => encodeURIComponent(f).replace('%3D', '=')).join('&')}` : '';
  return `${connection.identity}/api/users?${queryString({ search, sortBy, page, resultsPerPage })}${filterString}`;
}
export function userUrl(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Unknown user.');
  return `${connection.identity}/api/users/${id}`;
}
// Read-only lists shown on the user detail page, with the same paths as the old admin.
export function userAssetUrl(kind, userId, resultsPerPage = 50) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Unknown user.');
  const learning = `${connection.learning}/api/Users/${id}`;
  switch (kind) {
    case 'groups': return `${learning}/groups`;
    case 'courses': return `${learning}/traineeCourses?${queryString({ resultsPerPage })}`;
    case 'coaching': return `${learning}/coachCourses`;
    case 'adminCourses': return `${learning}/adminCourses?${queryString({ resultsPerPage })}`;
    case 'certifications': return `${learning}/traineeCertifications?${queryString({ resultsPerPage })}`;
    case 'books': return `${connection.books}/Users/${id}/books`;
    case 'referrals': return `${connection.analytics}/partners/byReps/${id}`;
    default: throw new Error(`Unknown user list: ${kind}`);
  }
}

// System alerts: one message per language, shown to everyone in the environment.
export const alertsUrl = () => `${connection.alerts}/alerts`;

// Referrals are "partners" in the analytics service. Same query as the old admin (search, page, resultsPerPage).
export function referralsUrl({ search = '', page = 0, resultsPerPage = 10 } = {}) {
  return `${connection.analytics}/partners?${queryString({ search, page, resultsPerPage })}`;
}
export const referralCategoriesUrl = () => `${connection.analytics}/partners/categories`;
export function referralUrl(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error('Unknown referral.');
  return `${connection.analytics}/partners/${n}`;
}
export const referralShareLink = code => (code ? `${connection.referralLink}/${code}` : '');

// ---- Books (books service, per group) and Certifications (learning service). Same paths and query as the old admin. ----
function positive(id, what) { const n = Number(id); if (!Number.isInteger(n) || n <= 0) throw new Error(`Unknown ${what}.`); return n; }
function bookKey(id) { const s = String(id ?? '').trim(); if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('Unknown book.'); return s; }
export function groupBooksUrl(groupId, { search = '', page = 0, resultsPerPage = 5, languages = [], statuses = [] } = {}) {
  return `${connection.books}/Groups/${positive(groupId, 'group')}/Books?${queryString({ search, page, resultsPerPage, language: languages.length ? languages : undefined, publishStatus: statuses })}`;
}
const bookBase = (groupId, bookId) => `${connection.books}/Groups/${positive(groupId, 'group')}/Books/${bookKey(bookId)}`;
export const bookUrl = (groupId, bookId) => bookBase(groupId, bookId);
export const bookReadersUrl = (groupId, bookId) => `${bookBase(groupId, bookId)}/readers`;
export function bookKeysUrl(groupId, bookId, { search = '', page = 0, resultsPerPage = 10 } = {}) {
  return `${connection.licenses}/groups/${positive(groupId, 'group')}/books/${bookKey(bookId)}/licenses?${queryString({ search, resultsPerPage, page })}`;
}
export function groupCertificationsUrl(groupId, { search = '', page = 0, resultsPerPage = 10 } = {}) {
  return `${connection.learning}/api/groups/${positive(groupId, 'group')}/certifications?${queryString({ search, page, resultsPerPage })}`;
}
export const certificationUrl = id => `${connection.learning}/api/certifications/${positive(id, 'certification')}`;
export const certificationTraineesUrl = (id, page = 0, resultsPerPage = 10) => `${certificationUrl(id)}/trainees?${queryString({ page, resultsPerPage })}`;
export function certificationCourseCandidatesUrl(id, { search = '', page = 0, resultsPerPage = 10 } = {}) {
  return `${certificationUrl(id)}/courseCandidates?${queryString({ search, page, resultsPerPage })}`;
}

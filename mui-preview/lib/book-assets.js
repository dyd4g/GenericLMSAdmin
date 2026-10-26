import { SessionError, canWriteUsers, connection, readAccessToken, writeBlockedMessage } from './read-api';
import { booksService } from './write-api';

// Cover, book file, revision and store listings of a book. Paths, bodies and rules are the existing admin's (LMSAdmin domain/services/as-admin.ts,
// BookEditionPage and BookManagementPage). Books are global to the environment, so every change is allowed only where the whole
// environment is editable (not on Galilee Prod) and goes to the books service.
const positive = (id, what) => { const n = Number(id); if (!Number.isInteger(n) || n <= 0) throw new Error(`Unknown ${what}.`); return n; };
const bookId = id => { const s = String(id ?? '').trim(); if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('Unknown book.'); return s; };
const base = (groupId, id) => `/Groups/${positive(groupId, 'group')}/Books/${bookId(id)}`;

export const revisionStates = { revised: 'Revised', notRevised: 'NotRevised' };
export const revisionLabels = { NotRevised: 'Not revised', RevisionInProgress: 'Revision in progress', ChangesRequested: 'Changes requested', Revised: 'Revised' };
export const revisionLabel = status => revisionLabels[status] || status || '—';
export const MAX_STORE_NAME = 100, MAX_PRODUCT_URL = 2000;

// What can be changed depends on the book: the file only while it is a draft, the cover until it is archived, and revision and store
// listings only on a published book and only for a system administrator, as in the old admin.
export const canChangeCover = book => Boolean(book) && book.publishStatus !== 'Archived';
export const canChangeFile = book => Boolean(book) && book.publishStatus === 'Draft';
export const canManagePublished = (book, isSystemAdmin) => Boolean(book) && book.publishStatus === 'Published' && Boolean(isSystemAdmin);

export function coverError(file) {
  if (!file) return 'Choose an image.';
  if (!String(file.type || '').startsWith('image/')) return 'Choose an image file.';
  if (!file.size) return 'That file is empty.';
  return null;
}
export function bookFileError(file) {
  if (!file) return 'Choose an EPUB file.';
  if (!/\.epub$/i.test(String(file.name || ''))) return 'Choose an EPUB file (.epub).';
  if (!file.size) return 'That file is empty.';
  return null;
}
export function storeListingError({ storeName, productUrl } = {}) {
  const name = String(storeName ?? '').trim(), url = String(productUrl ?? '').trim();
  if (!name) return 'Enter the store name.';
  if (name.length > MAX_STORE_NAME) return `The store name can be up to ${MAX_STORE_NAME} characters.`;
  if (!url) return 'Enter the link to the book in that store.';
  if (url.length > MAX_PRODUCT_URL) return `The link can be up to ${MAX_PRODUCT_URL} characters.`;
  let parsed;
  try { parsed = new URL(url); } catch { return 'Enter a full link that starts with http:// or https://.'; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return 'Enter a full link that starts with http:// or https://.';
  return null;
}

// Requests for writeApi: [{ path, method, body, options }].
export const removeCoverRequest = (groupId, id) => ({ path: `${base(groupId, id)}/cover`, method: 'DELETE', body: undefined, options: booksService });
export const removeFileRequest = (groupId, id) => ({ path: `${base(groupId, id)}/file`, method: 'DELETE', body: undefined, options: booksService });
export function revisionRequest(groupId, id, revised) {
  return { path: `${base(groupId, id)}/revisionStatus`, method: 'PUT', body: revised ? revisionStates.revised : revisionStates.notRevised, options: booksService };
}
export function addStoreListingRequest(groupId, id, values) {
  const error = storeListingError(values);
  if (error) throw new Error(error);
  return { path: `${base(groupId, id)}/externalProductLocations`, method: 'POST', body: { storeName: String(values.storeName).trim(), productUrl: String(values.productUrl).trim() }, options: booksService };
}
export const removeStoreListingRequest = (groupId, id, locationId) => ({ path: `${base(groupId, id)}/externalProductLocations/${positive(locationId, 'store listing')}`, method: 'DELETE', body: undefined, options: booksService });

// Cover and file go up as a form with one part named "file", like the old admin. The browser sets the form's content type.
async function upload(path, file) {
  if (!canWriteUsers()) throw new Error(writeBlockedMessage('books'));
  const token = readAccessToken();
  if (!token) throw new SessionError('Sign in again before saving.');
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${connection.books}${path}`, { method: 'PUT', credentials: 'omit', headers: { 'Client-Id': connection.clientId, authorization: `Bearer ${token}` }, body: form });
  if (!response.ok) {
    let message;
    try { const data = await response.json(); message = data.message || data.title || data.error_description; } catch { /* no body */ }
    throw new Error(message || `The upload failed (HTTP ${response.status}).`);
  }
}
export async function uploadCover(groupId, id, file) { const error = coverError(file); if (error) throw new Error(error); return upload(`${base(groupId, id)}/cover`, file); }
export async function uploadBookFile(groupId, id, file) { const error = bookFileError(file); if (error) throw new Error(error); return upload(`${base(groupId, id)}/file`, file); }

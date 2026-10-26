import { connection, queryString } from './read-api';

// License keys of a course (trainee keys and coach keys) and of a book. Paths, query and bodies are the existing admin's
// (LMSAdmin domain/services/as-admin.ts and components/Key). Keys let people join a course or open a book, so every change here is
// allowed only where the whole environment is editable (not on Galilee Prod) and goes to the licenses service.
const keyService = { service: 'licenses' };
const positive = (id, what) => { const n = Number(id); if (!Number.isInteger(n) || n <= 0) throw new Error(`Unknown ${what}.`); return n; };
const bookId = id => { const s = String(id ?? '').trim(); if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('Unknown book.'); return s; };

export const keyKinds = {
  trainee: { label: 'Course keys', noun: 'participant' },
  coach: { label: 'Coach keys', noun: 'coach' },
  book: { label: 'Book keys', noun: 'reader' },
};
export const MAX_KEYS_PER_BATCH = 100, MAX_ACTIVATIONS = 1000;
export const keySorts = [['', 'Default order'], ['CreationDate', 'Generated at'], ['LastActivationDate', 'Last activation at']];
export const keyPageSizes = [10, 25, 50];
const sortValues = ['CreationDate', 'LastActivationDate'];

function base(kind, ownerId, groupId) {
  const group = `${connection.licenses}/groups/${positive(groupId, 'group')}`;
  if (kind === 'book') return `${group}/books/${bookId(ownerId)}/licenses`;
  if (kind === 'trainee') return `${group}/courses/${positive(ownerId, 'course')}/traineeLicenses`;
  if (kind === 'coach') return `${group}/courses/${positive(ownerId, 'course')}/coachLicenses`;
  throw new Error('Unknown kind of key.');
}
const flag = value => (value === true || value === false ? value : undefined);

// GET. Same keys in the same order as the old admin's qs.stringify; filters left out when not chosen.
export function keysUrl(kind, ownerId, groupId, { search = '', resultsPerPage = 10, page = 0, isActive, multipleActivations, activationsRemaining, sortBy } = {}) {
  return `${base(kind, ownerId, groupId)}?${queryString({
    search: String(search).slice(0, 100),
    resultsPerPage: keyPageSizes.includes(Number(resultsPerPage)) ? Number(resultsPerPage) : 10,
    page: Math.max(0, Math.floor(Number(page) || 0)),
    isActive: flag(isActive), multipleActivations: flag(multipleActivations), activationsRemaining: flag(activationsRemaining),
    sortBy: sortValues.includes(sortBy) ? sortBy : undefined,
  })}`;
}

// How many keys, and how many times each may be activated. A key that is not marked "multiple activation" can be activated once.
export function generatePayload({ count, multiple = false, maxActivationCount }) {
  const n = Number(count), max = multiple ? Number(maxActivationCount) : 1;
  if (!Number.isInteger(n) || n < 1 || n > MAX_KEYS_PER_BATCH) throw new Error(`Enter a whole number of keys from 1 to ${MAX_KEYS_PER_BATCH}.`);
  if (!Number.isInteger(max) || max < 1 || max > MAX_ACTIVATIONS) throw new Error(`The activation limit must be a whole number from 1 to ${MAX_ACTIVATIONS}.`);
  return { count: n, maxActivationCount: max };
}
export const generateKeysRequest = (kind, ownerId, groupId, values) => ({ path: `${base(kind, ownerId, groupId).replace(connection.licenses, '')}/generate`, method: 'POST', body: generatePayload(values), options: keyService });
// The update replaces both fields, so the key's own activation limit is sent back with the new status (otherwise the service resets it to 0).
export function deactivateKeyRequest(kind, ownerId, groupId, key) {
  if (!key || !Number.isInteger(Number(key.id)) || Number(key.id) <= 0) throw new Error('Unknown key.');
  if (!Number.isInteger(Number(key.maxActivationCount)) || Number(key.maxActivationCount) < 0) throw new Error('This key has no activation limit to keep.');
  return { path: `${base(kind, ownerId, groupId).replace(connection.licenses, '')}/${Number(key.id)}`, method: 'PUT', body: { maxActivationCount: Number(key.maxActivationCount), isActive: false }, options: keyService };
}
// Coach allocation exists for course keys only.
export const assignKeyCoachRequest = (ownerId, groupId, keyId, coachId) => ({ path: `${base('trainee', ownerId, groupId).replace(connection.licenses, '')}/${positive(keyId, 'key')}/coaches`, method: 'POST', body: positive(coachId, 'coach'), options: keyService });
export const unassignKeyCoachRequest = (ownerId, groupId, keyId, coachId) => ({ path: `${base('trainee', ownerId, groupId).replace(connection.licenses, '')}/${positive(keyId, 'key')}/coaches/${positive(coachId, 'coach')}`, method: 'DELETE', body: undefined, options: keyService });

// 16 characters are shown in groups of four, as the old admin does.
export const displayKey = key => (key && String(key).length === 16 ? String(key).match(/.{1,4}/g).join('-') : String(key ?? ''));
export const keyStatus = key => (key?.isActive ? 'Active' : 'Inactive');
export const activationText = key => `${key?.activationCount ?? 0}/${key?.maxActivationCount ?? 0}`;

// Spreadsheet file of the chosen keys. Cells that a spreadsheet would read as a formula get a leading quote.
const safeCell = value => { let text = String(value ?? ''); if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; };
export function keysCsv(keys) {
  const head = ['Key', 'Activations', 'Maximum activations', 'Coach', 'Status', 'Generated at', 'Last activation at'];
  const rows = keys.map(key => [displayKey(key.key), key.activationCount ?? 0, key.maxActivationCount ?? 0, (key.coaches || []).map(coach => coach.name).join(', '), keyStatus(key), key.creationDate ?? '', key.lastActivationDate ?? '']);
  return [head, ...rows].map(row => row.map(safeCell).join(',')).join('\r\n');
}

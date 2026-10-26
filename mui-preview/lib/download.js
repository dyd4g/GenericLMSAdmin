import { connection, readAccessToken, SessionError } from './read-api';

// Files the admin saves from the API (certificate and transcript PDFs, form responses CSV): read with the signed-in session, then handed
// to the browser as a download. Nothing is stored by the app.
export const safeFileName = (name, fallback = 'download') => String(name ?? '').replace(/[^\p{L}\p{N} _.-]+/gu, '').trim().slice(0, 100) || fallback;
export const todayStamp = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export async function readFile(url, { fetcher = fetch, signal } = {}) {
  const token = readAccessToken();
  if (!token) throw new SessionError('Sign in to download this file.');
  const response = await fetcher(url, { method: 'GET', credentials: 'omit', signal, headers: { 'Client-Id': connection.clientId, authorization: `Bearer ${token}` } });
  if (response.status === 401) throw new SessionError('Your session has expired. Sign in again.');
  if (response.status === 403) throw new Error('Your account does not have permission to download this file.');
  if (response.status === 404) throw new Error('This file is not available. For a certificate, the participant may not have completed the course.');
  if (!response.ok) throw new Error(`The file could not be downloaded (HTTP ${response.status}). Please retry.`);
  return response.blob();
}

export async function downloadFile(url, fileName, options) {
  const blob = await readFile(url, options);
  const link = document.createElement('a');
  const href = URL.createObjectURL(blob);
  link.href = href; link.download = fileName; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

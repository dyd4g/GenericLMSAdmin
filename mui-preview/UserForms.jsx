import React, { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { connection, readApi } from './lib/read-api';
import { writeApi, identity, userFormError, createUserRequest, updateUserRequest, passwordRequest, confirmEmailRequest, assignRoleRequest, removeRoleRequest, deleteUserRequest } from './lib/write-api';
import { APP_CountryCode_List, APP_Timezone_List, GENDERS, userLanguageLabels } from './lib/user-lists';

const blank = () => ({ fullName: '', preferredName: '', email: '', phoneNumber: '', gender: '', country: '', language: connection.languages[0], timeZone: '', emailConfirmed: false, phoneNumberConfirmed: false });
const fromUser = u => ({ fullName: u.fullName || '', preferredName: u.preferredName || '', email: u.email || '', phoneNumber: u.phoneNumber || '', gender: u.gender || '', country: u.country || '', language: u.language || connection.languages[0], timeZone: u.timeZone || '', emailConfirmed: !!u.emailConfirmed, phoneNumberConfirmed: !!u.phoneNumberConfirmed });

// Create (user omitted) or edit a user. The server decides the password flow; no password is typed here.
export function UserFormDialog({ open, user, onClose, onSaved }) {
  const editing = !!user;
  const [values, setValues] = useState(blank), [busy, setBusy] = useState(false), [error, setError] = useState(null), [mail, setMail] = useState(null);
  const set = (field, value) => setValues(v => ({ ...v, [field]: value }));
  useEffect(() => { if (open) { setValues(user ? fromUser(user) : blank()); setError(null); setMail(null); setBusy(false); } }, [open, user?.id]);
  const problem = userFormError(values);
  async function save() {
    setBusy(true); setError(null);
    try {
      const request = editing ? updateUserRequest(user, values) : createUserRequest(values);
      const result = await writeApi(request.path, request.method, request.body, identity);
      const id = editing ? user.id : Number(typeof result === 'object' ? result?.id : result);
      if (!Number.isInteger(id) || id <= 0) throw new Error('The user was created but no ID was returned. Reload the list.');
      onSaved(id);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function resend() {
    setMail('sending');
    try { const r = confirmEmailRequest(user.id); await writeApi(r.path, r.method, r.body, identity); setMail('sent'); } catch (e) { setMail(/HTTP 404/.test(e.message) ? `${connection.name} does not offer this action (HTTP 404), so no email was sent.` : e.message); }
  }
  // time zones the server did not list (or an empty value) must still be selectable
  const zones = values.timeZone && !APP_Timezone_List.includes(values.timeZone) ? [values.timeZone, ...APP_Timezone_List] : APP_Timezone_List;
  const languages = values.language && !connection.languages.includes(values.language) ? [values.language, ...connection.languages] : connection.languages;
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="sm">
    <DialogTitle>{editing ? `Edit ${user.fullName || user.email}` : 'New user'}</DialogTitle>
    <DialogContent>
      <Stack spacing={2.5} sx={{ pt: 1 }} component="fieldset" disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        {!editing && <Alert severity="info">This creates a real account in {connection.name}. Passwords are not set here; use Change password on the user page afterwards.</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField required autoFocus label="Full name" value={values.fullName} onChange={e => set('fullName', e.target.value)} helperText={`${values.fullName.length}/80`} />
        <TextField label="Preferred name" value={values.preferredName} onChange={e => set('preferredName', e.target.value)} />
        <TextField required type="email" label="Email" value={values.email} onChange={e => set('email', e.target.value)} />
        <TextField required label="Phone number" value={values.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} helperText="Up to 15 characters." />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select fullWidth label="Gender" value={values.gender} onChange={e => set('gender', e.target.value)}><MenuItem value="">Not set</MenuItem>{GENDERS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
          <TextField select fullWidth label="Language" value={values.language} onChange={e => set('language', e.target.value)}>{languages.map(v => <MenuItem key={v} value={v}>{userLanguageLabels[v] || v}</MenuItem>)}</TextField>
        </Stack>
        <Autocomplete options={Object.keys(APP_CountryCode_List)} getOptionLabel={code => APP_CountryCode_List[code] || code} value={values.country || null} onChange={(_, v) => set('country', v || '')} renderInput={params => <TextField {...params} label="Country" />} />
        <Autocomplete options={zones} value={values.timeZone || null} onChange={(_, v) => set('timeZone', v || '')} renderInput={params => <TextField {...params} label="Time zone" />} />
        <Stack>
          <FormControlLabel control={<Switch checked={values.emailConfirmed} onChange={(_, v) => set('emailConfirmed', v)} />} label="Email confirmed" />
          <FormControlLabel control={<Switch checked={values.phoneNumberConfirmed} onChange={(_, v) => set('phoneNumberConfirmed', v)} />} label="Phone confirmed" />
        </Stack>
        {editing && !user.emailConfirmed && <Box>
          <Button variant="outlined" onClick={resend} disabled={mail === 'sending'}>{mail === 'sending' ? 'Sending…' : 'Resend confirmation email'}</Button>
          {mail === 'sent' && <Alert severity="success" sx={{ mt: 1 }}>A confirmation email was sent to {user.email}.</Alert>}
          {mail && !['sending', 'sent'].includes(mail) && <Alert severity="error" sx={{ mt: 1 }}>{mail}</Alert>}
        </Box>}
      </Stack>
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy || !!problem} onClick={save}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create user'}</Button></DialogActions>
  </Dialog>;
}

// The new password is typed by the person using the app and goes only to the password request; it is never stored or logged.
export function PasswordDialog({ user, onClose, onDone }) {
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  useEffect(() => { setPassword(''); setConfirm(''); setError(null); setBusy(false); }, [user?.id]);
  async function save() {
    setBusy(true); setError(null);
    try { const r = passwordRequest(user.id, password, confirm); await writeApi(r.path, r.method, r.body, identity); setPassword(''); setConfirm(''); onDone(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Dialog open={!!user} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="xs">
    <DialogTitle>Change password</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        <Typography variant="body2">Set a new password for <strong>{user?.fullName || user?.email}</strong>.</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField autoFocus type="password" autoComplete="new-password" label="New password" value={password} onChange={e => setPassword(e.target.value)} helperText="8 to 20 characters with an upper-case letter, a lower-case letter, a number and a symbol." disabled={busy} />
        <TextField type="password" autoComplete="new-password" label="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} />
      </Stack>
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy || !password} onClick={save}>{busy ? 'Saving…' : 'Change password'}</Button></DialogActions>
  </Dialog>;
}

// "Delete" removes the account and its analytics. "Anonymize" removes the person but keeps the analytics.
export function DeleteUserDialog({ user, anonymize, isSelf, onClose, onDone }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(null);
  useEffect(() => { setError(null); setBusy(false); }, [user?.id, anonymize]);
  async function remove() {
    setBusy(true); setError(null);
    try { const r = deleteUserRequest(user.id, { keepAnalytics: !!anonymize }); await writeApi(r.path, r.method, undefined, identity); onDone(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const verb = anonymize ? 'Anonymize' : 'Delete';
  return <Dialog open={!!user} onClose={() => { if (!busy) onClose(); }}>
    <DialogTitle>{verb} user?</DialogTitle>
    <DialogContent>
      <Typography fontWeight={600}>{user?.fullName || user?.email}</Typography>
      <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
      <DialogContentText sx={{ mt: 1.5 }}>{anonymize ? 'This removes the personal details of this user but keeps their learning analytics.' : 'This permanently deletes this user and their analytics.'} It cannot be undone here.</DialogContentText>
      {isSelf && <Alert severity="warning" sx={{ mt: 2 }}>This is the account you are signed in with, so it cannot be removed from here.</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button color="error" variant="contained" disabled={busy || isSelf} onClick={remove}>{busy ? `${verb.replace(/e$/, '')}ing…` : verb}</Button></DialogActions>
  </Dialog>;
}

// Roles: pick one the user does not have and add it, or remove a role. Your own Admin role cannot be removed here.
export function RolesPanel({ user, isSelf, onChanged }) {
  const [roles, setRoles] = useState(null), [pick, setPick] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  useEffect(() => { const abort = new AbortController(); readApi(`${connection.identity}/api/roles`, abort.signal).then(setRoles).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => abort.abort(); }, []);
  const mine = user.roles || [], mineIds = new Set(mine.map(r => r.id)), available = (roles || []).filter(r => !mineIds.has(r.id));
  async function change(request) {
    setBusy(true); setError(null);
    try { await writeApi(request.path, request.method, request.body, identity); setPick(''); await onChanged(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Paper variant="outlined" sx={{ p: 3 }}>
    <Typography variant="subtitle2" gutterBottom>Roles</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      {mine.length ? mine.map(r => { const locked = isSelf && r.name === 'Admin'; return <Chip key={r.id} label={r.name} color={r.name === 'Admin' ? 'primary' : 'default'} variant="outlined" disabled={busy} onDelete={locked ? undefined : () => change(removeRoleRequest(user.id, r.id))} title={locked ? 'You cannot remove your own Admin role here.' : `Remove ${r.name}`} />; }) : <Typography variant="body2" color="text.secondary">This user has no roles.</Typography>}
    </Stack>
    {roles === null && !error ? <CircularProgress size={20} /> : <Stack direction="row" spacing={1.5} alignItems="center">
      <TextField select size="small" label="Add a role" value={pick} onChange={e => setPick(e.target.value)} sx={{ minWidth: 220 }} disabled={busy || !available.length}>{available.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}</TextField>
      <Button variant="contained" disabled={busy || !pick} onClick={() => change(assignRoleRequest(user.id, pick))}>Add role</Button>
      {roles && !available.length && <Typography variant="caption" color="text.secondary">All roles are already assigned.</Typography>}
    </Stack>}
  </Paper>;
}

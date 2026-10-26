import React, { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { writeApi } from './lib/write-api';
import { createGroupRequest, deleteGroupRequest } from './lib/members';

const send = request => writeApi(request.path, request.method, request.body, request.options);

// Create a group (the existing admin's "Create organization"): name, description and, for system administrators, the URL code.
// The service answers with the new group's id.
export function CreateGroupDialog({ open, isSystemAdmin, onClose, onCreated }) {
  const [values, setValues] = useState({ name: '', description: '', code: '' }), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  useEffect(() => { if (open) { setValues({ name: '', description: '', code: '' }); setBusy(false); setError(null); } }, [open]);
  const change = field => event => setValues(current => ({ ...current, [field]: event.target.value }));
  async function create(event) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const id = await send(createGroupRequest(values, { isSystemAdmin }));
      onCreated(Number(String(id).replace(/[^0-9]/g, '')) || null, values.name.trim());
    } catch (e) { setError(e.message); setBusy(false); }
  }
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="sm" aria-labelledby="create-group-title">
    <form onSubmit={create} noValidate>
      <DialogTitle id="create-group-title">Create group</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField required autoFocus label="Group name" value={values.name} onChange={change('name')} disabled={busy} slotProps={{ htmlInput: { maxLength: 80 } }} helperText={`${values.name.length}/80 characters`} />
          <TextField multiline minRows={3} label="Description" value={values.description} onChange={change('description')} disabled={busy} slotProps={{ htmlInput: { maxLength: 500 } }} helperText={`${values.description.length}/500 characters`} />
          {isSystemAdmin && <TextField label="Group URL code" value={values.code} onChange={change('code')} disabled={busy} slotProps={{ htmlInput: { maxLength: 25 } }} helperText="Optional. Up to 25 letters, numbers or hyphens." />}
          <Typography variant="body2" color="text.secondary">You become the group's administrator. Add the introduction, image, courses and members after the group is created.</Typography>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" disabled={busy || !values.name.trim()}>{busy ? 'Creating…' : 'Create group'}</Button></DialogActions>
    </form>
  </Dialog>;
}

// Delete a group: system administrators only, and only after typing its name. The service decides whether the group can go
// (for example a group that still has courses may be refused); its message is shown.
export function DeleteGroupDialog({ group, isSystemAdmin, onClose, onDeleted }) {
  const [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  useEffect(() => { setTyped(''); setBusy(false); setError(null); }, [group?.id]);
  async function remove() {
    setBusy(true); setError(null);
    try { await send(deleteGroupRequest(group, typed, { isSystemAdmin })); onDeleted(); } catch (e) { setError(e.message); setBusy(false); }
  }
  return <Dialog open={Boolean(group)} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="sm" aria-labelledby="delete-group-title">
    <DialogTitle id="delete-group-title">Delete {group?.name}?</DialogTitle>
    <DialogContent>
      <DialogContentText component="div" sx={{ mb: 2 }}>This permanently deletes the group. There is no undo. Type the group name <strong>{group?.name}</strong> to confirm.</DialogContentText>
      <TextField fullWidth autoFocus label="Group name" value={typed} onChange={event => setTyped(event.target.value)} disabled={busy} />
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button color="error" variant="contained" disabled={busy || typed.trim() !== String(group?.name ?? '').trim()} onClick={remove}>{busy ? 'Deleting…' : 'Delete group'}</Button></DialogActions>
  </Dialog>;
}

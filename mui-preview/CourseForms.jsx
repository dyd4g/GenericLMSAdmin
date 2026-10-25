import React, { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { connection, readApi } from './lib/read-api';
import { writeApi, courseTypes, privacyLevels, coursePayload, createCourseRequest, deleteCourseRequest } from './lib/write-api';
import RichContentEditor from './RichContentEditor';

const languageLabels = { en: 'English', es: 'Spanish', pt: 'Portuguese', 'zh-Hans': 'Chinese (Simplified)', 'zh-Hant': 'Chinese (Traditional)' };
const blank = () => ({ name: '', description: '', type: 'SelfPaced', language: connection.languages[0], categoryId: '', privacyLevel: 'Public', code: '', author: '', isGroupMembershipRequired: false, isEnrollmentApprovalRequired: false, hasCertificate: false, certificateMessage: '', managementNotificationsEnabled: false, executionNotificationsEnabled: false, enforceSequentialExecution: false, requiresLicenseToEnroll: false });

export function NewCourseDialog({ group, open, onClose, onCreated }) {
  const [values, setValues] = useState(blank), [body, setBody] = useState(''), [categories, setCategories] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState(null), [editorKey, setEditorKey] = useState(0);
  const set = (field, value) => setValues(v => ({ ...v, [field]: value }));
  useEffect(() => {
    if (!open) return;
    setValues(blank()); setBody(''); setError(null); setEditorKey(k => k + 1);
    const abort = new AbortController();
    readApi(`${connection.learning}/api/categories`, abort.signal).then(list => { if (Array.isArray(list)) { setCategories(list); setValues(v => ({ ...v, categoryId: list[0]?.id ?? '' })); } }).catch(() => {});
    return () => abort.abort();
  }, [open]);
  async function create() {
    setBusy(true); setError(null);
    try {
      const request = createCourseRequest(group?.id, coursePayload(values, body));
      const result = await writeApi(request.path, request.method, request.body, { groupId: request.groupId });
      const id = Number(typeof result === 'object' ? result?.id : result);
      if (!Number.isInteger(id) || id <= 0) throw new Error('The course was created but no ID was returned. Reload the course list.');
      onCreated(id);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="md">
    <DialogTitle>New course in {group?.name}</DialogTitle>
    <DialogContent>
      <Stack spacing={2.5} sx={{ pt: 1 }} component="fieldset" disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <Alert severity="info">The course is created as a Draft. You can add lessons and tasks right after. Course images, SEO and sales settings are not part of this form.</Alert>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField required autoFocus label="Course name" value={values.name} onChange={e => set('name', e.target.value)} error={!!error && !values.name.trim()} />
        <TextField label="Short description" value={values.description} onChange={e => set('description', e.target.value)} multiline minRows={2} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select fullWidth label="Course type" value={values.type} onChange={e => set('type', e.target.value)}>{courseTypes.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
          <TextField select fullWidth label="Language" value={values.language} onChange={e => set('language', e.target.value)}>{connection.languages.map(v => <MenuItem key={v} value={v}>{languageLabels[v] || v}</MenuItem>)}</TextField>
          <TextField select fullWidth label="Visibility" value={values.privacyLevel} onChange={e => set('privacyLevel', e.target.value)}>{privacyLevels.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
        </Stack>
        {connection.showCategories && categories.length > 0 && <TextField select label="Category" value={values.categoryId} onChange={e => set('categoryId', e.target.value)}>{categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Course code" value={values.code} onChange={e => set('code', e.target.value)} />
          <TextField fullWidth label="Author" value={values.author} onChange={e => set('author', e.target.value)} />
        </Stack>
        <RichContentEditor key={editorKey} readOnly={busy} label="Course introduction (optional)" value={body} onChange={setBody} />
        <Typography variant="subtitle2">Enrollment and experience</Typography>
        <Stack>
          <FormControlLabel control={<Switch checked={values.isGroupMembershipRequired} onChange={(_, v) => set('isGroupMembershipRequired', v)} />} label="Require group membership to enroll" />
          <FormControlLabel control={<Switch checked={values.isEnrollmentApprovalRequired} onChange={(_, v) => set('isEnrollmentApprovalRequired', v)} />} label="Require approval for enrollment" />
          <FormControlLabel control={<Switch checked={values.requiresLicenseToEnroll} onChange={(_, v) => set('requiresLicenseToEnroll', v)} />} label="Require a license to enroll" />
          <FormControlLabel control={<Switch checked={values.enforceSequentialExecution} onChange={(_, v) => set('enforceSequentialExecution', v)} />} label="Trainees must complete tasks in order" />
          <FormControlLabel control={<Switch checked={values.managementNotificationsEnabled} onChange={(_, v) => set('managementNotificationsEnabled', v)} />} label="Send management notifications" />
          <FormControlLabel control={<Switch checked={values.executionNotificationsEnabled} onChange={(_, v) => set('executionNotificationsEnabled', v)} />} label="Send execution notifications" />
          <FormControlLabel control={<Switch checked={values.hasCertificate} onChange={(_, v) => set('hasCertificate', v)} />} label="Issue a completion certificate" />
        </Stack>
        {values.hasCertificate && <TextField label="Certificate message" value={values.certificateMessage} onChange={e => set('certificateMessage', e.target.value)} multiline minRows={2} />}
      </Stack>
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy || !values.name.trim()} onClick={create}>{busy ? 'Creating…' : 'Create course'}</Button></DialogActions>
  </Dialog>;
}

export function DeleteCourseDialog({ course, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(null);
  useEffect(() => { setError(null); setBusy(false); }, [course?.id]);
  async function remove() {
    setBusy(true); setError(null);
    try {
      const request = deleteCourseRequest(course);
      await writeApi(request.path, request.method, undefined, { groupId: course.groupId });
      onDeleted(course.id);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Dialog open={!!course} onClose={() => { if (!busy) onClose(); }}>
    <DialogTitle>Delete course?</DialogTitle>
    <DialogContent>
      <Typography fontWeight={600}>{course?.name || `Course ${course?.id}`}</Typography>
      <DialogContentText sx={{ mt: 1 }}>This deletes the course, its lessons and tasks from {connection.name}. This action cannot be undone here.</DialogContentText>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button color="error" variant="contained" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete course'}</Button></DialogActions>
  </Dialog>;
}

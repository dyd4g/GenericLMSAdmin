import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, FormControlLabel, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import DOMPurify from 'dompurify';
import RichContentEditor from './RichContentEditor';
import { alertsUrl, canWriteUsers, connection, loginUrl, readApi, SessionError } from './lib/read-api';
import { alertTypes, alertsService, updateAlertRequest, writeApi } from './lib/write-api';
import { userLanguageLabels } from './lib/user-lists';

const clean = html => DOMPurify.sanitize(html || '');
const plain = html => new DOMParser().parseFromString(clean(html), 'text/html').body.textContent.trim();
// The visual editor keeps text, bold, italic, lists and links. Anything else in a stored message is kept only in HTML mode.
const hasExtras = html => /style=|<font|<center|align=|<span|<table|<img/i.test(html || '');
const same = (a, b) => a.type === b.type && a.isActive === b.isActive && (a.message ?? '') === (b.message ?? '');

function Failure({ error, retry }) {
  const session = error instanceof SessionError;
  return <Alert severity={session ? 'warning' : 'error'} action={session ? <Button component="a" href={loginUrl()} color="inherit">Sign in</Button> : <Button onClick={retry} color="inherit">Retry</Button>}>{error instanceof TypeError ? `Unable to reach ${connection.name}. Check your connection and retry.` : error.message}</Alert>;
}

function AlertEditor({ alert, editable, onSaved }) {
  const stored = { type: alert.type, message: alert.message ?? '', isActive: !!alert.isActive };
  const [values, setValues] = useState(stored), [htmlMode, setHtmlMode] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(null), [done, setDone] = useState(false);
  useEffect(() => { setValues({ type: alert.type, message: alert.message ?? '', isActive: !!alert.isActive }); setError(null); }, [alert.id, alert.type, alert.message, alert.isActive]);
  const set = (field, value) => { setDone(false); setValues(v => ({ ...v, [field]: value })); };
  const dirty = !same(values, stored);
  const empty = !plain(values.message);
  async function save() {
    setBusy(true); setError(null); setDone(false);
    try { const r = updateAlertRequest(alert.id, values); await writeApi(r.path, r.method, r.body, alertsService); setDone(true); await onSaved(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Paper variant="outlined" sx={{ p: 3 }}>
    <Typography variant="h6" gutterBottom>Alert details</Typography>
    {!editable && <Alert severity="info" sx={{ mb: 2 }}>Alert changes are not available in {connection.name}, so this is read-only.</Alert>}
    <Stack component="fieldset" disabled={!editable || busy} spacing={2.5} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <TextField label="Language" value={userLanguageLabels[alert.language] || alert.language || ''} slotProps={{ input: { readOnly: true } }} sx={{ minWidth: 200 }} />
        <TextField select label="Alert type" value={values.type} onChange={e => set('type', e.target.value)} sx={{ minWidth: 200 }}>{alertTypes.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
        <FormControlLabel control={<Switch checked={values.isActive} onChange={(_, v) => set('isActive', v)} />} label="Active" />
      </Stack>
      {hasExtras(stored.message) && !htmlMode && <Alert severity="warning">This message uses formatting (colors, alignment or similar) that the visual editor cannot keep. Editing the text here removes it; use "Edit as HTML" to keep it exactly.</Alert>}
      <FormControlLabel control={<Switch checked={htmlMode} onChange={(_, v) => setHtmlMode(v)} />} label="Edit as HTML" />
      {htmlMode
        ? <TextField multiline minRows={6} label="Message (HTML)" value={values.message} onChange={e => set('message', e.target.value)} slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 13 } } }} />
        : <RichContentEditor key={`${alert.id}:${alert.message}`} readOnly={!editable || busy} label="Message" value={values.message} onChange={v => set('message', v)} />}
      {values.isActive && empty && <Alert severity="warning">This alert is active but has no message, so people would see an empty banner.</Alert>}
      <Box>
        <Typography variant="caption" color="text.secondary">Preview</Typography>
        <Alert severity={values.type === 'Success' ? 'success' : 'error'} sx={{ mt: 0.5, opacity: values.isActive ? 1 : 0.5 }}>{empty ? <em>No message</em> : <span dangerouslySetInnerHTML={{ __html: clean(values.message) }} />}</Alert>
        {!values.isActive && <Typography variant="caption" color="text.secondary">Inactive alerts are not shown to anyone.</Typography>}
      </Box>
    </Stack>
    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    {done && !dirty && <Alert severity="success" sx={{ mt: 2 }}>Saved.</Alert>}
    {editable && <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
      <Button disabled={busy || !dirty} onClick={() => { setValues(stored); setDone(false); setError(null); }}>Discard changes</Button>
      <Button variant="contained" disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
    </Stack>}
  </Paper>;
}

export default function LiveAlerts() {
  const [reload, setReload] = useState(0), [state, setState] = useState({ loading: true, data: null, error: null }), [selected, setSelected] = useState(null);
  useEffect(() => {
    const abort = new AbortController();
    setState(s => ({ loading: s.data == null, data: s.data, error: null }));
    readApi(alertsUrl(), abort.signal).then(data => { if (!Array.isArray(data)) throw new Error('The alerts service returned an unexpected response.'); setState({ loading: false, data, error: null }); }).catch(error => { if (error.name !== 'AbortError') setState({ loading: false, data: null, error }); });
    return () => abort.abort();
  }, [reload]);
  const alerts = state.data || [], editable = canWriteUsers();
  const current = alerts.find(a => a.id === selected) || alerts[0];
  return <>
    <Typography variant="h4" gutterBottom>System alerts</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>The banner messages shown to people in {connection.name}, one per language. Alerts cannot be created or deleted here, only edited.</Typography>
    <Stack direction="row" sx={{ mb: 2 }}><Button startIcon={<Refresh />} disabled={state.loading} onClick={() => setReload(v => v + 1)}>Refresh</Button></Stack>
    {state.loading ? <Stack role="status" alignItems="center" sx={{ py: 6 }}><CircularProgress size={26} /><Typography sx={{ mt: 2 }}>Loading…</Typography></Stack> : state.error ? <Failure error={state.error} retry={() => setReload(v => v + 1)} /> :
      <Stack spacing={4}>
        {alerts.length ? <TableContainer component={Paper} variant="outlined">
          <Table aria-label="System alerts">
            <TableHead><TableRow>{['Language', 'Message', 'Type', 'Status'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {alerts.map(a => <TableRow key={a.id} hover selected={a.id === current?.id} onClick={() => setSelected(a.id)} sx={{ cursor: 'pointer' }}>
                <TableCell>{userLanguageLabels[a.language] || a.language}</TableCell>
                <TableCell sx={{ width: '60%' }}>{plain(a.message) ? <span dangerouslySetInnerHTML={{ __html: clean(a.message) }} /> : <Typography color="text.secondary" variant="body2">No message</Typography>}</TableCell>
                <TableCell><Chip size="small" label={a.type} color={a.type === 'Success' ? 'success' : 'error'} variant="outlined" /></TableCell>
                <TableCell><Chip size="small" label={a.isActive ? 'Active' : 'Inactive'} color={a.isActive ? 'primary' : 'default'} variant="outlined" /></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer> : <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>No alert messages here.</Typography>}
        {current && <AlertEditor key={current.id} alert={current} editable={editable} onSaved={async () => setReload(v => v + 1)} />}
      </Stack>}
  </>;
}

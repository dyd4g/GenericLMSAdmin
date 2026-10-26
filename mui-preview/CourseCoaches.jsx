import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Button, CircularProgress, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { Add, DeleteOutline, Download, Search } from '@mui/icons-material';
import { SessionError, connection, loginUrl } from './lib/read-api';
import { writeApi } from './lib/write-api';
import { downloadFile, safeFileName, todayStamp } from './lib/download';
import { addCoachRequest, coachCandidatesUrl, courseCoachesUrl, removeCoachRequest, responsesUrl } from './lib/participants';
import { ConfirmDialog } from './UserAssets';
import PeoplePicker from './PeoplePicker';
import useApi from './useApi';

const send = request => writeApi(request.path, request.method, request.body, request.options);

// Coaches of a coach-assisted course: who they are, how many participants each one has, add and remove, and each coach's form responses.
export default function CourseCoaches({ courseId, course, writable, isSystemAdmin }) {
  const archived = course.status === 'Archived', draft = course.status === 'Draft';
  const canChange = writable && !archived;
  const [reload, setReload] = useState(0), [search, setSearch] = useState(''), [adding, setAdding] = useState(false), [removeFor, setRemoveFor] = useState(null), [notice, setNotice] = useState(null), [fileError, setFileError] = useState(null), [fileBusy, setFileBusy] = useState(null);
  const state = useApi(courseCoachesUrl(courseId), reload);
  const coaches = Array.isArray(state.data) ? state.data : [];
  const shown = useMemo(() => coaches.filter(coach => String(coach.name || '').toLowerCase().includes(search.trim().toLowerCase())), [coaches, search]);
  const candidatesUrl = useCallback(text => coachCandidatesUrl(courseId, text), [courseId]);
  const makeAdd = useCallback(id => addCoachRequest(courseId, id), [courseId]);
  async function download(coach) {
    setFileError(null); setFileBusy(coach.id);
    try { await downloadFile(responsesUrl(courseId, coach.id), `${safeFileName(coach.name, 'coach')}_${todayStamp()}.csv`); } catch (error) { setFileError(error.message); } finally { setFileBusy(null); }
  }
  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
      <Typography variant="h6" component="h2">Coaches</Typography>
      {canChange && !draft && <Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>Add coaches</Button>}
    </Stack>
    {!writable && <Alert severity="info">Coaches are shown read-only here: {connection.name} does not allow changes to people in this app.</Alert>}
    {archived && <Alert severity="info">This course is archived. Coaches cannot be changed.</Alert>}
    {draft && writable && <Alert severity="info">This course is a Draft. Publish it before adding coaches.</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}
    {fileError && <Alert severity="error" onClose={() => setFileError(null)}>{fileError}</Alert>}
    <TextField size="small" label="Search coaches" value={search} onChange={event => setSearch(event.target.value)} sx={{ maxWidth: 360 }} slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 1 }} /> } }} />
    {state.error ? <Alert severity={state.error instanceof SessionError ? 'warning' : 'error'} action={state.error instanceof SessionError ? <Button color="inherit" component="a" href={loginUrl()}>Sign in</Button> : <Button color="inherit" onClick={() => setReload(value => value + 1)}>Retry</Button>}>{state.error.message}</Alert>
      : <Paper variant="outlined"><TableContainer><Table aria-label="Coaches" size="small">
        <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Coach</TableCell><TableCell>Participants</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>
          {state.loading && !coaches.length ? <TableRow><TableCell colSpan={4}><Stack role="status" alignItems="center" sx={{ py: 3 }}><CircularProgress size={24} /></Stack></TableCell></TableRow>
            : !shown.length ? <TableRow><TableCell colSpan={4}><Typography color="text.secondary" sx={{ py: 2 }}>{search ? 'No coaches match your search.' : 'This course has no coaches yet.'}</Typography></TableCell></TableRow>
            : shown.map(coach => <TableRow key={coach.id} hover>
              <TableCell>{coach.id}</TableCell>
              <TableCell><Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{coach.name}</Typography>{coach.email && <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{coach.email}</Typography>}</TableCell>
              <TableCell>{coach.traineeCount ?? '—'}</TableCell>
              <TableCell align="right"><Stack direction="row" spacing={0.5} justifyContent="flex-end">
                {isSystemAdmin && <Tooltip title="Download this coach's form responses (CSV)"><span><IconButton aria-label={`Download responses of ${coach.name}`} disabled={fileBusy !== null} onClick={() => download(coach)}><Download fontSize="small" /></IconButton></span></Tooltip>}
                {canChange && <Tooltip title={coach.traineeCount ? 'This coach still has participants. Unassign them first.' : 'Remove this coach'}><span><IconButton aria-label={`Remove ${coach.name}`} color="error" disabled={Boolean(coach.traineeCount)} onClick={() => setRemoveFor(coach)}><DeleteOutline fontSize="small" /></IconButton></span></Tooltip>}
              </Stack></TableCell>
            </TableRow>)}
        </TableBody>
      </Table></TableContainer></Paper>}
    <PeoplePicker open={adding} title="Add coaches" noun="coach" plural="coaches" searchLabel="Search people who can coach this course" candidatesUrl={candidatesUrl} makeRequest={makeAdd}
      onClose={() => setAdding(false)} onDone={({ keepOpen } = {}) => { if (!keepOpen) setAdding(false); setNotice('Coaches added.'); setReload(value => value + 1); }} />
    <ConfirmDialog open={Boolean(removeFor)} title="Remove this coach?" confirmLabel="Remove" onClose={() => setRemoveFor(null)}
      onConfirm={async () => { await send(removeCoachRequest(courseId, removeFor.id)); setNotice(`${removeFor.name} was removed as a coach.`); setReload(value => value + 1); }} onDone={() => setRemoveFor(null)}>
      {removeFor && <><strong>{removeFor.name}</strong> will no longer coach this course. They have no participants assigned.</>}
    </ConfirmDialog>
  </Stack>;
}

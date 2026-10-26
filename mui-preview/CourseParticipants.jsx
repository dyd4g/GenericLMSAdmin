import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, LinearProgress, List, ListItem, ListItemText, Menu, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Add, Download, MoreVert, Search } from '@mui/icons-material';
import { SessionError, connection, loginUrl, readApi } from './lib/read-api';
import { writeApi } from './lib/write-api';
import { downloadFile, safeFileName, todayStamp } from './lib/download';
import { addCoachRequest, approveRequest, assignCoachRequest, canMarkComplete, certificateUrl, completionUrl, courseCoachesUrl, enrollRequest, finishTaskRequest, isPending, isTaskFinished, pageSizes, participantSorts, participantState, removeParticipantRequest, responsesUrl, runEach, stateLabels, traineeCandidatesUrl, traineeStatuses, traineesUrl, transcriptUrl, unassignCoachRequest } from './lib/participants';
import { ConfirmDialog } from './UserAssets';
import PeoplePicker from './PeoplePicker';
import useApi from './useApi';

const send = request => writeApi(request.path, request.method, request.body, request.options);
const dateText = value => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '—'; };
const dateTimeText = value => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '—'; };

function Failure({ error, retry }) {
  const session = error instanceof SessionError;
  return <Alert severity={session ? 'warning' : 'error'} action={session ? <Button color="inherit" component="a" href={loginUrl()}>Sign in</Button> : <Button color="inherit" onClick={retry}>Retry</Button>}>{error.message}</Alert>;
}

// What happened with a batch of requests, shown above the list until dismissed.
function Report({ report, onClose }) {
  if (!report) return null;
  const severity = report.failed.length ? (report.done.length ? 'warning' : 'error') : 'success';
  return <Alert severity={severity} onClose={onClose}>
    {report.text}
    {report.failed.length > 0 && <Box component="ul" sx={{ m: 0, pl: 3 }}>{report.failed.map(item => <li key={item.id}>{item.label}: {item.message}</li>)}</Box>}
  </Alert>;
}

// Lessons and tasks of one participant, with "Mark as completed" for tasks that are switched on and not finished yet.
function ProgressDialog({ courseId, participant, canChange, onClose, onChanged }) {
  const [reload, setReload] = useState(0), [busy, setBusy] = useState(null), [confirm, setConfirm] = useState(null);
  const url = participant ? completionUrl(courseId, participant.id) : null;
  const state = useApi(url, reload);
  const lessons = Array.isArray(state.data) ? state.data : [];
  // A failure is thrown on to the confirmation dialog, which shows it and stays open.
  async function finish(task) {
    setBusy(task.id);
    try { await send(finishTaskRequest(participant.id, task.id)); setConfirm(null); setReload(value => value + 1); onChanged(); } finally { setBusy(null); }
  }
  return <Dialog open={Boolean(participant)} onClose={() => { if (busy === null) onClose(); }} fullWidth maxWidth="md" aria-labelledby="progress-title">
    <DialogTitle id="progress-title">Progress: {participant?.name || participant?.email}</DialogTitle>
    <DialogContent>
      {participant && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Last lesson: {participant.lastLessonName || '—'} · Last task: {participant.lastTaskName || '—'}{participant.lastTaskStatus ? ` (${participant.lastTaskStatus})` : ''}
      </Typography>}
      {state.loading ? <Stack role="status" alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>
        : state.error ? <Failure error={state.error} retry={() => setReload(value => value + 1)} />
        : !lessons.length ? <Typography color="text.secondary">This course has no lessons yet.</Typography>
        : lessons.map((lesson, index) => <Box key={lesson.id ?? index} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" component="h3">Lesson {index + 1}: {lesson.name}</Typography>
          <List dense disablePadding aria-label={`Tasks of ${lesson.name}`}>{(lesson.tasks || []).map(task => <ListItem key={task.id} divider secondaryAction={canChange && canMarkComplete(task)
            ? <Button size="small" variant="outlined" disabled={busy !== null} onClick={() => setConfirm(task)}>{busy === task.id ? 'Saving…' : 'Mark as completed'}</Button> : undefined}>
            <ListItemText primary={<>{task.name}{task.isRequired === false && <Chip size="small" color="warning" label="Optional" sx={{ ml: 1 }} />}</>} secondary={`${task.type || 'Task'}${task.assignedTo === 'Coach' ? ' · done by the coach' : ''}`} />
            <Chip size="small" variant="outlined" color={isTaskFinished(task.status) ? 'success' : 'default'} label={task.status || '—'} sx={{ mr: canChange && canMarkComplete(task) ? 18 : 0 }} />
          </ListItem>)}</List>
        </Box>)}
    </DialogContent>
    <DialogActions><Button disabled={busy !== null} onClick={onClose}>Close</Button></DialogActions>
    <ConfirmDialog open={Boolean(confirm)} title="Mark this task as completed?" confirmLabel="Mark as completed" color="primary" onClose={() => setConfirm(null)} onConfirm={() => finish(confirm)} onDone={() => {}}>
      {confirm && <>“{confirm.name}” will count as finished for {participant?.name || participant?.email}. This changes their progress and cannot be undone here.</>}
    </ConfirmDialog>
  </Dialog>;
}

export default function CourseParticipants({ courseId, course, writable, isSystemAdmin }) {
  const coachAssisted = course.type === 'CoachAssisted';
  const archived = course.status === 'Archived', draft = course.status === 'Draft';
  const canChange = writable && !archived;
  const canEnroll = canChange && !draft;
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [statuses, setStatuses] = useState([]), [pendingApproval, setPendingApproval] = useState(false), [coachPending, setCoachPending] = useState(false);
  const [coachIds, setCoachIds] = useState([]), [sortBy, setSortBy] = useState('enrollmentDate'), [from, setFrom] = useState(''), [to, setTo] = useState('');
  const [page, setPage] = useState(0), [size, setSize] = useState(10);
  const [selected, setSelected] = useState([]), [report, setReport] = useState(null), [menu, setMenu] = useState(null);
  const [progressFor, setProgressFor] = useState(null), [removeFor, setRemoveFor] = useState(null), [adding, setAdding] = useState(false), [coachDialog, setCoachDialog] = useState(null), [approveAll, setApproveAll] = useState(false), [fileError, setFileError] = useState(null), [fileBusy, setFileBusy] = useState(null);

  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const url = useMemo(() => traineesUrl(courseId, { search: query, sortBy, coachIds, traineeStatus: statuses, pendingApproval, coachPending, enrollmentDateStart: from, enrollmentDateEnd: to, page, resultsPerPage: size }), [courseId, query, sortBy, coachIds, statuses, pendingApproval, coachPending, from, to, page, size]);
  const list = useApi(url, reload);
  const coaches = useApi(coachAssisted ? courseCoachesUrl(courseId) : null, reload);
  const coachRows = Array.isArray(coaches.data) ? coaches.data : [];
  const rows = Array.isArray(list.data?.results) ? list.data.results : [];
  const total = Number(list.data?.resultsCount) || 0;
  const pendingOnPage = rows.filter(isPending);
  const allSelected = rows.length > 0 && rows.every(row => selected.includes(row.id));
  useEffect(() => { setSelected([]); }, [url]);
  const refresh = () => setReload(value => value + 1);
  const toggleRow = id => setSelected(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  const nameOf = id => rows.find(row => row.id === id)?.name || `#${id}`;
  const filtered = Boolean(query || statuses.length || pendingApproval || coachPending || coachIds.length || from || to);

  async function batch(ids, make, text) {
    setReport(null);
    const result = await runEach(ids, send, make);
    setReport({ text: text(result), done: result.done, failed: result.failed.map(item => ({ ...item, label: nameOf(item.id) })) });
    refresh();
    return result;
  }
  async function approve(ids) {
    await batch(ids, id => approveRequest(courseId, id), result => `${result.done.length} approved${result.failed.length ? `, ${result.failed.length} failed` : ''}.`);
  }
  async function assign(coach) {
    const ids = coachDialog.mode === 'assign' ? selected : selected.filter(id => rows.find(row => row.id === id)?.coaches?.some(item => Number(item.id) === Number(coach.id)));
    const make = coachDialog.mode === 'assign' ? id => assignCoachRequest(courseId, id, coach.id) : id => unassignCoachRequest(courseId, id, coach.id);
    setCoachDialog(null);
    await batch(ids, make, result => `${coachDialog.mode === 'assign' ? 'Assigned' : 'Unassigned'} ${coach.name} for ${result.done.length} participant${result.done.length === 1 ? '' : 's'}${result.failed.length ? `, ${result.failed.length} failed` : ''}.`);
  }
  async function save(kind, url, fileName) {
    setFileError(null); setFileBusy(kind);
    try { await downloadFile(url, fileName); } catch (e) { setFileError(e.message); } finally { setFileBusy(null); }
  }
  const candidatesUrl = useCallback(text => traineeCandidatesUrl(courseId, text), [courseId]);
  const makeEnroll = useCallback(id => enrollRequest(courseId, id), [courseId]);
  const coachesInSelection = coachRows.filter(coach => selected.some(id => rows.find(row => row.id === id)?.coaches?.some(item => Number(item.id) === Number(coach.id))));

  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
      <Typography variant="h6" component="h2">Participants</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {isSystemAdmin && <Button startIcon={<Download />} disabled={fileBusy !== null} onClick={() => save('responses', responsesUrl(courseId), `${safeFileName(course.name, 'course')}_${todayStamp()}.csv`)}>{fileBusy === 'responses' ? 'Preparing…' : 'Download responses (CSV)'}</Button>}
        {canEnroll && <Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>Add participants</Button>}
      </Stack>
    </Stack>
    {!writable && <Alert severity="info">Participants are shown read-only here: {connection.name} does not allow changes to people in this app.</Alert>}
    {archived && <Alert severity="info">This course is archived. Participants can be viewed and their files downloaded, but not changed.</Alert>}
    {draft && writable && <Alert severity="info">This course is a Draft. Publish it before adding participants.</Alert>}
    {fileError && <Alert severity="error" onClose={() => setFileError(null)}>{fileError}</Alert>}
    <Report report={report} onClose={() => setReport(null)} />

    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
          <TextField size="small" label="Search participants" value={search} onChange={event => setSearch(event.target.value)} sx={{ minWidth: 260 }} slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 1 }} /> } }} />
          <TextField select size="small" label="Sort by" value={sortBy} onChange={event => { setSortBy(event.target.value); setPage(0); }} sx={{ minWidth: 180 }}>{participantSorts.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
          <TextField size="small" type="date" label="Enrolled from" value={from} onChange={event => { setFrom(event.target.value); setPage(0); }} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label="Enrolled until" value={to} onChange={event => { setTo(event.target.value); setPage(0); }} slotProps={{ inputLabel: { shrink: true } }} />
          {coachAssisted && <TextField select size="small" label="Coach" value={coachIds} onChange={event => { setCoachIds(event.target.value); setPage(0); }} sx={{ minWidth: 200 }} slotProps={{ select: { multiple: true, renderValue: ids => coachRows.filter(coach => ids.includes(coach.id)).map(coach => coach.name).join(', ') } }}>
            {coachRows.map(coach => <MenuItem key={coach.id} value={coach.id}><Checkbox checked={coachIds.includes(coach.id)} />{coach.name}</MenuItem>)}
          </TextField>}
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup size="small" aria-label="Progress" value={statuses} onChange={(_, value) => { setStatuses(value); setPage(0); }}>{traineeStatuses.map(([value, label]) => <ToggleButton key={value} value={value}>{label}</ToggleButton>)}</ToggleButtonGroup>
          <FormControlLabel control={<Checkbox checked={pendingApproval} onChange={event => { setPendingApproval(event.target.checked); setPage(0); }} />} label="Waiting for approval" />
          {coachAssisted && <FormControlLabel control={<Checkbox checked={coachPending} onChange={event => { setCoachPending(event.target.checked); setPage(0); }} />} label="Waiting for a coach" />}
          {filtered && <Button onClick={() => { setSearch(''); setQuery(''); setStatuses([]); setPendingApproval(false); setCoachPending(false); setCoachIds([]); setFrom(''); setTo(''); setPage(0); }}>Clear filters</Button>}
        </Stack>
      </Stack>
    </Paper>

    {canChange && (pendingOnPage.length > 0 || (coachAssisted && selected.length > 0)) && <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap role="toolbar" aria-label="Actions for the participants">
      {pendingOnPage.length > 0 && <Button variant="outlined" onClick={() => setApproveAll(true)}>Approve all waiting on this page ({pendingOnPage.length})</Button>}
      {coachAssisted && selected.length > 0 && <>
        <Typography variant="body2">{selected.length} selected</Typography>
        <Button variant="outlined" disabled={!coachRows.length} onClick={() => setCoachDialog({ mode: 'assign' })}>Assign coach</Button>
        <Button variant="outlined" disabled={!coachesInSelection.length} onClick={() => setCoachDialog({ mode: 'unassign' })}>Unassign coach</Button>
      </>}
    </Stack>}

    {list.error ? <Failure error={list.error} retry={refresh} /> : <Paper variant="outlined">
      <TableContainer>
        <Table aria-label="Participants" size="small" sx={{ minWidth: 820 }}>
          <TableHead><TableRow>
            {canChange && coachAssisted && <TableCell padding="checkbox"><Checkbox checked={allSelected} indeterminate={!allSelected && selected.length > 0} onChange={() => setSelected(allSelected ? [] : rows.map(row => row.id))} slotProps={{ input: { 'aria-label': 'Select all participants on this page' } }} /></TableCell>}
            <TableCell sx={{ minWidth: 200 }}>Participant</TableCell>{coachAssisted && <TableCell>Coach</TableCell>}<TableCell>Progress</TableCell><TableCell>Enrolled</TableCell><TableCell>Last visit</TableCell><TableCell align="right">Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {list.loading && !rows.length ? <TableRow><TableCell colSpan={7}><Stack role="status" alignItems="center" sx={{ py: 3 }}><CircularProgress size={24} /></Stack></TableCell></TableRow>
              : !rows.length ? <TableRow><TableCell colSpan={7}><Typography color="text.secondary" sx={{ py: 2 }}>{filtered ? 'No participants match these filters.' : 'This course has no participants yet.'}</Typography></TableCell></TableRow>
              : rows.map(row => {
                const [label, color] = stateLabels[participantState(row)];
                return <TableRow key={row.id} hover selected={selected.includes(row.id)}>
                  {canChange && coachAssisted && <TableCell padding="checkbox"><Checkbox checked={selected.includes(row.id)} onChange={() => toggleRow(row.id)} slotProps={{ input: { 'aria-label': `Select ${row.name || row.email}` } }} /></TableCell>}
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{row.name || '—'}</Typography><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{row.email}</Typography></TableCell>
                  {coachAssisted && <TableCell>{(row.coaches || []).length ? (row.coaches || []).map(coach => <Chip key={coach.id} size="small" variant="outlined" label={coach.name} sx={{ mr: 0.5, mb: 0.5 }} />) : <Typography variant="body2" color="text.secondary">No coach yet</Typography>}</TableCell>}
                  <TableCell sx={{ minWidth: 150 }}><Chip size="small" color={color} variant={color === 'default' ? 'outlined' : 'filled'} label={label} /><LinearProgress variant="determinate" value={Math.min(100, Math.max(0, (Number(row.progress) || 0) * 100))} aria-label={`${Math.round((Number(row.progress) || 0) * 100)}% complete`} sx={{ mt: 1 }} /></TableCell>
                  <TableCell>{dateText(row.enrollmentDate)}</TableCell>
                  <TableCell>{dateTimeText(row.traineeLastAccessDate ?? row.lastAccessDate)}</TableCell>
                  <TableCell align="right"><Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                    {canChange && isPending(row) && <Button size="small" variant="outlined" onClick={() => approve([row.id])}>Approve</Button>}
                    <Button size="small" onClick={() => setProgressFor(row)}>Progress</Button>
                    <IconButton aria-label={`More actions for ${row.name || row.email}`} aria-haspopup="menu" onClick={event => setMenu({ anchor: event.currentTarget, row })}><MoreVert fontSize="small" /></IconButton>
                  </Stack></TableCell>
                </TableRow>;
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={total} page={Math.min(page, Math.max(0, Math.ceil(total / size) - 1))} rowsPerPage={size} rowsPerPageOptions={pageSizes} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={event => { setSize(Number(event.target.value)); setPage(0); }} />
    </Paper>}

    <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
      <MenuItem disabled={fileBusy !== null || !course.hasCertificate || participantState(menu?.row) !== 'completed'} onClick={() => { const row = menu.row; setMenu(null); save('certificate', certificateUrl(row.id, courseId), `${safeFileName(row.name, 'participant')}_certificate.pdf`); }}>Download certificate</MenuItem>
      <MenuItem disabled={fileBusy !== null} onClick={() => { const row = menu.row; setMenu(null); save('transcript', transcriptUrl(row.id), `${safeFileName(row.name, 'participant')}_transcript.pdf`); }}>Download transcript</MenuItem>
      {canChange && <MenuItem onClick={() => { setRemoveFor(menu.row); setMenu(null); }} sx={{ color: 'error.main' }}>Remove from course</MenuItem>}
    </Menu>

    <ProgressDialog courseId={courseId} participant={progressFor} canChange={canChange} onClose={() => setProgressFor(null)} onChanged={refresh} />
    <PeoplePicker open={adding} title="Add participants" noun="participant" searchLabel="Search people who can join this course" candidatesUrl={candidatesUrl} makeRequest={makeEnroll}
      onClose={() => setAdding(false)} onDone={({ keepOpen } = {}) => { if (!keepOpen) setAdding(false); setReport({ text: 'Participants added.', done: [1], failed: [] }); refresh(); }} />
    <ConfirmDialog open={approveAll} title="Approve all waiting participants?" confirmLabel="Approve" color="primary" onClose={() => setApproveAll(false)} onConfirm={() => approve(pendingOnPage.map(row => row.id))} onDone={() => setApproveAll(false)}>
      {pendingOnPage.length} participant{pendingOnPage.length === 1 ? '' : 's'} on this page will be enrolled in the course: {pendingOnPage.map(row => row.name || row.email).join(', ')}.
    </ConfirmDialog>
    <ConfirmDialog open={Boolean(removeFor)} title="Remove this participant?" confirmLabel="Remove" onClose={() => setRemoveFor(null)} onConfirm={async () => { await send(removeParticipantRequest(courseId, removeFor.id)); setReport({ text: `${removeFor.name || removeFor.email} was removed from the course.`, done: [removeFor.id], failed: [] }); refresh(); }} onDone={() => setRemoveFor(null)}>
      {removeFor && <><strong>{removeFor.name || removeFor.email}</strong> will be removed from this course and their progress is lost. They can be added again, but they start from the beginning.</>}
    </ConfirmDialog>
    <Dialog open={Boolean(coachDialog)} onClose={() => setCoachDialog(null)} fullWidth maxWidth="xs" aria-labelledby="coach-dialog-title">
      <DialogTitle id="coach-dialog-title">{coachDialog?.mode === 'assign' ? 'Assign a coach' : 'Unassign a coach'}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>{coachDialog?.mode === 'assign' ? `Choose the coach for the ${selected.length} selected participant${selected.length === 1 ? '' : 's'}.` : 'Choose the coach to take off the selected participants they coach.'}</Typography>
        <List aria-label="Coaches">{(coachDialog?.mode === 'assign' ? coachRows : coachesInSelection).map(coach => <ListItem key={coach.id} disablePadding><Button fullWidth sx={{ justifyContent: 'flex-start' }} onClick={() => assign(coach)}>{coach.name}{coach.traineeCount != null ? ` (${coach.traineeCount} participant${coach.traineeCount === 1 ? '' : 's'})` : ''}</Button></ListItem>)}</List>
      </DialogContent>
      <DialogActions><Button onClick={() => setCoachDialog(null)}>Cancel</Button></DialogActions>
    </Dialog>
  </Stack>;
}

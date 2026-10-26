import React, { useCallback, useState } from 'react';
import { Alert, Button, CircularProgress, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Add, DeleteOutline } from '@mui/icons-material';
import { SessionError, connection, loginUrl } from './lib/read-api';
import { writeApi } from './lib/write-api';
import { addPrerequisiteRequest, coursePrerequisitesUrl, prerequisiteCandidatesUrl, prerequisiteRows, removePrerequisiteRequest } from './lib/prerequisites';
import { ConfirmDialog } from './UserAssets';
import PeoplePicker from './PeoplePicker';
import useApi from './useApi';

const send = request => writeApi(request.path, request.method, request.body, request.options);

function CourseTable({ label, nameHeader, rows, empty, onRemove }) {
  return <Paper variant="outlined"><TableContainer><Table aria-label={label} size="small">
    <TableHead><TableRow><TableCell>{nameHeader}</TableCell><TableCell>Code</TableCell>{onRemove && <TableCell align="right">Actions</TableCell>}</TableRow></TableHead>
    <TableBody>
      {!rows.length ? <TableRow><TableCell colSpan={onRemove ? 3 : 2}><Typography color="text.secondary" sx={{ py: 2 }}>{empty}</Typography></TableCell></TableRow>
        : rows.map(row => <TableRow key={row.id} hover>
          <TableCell sx={{ overflowWrap: 'anywhere', fontWeight: 600 }}>{row.name || `Course ${row.id}`}</TableCell>
          <TableCell>{row.code || '—'}</TableCell>
          {onRemove && <TableCell align="right"><Tooltip title="Remove this prerequisite"><IconButton aria-label={`Remove ${row.name || `course ${row.id}`}`} color="error" onClick={() => onRemove(row)}><DeleteOutline fontSize="small" /></IconButton></Tooltip></TableCell>}
        </TableRow>)}
    </TableBody>
  </Table></TableContainer></Paper>;
}

// Prerequisite courses of a coach-assisted course: the courses a coach must complete first (add and remove) and the courses that
// completing this one qualifies a coach for (read-only, they are set on those courses).
export default function CoursePrerequisites({ courseId, groupId, course, writable }) {
  const archived = course.status === 'Archived', canChange = writable && !archived;
  const [reload, setReload] = useState(0), [adding, setAdding] = useState(false), [removeFor, setRemoveFor] = useState(null), [notice, setNotice] = useState(null);
  const state = useApi(coursePrerequisitesUrl(courseId), reload);
  const { required, unlocks } = prerequisiteRows(state.data);
  const candidatesUrl = useCallback(text => prerequisiteCandidatesUrl(courseId, text), [courseId]);
  const makeAdd = useCallback(id => addPrerequisiteRequest(courseId, groupId, id), [courseId, groupId]);
  const failure = state.error;
  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
      <Typography variant="h6" component="h2">Coach prerequisite courses</Typography>
      {canChange && <Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>Add prerequisite courses</Button>}
    </Stack>
    <Typography variant="body2" color="text.secondary">A coach has to complete every prerequisite course before they can coach this course.</Typography>
    {!writable && <Alert severity="info">Prerequisites are shown read-only here: {connection.name} does not allow changes to this course in this app.</Alert>}
    {archived && <Alert severity="info">This course is archived. Prerequisites cannot be changed.</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}
    {failure ? <Alert severity={failure instanceof SessionError ? 'warning' : 'error'} action={failure instanceof SessionError ? <Button color="inherit" component="a" href={loginUrl()}>Sign in</Button> : <Button color="inherit" onClick={() => setReload(value => value + 1)}>Retry</Button>}>{failure.message}</Alert>
      : state.loading && !state.data ? <Stack role="status" alignItems="center" sx={{ py: 3 }}><CircularProgress size={24} /></Stack>
      : <>
        <CourseTable label="Prerequisite courses" nameHeader="Prerequisite course" rows={required} empty="No prerequisite courses. Any coach can coach this course." onRemove={canChange ? setRemoveFor : undefined} />
        {unlocks.length > 0 && <>
          <Typography variant="subtitle1" component="h3">Courses this course qualifies coaches for</Typography>
          <CourseTable label="Courses this course qualifies coaches for" nameHeader="Course" rows={unlocks} empty="" />
        </>}
      </>}
    <PeoplePicker open={adding} title="Add prerequisite courses" noun="course" plural="courses" searchLabel="Search courses" allowEmptySearch excludeIds={[Number(courseId)]} alreadyIn="courses already added" candidatesUrl={candidatesUrl} makeRequest={makeAdd}
      onClose={() => setAdding(false)} onDone={({ keepOpen } = {}) => { if (!keepOpen) setAdding(false); setNotice('Prerequisite courses added.'); setReload(value => value + 1); }} />
    <ConfirmDialog open={Boolean(removeFor)} title="Remove this prerequisite?" confirmLabel="Remove" onClose={() => setRemoveFor(null)}
      onConfirm={async () => { await send(removePrerequisiteRequest(courseId, groupId, removeFor.id)); setNotice(`${removeFor.name || 'The course'} is no longer a prerequisite.`); setReload(value => value + 1); }} onDone={() => setRemoveFor(null)}>
      {removeFor && <>Coaches will no longer need to complete <strong>{removeFor.name}</strong> before coaching this course.</>}
    </ConfirmDialog>
  </Stack>;
}

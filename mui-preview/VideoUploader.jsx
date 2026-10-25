import React, { useRef, useState } from 'react';
import { Alert, Box, Button, Chip, LinearProgress, Link, Stack, Typography } from '@mui/material';
import { CloudUploadOutlined, DeleteOutline, Close } from '@mui/icons-material';
import { connection, readApi } from './lib/read-api';
import { writeApi, initVideoUploadRequest, finishVideoUploadRequest, removeVideoUploadRequest } from './lib/write-api';
import { startUpload } from './lib/video-upload';

const size = bytes => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const when = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(); };

export default function VideoUploader({ video, blocked, blockedReason, onChanged }) {
  const [file, setFile] = useState(null), [phase, setPhase] = useState('idle'), [progress, setProgress] = useState(0), [error, setError] = useState(null);
  const cancel = useRef(null), input = useRef(null);
  const busy = ['starting', 'uploading', 'finishing', 'removing'].includes(phase);
  const upload = video?.upload;
  const hasVideo = !!(upload?.fileName);
  async function refresh() { onChanged(await readApi(`${connection.learning}/api/videos/${encodeURIComponent(video.id)}`)); }
  async function start() {
    if (!file || busy || blocked) return;
    setError(null); setProgress(0); setPhase('starting');
    try {
      const init = initVideoUploadRequest(video.id, file);
      const target = await writeApi(init.path, init.method, init.body);
      if (!target?.uploadUrl || !target?.provider) throw new Error('The server did not return an upload address.');
      setPhase('uploading');
      cancel.current = await startUpload(target.provider, target.uploadUrl, file, {
        onProgress: setProgress,
        onError: e => { cancel.current = null; setPhase('error'); setError(e.message || 'The upload failed.'); },
        onSuccess: async () => {
          cancel.current = null; setPhase('finishing');
          try { const done = finishVideoUploadRequest(video.id); await writeApi(done.path, done.method); await refresh(); setFile(null); if (input.current) input.current.value = ''; setPhase('idle'); }
          catch (e) { setPhase('error'); setError(`The file was uploaded but could not be finalised: ${e.message}`); }
        },
      });
    } catch (e) { setPhase('error'); setError(e.message); }
  }
  async function stop() {
    setPhase('removing');
    try { await cancel.current?.(); } catch { /* ignore */ }
    cancel.current = null;
    try { const r = removeVideoUploadRequest(video.id); await writeApi(r.path, r.method); await refresh(); } catch (e) { setError(e.message); }
    setPhase('idle'); setProgress(0);
  }
  async function remove() {
    setPhase('removing'); setError(null);
    try { const r = removeVideoUploadRequest(video.id); await writeApi(r.path, r.method); await refresh(); setPhase('idle'); }
    catch (e) { setPhase('error'); setError(e.message); }
  }
  return <Stack spacing={1.5} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
    <Typography variant="subtitle2">Video file</Typography>
    {hasVideo ? <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Typography variant="body2" fontWeight={600}>{upload.fileName}</Typography>
      {upload.fileSize != null && <Typography variant="caption" color="text.secondary">{size(upload.fileSize)}</Typography>}
      <Chip size="small" color={upload.finishDate ? 'success' : 'warning'} variant="outlined" label={upload.finishDate ? 'Uploaded' : 'Upload not finished'} />
      {(upload.finishDate || upload.startDate) && <Typography variant="caption" color="text.secondary">{when(upload.finishDate || upload.startDate)}</Typography>}
      {video.provider && <Typography variant="caption" color="text.secondary">via {video.provider}</Typography>}
      {video.url && /^https?:\/\//.test(video.url) && <Link href={video.url} target="_blank" rel="noopener noreferrer" variant="body2">Open video</Link>}
      <Box sx={{ flex: 1 }} />
      <Button size="small" color="error" startIcon={<DeleteOutline />} disabled={busy || blocked} onClick={remove}>Remove video</Button>
    </Stack> : <Typography variant="body2" color="text.secondary">No video has been uploaded yet.</Typography>}
    {blocked && <Alert severity="info">{blockedReason}</Alert>}
    {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
      <Button component="label" variant="outlined" startIcon={<CloudUploadOutlined />} disabled={busy || blocked}>
        {hasVideo ? 'Choose a replacement' : 'Choose video file'}
        <input ref={input} hidden type="file" accept="video/*" onChange={e => { setFile(e.target.files?.[0] || null); setError(null); setPhase('idle'); }} />
      </Button>
      {file && <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{file.name} · {size(file.size)}</Typography>}
      <Box sx={{ flex: 1 }} />
      {phase === 'uploading' || phase === 'starting' ? <Button color="inherit" startIcon={<Close />} onClick={stop}>Cancel upload</Button> : <Button variant="contained" disabled={!file || busy || blocked} onClick={start}>{hasVideo ? 'Replace video' : 'Upload video'}</Button>}
    </Stack>
    {hasVideo && file && <Typography variant="caption" color="text.secondary">Uploading a replacement starts a new upload for this task.</Typography>}
    {(phase === 'uploading' || phase === 'finishing') && <Box><LinearProgress variant="determinate" value={phase === 'finishing' ? 100 : progress} /><Typography variant="caption" color="text.secondary">{phase === 'finishing' ? 'Finishing…' : `Uploading… ${Math.round(progress)}%`}</Typography></Box>}
  </Stack>;
}

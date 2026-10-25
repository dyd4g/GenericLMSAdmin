import React from 'react';
import {Button,Stack,Typography} from '@mui/material';
export default function AutosaveStatus({status,onRetry}){
 if(status?.state!=='error')return null;
 return <Stack role="alert" direction="row" spacing={1} alignItems="center"><Typography variant="caption" color="error">Couldn’t save. {status.error}</Typography><Button size="small" onClick={onRetry}>Retry</Button></Stack>;
}

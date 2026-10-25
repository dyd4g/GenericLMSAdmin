import React,{useEffect,useState} from 'react';
import {ThemeProvider,CssBaseline,Box,Paper,Stack,Typography,TextField,Button,Chip,Alert,CircularProgress,InputAdornment,IconButton,Link} from '@mui/material';
import {SchoolOutlined,Visibility,VisibilityOff} from '@mui/icons-material';
import {connection,readAccessToken,saveAdminSession,clearAdminSession} from './lib/read-api';
import theme from './theme';
import Preview from './Preview';

export default function AdminAccess(){
 const[profile,setProfile]=useState(null),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;const abort=new AbortController();
  async function check(){const token=readAccessToken();if(!token){if(active){setProfile(null);setChecking(false)}return;}
   try{const response=await fetch('/api/admin-session',{headers:{authorization:`Bearer ${token}`},cache:'no-store',signal:abort.signal});const result=await response.json();if(!active)return;
    if(response.ok){setProfile(result.profile);setError('');}
    else if(response.status===401||response.status===403){clearAdminSession();setProfile(null);setError(result.message);}
    else setError(result.message||'Unable to check your access. Please try again.');
   }catch(e){if(active&&e.name!=='AbortError')setError('Unable to reach the sign-in service. Please try again.');}finally{if(active)setChecking(false);}
  }
  check();const timer=setInterval(check,60000);window.addEventListener('focus',check);return()=>{active=false;abort.abort();clearInterval(timer);window.removeEventListener('focus',check)};
 },[retry]);
 async function signIn(event){event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{const response=await fetch('/api/admin-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password}),cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.message||'Unable to sign in. Please try again.');saveAdminSession(result.accessToken,result.expiresIn);setPassword('');setProfile(result.profile);}
  catch(e){setError(e.message||'Unable to reach the sign-in service. Please try again.');}finally{setBusy(false);}
 }
 function signOut(){clearAdminSession();setProfile(null);setPassword('');setError('');}
 if(profile)return <><Preview profile={profile} onSignOut={signOut}/>{error&&<Alert severity="warning" sx={{position:'fixed',bottom:16,right:16,maxWidth:420,zIndex:1500}} action={<Button onClick={()=>setRetry(v=>v+1)}>Retry</Button>}>{error}</Alert>}</>;
 return <ThemeProvider theme={theme}><CssBaseline/><Box component="main" sx={{minHeight:'100vh',display:'grid',placeItems:'center',p:3,bgcolor:'background.default'}}><Box sx={{width:'100%',maxWidth:420}}><Stack direction="row" alignItems="center" spacing={1.5} sx={{mb:3}}><Box sx={{bgcolor:'primary.main',color:'white',p:1,borderRadius:1,display:'flex'}}><SchoolOutlined/></Box><Typography variant="h6">Learning Admin</Typography></Stack><Paper variant="outlined" sx={{p:{xs:3,sm:4}}}><Chip label={connection.name} size="small" variant="outlined" sx={{mb:3}}/>{checking?<Stack role="status" spacing={2} alignItems="center" sx={{py:4}}><CircularProgress size={28}/><Typography>Checking administrator access…</Typography></Stack>:<><Typography component="h1" variant="h4" sx={{fontSize:26,mb:1}}>Sign in to administration</Typography><Typography color="text.secondary" sx={{mb:3}}>Use your existing administrator account.</Typography>{error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}<Box component="form" onSubmit={signIn}><Stack spacing={2.5}><TextField label="Email" type="email" name="username" autoComplete="username" required fullWidth value={username} onChange={e=>setUsername(e.target.value)} disabled={busy} inputProps={{maxLength:320}}/><TextField label="Password" type={visible?'text':'password'} name="password" autoComplete="current-password" required fullWidth value={password} onChange={e=>setPassword(e.target.value)} disabled={busy} slotProps={{input:{endAdornment:<InputAdornment position="end"><IconButton aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(v=>!v)} edge="end">{visible?<VisibilityOff/>:<Visibility/>}</IconButton></InputAdornment>}}}/><Button type="submit" variant="contained" size="large" disabled={busy}>{busy?'Signing in…':'Sign in'}</Button></Stack></Box><Link href={connection.login.replace(/\/login$/, '/forgotpassword')} sx={{display:'inline-block',mt:2.5,fontSize:14}}>Forgot password?</Link><Typography variant="body2" color="text.secondary" sx={{mt:3}}>Access is limited to administrators. Contact your administrator if you need access.</Typography></>}</Paper></Box></Box></ThemeProvider>;
}

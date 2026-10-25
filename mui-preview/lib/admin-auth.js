import { connection } from './read-api';

export class AdminAccessError extends Error {
  constructor(message,status=403){super(message);this.status=status;}
}
export function isSystemAdmin(profile){const roles=profile?.roles??profile?.role;return (Array.isArray(roles)?roles:[roles]).includes('Admin');}
async function serviceJson(url,token,fetcher){
 const response=await fetcher(url,{headers:{'Client-Id':connection.clientId,authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(response.status===401)throw new AdminAccessError('Your session has expired. Sign in again.',401);
 if(response.status===403)throw new AdminAccessError('You don’t have permission to access this admin site.');
 if(!response.ok)throw new AdminAccessError('Unable to check administrator access. Please try again.',503);
 return response.json();
}
export async function verifyAdminAccess(token,fetcher=fetch){
 const profile=await serviceJson(`${connection.identity}/api/account/userinfo`,token,fetcher);
 if(!profile||typeof profile!=='object')throw new AdminAccessError('Unable to check your account. Please try again.',503);
 if(isSystemAdmin(profile))return profile;
 // These are the same assigned-administrator lists used by the existing admin.
 const groups=await serviceJson(`${connection.learning}/api/myAdminGroups?page=0&resultsPerPage=1&search=&isAdmin=true`,token,fetcher);
 if(!Array.isArray(groups?.results))throw new AdminAccessError('Unable to check group access. Please try again.',503);
 if(groups.results.length)return profile;
 const courses=await serviceJson(`${connection.learning}/api/myAdminCourses?page=0&resultsPerPage=1&search=`,token,fetcher);
 if(!Array.isArray(courses?.results))throw new AdminAccessError('Unable to check course access. Please try again.',503);
 if(courses.results.length)return profile;
 throw new AdminAccessError('You don’t have permission to access this admin site. Ask an administrator to grant you access.');
}
export async function signInAdmin(username,password,fetcher=fetch){
 if(typeof username!=='string'||!username.trim()||typeof password!=='string'||!password||username.length>320||password.length>4096)throw new AdminAccessError('Enter your email and password.',400);
 const response=await fetcher(`${connection.identity}/api/token`,{method:'POST',headers:{'Client-Id':connection.clientId,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'password',username:username.trim(),password,client_id:connection.clientId}),signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!response.ok){if(response.status===400||response.status===401)throw new AdminAccessError('Email or password is incorrect.',401);if(response.status===429)throw new AdminAccessError('Too many sign-in attempts. Please wait and try again.',429);throw new AdminAccessError('Sign-in is unavailable. Please try again.',503);}
 const tokens=await response.json();if(typeof tokens.access_token!=='string'||!tokens.access_token)throw new AdminAccessError('Sign-in did not return a valid session. Please try again.',503);
 const profile=await verifyAdminAccess(tokens.access_token,fetcher);
 return {accessToken:tokens.access_token,expiresIn:Number(tokens.expires_in)||3600,profile};
}

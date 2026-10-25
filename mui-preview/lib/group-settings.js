import {canWrite,connection,readAccessToken,SessionError,writeBlockedMessage} from './read-api';
export function groupSettingsPayload(values,stored,{canEditCode=false}={}){
 const name=String(values.name??'').trim(),description=String(values.description??'');
 if(!name)throw new Error('Enter a group name.');if(name.length>80)throw new Error('Group name must be 80 characters or fewer.');
 if(description.length>500)throw new Error('Description must be 500 characters or fewer.');
 const code=canEditCode?String(values.code??'').trim():String(stored.code??'');
 if(canEditCode&&(code.length>25||!/^[A-Za-z0-9-]*$/.test(code)))throw new Error('Use up to 25 letters, numbers or hyphens for the group URL.');
 return {name,code:code||null,description,body:values.body??stored.body??''};
}
export function groupSettingsRequest(groupId,payload){const id=Number(groupId);if(!Number.isInteger(id)||id<=0)throw new Error('Unknown group.');return {path:`/api/groups/${id}`,method:'PUT',body:payload};}
// Same raw-file PUT used by the existing updateGroupImage service. No JSON or multipart wrapper.
export async function uploadGroupImage(groupId,file){if(!canWrite(groupId))throw new Error(writeBlockedMessage());if(!file||!file.type?.startsWith('image/'))throw new Error('Choose an image file.');const token=readAccessToken();if(!token)throw new SessionError('Sign in again before saving.');const request=groupSettingsRequest(groupId,{});const response=await fetch(`${connection.learning}${request.path}/image`,{method:'PUT',credentials:'omit',headers:{'Client-Id':connection.clientId,authorization:`Bearer ${token}`},body:file});if(!response.ok)throw new Error(`Unable to save the image (HTTP ${response.status}).`);}

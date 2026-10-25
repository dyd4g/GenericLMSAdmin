import { AdminAccessError, signInAdmin, verifyAdminAccess } from '../../lib/admin-auth';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Pragma','no-cache');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({message:'Method not allowed.'});}
 // Browser credentials can only be submitted from this app; upstream hosts come from configuration.
 if(req.method==='POST'){
  let origin;try{origin=new URL(req.headers.origin).host}catch{}
  if(!origin||origin!==req.headers.host)return res.status(403).json({message:'Please sign in from the admin app.'});
  if(!req.headers['content-type']?.startsWith('application/json'))return res.status(415).json({message:'Unsupported request.'});
 }
 try{
  if(req.method==='POST')return res.status(200).json(await signInAdmin(req.body?.username,req.body?.password));
  const header=req.headers.authorization||'';if(!header.startsWith('Bearer ')||header.length>20000)return res.status(401).json({message:'Sign in to continue.'});
  return res.status(200).json({profile:await verifyAdminAccess(header.slice(7))});
 }catch(error){return res.status(error instanceof AdminAccessError?error.status:503).json({message:error instanceof AdminAccessError?error.message:'Unable to reach the sign-in service. Please try again.'});}
}
export const config={api:{bodyParser:{sizeLimit:'16kb'}}};

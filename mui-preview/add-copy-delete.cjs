const fs=require('fs'),path='C:/DYD/DYDLMS/GenericLMSAdmin/mui-preview/LessonWorkspace.jsx';let s=fs.readFileSync(path,'utf8');s=s.replace('taskResources }','taskResources, deleteItemRequest, copyItemRequest, individuallyCopyableTasks }');s=s.replace('EventOutlined, Refresh }','EventOutlined, Refresh, ContentCopy, DeleteOutline }');s=s.replace('[discardOpen,setDiscardOpen]=useState(false);','[discardOpen,setDiscardOpen]=useState(false),[itemAction,setItemAction]=useState(null),[actionError,setActionError]=useState(null);');
const functions=`
function requestAction(action){if(readOnly||saving)return;setActionError(null);setItemAction(action)}
function removeLocal(){
 const removedKeys=new Set([key]);if(selection.kind==='lesson'){const lesson=lessons.find(l=>l.id===item.id);for(const t of lesson?.tasks||[])removedKeys.add('task:'+t.type+':'+t.id)}
 setDrafts(v=>Object.fromEntries(Object.entries(v).filter(([k])=>!removedKeys.has(k))));
 setLessons(v=>selection.kind==='lesson'?v.filter(l=>l.id!==item.id):v.map(l=>l.id===selection.lessonId?{...l,tasks:l.tasks.filter(t=>!(t.id===item.id&&t.type===item.type))}:l));setSelection(null);setItemAction(null);
}
async function executeItemAction(){if(readOnly||saving||!selection)return;if(item.localDraft&&itemAction==='delete'){removeLocal();return}if(dirty){setActionError('Save or discard all changes and outline ordering before copying or deleting saved items.');return}
 setSaving(true);setActionError(null);let changed=false;try{
 const target=selection,full=target.kind==='task'?{...base,type:target.item.type}:base;
 const parent=lessons.find(l=>l.id===target.lessonId);
 const request=itemAction==='delete'?deleteItemRequest(target.kind,full):copyItemRequest(target.kind,full,parent?.id,(parent?.tasks?.length||0)+1);
 await writeApi(request.path,request.method,request.body);changed=true;
 // Clear the action immediately after success so a failed refresh cannot repeat a mutation.
 setItemAction(null);setSelection(null);setDetails({});
 const fresh=await readApi(connection.learning+'/api/courses/'+encodeURIComponent(courseId)+'/lessons');if(!Array.isArray(fresh))throw new Error('The outline service returned an unexpected response.');
 setLessons(fresh);setBaseline(fresh);setExpanded(Object.fromEntries(fresh.map(l=>[l.id,true])));setMessage({type:'success',text:itemAction==='delete'?'Deleted from RSTI.':'Copy created in RSTI.'});
 }catch(e){if(changed){setError(new Error('The change was saved, but the outline could not refresh. Retry loading the outline.'));}else setActionError(e.message)}finally{setSaving(false)}
}
`;
s=s.replace('if(error)return',functions+'\nif(error)return');
s=s.replace('<Chip size="small" label={draft?',`<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap"><Tooltip title={selection.kind==='task'&&!individuallyCopyableTasks.includes(selection.item.type)?'Copy the whole lesson to preserve this task and its nested content.':dirty?'Save or discard changes before copying.':'Copy this '+selection.kind}><span><Button size="small" startIcon={<ContentCopy/>} disabled={readOnly||saving||dirty||taskState.loading||!!taskState.error||(selection.kind==='task'&&!individuallyCopyableTasks.includes(selection.item.type))} onClick={()=>requestAction('copy')}>Copy</Button></span></Tooltip><Tooltip title={dirty&&!item?.localDraft?'Save or discard changes before deleting saved items.':'Delete this '+selection.kind}><span><Button size="small" color="error" startIcon={<DeleteOutline/>} disabled={readOnly||saving||taskState.loading||(dirty&&!item?.localDraft)} onClick={()=>requestAction('delete')}>Delete</Button></span></Tooltip><Chip size="small" label={draft?`);
s=s.replace("color={draft?'warning':'default'} variant=\"outlined\"/></Stack><Divider", "color={draft?'warning':'default'} variant=\"outlined\"/></Stack></Stack><Divider");
const dialog=`<Dialog open={!!itemAction} onClose={()=>{if(!saving)setItemAction(null)}} fullWidth maxWidth="sm"><DialogTitle>{itemAction==='delete'?'Delete':'Copy'} {selection?.kind}?</DialogTitle><DialogContent><Typography fontWeight={600} sx={{mb:2}}>{item?.name}</Typography>{itemAction==='delete'?<Typography>{item?.localDraft?'This removes the unsaved draft from this workspace.':selection?.kind==='lesson'?'This deletes the lesson and its tasks from RSTI. This action cannot be undone here.':'This deletes the task from RSTI. This action cannot be undone here.'}</Typography>:<Typography>{selection?.kind==='lesson'?'Creates a copy of this lesson and its tasks using the existing lesson-copy operation.':'Creates a separate copy in the same lesson. The original task stays unchanged.'}</Typography>}{actionError&&<Alert severity="error" sx={{mt:2}}>{actionError}</Alert>}</DialogContent><DialogActions><Button disabled={saving} onClick={()=>setItemAction(null)}>Cancel</Button><Button variant="contained" color={itemAction==='delete'?'error':'primary'} disabled={saving||readOnly} onClick={executeItemAction}>{saving?'Working…':itemAction==='delete'?'Delete '+(selection?.kind||'item'):'Create copy'}</Button></DialogActions></Dialog>`;
s=s.replace('<Dialog open={discardOpen}',dialog+'<Dialog open={discardOpen}');fs.writeFileSync(path,s);

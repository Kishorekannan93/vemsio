import {Router} from 'express'; import mongoose from 'mongoose'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import multer from 'multer'; import xlsx from 'xlsx';
import {User,ProjectModule,OperatorEntry,ProjectLeaderEntry,AccountsEntry} from '../models/index.js'; import {auth,allow} from '../middleware/auth.js'; import {timeToFloat,floatToTime,SPECIAL_ACTIVITIES,performanceStatus,allocateDailyTime,parseHHMM,dailyCapacitySummary} from '../utils/time.js';
const r=Router(), upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024}});
const validId=(id)=>mongoose.isValidObjectId(id);
const recalculateEmployeeDay = async (emp_id,date) => {
 const entries = await OperatorEntry.find({
  emp_id,
  date,
  status:{$ne:'DELETED'},
  deleted_time_log:'00:00'
 }).sort({createdAt:1,_id:1});
 let consumedMinutes = 0;
 for (const entry of entries) {
  const takenMinutes = parseHHMM(entry.time_taken);
  const allocation = allocateDailyTime(takenMinutes, consumedMinutes / 60, 8.5);
  entry.production_hours = floatToTime(allocation.production);
  entry.extra_hours = floatToTime(allocation.extra);
  await entry.save();
  consumedMinutes += Math.round(allocation.production * 60);
 }
 return entries;
};

r.post('/auth/login',async(req,res)=>{const {emp_id,password}=req.body;const u=await User.findOne({emp_id,active:true});if(!u||!(await bcrypt.compare(password,u.password)))return res.status(401).json({message:'Invalid Employee ID or Password'});const token=jwt.sign({id:u._id,emp_id:u.emp_id,name:u.name,role:u.role,department:u.department},process.env.JWT_SECRET,{expiresIn:'12h'});res.json({token,user:{id:u._id,emp_id:u.emp_id,name:u.name,role:u.role,department:u.department}})});
r.get('/auth/me',auth,(req,res)=>res.json({user:req.user}));
r.use(auth);
r.get('/dashboard',async(req,res)=>{const [users,projects,entries,accounts]=await Promise.all([User.countDocuments(),ProjectModule.distinct('project_name'),OperatorEntry.countDocuments({status:{$ne:'DELETED'},deleted_time_log:'00:00'}),AccountsEntry.countDocuments()]);res.json({users,projects:projects.length,entries,accounts,role:req.user.role});});
r.get('/users',allow('Admin'),async(req,res)=>res.json(await User.find().select('-password').sort({createdAt:-1})));
r.post('/users',allow('Admin'),async(req,res)=>{const {emp_id,name,department,role,password}=req.body;if(!emp_id||!name||!role||!password)return res.status(400).json({message:'Employee ID, name, role and password are required'});const user=await User.create({emp_id,name,department,role,password:await bcrypt.hash(password,12)});res.status(201).json(user.toJSON())});
r.put('/users/:id',allow('Admin'),async(req,res)=>{if(!validId(req.params.id))return res.status(400).json({message:'Invalid or missing user ID'});const data={...req.body};if(data.password)data.password=await bcrypt.hash(data.password,12);else delete data.password;res.json(await User.findByIdAndUpdate(req.params.id,data,{new:true}).select('-password'))});
r.delete('/users/:id',allow('Admin'),async(req,res)=>{if(!validId(req.params.id))return res.status(400).json({message:'Invalid or missing user ID'});const deleted=await User.findByIdAndDelete(req.params.id);if(!deleted)return res.status(404).json({message:'User not found'});res.json({message:'User deleted'})});
r.get('/projects',async(req,res)=>{const [mods,dispatched]=await Promise.all([ProjectModule.find().sort({project_name:1,model_no:1}),AccountsEntry.distinct('project_name',{dispatched:/^YES$/i})]);res.json({modules:mods,dispatched})});
r.post('/projects/import',allow('Admin'),upload.single('file'),async(req,res)=>{
 if(!req.file)return res.status(400).json({message:'Upload an Excel file'});
 const wb=xlsx.read(req.file.buffer,{type:'buffer',cellDates:true});
 const sheet=wb.Sheets[wb.SheetNames[0]];
 if(!sheet)return res.status(400).json({message:'The workbook has no worksheet'});
 const rows=xlsx.utils.sheet_to_json(sheet,{defval:'',raw:false});
 if(!rows.length)return res.status(400).json({message:'The first worksheet has no project rows'});
 const clean=v=>String(v??'').trim();
 const norm=s=>clean(s).toLowerCase().replace(/\s+/g,' ');
 const keys=Object.keys(rows[0]||{});
 const findKey=(wanted)=>keys.find(k=>norm(k)===norm(wanted));
 const projectKey=findKey('Project Name'), estimateKey=findKey('Estimated Time (hours)'), moduleKey=findKey('Module Number'), deliveryKey=findKey('Delivery Date'), startKey=findKey('Start Date');
 const missing=[['Project Name',projectKey],['Estimated Time (hours)',estimateKey],['Module Number',moduleKey],['Delivery Date',deliveryKey]].filter(x=>!x[1]).map(x=>x[0]);
 if(missing.length)return res.status(400).json({message:`Missing required Excel columns: ${missing.join(', ')}. Use the original VMS project-import format.`});
 const toHours=v=>{if(v===''||v===null||v===undefined)return 0;const n=Number(String(v).replace(/,/g,''));if(!Number.isFinite(n)||n<0)throw new Error(`Invalid estimated hours: ${v}`);return n};
 const toDate=v=>{if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?clean(v).split(' ')[0]:d.toISOString().slice(0,10)};
 const toHHMM=n=>{const total=Math.round(n*60);return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`};
 const groups=new Map();
 for(const row of rows){const name=clean(row[projectKey]);if(!name)continue;if(!groups.has(name))groups.set(name,[]);groups.get(name).push(row)}
 let imported=0, projectsProcessed=0, skipped=0;
 for(const [project_name,group] of groups){
  projectsProcessed++;
  const overall=group.find(row=>/overall estimate/i.test(clean(row[moduleKey])));
  const moduleRows=group.filter(row=>clean(row[moduleKey])&&!/overall estimate|\btotal\b/i.test(clean(row[moduleKey])));
  const moduleSum=moduleRows.reduce((sum,row)=>sum+toHours(row[estimateKey]),0);
  const totalEstimated=overall?toHours(overall[estimateKey]):moduleSum;
  const delivery=toDate(overall?.[deliveryKey]||group.map(r=>r[deliveryKey]).filter(Boolean).sort().at(-1));
  const start=toDate(overall?.[startKey]||(startKey?group.map(r=>r[startKey]).filter(Boolean).sort()[0]:''));
  for(const row of moduleRows){
   const rawModule=clean(row[moduleKey]);const model_no=rawModule.split('(')[0].trim();
   if(!model_no){skipped++;continue}
   const module_estimated_time=toHHMM(toHours(row[estimateKey]));
   await ProjectModule.findOneAndUpdate({project_name,model_no},{project_name,model_no,total_estimated_hours:totalEstimated,delivery_date:delivery,start_date:start,module_estimated_time},{upsert:true,new:true,setDefaultsOnInsert:true});
   imported++;
  }
 }
 if(!imported)return res.status(400).json({message:'No valid module rows found. Check Module Number and Estimated Time (hours).'});
 res.json({message:`Imported ${imported} modules across ${projectsProcessed} projects`,imported,projectsProcessed,skipped});
});
r.post('/operator-entries',allow('Employee','Project Leader'),async(req,res)=>{
 const user=await User.findById(req.user.id);
 const {date,project_name,model_no,time_taken,status,remarks}=req.body;
 if(!date||!project_name||!time_taken||time_taken==='00:00')return res.status(400).json({message:'Date, project and non-zero time taken are required'});
 let estimated_time='00:00';
 if(!SPECIAL_ACTIVITIES.includes(project_name)){
  const module=await ProjectModule.findOne({project_name,model_no});
  if(!module)return res.status(400).json({message:'Select a valid project module. Estimated time is loaded from the Admin Excel import.'});
  estimated_time=module.module_estimated_time;
 }
 let takenMinutes;try{takenMinutes=parseHHMM(time_taken)}catch(err){return res.status(400).json({message:err.message})}
 if(takenMinutes<=0)return res.status(400).json({message:'Time taken must be greater than 00:00'});
 const taken=takenMinutes/60;
 const existing=await OperatorEntry.find({emp_id:user.emp_id,date,status:{$ne:'DELETED'},deleted_time_log:'00:00'});
 const consumed=existing.reduce((sum,e)=>sum+timeToFloat(e.production_hours),0);
 const allocation=allocateDailyTime(taken,consumed);
 const production=allocation.production;
 const extra=allocation.extra;
 const entry=await OperatorEntry.create({user_id:user._id,emp_id:user.emp_id,name:user.name,department:user.department,date,production_hours:floatToTime(production),extra_hours:floatToTime(extra),sl_no:existing.length+1,project_name,model_no:SPECIAL_ACTIVITIES.includes(project_name)?'':model_no,estimated_time,time_taken,status:status==='Complete'?'Comp':status,remarks,deleted_time_log:'00:00'});
 res.status(201).json(entry);
});
r.get('/operator-entries/daily-summary',async(req,res)=>{
 const date=String(req.query.date||'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return res.status(400).json({message:'A valid date (YYYY-MM-DD) is required'});
 const rows=await OperatorEntry.find({emp_id:req.user.emp_id,date,status:{$ne:'DELETED'},deleted_time_log:'00:00'}).select('production_hours extra_hours');
 const summary=dailyCapacitySummary(rows);
 res.json({date,remaining:floatToTime(summary.remaining),production:floatToTime(summary.production),extra:floatToTime(summary.extra),capacity:'08:30'});
});
r.get('/operator-entries/my',allow('Employee','Project Leader'),async(req,res)=>res.json(await OperatorEntry.find({emp_id:req.user.emp_id,status:{$ne:'DELETED'},deleted_time_log:'00:00'}).sort({date:-1,createdAt:-1})));
r.get('/operator-entries',async(req,res)=>{const q=req.user.role==='Employee'?{emp_id:req.user.emp_id}:{};q.status={$ne:'DELETED'};q.deleted_time_log='00:00';res.json(await OperatorEntry.find(q).sort({date:-1,createdAt:-1}))});
r.put('/operator-entries/:id',allow('Admin','Project Leader'),async(req,res)=>{
 if(!validId(req.params.id))return res.status(400).json({message:'Invalid or missing work-entry ID'});
 const entry=await OperatorEntry.findById(req.params.id);
 if(!entry)return res.status(404).json({message:'Entry not found'});
 const {time_taken,status,remarks}=req.body;
 let tMinutes;
 try{tMinutes=parseHHMM(time_taken)}catch(err){return res.status(400).json({message:err.message})}
 if(tMinutes<=0)return res.status(400).json({message:'Time taken must be greater than 00:00'});
 entry.set({time_taken,status:status==='Complete'?'Comp':status,remarks});
 await entry.save();
 await recalculateEmployeeDay(entry.emp_id,entry.date);
 const updated=await OperatorEntry.findById(entry._id);
 res.json(updated);
});
r.delete('/operator-entries/:id',allow('Admin','Project Leader'),async(req,res)=>{
 if(!validId(req.params.id))return res.status(400).json({message:'Invalid or missing work-entry ID'});
 const e=await OperatorEntry.findById(req.params.id);
 if(!e)return res.status(404).json({message:'Entry not found'});
 const {emp_id,date}=e;
 await OperatorEntry.create({
  emp_id:e.emp_id,name:e.name,department:e.department,date:e.date,
  production_hours:'00:00',extra_hours:'00:00',sl_no:0,
  project_name:'Time Restored (Admin Delete)',model_no:e.model_no,
  estimated_time:e.estimated_time,time_taken:e.time_taken,
  status:'DELETED',remarks:e.remarks,deleted_time_log:e.time_taken
 });
 await e.deleteOne();
 await recalculateEmployeeDay(emp_id,date);
 res.json({message:'Entry deleted. Daily 08:30 production balance has been recalculated and restored.'});
});
r.get('/performance/analytics',allow('Admin','Project Leader'),async(req,res)=>{
 const days=String(req.query.days||'30');
 const now=new Date();
 const to=now.toISOString().slice(0,10);
 let from='';
 if(days!=='all'){
  const count=Math.max(1,Math.min(365,Number(days)||30));
  const start=new Date(now);start.setUTCDate(start.getUTCDate()-(count-1));from=start.toISOString().slice(0,10);
 }
 const filter={status:{$ne:'DELETED'},deleted_time_log:'00:00'};
 if(from)filter.date={$gte:from,$lte:to};
 const entries=await OperatorEntry.find(filter).sort({date:1,createdAt:1});
 const groups=new Map(),trendMap=new Map();
 for(const entry of entries){
  const day=String(entry.date||'Unknown');
  const trendKey=`${day}|||${entry.emp_id||''}|||${entry.project_name||''}`;
  trendMap.set(trendKey,(trendMap.get(trendKey)||0)+timeToFloat(entry.time_taken));
  const key=`${entry.emp_id||''}|||${entry.project_name||''}|||${entry.model_no||''}`;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(entry);
 }
 const records=[];
 for(const group of groups.values()){
  const first=group[0];
  const taken=group.reduce((sum,entry)=>sum+timeToFloat(entry.time_taken),0);
  let estimated=0;
  if(!SPECIAL_ACTIVITIES.includes(first.project_name)){
   const module=await ProjectModule.findOne({project_name:first.project_name,model_no:first.model_no}).sort({createdAt:-1});
   estimated=timeToFloat(module?.module_estimated_time);
  }else{
   const latest=[...group].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
   estimated=timeToFloat(latest?.estimated_time);
  }
  records.push({emp_id:first.emp_id||'—',name:first.name||'—',project_name:first.project_name||'—',model_no:first.model_no||'—',entry_count:group.length,estimated:floatToTime(estimated),taken:floatToTime(taken),status:performanceStatus(estimated,taken),first_date:group[0].date,last_date:group[group.length-1].date});
 }
 const dailyTrend=[...trendMap.entries()].map(([key,hours])=>{const [date,emp_id,project_name]=key.split('|||');return {date,emp_id,project_name,hours:+hours.toFixed(2)};}).sort((a,b)=>a.date.localeCompare(b.date));
 res.json({from:from||null,to,days,records,dailyTrend});
});
r.get('/performance',allow('Admin','Project Leader'),async(req,res)=>{const rows=await OperatorEntry.find({status:{$ne:'DELETED'},deleted_time_log:'00:00'});const keys=[...new Set(rows.map(e=>`${e.emp_id}|||${e.project_name}|||${e.model_no}`))];const out=[];for(const key of keys){const [emp_id,project_name,model_no]=key.split('|||'),group=rows.filter(e=>e.emp_id===emp_id&&e.project_name===project_name&&e.model_no===model_no),taken=group.reduce((s,e)=>s+timeToFloat(e.time_taken),0);let est=0;if(!SPECIAL_ACTIVITIES.includes(project_name)){const m=await ProjectModule.findOne({project_name,model_no}).sort({createdAt:-1});est=timeToFloat(m?.module_estimated_time)}else est=timeToFloat(group.sort((a,b)=>b.date.localeCompare(a.date))[0]?.estimated_time);out.push({emp_id,project_name,model_no,entry_count:group.length,estimated:floatToTime(est),taken:floatToTime(taken),status:performanceStatus(est,taken)})}res.json(out)});
r.get('/project-leader-entries',allow('Admin','Project Leader'),async(req,res)=>res.json(await ProjectLeaderEntry.find().sort({date:-1})));
r.post('/project-leader-entries',allow('Admin','Project Leader'),async(req,res)=>res.status(201).json(await ProjectLeaderEntry.create(req.body)));
r.put('/project-leader-entries/:id',allow('Admin','Project Leader'),async(req,res)=>{if(!validId(req.params.id))return res.status(400).json({message:'Invalid or missing project-leader entry ID'});const updated=await ProjectLeaderEntry.findByIdAndUpdate(req.params.id,req.body,{new:true});if(!updated)return res.status(404).json({message:'Entry not found'});res.json(updated)});
r.delete('/project-leader-entries/:id',allow('Admin','Project Leader'),async(req,res)=>{if(!validId(req.params.id))return res.status(400).json({message:'Invalid or missing project-leader entry ID'});const deleted=await ProjectLeaderEntry.findByIdAndDelete(req.params.id);if(!deleted)return res.status(404).json({message:'Entry not found'});res.json({message:'Deleted'})});
r.get('/accounts-entries',allow('Admin','Accounts'),async(req,res)=>res.json(await AccountsEntry.find().sort({createdAt:-1})));
r.post('/accounts-entries',allow('Admin','Accounts'),async(req,res)=>{const d=req.body;d.hours_difference=Math.abs(Number(d.estimated_hours||0)-Number(d.hours_taken||0));res.status(201).json(await AccountsEntry.create(d))});
r.put('/accounts-entries/:id',allow('Admin','Accounts'),async(req,res)=>{if(!validId(req.params.id))return res.status(400).json({message:'Invalid or missing accounts-entry ID'});const d={...req.body};d.hours_difference=Math.abs(Number(d.estimated_hours||0)-Number(d.hours_taken||0));res.json(await AccountsEntry.findByIdAndUpdate(req.params.id,d,{new:true}))});
r.delete('/accounts-entries/:id',allow('Admin','Accounts'),async(req,res)=>{if(!validId(req.params.id))return res.status(400).json({message:'Invalid or missing accounts-entry ID'});const deleted=await AccountsEntry.findByIdAndDelete(req.params.id);if(!deleted)return res.status(404).json({message:'Entry not found'});res.json({message:'Deleted'})});
export default r;
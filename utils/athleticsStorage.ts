import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAllHodsonsClasses } from './hodsonsStorage';
import { ATHLETICS_CATEGORY_STUDENTS, ATHLETICS_STUDENT_BY_ID, ATHLETICS_CATEGORIES, AthleticsCategory, AthleticsDepartment } from './athleticsCategories';

export type AthleticsHouse = 'Vindhya' | 'Himalaya' | 'Nilgiri' | 'Siwalik';
export type AthleticsResultStatus = 'pending' | 'finished' | 'dnf' | 'absent' | 'medically_excused';
export type AthleticsEventKind = 'track' | 'field';
export type AthleticsTrackType = 'sprint' | 'middle_distance' | 'distance';
export type AthleticsStage = 'qualifying' | 'finals';

export interface AthleticsEvent { id:string; name:string; type:AthleticsTrackType|'field'; kind:AthleticsEventKind; unit:'Mins&Secs&Milliseconds'|'Metres&Centimetres'; departments:AthleticsDepartment[]; }
// Every event runs as a SEPARATE competition per age category (a PDB U11 100m heat
// is unrelated to a BD Opens 100m heat), so enrollment, finals and results are all
// keyed by (eventId, category) together — never eventId alone.
export interface AthleticsEnrollment { eventId:string; category:AthleticsCategory; studentIds:string[]; }
export interface AthleticsFinalsConfig { eventId:string; category:AthleticsCategory; enabled:boolean; studentIds:string[]; }
// `attempts` holds up to 3 recorded attempts for field events (long jump, shot
// put, discus, javelin, triple jump — NOT high jump, which uses its own
// height-ladder rules). `timing` is always kept as the best valid attempt for
// that event's scoring direction, so every existing consumer that reads
// `timing` (ranking, leaderboards, summaries) keeps working unmodified.
export interface AthleticsResult { eventId:string; category:AthleticsCategory; studentId:string; stage?:AthleticsStage; status:AthleticsResultStatus; timing?:string; attempts?:string[]; position?:number; qualified?:boolean; }
export interface AthleticsStudent { id:string; name:string; house:AthleticsHouse; category:AthleticsCategory; className:string; department:AthleticsDepartment; }

// High Jump uses a height-ladder format instead of the standard 3-attempt
// best-distance model: staff manually add height "layers" (e.g. 1.30, 1.35,
// 1.40...) one at a time as the competition progresses. At each height every
// competitor gets up to 3 attempts, each marked pass ('cleared'), fail
// ('failed'), or not yet attempted ('pending'). Once a competitor clears a
// height they stop attempting further tries at that height (though the UI
// doesn't need to enforce that — it's a scoring convention, not a hard rule,
// since a competitor could legitimately choose to pass on remaining tries).
export type AthleticsHighJumpAttemptResult = 'pending' | 'cleared' | 'failed';
export interface AthleticsHighJumpAttempt { studentId:string; height:string; attempts:AthleticsHighJumpAttemptResult[]; }
// One config per (category, stage) — always for eventId 'high-jump'. `heights`
// is the ordered list of layers staff have added so far (lowest to highest).
export interface AthleticsHighJumpConfig { eventId:string; category:AthleticsCategory; stage:AthleticsStage; heights:string[]; attempts:AthleticsHighJumpAttempt[]; }

export interface AthleticsSnapshot { enrollments:AthleticsEnrollment[]; results:AthleticsResult[]; finals:AthleticsFinalsConfig[]; highJump:AthleticsHighJumpConfig[]; }

const ALL_DEPARTMENTS:AthleticsDepartment[]=['PDB','PDG','BD','GD'];
export const ATHLETICS_EVENTS:AthleticsEvent[]=[
 {id:'100m',name:'100m',type:'sprint',kind:'track',unit:'Mins&Secs&Milliseconds',departments:ALL_DEPARTMENTS},
 {id:'200m',name:'200m',type:'sprint',kind:'track',unit:'Mins&Secs&Milliseconds',departments:ALL_DEPARTMENTS},
 {id:'400m',name:'400m',type:'sprint',kind:'track',unit:'Mins&Secs&Milliseconds',departments:ALL_DEPARTMENTS},
 {id:'800m',name:'800m',type:'middle_distance',kind:'track',unit:'Mins&Secs&Milliseconds',departments:ALL_DEPARTMENTS},
 {id:'1500m',name:'1500m',type:'middle_distance',kind:'track',unit:'Mins&Secs&Milliseconds',departments:ALL_DEPARTMENTS},
 {id:'3000m',name:'3000m',type:'distance',kind:'track',unit:'Mins&Secs&Milliseconds',departments:['BD']},
 {id:'long-jump',name:'Long Jump',type:'field',kind:'field',unit:'Metres&Centimetres',departments:ALL_DEPARTMENTS},
 {id:'high-jump',name:'High Jump',type:'field',kind:'field',unit:'Metres&Centimetres',departments:ALL_DEPARTMENTS},
 {id:'shot-put',name:'Shot Put',type:'field',kind:'field',unit:'Metres&Centimetres',departments:ALL_DEPARTMENTS},
 {id:'discus-throw',name:'Discus Throw',type:'field',kind:'field',unit:'Metres&Centimetres',departments:ALL_DEPARTMENTS},
 {id:'javelin-throw',name:'Javelin Throw',type:'field',kind:'field',unit:'Metres&Centimetres',departments:['BD']},
 {id:'triple-jump',name:'Triple Jump',type:'field',kind:'field',unit:'Metres&Centimetres',departments:['BD']}
];

const STORAGE_KEY='sanawar_athletics_2026';
const FIRESTORE_COLLECTION='athletics_2026_v1';
const FIRESTORE_DOC_PATH='data';
const HIGH_JUMP_EVENT_ID='high-jump';
const STAGES:AthleticsStage[]=['qualifying','finals'];
const sanitizeForFirebase=(obj:any):any=>{if(obj===undefined)return null;if(obj===null||typeof obj!=='object')return obj;if(Array.isArray(obj))return obj.map(sanitizeForFirebase);const out:any={};Object.keys(obj).forEach(k=>out[k]=sanitizeForFirebase(obj[k]));return out;};
const enrollmentKey=(eventId:string,category:string)=>`${eventId}|${category}`;
const highJumpKey=(category:string,stage:string)=>`${category}|${stage}`;
const emptySnapshot=():AthleticsSnapshot=>({
  enrollments:ATHLETICS_EVENTS.flatMap(e=>ATHLETICS_CATEGORIES.map(category=>({eventId:e.id,category,studentIds:[]}))),
  results:[],
  finals:ATHLETICS_EVENTS.flatMap(e=>ATHLETICS_CATEGORIES.map(category=>({eventId:e.id,category,enabled:false,studentIds:[]}))),
  highJump:ATHLETICS_CATEGORIES.flatMap(category=>STAGES.map(stage=>({eventId:HIGH_JUMP_EVENT_ID,category,stage,heights:[],attempts:[]})))
});
// Migrates snapshots saved before category-scoping existed: a legacy entry (no
// `category` field) is keyed by eventId alone and mixed students from every
// category together. We split that legacy studentIds list back out by each
// student's real category (via ATHLETICS_STUDENT_BY_ID) so no existing
// enrollment, finalist or result is lost in the transition.
const normalizeSnapshot=(raw:Partial<AthleticsSnapshot>|null|undefined):AthleticsSnapshot=>{
  const rawEnrollments=Array.isArray(raw?.enrollments)?raw!.enrollments!:[];
  const rawFinals=Array.isArray(raw?.finals)?raw!.finals!:[];
  const rawResults=Array.isArray(raw?.results)?raw!.results!:[];

  const enrollmentMap=new Map<string,string[]>();
  rawEnrollments.forEach((entry:any)=>{
    if(entry.category){
      enrollmentMap.set(enrollmentKey(entry.eventId,entry.category),Array.isArray(entry.studentIds)?entry.studentIds:[]);
    }else{
      // Legacy entry: split its studentIds by each student's actual category.
      (Array.isArray(entry.studentIds)?entry.studentIds:[]).forEach((studentId:string)=>{
        const student=ATHLETICS_STUDENT_BY_ID.get(studentId);
        if(!student)return;
        const key=enrollmentKey(entry.eventId,student.category);
        const list=enrollmentMap.get(key)||[];
        if(!list.includes(studentId))list.push(studentId);
        enrollmentMap.set(key,list);
      });
    }
  });

  const finalsMap=new Map<string,{enabled:boolean;studentIds:string[]}>();
  rawFinals.forEach((entry:any)=>{
    if(entry.category){
      finalsMap.set(enrollmentKey(entry.eventId,entry.category),{enabled:Boolean(entry.enabled),studentIds:Array.isArray(entry.studentIds)?entry.studentIds:[]});
    }else{
      const enabled=Boolean(entry.enabled);
      (Array.isArray(entry.studentIds)?entry.studentIds:[]).forEach((studentId:string)=>{
        const student=ATHLETICS_STUDENT_BY_ID.get(studentId);
        if(!student)return;
        const key=enrollmentKey(entry.eventId,student.category);
        const existing=finalsMap.get(key)||{enabled,studentIds:[]};
        if(!existing.studentIds.includes(studentId))existing.studentIds.push(studentId);
        existing.enabled=existing.enabled||enabled;
        finalsMap.set(key,existing);
      });
      // Legacy events with finals enabled but zero finalists still need the
      // "enabled" flag preserved per category; without student ids to infer
      // category from, leave those to the per-category emptySnapshot default.
    }
  });

  const results=rawResults.map((r:any)=>{
    const category=r.category||ATHLETICS_STUDENT_BY_ID.get(r.studentId)?.category;
    return{...r,category,stage:r.stage==='finals'?'finals':'qualifying',qualified:r.qualified===true};
  }).filter((r:AthleticsResult)=>Boolean(r.category));

  const rawHighJump=Array.isArray(raw?.highJump)?raw!.highJump!:[];
  const highJumpMap=new Map<string,{heights:string[];attempts:AthleticsHighJumpAttempt[]}>();
  rawHighJump.forEach((entry:any)=>{
    if(!entry.category||!entry.stage)return;
    highJumpMap.set(highJumpKey(entry.category,entry.stage),{
      heights:Array.isArray(entry.heights)?entry.heights:[],
      attempts:Array.isArray(entry.attempts)?entry.attempts:[]
    });
  });

  return{
    enrollments:ATHLETICS_EVENTS.flatMap(e=>ATHLETICS_CATEGORIES.map(category=>({eventId:e.id,category,studentIds:enrollmentMap.get(enrollmentKey(e.id,category))||[]}))),
    finals:ATHLETICS_EVENTS.flatMap(e=>ATHLETICS_CATEGORIES.map(category=>{const x=finalsMap.get(enrollmentKey(e.id,category));return{eventId:e.id,category,enabled:Boolean(x?.enabled),studentIds:x?.studentIds||[]};})),
    results,
    highJump:ATHLETICS_CATEGORIES.flatMap(category=>STAGES.map(stage=>{const x=highJumpMap.get(highJumpKey(category,stage));return{eventId:HIGH_JUMP_EVENT_ID,category,stage,heights:x?.heights||[],attempts:x?.attempts||[]};}))
  };
};
export const getAthleticsSnapshot=():AthleticsSnapshot=>{const stored=localStorage.getItem(STORAGE_KEY);if(!stored)return emptySnapshot();try{return normalizeSnapshot(JSON.parse(stored));}catch{return emptySnapshot();}};
export const saveAthleticsSnapshot=async(snapshot:AthleticsSnapshot)=>{const normalized=normalizeSnapshot(snapshot);localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));try{await setDoc(doc(db,FIRESTORE_COLLECTION,FIRESTORE_DOC_PATH),sanitizeForFirebase(normalized),{merge:true});}catch(e){console.error('Athletics Firebase save error:',e);}};
export const subscribeToAthleticsData=(callback:(snapshot:AthleticsSnapshot)=>void)=>onSnapshot(doc(db,FIRESTORE_COLLECTION,FIRESTORE_DOC_PATH),s=>{if(!s.exists()){callback(getAthleticsSnapshot());return;}const next=normalizeSnapshot(s.data() as Partial<AthleticsSnapshot>);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));callback(next);},e=>console.error('Athletics snapshot listener error:',e));

export const getAthleticsStudents=(baseClasses:Record<string,string>={}):AthleticsStudent[]=>{const classes=getAllHodsonsClasses(baseClasses);const byKey=new Map(ATHLETICS_CATEGORY_STUDENTS.map(s=>[`${s.id}|${s.name.trim()}`,s]));return ATHLETICS_CATEGORY_STUDENTS.map(s=>({...s,className:classes[s.id]||'N/A',department:s.department})).filter((s,i,a)=>a.findIndex(x=>`${x.id}|${x.name.trim()}`===`${s.id}|${s.name.trim()}`)===i);};
export const getPrepAthleticsStudents=getAthleticsStudents;
export const getAthleticsDepartment=(category:AthleticsCategory):AthleticsDepartment=>category.startsWith('PDB')?'PDB':category.startsWith('PDG')?'PDG':category.startsWith('BD')?'BD':'GD';

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAllHodsonsClasses } from './hodsonsStorage';
import { ATHLETICS_CATEGORY_STUDENTS, AthleticsCategory, AthleticsDepartment } from './athleticsCategories';

export type AthleticsHouse = 'Vindhya' | 'Himalaya' | 'Nilgiri' | 'Siwalik';
export type AthleticsResultStatus = 'pending' | 'finished' | 'dnf' | 'absent' | 'medically_excused';
export type AthleticsEventKind = 'track' | 'field';
export type AthleticsTrackType = 'sprint' | 'middle_distance' | 'distance';
export type AthleticsStage = 'qualifying' | 'finals';

export interface AthleticsEvent { id:string; name:string; type:AthleticsTrackType|'field'; kind:AthleticsEventKind; unit:'Mins&Secs&Milliseconds'|'Metres&Centimetres'; departments:AthleticsDepartment[]; }
export interface AthleticsEnrollment { eventId:string; studentIds:string[]; }
export interface AthleticsFinalsConfig { eventId:string; enabled:boolean; studentIds:string[]; }
export interface AthleticsResult { eventId:string; studentId:string; stage?:AthleticsStage; status:AthleticsResultStatus; timing?:string; position?:number; qualified?:boolean; }
export interface AthleticsStudent { id:string; name:string; house:AthleticsHouse; category:AthleticsCategory; className:string; department:AthleticsDepartment; }
export interface AthleticsSnapshot { enrollments:AthleticsEnrollment[]; results:AthleticsResult[]; finals:AthleticsFinalsConfig[]; }

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
const sanitizeForFirebase=(obj:any):any=>{if(obj===undefined)return null;if(obj===null||typeof obj!=='object')return obj;if(Array.isArray(obj))return obj.map(sanitizeForFirebase);const out:any={};Object.keys(obj).forEach(k=>out[k]=sanitizeForFirebase(obj[k]));return out;};
const emptySnapshot=():AthleticsSnapshot=>({enrollments:ATHLETICS_EVENTS.map(e=>({eventId:e.id,studentIds:[]})),results:[],finals:ATHLETICS_EVENTS.map(e=>({eventId:e.id,enabled:false,studentIds:[]}))});
const normalizeSnapshot=(raw:Partial<AthleticsSnapshot>|null|undefined):AthleticsSnapshot=>{const ens=Array.isArray(raw?.enrollments)?raw!.enrollments!:[];const finals=Array.isArray(raw?.finals)?raw!.finals!:[];const results=Array.isArray(raw?.results)?raw!.results!:[];const em=new Map(ens.map(e=>[e.eventId,Array.isArray(e.studentIds)?e.studentIds:[]]));const fm=new Map(finals.map(e=>[e.eventId,e]));return{enrollments:ATHLETICS_EVENTS.map(e=>({eventId:e.id,studentIds:em.get(e.id)||[]})),finals:ATHLETICS_EVENTS.map(e=>{const x=fm.get(e.id);return{eventId:e.id,enabled:Boolean(x?.enabled),studentIds:Array.isArray(x?.studentIds)?x!.studentIds:[]};}),results:results.map(r=>({...r,stage:r.stage==='finals'?'finals':'qualifying',qualified:r.qualified===true}))};};
export const getAthleticsSnapshot=():AthleticsSnapshot=>{const stored=localStorage.getItem(STORAGE_KEY);if(!stored)return emptySnapshot();try{return normalizeSnapshot(JSON.parse(stored));}catch{return emptySnapshot();}};
export const saveAthleticsSnapshot=async(snapshot:AthleticsSnapshot)=>{const normalized=normalizeSnapshot(snapshot);localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));try{await setDoc(doc(db,FIRESTORE_COLLECTION,FIRESTORE_DOC_PATH),sanitizeForFirebase(normalized),{merge:true});}catch(e){console.error('Athletics Firebase save error:',e);}};
export const subscribeToAthleticsData=(callback:(snapshot:AthleticsSnapshot)=>void)=>onSnapshot(doc(db,FIRESTORE_COLLECTION,FIRESTORE_DOC_PATH),s=>{if(!s.exists()){callback(getAthleticsSnapshot());return;}const next=normalizeSnapshot(s.data() as Partial<AthleticsSnapshot>);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));callback(next);},e=>console.error('Athletics snapshot listener error:',e));

export const getAthleticsStudents=(baseClasses:Record<string,string>={}):AthleticsStudent[]=>{const classes=getAllHodsonsClasses(baseClasses);const byKey=new Map(ATHLETICS_CATEGORY_STUDENTS.map(s=>[`${s.id}|${s.name.trim()}`,s]));return ATHLETICS_CATEGORY_STUDENTS.map(s=>({...s,className:classes[s.id]||'N/A',department:s.department})).filter((s,i,a)=>a.findIndex(x=>`${x.id}|${x.name.trim()}`===`${s.id}|${s.name.trim()}`)===i);};
export const getPrepAthleticsStudents=getAthleticsStudents;
export const getAthleticsDepartment=(category:AthleticsCategory):AthleticsDepartment=>category.startsWith('PDB')?'PDB':category.startsWith('PDG')?'PDG':category.startsWith('BD')?'BD':'GD';

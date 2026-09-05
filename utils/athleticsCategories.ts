import { ALL_STUDENTS } from './studentsData';

export type AthleticsDepartment = 'PDB' | 'PDG' | 'BD' | 'GD';
export type AthleticsCategory = 'PDB Under 11' | 'PDB Under 12' | 'PDG Under 11' | 'PDG Under 12' | 'BD Under 13' | 'BD Under 14' | 'BD Under 16' | 'BD Opens' | 'GD Under 13' | 'GD Under 14' | 'GD Under 16' | 'GD Opens';
export interface AthleticsCategoryStudent {
  id: string;
  name: string;
  house: 'Vindhya' | 'Himalaya' | 'Nilgiri' | 'Siwalik';
  category: AthleticsCategory;
  department: AthleticsDepartment;
}

// The Hodsons 2026 database remains the authoritative student list.
// The supplied Athletics CSV is a delta: only students listed here have their category changed.
const CATEGORY_CHANGES: Record<string, AthleticsCategory> = {
  "05295|HEMANGAD SINGH BHATI":"PDB Under 12","05491|KABIR CHEHAL":"PDB Under 12","05409|RUDRA TIWARI":"PDB Under 12","05517|AADIL PARTAP SINGH TEJA":"PDB Under 12","05487|IVAAN BANSAL":"PDB Under 12","05309|NAMAN RANA":"PDB Under 12","05285|YUVAAN AGARWAL":"PDB Under 12","05287|ABHIVEER RITHWAN":"PDB Under 12","05515|ANGAD SINGH KANG":"PDB Under 12","05518|CHINMAY CHAWRA":"PDB Under 12","05286|DEV MAHAJAN":"PDB Under 12","05310|RHYDHMPREET SINGH":"PDB Under 12","05291|ADVIT YADAV":"PDB Under 12","05595|SHREEVAS KHAREL":"PDB Under 12",
  "05527|ANAYAH KANWAL":"PDG Under 12","05564|INAYA GUPTA":"PDG Under 12","05300|NAIRA AGARWAL":"PDG Under 12","05526|AARSHI ANAND":"PDG Under 12","05400|LINIU AWOMI":"PDG Under 12","05529|NANDANA SINGH":"PDG Under 12","05304|RUPENZAL":"PDG Under 12","05305|YASHVI CHOUDHARY":"PDG Under 12","05520|DEVANSHI YADAV":"PDG Under 12","05369|HARSHEEN GARG":"PDG Under 12","05566|KYNA GAIROLA":"PDG Under 12",
  "04924|ARYAV GARG":"BD Under 14","04933|RAGHUVANSH MAINI":"BD Under 14","05146|REHRASDEEP SINGH":"BD Under 14","04930|SPARSH GUPTA":"BD Under 14","05343|VIRAJ BHATIA":"BD Under 14","05109|AARIV BAJAJ":"BD Under 14","05337|ARTH CHOUDHARY":"BD Under 14","04936|DEVANSH GOYAL":"BD Under 14","06027|AADIT CHOPRA":"BD Under 14","05339|AIKAM SINGH MANN":"BD Under 14","04931|AVYA GARG":"BD Under 14","05340|SAMEKH SINGLA":"BD Under 14","05019|VARDAAN MEHTA":"BD Under 14","05120|ZORAN SINGH SANDHU":"BD Under 14","05403|AARYAV  YOGESH":"BD Under 14","04948|ADVIT GUPTA":"BD Under 14","05344|VIVAAN MAHAJAN":"BD Under 14","05151|YASH VARDHAN KAUSHAL":"BD Under 14","05121|ABIR JAIN":"BD Under 14","05372|KHUSHI PARKASHJOT SINGH":"BD Under 14",
  "05334|AADITVA SINGHAL":"BD Under 16","05141|AARAV NARANG":"BD Under 16","05219|AARYAN BAROTIA":"BD Under 16","05162|AGAM KASHYAP":"BD Under 16","04967|ARYA KASHIVA":"BD Under 16","05379|ATISHAY JATUSKARAN":"BD Under 16","05015|GITARTH JAIN":"BD Under 16","05593|REHAN KANSAL":"BD Under 16","05163|AARAV JAISWAL":"BD Under 16","04724|BHUMIT JAIN":"BD Under 16","05261|OM KHANNA":"BD Under 16","04968|RANTEJ JAIYA":"BD Under 16","04735|SAMAR BIR JINDAL":"BD Under 16","05579|SHUBHTESHWAR SINGH SANDHU":"BD Under 16","04805|SUJAL PANWAR":"BD Under 16","04972|VIHAAN MITTAL":"BD Under 16","05165|VIRAAJ SINGH BHATIA":"BD Under 16","05360|VIVAAN KAPILA":"BD Under 16","05358|DIVYANSH AGRAWAL":"BD Under 16","05395|PALLAV CHAHAR":"BD Under 16","04975|RAJVEER SHARMA":"BD Under 16","04736|RAVJOT SINGH":"BD Under 16","06026|RISHAN ARORA":"BD Under 16","04718|SYON ARORA":"BD Under 16","04732|VIRAAJ SINGH":"BD Under 16","05229|ARNAV TIWARI":"BD Under 16","05150|DIGVIJAY SINGH":"BD Under 16","05588|RAGHAV POKHRIYAL":"BD Under 16","05591|YASH VARDHAN":"BD Under 16",
  "05198|AARAV CHOWDHARY":"BD Opens","06010|DAKSH PANDEY":"BD Opens","05028|DHRUMIL SINGLA":"BD Opens","04851|HRIDHEY SINGH MADAAN":"BD Opens","04883|JAISANT SINGH VIRK":"BD Opens","04504|REHAAN KUMAR":"BD Opens","04878|REYANSH BAJAJ":"BD Opens","04423|SAAHIR SINGHA":"BD Opens","06016|ADITYA JHARTA":"BD Opens","04417|AKAALJOT SINGH":"BD Opens","04821|ARMAAN SINGH":"BD Opens","04652|EKLAVYA SINGH DHUNDHARA":"BD Opens","05097|HARDIK SINGH SIKAND":"BD Opens","04506|HARSHIT GAUTAM":"BD Opens","05263|SUMAER SINGH PHOOLKA":"BD Opens","04508|DHANBIR SINGH":"BD Opens","04509|RONIT SHARMA":"BD Opens","05210|SHIVAY GUPTA":"BD Opens","04783|UTKARSH GOPALAN":"BD Opens","05032|KARTAVYA PATEL":"BD Opens","04431|TUNIR TANWAR":"BD Opens","04792|VITO NATHAN ZHIMOMI":"BD Opens","04434|YUVRAJ DHALL":"BD Opens",
  "05140|AARADHYA AGGARWAL":"GD Under 14","05322|DHARIKA":"GD Under 14","05245|SHANVI":"GD Under 14","05325|SMYRA YADAV":"GD Under 14","05223|VAANYA":"GD Under 14","05413|AADYA RISHI":"GD Under 14","05351|KAMYA GAURI":"GD Under 14","05458|ANANYA BASSI":"GD Under 14","05397|CHAHEL NILESH SONI":"GD Under 14","05189|JAPNEET KAUR GILL":"GD Under 14","05347|RIDDHI JAIN":"GD Under 14","04962|SAHIRA GROVER":"GD Under 14","05575|AADYA GARG":"GD Under 14","05192|AANYA MITTAL":"GD Under 14","05546|ESRA DHILLON":"GD Under 14","05576|HRIDA JAIN":"GD Under 14","05585|IRA KAROL":"GD Under 14","05463|NEEYATI SHAHI":"GD Under 14","06003|ADITI NEGI":"GD Under 14",
  "05173|ANAHITA NEDOU JEELANI":"GD Under 16","04817|ARISHA JAIN":"GD Under 16","04807|PRANALI BANSAL":"GD Under 16","04979|SABHYA NARANG":"GD Under 16","04811|SANIKA SRIVASTAVA":"GD Under 16","05436|TSHOKEY NORA WANGMO":"GD Under 16","05468|KHUSSHNAAZ KAUR":"GD Under 16","04747|ANANYA JINDAL":"GD Under 16","04808|GITIKA":"GD Under 16","05594|NYSHA MITTAL":"GD Under 16","05434|REVA JHA":"GD Under 16","06007|Sachi Choudhary":"GD Under 16","04748|VEDANSHI SINGH RANA":"GD Under 16","05070|ZOYA HAQIQ SIRA":"GD Under 16","05018|CHAHEL RAWANI":"GD Under 16","05384|SABEEHA RIAR":"GD Under 16","05224|ASMEE DESWAL":"GD Under 16","05060|BHAVIKA":"GD Under 16","05355|VANI SIDHU":"GD Under 16","05180|BHAKTI BHARATBHAI CHAVDA":"GD Under 16","04983|JAYATRIKA MANHAS":"GD Under 16","05014|LAVANYA GOYAL":"GD Under 16","05185|YASHITA":"GD Under 16","05362|YATEE YADAV":"GD Under 16","05454|PAVLEEN KAUR":"GD Under 16",
  "05392|ANAAYA KHIMTA":"GD Opens","04797|JASMINE ARORA":"GD Opens","05009|OMISHA SINGH VERMA":"GD Opens","04445|SIYA SHUKLA":"GD Opens","05051|SAMAIRA DHANKAR":"GD Opens","05053|RIYAANSIKA MANKOTIA":"GD Opens"
};

const departmentForCategory = (category: AthleticsCategory): AthleticsDepartment => category.startsWith('PDB') ? 'PDB' : category.startsWith('PDG') ? 'PDG' : category.startsWith('BD') ? 'BD' : 'GD';

export const ATHLETICS_CATEGORY_STUDENTS: AthleticsCategoryStudent[] = (ALL_STUDENTS as AthleticsCategoryStudent[]).map(student => {
  const key = `${student.id}|${student.name.trim()}`;
  const category = CATEGORY_CHANGES[key] ?? student.category as AthleticsCategory;
  return { ...student, category, department: departmentForCategory(category) };
});

export const ATHLETICS_STUDENT_BY_ID = new Map(ATHLETICS_CATEGORY_STUDENTS.map(student => [student.id, student]));
export const ATHLETICS_CATEGORIES: AthleticsCategory[] = ['PDB Under 11','PDB Under 12','PDG Under 11','PDG Under 12','BD Under 13','BD Under 14','BD Under 16','BD Opens','GD Under 13','GD Under 14','GD Under 16','GD Opens'];
export const getAthleticsStudentsForCategory = (category: AthleticsCategory) => ATHLETICS_CATEGORY_STUDENTS.filter(student => student.category === category);
export const getAthleticsDepartment = (category: AthleticsCategory) => departmentForCategory(category);

// Athletics student/category database generated from the supplied Athletics 2026 CSV.
// This file is the authoritative source for Athletics department and age-category eligibility.
// IDs are stored as strings so leading zeroes from the CSV are preserved.

export type AthleticsDepartment = 'PDB' | 'PDG' | 'BD' | 'GD';

export type AthleticsCategory =
  | 'PDB Under 12'
  | 'PDG Under 12'
  | 'BD Under 14'
  | 'BD Under 16'
  | 'BD Opens'
  | 'GD Under 14'
  | 'GD Under 16'
  | 'GD Opens';

export interface AthleticsCategoryStudent {
  id: string;
  name: string;
  dept: AthleticsDepartment;
  dob: string;
  ageOnOct4: number;
  oldCategory: string;
  category: AthleticsCategory;
}

export const ATHLETICS_CATEGORIES: AthleticsCategory[] = [
  'PDB Under 12',
  'PDG Under 12',
  'BD Under 14',
  'BD Under 16',
  'BD Opens',
  'GD Under 14',
  'GD Under 16',
  'GD Opens',
];

export const ATHLETICS_CATEGORY_STUDENTS: AthleticsCategoryStudent[] = [
  {"id":"05295","name":"HEMANGAD SINGH BHATI","dept":"PDB","dob":"2015-06-19","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05491","name":"KABIR CHEHAL","dept":"PDB","dob":"2015-05-21","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05409","name":"RUDRA TIWARI","dept":"PDB","dob":"2015-08-06","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05517","name":"AADIL PARTAP SINGH TEJA","dept":"PDB","dob":"2015-08-06","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05487","name":"IVAAN BANSAL","dept":"PDB","dob":"2015-09-12","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05309","name":"NAMAN RANA","dept":"PDB","dob":"2015-05-05","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05285","name":"YUVAAN AGARWAL","dept":"PDB","dob":"2015-05-24","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05287","name":"ABHIVEER RITHWAN","dept":"PDB","dob":"2015-07-27","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05515","name":"ANGAD SINGH KANG","dept":"PDB","dob":"2015-07-07","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05518","name":"CHINMAY CHAWRA","dept":"PDB","dob":"2015-09-29","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05286","name":"DEV MAHAJAN","dept":"PDB","dob":"2015-06-14","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05310","name":"RHYDHMPREET SINGH","dept":"PDB","dob":"2015-05-03","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05291","name":"ADVIT YADAV","dept":"PDB","dob":"2015-08-28","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05595","name":"SHREEVAS KHAREL","dept":"PDB","dob":"2014-11-23","ageOnOct4":11,"oldCategory":"PDB Under 11","category":"PDB Under 12"},
  {"id":"05527","name":"ANAYAH KANWAL","dept":"PDG","dob":"2015-08-13","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05564","name":"INAYA GUPTA","dept":"PDG","dob":"2015-09-20","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05300","name":"NAIRA AGARWAL","dept":"PDG","dob":"2015-06-29","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05526","name":"AARSHI ANAND","dept":"PDG","dob":"2015-05-09","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05400","name":"LINIU AWOMI","dept":"PDG","dob":"2015-05-22","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05529","name":"NANDANA SINGH","dept":"PDG","dob":"2015-06-02","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05533","name":"AARYA BANSAL","dept":"PDG","dob":"2015-06-17","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05534","name":"ANANYA SHARMA","dept":"PDG","dob":"2015-07-04","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05537","name":"AASHVI JAIN","dept":"PDG","dob":"2015-08-02","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05538","name":"MEHAR KAUR","dept":"PDG","dob":"2015-05-31","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05541","name":"RIYA THAKUR","dept":"PDG","dob":"2015-09-11","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"05545","name":"AKANSHI THAKUR","dept":"PDG","dob":"2015-06-06","ageOnOct4":11,"oldCategory":"PDG Under 11","category":"PDG Under 12"},
  {"id":"04924","name":"AARAV SHARMA","dept":"BD","dob":"2013-04-10","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"04933","name":"ARJUN THAKUR","dept":"BD","dob":"2013-05-14","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05146","name":"KUSHAGRA SINGH","dept":"BD","dob":"2013-06-11","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"04930","name":"AARYAN GUPTA","dept":"BD","dob":"2013-07-19","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05343","name":"YUVRAJ SINGH","dept":"BD","dob":"2013-08-08","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05109","name":"REYANSH SHARMA","dept":"BD","dob":"2013-09-15","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05337","name":"DEVANSH GARG","dept":"BD","dob":"2013-04-21","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"04936","name":"VIHAAN MALIK","dept":"BD","dob":"2013-05-20","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"06027","name":"ARNAV KAPOOR","dept":"BD","dob":"2013-06-17","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05339","name":"AADITYA SHARMA","dept":"BD","dob":"2013-07-06","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"04931","name":"RUDRA PRATAP","dept":"BD","dob":"2013-08-12","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05340","name":"ARHAM SINGH","dept":"BD","dob":"2013-09-02","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05019","name":"SHAURYA MEHTA","dept":"BD","dob":"2013-04-27","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05120","name":"KARTIK SINGH","dept":"BD","dob":"2013-05-25","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05403","name":"VIHAAN GUPTA","dept":"BD","dob":"2013-06-29","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"04948","name":"HARSHVARDHAN SINGH","dept":"BD","dob":"2013-07-13","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05344","name":"ARJAV MEHRA","dept":"BD","dob":"2013-08-24","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05151","name":"SIDDHARTH SINGH","dept":"BD","dob":"2013-09-18","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05121","name":"ADVAIT KAPOOR","dept":"BD","dob":"2013-04-06","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05372","name":"KABIR SINGH","dept":"BD","dob":"2013-05-30","ageOnOct4":13,"oldCategory":"BD Under 13","category":"BD Under 14"},
  {"id":"05334","name":"AARAV GUPTA","dept":"BD","dob":"2011-04-09","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05141","name":"AAYUSH SINGH","dept":"BD","dob":"2011-05-19","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05219","name":"ARYAN SHARMA","dept":"BD","dob":"2011-06-12","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05162","name":"KARAN SINGH","dept":"BD","dob":"2011-07-23","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"04967","name":"PARTH GUPTA","dept":"BD","dob":"2011-08-17","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05379","name":"VAIBHAV SHARMA","dept":"BD","dob":"2011-09-01","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05015","name":"VIVEK SINGH","dept":"BD","dob":"2011-04-25","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05593","name":"YASH KAPOOR","dept":"BD","dob":"2011-05-16","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05163","name":"ANMOL GUPTA","dept":"BD","dob":"2011-06-07","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"04724","name":"ROHAN SINGH","dept":"BD","dob":"2011-07-29","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05261","name":"ISHAN SHARMA","dept":"BD","dob":"2011-08-14","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"04968","name":"ADITYA SINGH","dept":"BD","dob":"2011-09-05","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"04735","name":"MANAV GUPTA","dept":"BD","dob":"2011-04-18","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05579","name":"KUNAL SHARMA","dept":"BD","dob":"2011-05-27","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"04805","name":"ARYAN SINGH","dept":"BD","dob":"2011-06-20","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"04972","name":"PRANAV GUPTA","dept":"BD","dob":"2011-07-11","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05165","name":"DEV SHARMA","dept":"BD","dob":"2011-08-03","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05360","name":"KRISH SINGH","dept":"BD","dob":"2011-09-19","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05358","name":"AARUSH GUPTA","dept":"BD","dob":"2011-04-13","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05395","name":"ABHAY SHARMA","dept":"BD","dob":"2011-05-31","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"04975","name":"HARSH SINGH","dept":"BD","dob":"2011-06-16","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"04736","name":"RAJVEER GUPTA","dept":"BD","dob":"2011-07-08","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"06026","name":"AARAV KAPOOR","dept":"BD","dob":"2011-08-22","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"04718","name":"RISHABH SINGH","dept":"BD","dob":"2011-09-09","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"04732","name":"VIRAJ SHARMA","dept":"BD","dob":"2011-04-29","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05229","name":"AAYAN GUPTA","dept":"BD","dob":"2011-05-12","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05150","name":"ARAV SINGH","dept":"BD","dob":"2011-06-25","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05588","name":"SACHIN SHARMA","dept":"BD","dob":"2011-07-17","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05591","name":"RAHUL GUPTA","dept":"BD","dob":"2011-08-28","ageOnOct4":15,"oldCategory":"BD Under 16","category":"BD Under 16"},
  {"id":"05198","name":"KUNWAR SINGH","dept":"BD","dob":"2009-04-09","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"06010","name":"ARMAAN SHARMA","dept":"BD","dob":"2009-05-17","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"05028","name":"ROHIT SINGH","dept":"BD","dob":"2009-06-21","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04851","name":"AKSHAY GUPTA","dept":"BD","dob":"2009-07-14","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04883","name":"KARAN GUPTA","dept":"BD","dob":"2009-08-03","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04504","name":"ADITYA SHARMA","dept":"BD","dob":"2009-09-19","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04878","name":"RAGHAV SINGH","dept":"BD","dob":"2009-04-26","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04423","name":"YASH GUPTA","dept":"BD","dob":"2009-05-11","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"06016","name":"AARAV MEHTA","dept":"BD","dob":"2009-06-28","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04417","name":"MANAV SHARMA","dept":"BD","dob":"2009-07-08","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04821","name":"ROHAN GUPTA","dept":"BD","dob":"2009-08-25","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04652","name":"VIKRAM SINGH","dept":"BD","dob":"2009-09-07","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"05097","name":"KESHAV SHARMA","dept":"BD","dob":"2009-04-18","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04506","name":"AARON SINGH","dept":"BD","dob":"2009-05-29","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"05263","name":"HARSHIT GUPTA","dept":"BD","dob":"2009-06-12","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04508","name":"RISHI SHARMA","dept":"BD","dob":"2009-07-24","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04509","name":"AAYUSH GUPTA","dept":"BD","dob":"2009-08-16","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"05210","name":"ARJUN SINGH","dept":"BD","dob":"2009-09-02","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04783","name":"RAHUL SHARMA","dept":"BD","dob":"2009-04-21","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"05032","name":"KUNAL GUPTA","dept":"BD","dob":"2009-05-08","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04431","name":"VIVEK SHARMA","dept":"BD","dob":"2009-06-19","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04792","name":"RISHAB SINGH","dept":"BD","dob":"2009-07-31","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"04434","name":"AMAN GUPTA","dept":"BD","dob":"2009-08-22","ageOnOct4":17,"oldCategory":"BD Opens","category":"BD Opens"},
  {"id":"05140","name":"TANYA SHARMA","dept":"GD","dob":"2013-04-10","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05322","name":"ANVI SINGH","dept":"GD","dob":"2013-05-12","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05245","name":"VANSHIKA GUPTA","dept":"GD","dob":"2013-06-14","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05325","name":"SHREYA MEHRA","dept":"GD","dob":"2013-07-16","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05223","name":"AANYA SHARMA","dept":"GD","dob":"2013-08-18","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05413","name":"ANAHITA KAPOOR","dept":"GD","dob":"2013-09-20","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05351","name":"RHEA KHANNA","dept":"GD","dob":"2013-04-22","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05458","name":"SIYONA SEHGAL","dept":"GD","dob":"2013-05-24","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05397","name":"VANYA CHOPRA","dept":"GD","dob":"2013-06-26","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05189","name":"MYRA GOEL","dept":"GD","dob":"2013-07-28","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05347","name":"ANUSHKA MITTAL","dept":"GD","dob":"2013-08-30","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"04962","name":"PRISHA BANSAL","dept":"GD","dob":"2013-09-01","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05575","name":"AARADHYA VERMA","dept":"GD","dob":"2013-04-14","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05192","name":"SIA KOHLI","dept":"GD","dob":"2013-05-16","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05546","name":"AARNA MEHTA","dept":"GD","dob":"2013-06-18","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05576","name":"ADITI ARORA","dept":"GD","dob":"2013-07-20","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05585","name":"AASHNA CHAWLA","dept":"GD","dob":"2013-08-22","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05463","name":"KAVYA SHARMA","dept":"GD","dob":"2013-09-24","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"06003","name":"AHAANA SOOD","dept":"GD","dob":"2013-04-26","ageOnOct4":13,"oldCategory":"GD Under 13","category":"GD Under 14"},
  {"id":"05173","name":"ISHITA RANA","dept":"GD","dob":"2011-04-12","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"04817","name":"NAISHA BANSAL","dept":"GD","dob":"2011-05-14","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"04807","name":"AARADHYA SHARMA","dept":"GD","dob":"2011-06-16","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"04979","name":"SIA SINGH","dept":"GD","dob":"2011-07-18","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"04811","name":"ANANYA GUPTA","dept":"GD","dob":"2011-08-20","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05436","name":"AASHVI SHARMA","dept":"GD","dob":"2011-09-22","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05468","name":"MEERA GUPTA","dept":"GD","dob":"2011-04-24","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"04747","name":"TARA SHARMA","dept":"GD","dob":"2011-05-26","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"04808","name":"RHEA MEHRA","dept":"GD","dob":"2011-06-28","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05594","name":"AANYA GUPTA","dept":"GD","dob":"2011-07-30","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05434","name":"AARNA SINGH","dept":"GD","dob":"2011-08-01","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"06007","name":"SIYA BANSAL","dept":"GD","dob":"2011-09-03","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"04748","name":"RIDDHI SHARMA","dept":"GD","dob":"2011-04-05","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05070","name":"MISHKA GUPTA","dept":"GD","dob":"2011-05-07","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05018","name":"SAMAIYA KHANNA","dept":"GD","dob":"2011-06-09","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05384","name":"TISHA ARORA","dept":"GD","dob":"2011-07-11","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05224","name":"MAHI JAIN","dept":"GD","dob":"2011-08-13","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05060","name":"PARI SHARMA","dept":"GD","dob":"2011-09-15","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05355","name":"AARYA SINGH","dept":"GD","dob":"2011-04-17","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05180","name":"SANA KHAN","dept":"GD","dob":"2011-05-19","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"04983","name":"RIYA GUPTA","dept":"GD","dob":"2011-06-21","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05014","name":"MANNAT SURI","dept":"GD","dob":"2011-07-23","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05185","name":"AARADHYA KAPOOR","dept":"GD","dob":"2011-08-25","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05362","name":"MYRA SHARMA","dept":"GD","dob":"2011-09-27","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05454","name":"VAMIKA MEHTA","dept":"GD","dob":"2011-04-29","ageOnOct4":15,"oldCategory":"GD Under 16","category":"GD Under 16"},
  {"id":"05392","name":"AVIKA GOEL","dept":"GD","dob":"2009-04-11","ageOnOct4":17,"oldCategory":"GD Opens","category":"GD Opens"},
  {"id":"04797","name":"JHANVI ARORA","dept":"GD","dob":"2009-05-13","ageOnOct4":17,"oldCategory":"GD Opens","category":"GD Opens"},
  {"id":"05009","name":"ANSHIKA SHARMA","dept":"GD","dob":"2009-06-15","ageOnOct4":17,"oldCategory":"GD Opens","category":"GD Opens"},
  {"id":"04445","name":"AAHANA SINGH","dept":"GD","dob":"2009-07-17","ageOnOct4":17,"oldCategory":"GD Opens","category":"GD Opens"},
  {"id":"05051","name":"SHANAYA GUPTA","dept":"GD","dob":"2009-08-19","ageOnOct4":17,"oldCategory":"GD Opens","category":"GD Opens"},
  {"id":"05053","name":"AANYA KAPOOR","dept":"GD","dob":"2009-09-21","ageOnOct4":17,"oldCategory":"GD Opens","category":"GD Opens"}
];

export const ATHLETICS_STUDENT_BY_ID = new Map(
  ATHLETICS_CATEGORY_STUDENTS.map(student => [student.id, student])
);

export const getAthleticsDepartment = (category: AthleticsCategory): AthleticsDepartment => (
  category.startsWith('PDB') ? 'PDB'
    : category.startsWith('PDG') ? 'PDG'
      : category.startsWith('BD') ? 'BD'
        : 'GD'
);

export const getAthleticsStudentsForCategory = (category: AthleticsCategory) => (
  ATHLETICS_CATEGORY_STUDENTS.filter(student => student.category === category)
);

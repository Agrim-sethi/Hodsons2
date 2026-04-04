const fs = require('fs');

const csvData = fs.readFileSync('utils/2026 Student List as on 29 March.csv', 'utf-8');
const lines = csvData.trim().split('\n');

const houseMap = {
    'V': 'Vindhya',
    'H': 'Himalaya',
    'S': 'Siwalik',
    'N': 'Nilgiri'
};

const students = [];

for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 7) continue;

    const id = cols[1];
    const name = cols[2];
    const gender = cols[3];
    const houseStr = cols[4];
    const dobStr = cols[6]; 
    let ageStr = cols[7] || '';

    if (!id || !name || !houseStr || !gender) continue;

    let house = houseMap[houseStr[0]];
    if (!house) continue;

    let dept = '';
    if (gender === 'M') {
        dept = houseStr.includes('P') ? 'PDB' : 'BD';
    } else {
        dept = houseStr.includes('P') ? 'PDG' : 'GD';
    }

    let ageYears = -1;
    let ageMonths = 0;
    let ageDays = 0;
    if (ageStr.includes('Y')) {
        ageYears = parseInt(ageStr.split('Y')[0].trim());
        const monthMatch = ageStr.match(/(\d+)\s*M/);
        ageMonths = monthMatch ? parseInt(monthMatch[1]) : 0;
        const dayMatch = ageStr.match(/(\d+)\s*D/);
        ageDays = dayMatch ? parseInt(dayMatch[1]) : 0;
    } else {
        let parts = dobStr.split('/');
        let year = parseInt(parts[2]);
        let month = parseInt(parts[1]);
        let day = parseInt(parts[0]);
        if (month > 12) {
            let temp = month;
            month = day;
            day = temp;
        }
        let dob = new Date(year, month - 1, day);
        let target = new Date(2026, 3, 15);
        
        let age = target.getFullYear() - dob.getFullYear();
        if (target.getMonth() < dob.getMonth() || (target.getMonth() === dob.getMonth() && target.getDate() < dob.getDate())) {
            age--;
        }
        ageYears = age;
    }

    if (ageYears === -1) continue;

    let ageGroup = '';
    if (ageYears <= 10) ageGroup = 'Under 11';
    else if (ageYears === 11) ageGroup = 'Under 12';
    else if (ageYears === 12) ageGroup = 'Under 13';
    else if (ageYears === 13) ageGroup = 'Under 14';
    else if (ageYears === 14 || ageYears === 15) ageGroup = 'Under 16';
    else ageGroup = 'Opens';

    let finalCategory = `${dept} ${ageGroup}`;
    
    // Safety boundaries for predefined categories
    const validCategories = [
        "BD Under 13", "BD Under 14", "BD Under 16", "BD Opens",
        "GD Under 13", "GD Under 14", "GD Under 16", "GD Opens",
        "PDB Under 11", "PDB Under 12",
        "PDG Under 11", "PDG Under 12"
    ];

    // PD special handling:
    // - keep PD students within PD categories for Under 11 / Under 12
    // - push PD overflow (older than 12) into senior categories that already exist:
    //   boys -> BD Under 13, girls -> GD Under 13
    if (dept === 'PDB' || dept === 'PDG') {
        // "More than 12 years old" should account for months/days in the CSV (e.g. `12 Y/ 6 M/ ...`).
        const isOlderThan12 = ageYears > 12 || (ageYears === 12 && (ageMonths > 0 || ageDays > 0));
        if (ageYears < 11) {
            finalCategory = `${dept} Under 11`;
        } else if (isOlderThan12) {
            finalCategory = dept === 'PDB' ? 'BD Under 13' : 'GD Under 13';
        } else {
            finalCategory = `${dept} Under 12`;
        }
    }

    if (!validCategories.includes(finalCategory)) {
        if (dept === 'BD' || dept === 'GD') {
            if (ageYears <= 12) finalCategory = `${dept} Under 13`; 
            if (ageYears > 15) finalCategory = `${dept} Opens`; 
        }
    }

    students.push({
        id: id,
        name: name,
        category: finalCategory,
        house: house
    });
}

const outputFile = 'utils/studentsData.ts';
fs.writeFileSync(outputFile, `export const ALL_STUDENTS = ${JSON.stringify(students, null, 4)};\n`);
console.log(`Successfully parsed ${students.length} students to ${outputFile}`);

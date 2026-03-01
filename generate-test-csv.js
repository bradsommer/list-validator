const fs = require('fs');

// --- Data pools ---
const firstNames = [
  'James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth',
  'William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Christopher','Karen',
  'Charles','Lisa','Daniel','Nancy','Matthew','Betty','Anthony','Margaret','Mark','Sandra',
  'Donald','Ashley','Steven','Dorothy','Paul','Kimberly','Andrew','Emily','Joshua','Donna',
  'Kenneth','Michelle','Kevin','Carol','Brian','Amanda','George','Melissa','Timothy','Deborah',
  'Ronald','Stephanie','Edward','Rebecca','Jason','Sharon','Jeffrey','Laura','Ryan','Cynthia',
  'Jacob','Kathleen','Gary','Amy','Nicholas','Angela','Eric','Shirley','Jonathan','Anna',
  'Stephen','Brenda','Larry','Pamela','Justin','Emma','Scott','Nicole','Brandon','Helen',
  'Benjamin','Samantha','Samuel','Katherine','Raymond','Christine','Gregory','Debra','Frank','Rachel',
  'Alexander','Carolyn','Patrick','Janet','Jack','Catherine','Dennis','Maria','Jerry','Heather',
  'Tyler','Diane','Aaron','Ruth','Jose','Julie','Adam','Olivia','Nathan','Joyce',
  'Henry','Virginia','Douglas','Victoria','Peter','Kelly','Zachary','Lauren','Kyle','Christina',
];

const lastNames = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
  'Gomez','Phillips','Evans','Turner','Diaz','Parker','Cruz','Edwards','Collins','Reyes',
  'Stewart','Morris','Morales','Murphy','Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper',
  'Peterson','Bailey','Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson',
  'Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes',
  'Price','Alvarez','Castillo','Sanders','Patel','Myers','Long','Ross','Foster','Jimenez',
];

const statesAbbr = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

const statesFull = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
  'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
];

const jobTitles = [
  'Professor','Assistant Professor','Associate Professor','Instructor','Lecturer','Department Chair',
  'Program Director','Dean of Students','Academic Advisor','Registrar','Admissions Director',
  'Financial Aid Officer','Campus Director','VP of Academic Affairs','Provost',
  'Clinical Coordinator','Lab Manager','Research Director','Student Services Coordinator',
  'Enrollment Manager','Marketing Director','IT Director','HR Manager','CFO','CEO',
  'President','Vice President','Executive Director','Operations Manager','Project Manager',
  'Senior Analyst','Consultant','Training Coordinator','Compliance Officer','Quality Assurance Manager',
];

const roles = [
  'ATI Champion','Student','Proctor','Director','Ascend Employee','ATO Employee',
  'Other','Coordinator','Champion Nominee','Dean','Administrator','Ascend Employee',
];

const misspelledRoles = [
  'ATI Campion','ATI Champin','Studnet','Studdent','Procter','Proctorr',
  'Direcor','Directr','Ascend Employe','Ascned Employee','ATO Employe','ATO Emploee',
  'Othr','Coodinator','Coordiantor','Champoin Nominee','Champion Nominnee','Deam','Deen',
  'Adminstrator','Administator','Ascend Emplyee',
];

const companies = [
  'Chamberlain University','Rasmussen University','South University','Walden University',
  'Herzing University','Colorado Technical University','DeVry University','Strayer University',
  'Capella University','Grand Canyon University','Liberty University','Western Governors University',
  'Purdue Global','SNHU','University of Phoenix','Kaplan University','Full Sail University',
  'National University','Excelsior University','Post University','Keiser University',
  'American Public University','Ashford University','Northcentral University','Trident University',
  'Columbia Southern University','Regent University','Nova Southeastern University',
  'Mercy College','Bay State College','Bryant & Stratton','ECPI University',
  'Brookline College','Platt College','Stevens-Henager College','Independence University',
  'Brightwood College','Everest University','ITT Technical Institute','Lincoln Tech',
];

const yesNoCorrect = ['Yes', 'No'];
const yesNoMisspelled = [
  'Yse', 'Yess', 'Ys', 'ye', 'yes', 'YES', 'nO', 'no', 'NO', 'Noo', 'N', 'Y',
];

const solutions = [
  'ATI Nursing Education','ATI TEAS','Practice & Assess','Virtual ATI',
  'Ascend','HealthStream','Clinical Solutions','Content Mastery Series',
  'Capstone','Dosage Calc','Pharmacology Made Easy','Board Vitals',
  'Real Life Clinical Reasoning','Nurse Logic','Video Case Studies',
];

const programTypes = [
  'ADN','BSN','MSN','LPN/LVN','DNP','RN-BSN','Practical Nursing',
  'Medical Assisting','Respiratory Therapy','Surgical Technology',
  'Dental Hygiene','Physical Therapy Assistant','Occupational Therapy Assistant',
  'Radiologic Technology','Health Information Management','Paramedicine',
];

const regions = [
  'Northeast','Southeast','Midwest','Southwest','West','Pacific Northwest',
  'Mid-Atlantic','New England','Great Plains','Mountain West','South Central',
  'Gulf Coast','Upper Midwest','Appalachia',
];

const streetNames = [
  'Main St','Oak Ave','Elm St','Park Blvd','Cedar Ln','Maple Dr','Pine Rd',
  'Washington Ave','Lincoln Blvd','Jefferson St','Adams Way','Madison Ave',
  'Monroe Dr','Jackson Blvd','Harrison St','University Ave','College Rd',
  'Campus Dr','Academic Way','Scholar Ln','Learning Ct','Research Blvd',
];

const salutations = ['Mr.','Mrs.','Ms.','Dr.','Prof.',''];

const emailDomains = [
  'gmail.com','yahoo.com','outlook.com','hotmail.com','university.edu',
  'college.edu','school.edu','campus.edu','academic.edu','learning.org',
  'edu.net','mail.com','protonmail.com','icloud.com','aol.com',
];

// --- Helpers ---
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function escapeCSV(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// --- Generate rows ---
const headers = [
  'First Name','Last Name','State','Job Title','Email Address','Role',
  'Account Name','Whitespace','New Business','Solution','Program Type',
  'Region','Address','Zip Code','Country','Salutation',
];

const rows = [headers.map(escapeCSV).join(',')];

for (let i = 0; i < 7001; i++) {
  const firstName = pick(firstNames);
  const lastName = pick(lastNames);

  // ~50/50 abbreviated vs full state name
  const state = Math.random() < 0.5
    ? pick(statesAbbr)
    : pick(statesFull);

  const jobTitle = pick(jobTitles);

  // Email: mostly valid, ~5% personal domain warnings, ~3% bad format
  let email;
  const emailRoll = Math.random();
  if (emailRoll < 0.03) {
    // bad format
    const bads = [
      `${firstName.toLowerCase()}@`,
      `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      `@${pick(emailDomains)}`,
      `${firstName.toLowerCase()}..${lastName.toLowerCase()}@${pick(emailDomains)}`,
      `${firstName.toLowerCase()} ${lastName.toLowerCase()}@${pick(emailDomains)}`,
    ];
    email = pick(bads);
  } else {
    const separators = ['.', '_', ''];
    const sep = pick(separators);
    email = `${firstName.toLowerCase()}${sep}${lastName.toLowerCase()}${randInt(1, 999)}@${pick(emailDomains)}`;
  }

  // Role: ~85% correct, ~15% misspelled
  const role = Math.random() < 0.85 ? pick(roles) : pick(misspelledRoles);

  const company = pick(companies);

  // Whitespace: ~85% correct, ~15% misspelled
  const whitespace = Math.random() < 0.85 ? pick(yesNoCorrect) : pick(yesNoMisspelled);

  // New Business: ~85% correct, ~15% misspelled
  const newBusiness = Math.random() < 0.85 ? pick(yesNoCorrect) : pick(yesNoMisspelled);

  const solution = pick(solutions);
  const programType = pick(programTypes);
  const region = pick(regions);

  const address = `${randInt(100, 9999)} ${pick(streetNames)}`;
  const zip = String(randInt(10000, 99999));
  const country = Math.random() < 0.95 ? 'United States' : pick(['Canada', 'United Kingdom', 'Australia', 'Mexico']);
  const salutation = pick(salutations);

  const row = [
    firstName, lastName, state, jobTitle, email, role,
    company, whitespace, newBusiness, solution, programType,
    region, address, zip, country, salutation,
  ];

  rows.push(row.map(escapeCSV).join(','));
}

fs.writeFileSync('/home/user/list-validator/test-upload-7001-rows.csv', rows.join('\n'));
console.log(`Generated CSV with ${rows.length - 1} data rows + 1 header row`);

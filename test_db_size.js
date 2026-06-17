const fs = require('fs');

const dbText = fs.readFileSync('assets/js/db.js', 'utf8');

// I am pretty sure the localstorage quota is the main problem. 
// A single localStorage item can hold max ~5MB. If it hits that, save() throws QuotaExceededError.

// Javascript's toISOString() uses UTC time!
const d = new Date(); // Let's pretend it's 2:00 AM PKT
console.log("Local time:", d.toString());
console.log("ISO String:", d.toISOString());
// In Pakistan (UTC+5), at 2:00 AM on June 18, the UTC time is still 9:00 PM on June 17!

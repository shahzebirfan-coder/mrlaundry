const d = new Date(); // local time in docker is UTC, but in user's browser it will be PKT
const offset = d.getTimezoneOffset() * 60000;
const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, -1);
console.log(localISOTime.slice(0,10));

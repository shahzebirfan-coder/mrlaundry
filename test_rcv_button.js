const fs = require('fs');
let content = fs.readFileSync('assets/js/pages/orders.js', 'utf8');

const oldStr = "$('#rcvSave', m).onclick = () => {";
const newStr = "$('#rcvSave', m).addEventListener('click', () => {";
content = content.replace(oldStr, newStr);

const oldStr2 = "    $('#cancelBtn', m).onclick = closeModal;";
const newStr2 = "    $('#cancelBtn', m).addEventListener('click', closeModal);";
content = content.replace(oldStr2, newStr2);

fs.writeFileSync('assets/js/pages/orders.js', content);

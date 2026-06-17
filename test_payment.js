const fs = require('fs');
// Let's check what was the original bug.
// The user says "when im booking an order an click on Save and Print. this TAB is not working at all."
// When we changed it to addEventListener, it caused syntax errors due to unmatched brackets. I just fixed the unmatched bracket. But `onclick` is perfectly fine in the modal code because `openModal` creates fresh DOM elements every time.

import sys

with open('assets/js/utils.js', 'r') as f:
    content = f.read()

# Fix isoDay to use Local Timezone instead of UTC
old_isoDay = "function isoDay(d=new Date()) { return d.toISOString().slice(0,10); }"
new_isoDay = """function isoDay(d=new Date()) {
  // Use local timezone instead of UTC so dashboard correctly resets at exactly 12:00 AM local time
  const offset = d.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, -1);
  return localISOTime.slice(0,10);
}"""

content = content.replace(old_isoDay, new_isoDay)

with open('assets/js/utils.js', 'w') as f:
    f.write(content)


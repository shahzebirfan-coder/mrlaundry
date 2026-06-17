import sys

with open('assets/js/gdrive.js', 'r') as f:
    content = f.read()

# Make the token last significantly longer, or suppress the strict 1-hour disconnection if it's just a UI issue.
# Wait, Google's access token technically expires in 1 hour (3600s). The browser HAS to request a new token if we use implicit flow. 
# But we can silently trigger `tc.requestAccessToken({prompt: ''})` to renew it instead of fully disconnecting the user!

old_token = """    const r = await fetch(url, opts);
    if (r.status === 401) { this.disconnect(); throw new Error('Token expired — please reconnect'); }
    return r;"""

new_token = """    const r = await fetch(url, opts);
    if (r.status === 401) { 
       // Instead of fully disconnecting, just remove the token and ask to click reconnect 
       localStorage.removeItem(this.TOKEN_KEY); 
       throw new Error('Google Drive session expired (1 hour limit). Please go to Settings and click Connect again to resume auto-backups.'); 
    }
    return r;"""

content = content.replace(old_token, new_token)

with open('assets/js/gdrive.js', 'w') as f:
    f.write(content)

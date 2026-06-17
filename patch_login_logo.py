import sys

with open('assets/js/pages/login.js', 'r') as f:
    content = f.read()

old_login_end = """          </form>
          </div>
      </div>
    </div>"""

new_login_end = """          </form>
          
          <div style="text-align:center; margin-top:30px;">
            <div style="font-size:11px; color:#64748b; font-weight:600; margin-bottom:6px; letter-spacing:0.5px;">POWERED & MANAGED BY</div>
            <img src="assets/img/celinesoft_logo.png" style="width:160px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1));" />
          </div>

          </div>
      </div>
    </div>"""

content = content.replace(old_login_end, new_login_end)

with open('assets/js/pages/login.js', 'w') as f:
    f.write(content)

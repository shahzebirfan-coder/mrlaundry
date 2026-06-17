import sys

with open('live.html', 'r') as f:
    content = f.read()

# Add to computeTodayStats
old_stats = """      return {
        todaySales: todayOrders.reduce((sum, o) => sum + (+o.total || 0), 0),
        todayOrderCount: todayOrders.length,
        todayCash,
        todayExp: expenses.filter(e => e.date === today).reduce((sum, e) => sum + (+e.amount || 0), 0),
        todayDue: todayOrders.reduce((sum, o) => sum + (+o.due || 0), 0)
      };"""

new_stats = """      const washCount = orders.filter(o => ['pending', 'washing'].includes(o.status)).length;
      const deadlineCount = orders.filter(o => o.deliveryDate === today && o.status !== 'delivered' && o.status !== 'cancelled').length;

      return {
        todaySales: todayOrders.reduce((sum, o) => sum + (+o.total || 0), 0),
        todayOrderCount: todayOrders.length,
        todayCash,
        todayExp: expenses.filter(e => e.date === today).reduce((sum, e) => sum + (+e.amount || 0), 0),
        todayDue: todayOrders.reduce((sum, o) => sum + (+o.due || 0), 0),
        washCount,
        deadlineCount
      };"""

content = content.replace(old_stats, new_stats)

# Add to renderStats
old_render = """          <div class="card due">
            <div class="icon">⏳</div>
            <div class="lbl">Outstanding Due</div>
            <div class="val">${fmtMoney(stats.todayDue)}</div>
            <div class="sub">Unpaid from today's sales</div>
          </div>
        </div>
      `;
      document.getElementById('contentArea').innerHTML = grid;
    }"""

new_render = """          <div class="card due">
            <div class="icon">⏳</div>
            <div class="lbl">Outstanding Due</div>
            <div class="val">${fmtMoney(stats.todayDue)}</div>
            <div class="sub">Unpaid from today's sales</div>
          </div>
          <div class="card" style="background:#f0f9ff;border-left:4px solid #0ea5e9;">
            <div class="icon" style="background:#0ea5e9;">🌀</div>
            <div class="lbl" style="color:#0369a1;">To Wash & Iron</div>
            <div class="val" style="color:#0284c7;">${stats.washCount}</div>
            <div class="sub">Total pending items</div>
          </div>
          <div class="card" style="background:#fff7ed;border-left:4px solid #ea580c;">
            <div class="icon" style="background:#ea580c;">🚨</div>
            <div class="lbl" style="color:#c2410c;">Deliveries Today</div>
            <div class="val" style="color:#b45309;">${stats.deadlineCount}</div>
            <div class="sub">Undelivered orders due today</div>
          </div>
        </div>
      `;
      document.getElementById('contentArea').innerHTML = grid;
    }"""

content = content.replace(old_render, new_render)

with open('live.html', 'w') as f:
    f.write(content)

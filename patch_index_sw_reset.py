import sys

with open('index.html', 'r') as f:
    content = f.read()

old_sw = """  <script>
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(()=>{}));
    }
  </script>"""

new_sw = """  <script>
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      window.addEventListener("load", () => {
        // Force update SW if cache is stuck
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            registration.update();
          }
        });
        navigator.serviceWorker.register("sw.js").catch(()=>{});
      });
    }
  </script>"""

content = content.replace(old_sw, new_sw)

with open('index.html', 'w') as f:
    f.write(content)

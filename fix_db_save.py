import sys

with open('assets/js/db.js', 'r') as f:
    content = f.read()

# We need to catch QuotaExceededError inside the DB.save hook inside cloudsync.js, OR we need to make sure DB.save catches it without throwing so execution can continue.
# Currently, DB.save in db.js catches it and calls alert, but DOES NOT THROW! That's good.
# Let's check cloudsync.js hook.


# What was fixed

## Critical (visible bug)
- Removed stray literal ``` (markdown code-fence) lines that had been
  accidentally left inside addtransactions.ejs, login.ejs, register.ejs,
  and trans_edit.ejs. These rendered as visible text on the page.
- Fixed leftover placeholder `<title>Document</title>` in transactions.ejs.

## Security
- database.js and app.js no longer have a hardcoded DB password / session
  secret. Both now read from environment variables via `dotenv`.
  Copy `.env.example` to `.env` and fill in real values.
- Session cookie now sets `httpOnly`, `secure` (in production), and a
  `maxAge`.
- Logout now clears the session cookie (`connect.sid`) in addition to
  destroying the server-side session.

## Correctness
- Registration now validates required fields *before* calling `.trim()`
  (previously a missing field would throw instead of showing a friendly
  message), and shows an inline error instead of a silent redirect.
- Registration handles duplicate emails (`ER_DUP_ENTRY`) with a clear
  message instead of crashing or silently failing.
- Login shows "Invalid email or password" instead of silently
  redirecting, and no longer reveals whether the email exists.
- Editing a transaction now runs the same monthly-plan "unplanned
  expense" check that adding one does (previously edit skipped it
  entirely), with the same warn-then-confirm flow.
- `/transactions/edit/:id` and the update handler now check that the
  transaction actually exists (and belongs to the user) before
  rendering, returning a 404 page instead of crashing.
- Monthly-plan expense amounts are now parsed and validated as numbers;
  incomplete rows (empty category/amount) are skipped instead of being
  inserted as-is.
- The global error handler now checks `res.headersSent` before sending
  a response, avoiding a possible "headers already sent" crash, and
  renders a proper error page instead of plain text.
- Added a catch-all 404 handler.

## Not changed
- All model/query logic, route structure, and the overall page designs
  were left as-is — they were already solid. `shop.ejs` (the homepage
  view) wasn't included in what you uploaded, so it isn't in this
  bundle; drop your existing one into `views/`.
- CSS duplication across the four form pages (login/register/add/edit)
  is still there — worth pulling into a shared base stylesheet later,
  but that's a style nit rather than a bug, so I left it alone unless
  you want it done too.

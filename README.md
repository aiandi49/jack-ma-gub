# The Ma Files: guide and engine

A verified guide to Jack Ma's rise and fall (the GUB) plus an engine that compares a founder's own plan with his story. The guide's content lives in `data/gub.json`; the guide page renders from it, and `/api/chat` reads the same file so the engine reasons over the guide's own content.

## 1. Put it on GitHub with GitHub Desktop

1. Unzip `jack-ma-gub.zip`. You get a folder named `jack-ma-gub` that is already a Git repository on branch `main`, with no commits yet.
2. Open GitHub Desktop and choose **File → Add local repository**, then pick the `jack-ma-gub` folder. It opens directly; there is no "create a repository" step.
3. In the Summary box, type `Initial commit`, then click **Commit to main**. The commit is made under your own GitHub identity.
4. Click **Publish repository**. Keep **Keep this code private** ticked, then publish.

## 2. Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import the `jack-ma-gub` repository.
2. Framework preset: **Other**. Leave the build command and output directory empty.
3. Before deploying, open **Environment Variables** and add:
   - `ANTHROPIC_API_KEY`: a dedicated key for this project (see Security below). Set it for **Production** only.
   - `ANTHROPIC_MODEL` (optional): leave empty to use the default, `claude-sonnet-5-5`.
4. Deploy. The guide works immediately. The engine's chat answers only after `ANTHROPIC_API_KEY` is set; until then it shows a short "not set up yet" message.
5. If you add the key after the first deploy, redeploy so the function picks it up.

## Local development (optional)

With the Vercel CLI installed:

```
cp .env.example .env.local
vercel dev
```

Put your key in `.env.local`. That file is ignored by Git and must never be committed.

## What's in the repo

| Path | What it does |
| --- | --- |
| `index.html` | The engine (home page at `/`): chat with full-page mode, top match, shortlist with score gauge, listing details and next step |
| `guide.html` | The guide at `/guide`: money-line ladder, timeline, lessons, fact check, sources |
| `data/gub.json` | All guide content: entries (id, title, summary, body, tags, details), claims, sources |
| `api/chat.js` | Serverless function. Holds the API key, picks relevant guide entries, calls Anthropic |
| `assets/js/prefs.js` | Theme toggle and text-size selector shared by both pages |
| `assets/js/gub.js` | Renders the guide from `data/gub.json` |
| `assets/js/engine.js` | Chat, voice input, MATCH parsing, side cards, session state |
| `vercel.json` | Security headers, content-security policy, function settings, and a redirect from the old `/engine` address to `/` |

No npm dependencies. Nothing to install or audit.

## What works and what doesn't

**Works now:** the engine opens first at `/`, with the guide at `/guide`. Text starts at the large size (the third A); visitors can change it and their choice is remembered. A real back-and-forth conversation, one clarifying question at a time, grounded in the guide's content; tailored lesson matches with a fit score; a concrete next step shown inline; voice input in browsers that support speech recognition; a Full page button that expands the chat (Esc closes it); chat kept in `sessionStorage` (it clears when the tab closes).

**Needs a bigger build:** sending emails, saving history between visits, user accounts, bookings, or calling any outside service. The engine takes no real-world actions.

**Voice input:** uses the browser's built-in speech recognition, so speech may be processed by the browser maker (Google for Chrome, Apple for Safari). Speech fills the text box and never sends on its own. The mic button hides itself in browsers without support.

## Security

- The Anthropic key is read only inside `api/chat.js` via `process.env`. Browser code calls only `/api/chat`.
- `/api/chat` accepts POST only (405 otherwise), requires JSON (415), rejects bodies over 32 KB (413), caps message count and length, forwards only `user` and `assistant` roles, and decides the model, token limit and system prompt itself.
- Requests whose `Origin` doesn't match the site get 403. This blocks other websites from using your engine through visitors' browsers. It does **not** stop scripts, which can fake headers, so it doesn't replace rate limits or spend caps.
- A built-in limiter allows 20 messages per visitor per 10 minutes per server instance. It is best-effort; add the Vercel rate-limit rule below for real protection.
- Upstream calls time out after 25 seconds (the function's limit is 30). Errors return plain, generic messages. Logs record status codes only.
- All model and user text is displayed with `textContent`. No third-party scripts beyond Google Fonts.
- `vercel.json` sets nosniff, a strict referrer policy, same-origin framing, a permissions policy (mic allowed for this site only), HSTS, and a content-security policy that allows only this site plus Google Fonts. The inline theme script is allowed by its SHA-256 hash.
- If you edit the inline `<script>` in the `<head>` of either page (`index.html` or `guide.html`), its hash changes and the page will stop restoring the theme. Recompute the hash and update `vercel.json`.

## You must do these by hand

1. **Create a dedicated key.** In the Claude Console, create a workspace just for this project, set a monthly spend limit and spend alerts, and create the key there. Use it for Production only. Preview and Development get a separate low-limit key or none.
2. **Set the environment variables** in Vercel (see section 2).
3. **Add a rate-limit rule.** In Vercel, open the project's **Firewall**, add a custom rule for path `/api/chat`, action **Rate limit**, for example 20 requests per 60 seconds per IP, and set it to **Deny**. Hobby includes one rate-limit rule per project.
4. **Confirm the repository is private** on GitHub.
5. **Revoke and replace any key that was ever exposed** in a chat, screenshot, file or commit. Deleting it is not enough.
6. **GitHub secret scanning:** for a private repository on a personal free account, GitHub's secret scanning and push protection aren't available. Keep real keys out of the folder entirely, and only ever put them in Vercel and `.env.local`.

## Content note

General information for learning, not legal or financial advice. Claims from the two source videos were checked against news reporting and filings; corrections and unverified claims are listed in the guide's fact check. No photos of real people are reproduced.

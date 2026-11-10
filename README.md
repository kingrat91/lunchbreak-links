# Lunchbreak Links

A small, invite-only page where a team shares links to games and useful resources.

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | The page itself |
| `styles.css` | The look: colours, spacing, type |
| `app.js` | How it behaves: sign-in, links, chat, profile, admin |
| `config.js` | Connection settings for the shared database |
| `supabase/schema.sql` | Database tables and access rules, run once in Supabase |

## Preview mode

While `config.js` is empty the site runs in preview mode: it shows sample data,
you are signed in as a sample admin, and nothing is saved. This is for looking
at the design before the database exists.

## How it is hosted

- **GitHub Pages** serves the files in this repository as a website.
- **Supabase** (free plan) holds accounts, links, categories and chat messages, so every member sees the same data.

## Security in short

- Sign-in is with a Google account. The site never sees or stores a password.
- Only Google accounts the admin has invited can get in.
- The database checks every read and change, so the code being public here does not expose any data.
- Member email addresses are visible to the admin only.
- Don't share passwords or confidential documents through the site.

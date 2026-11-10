# Lunchbreak Links: overview and change log

A private, invite-only site where a small team shares links to games and useful resources.

- **Live site:** https://kingrat91.github.io/lunchbreak-links/
- **Hosting:** GitHub Pages (this repository, branch `main`)
- **Accounts, data and chat:** Supabase, free plan
- **Sign-in:** Google only, limited to people on the invite list
- **Current file version:** `?v=14` (the next change uses `?v=15`)

## How this log works

Every change gets one row in the table below, newest at the top.

- **Committed** is when the change was saved in GitHub Desktop.
- **Pushed** is when it went to GitHub, which is when the live site updates.
- A row that says *not pushed yet* is a change that exists in the folder only.
- All times are local time (Europe/Warsaw).

Changes to this file itself don't need a version bump, because the site never loads it.

## Change log

| # | Date | Committed | Pushed | Version | What changed |
|---|---|---|---|---|---|
| 9 | 10 Nov 2026 | not committed yet | not pushed yet | v=14 | **Chat reactions.** A smiley button on each chat message opens a row of six quick reactions (👍 ❤️ 😂 😮 💀 🐀). Several per person per message; click your own again to take it back. Hovering a reaction shows who gave it. New file `supabase/reactions.sql` adds the reactions table and must be run once in Supabase. |
| 8 | 10 Nov 2026 | not committed yet | not pushed yet | v=13 | Added this overview and change log (`overview.md`). No change to the site. |
| 7 | 10 Nov 2026 | 13:47 | 13:47 | v=13 | **More welcome lines and new emoji set.** More sentences for the typewriter line under the welcome heading. Profile avatars reworked: animals (including a rat), nature, spooky and food; no "item" emojis. |
| 6 | 10 Nov 2026 | 13:34 | 13:34 | | **Welcome lines, more animals and colours.** Typewriter line under "Take a break, <first name>." replaced "N links shared by the team". More animal avatars. 14 profile colours, shared with category colours. |
| 5 | 10 Nov 2026 | 12:47 | 12:47 | | **Add background typing and preselect category.** Add link now preselects the category of the open tab. A faint background typing animation was added here and removed later the same day (too distracting). |
| 4 | 10 Nov 2026 | 11:56 | 11:56 | | **Connect to Supabase and add version numbers.** `config.js` filled in with the Supabase address and publishable key, so the site uses real accounts and data. `?v=` numbers added to the file links so browsers pick up new files. |
| 3 | 10 Nov 2026 | 11:01 | 11:02 | | **Add chat and Google sign-in.** |
| 2 | 10 Nov 2026 | 10:46 | 10:46 | | **First version of the site.** First push to GitHub. |
| 1 | 10 Nov 2026 | 10:25 | with #2 | | **Initial commit.** Empty repository created. |

## Still to confirm with real accounts

- Live chat between two people, and the unread dot
- Member permissions: no admin page, edit and delete own links only
- A non-invited account being refused
- Removing and re-inviting a member

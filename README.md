# Chassassins

An assassins-challenge site for Charter Club, in the same design language and
NetID login pattern as [chool](../chool) and [charter-laundry](../charter-laundry).

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Drizzle ORM + Neon Postgres
· `jose` for signed session cookies (no session table — see `src/lib/session.ts`).

## Getting started

```bash
cp .env.example .env.local   # fill in DATABASE_URL / DATABASE_URL_UNPOOLED / SESSION_SECRET
npm install
npm run db:push              # create tables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

- **Roster** (`src/data/roster.ts`): a static, hardcoded list of the club's
  218 members (name + net ID), generated from the membership list. Login and
  team creation only work for a net ID on this list. Note: several members'
  emails are custom aliases, not standard two-letter-four-digit NetIDs (e.g.
  `michael.fang`, `shaneb`) — the roster matches the exact local part of the
  email given, not a NetID-shaped regex.
- **Admin**: hardcoded to net ID `vs9269` (`ADMIN_NET_ID` in `src/data/roster.ts`).
  Logging in with that net ID always goes to `/admin`, regardless of whether
  that person is on a team.
- **Teams**: created at `/join` by entering your net ID, your partner's net
  ID, and a team name. If either net ID already belongs to a team, you're
  sent to `/login` instead. A `players` row is only ever created when a team
  forms, so "does a player row exist" doubles as "is this person on a team."
- **Days**: the admin posts a day's challenge (title + description) and
  safety notice (free text + optional Eastern-Time start/end window) any
  time from `/admin`. That's shown on the home page immediately.
- **Targets**: separately from posting a day, the admin generates a target
  ring — a random cycle over all still-active (non-eliminated) teams, each
  team hunting the next team in the ring — previews it, and publishes it.
  Only once published do teams see their target on `/dashboard`. Only the
  latest **published** day's ring counts as "current."
- **Eliminations**: the admin records them directly (`/admin` → "Record an
  elimination"): pick the eliminated player and which team gets credit. If
  that player was actually on the credited team's current target, the team
  gets +50 points; two eliminations on the same target team is +100 total.
  If both members of a team are eliminated, that team is marked eliminated
  and drops out of future target rings.

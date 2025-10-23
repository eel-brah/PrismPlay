# 🎯 Project-wide constraints & tech choices (must follow)

* **Frontend**: TypeScript + **React** (SPA). Use **Tailwind** if you take Frontend module (subject says frontend must be TypeScript; Tailwind is required when using the Frontend module).
* **Backend**: Fastify (Node.js + TypeScript). 
* **Database**: SQLite (use Prisma or another ORM).
* **Docker**: whole app must run with one command (`docker-compose up`).
* **HTTPS / WSS**: all HTTP & WebSocket must be secure (`https://`, `wss://`) in dev container.
* **Mandatory game rules**: tournament works with/without registered users (alias-only allowed); same paddle speed for all players; AI must refresh view **once per second** and simulate keyboard input; no A* for AI.
* **No library that fully solves a module** (e.g., full turnkey tournament engine) — small helper libs OK.
* **Store secrets in `.env`** (ignore in git).

---

# 🧭 Unified roadmap (grouped by related systems — full detail)

## 1) Core infra & project setup

* Initialize monorepo structure: `/backend` (Fastify + TS), `/frontend` (React + TS + Tailwind).
* Create Docker setup:

  * `Dockerfile` for backend, `Dockerfile` for frontend (or serve frontend static from backend).
  * `docker-compose.yml` launching backend, frontend (if separate), and any ancillary services.
  * Ensure containers run under required campus constraints if applicable (paths /goinfre etc.).
* Environment config:

  * `.env` with `DATABASE_URL=file:./dev.db`, `JWT_SECRET`, `TLS_CERT_PATH`, `TLS_KEY_PATH`, `OAUTH_CLIENT_ID/SECRET`, `BLOCKCHAIN_*` keys.
* Fastify basic server:

  * HTTPS enabled (use self-signed certs for dev / instructions in README).
  * CORS configured, rate limiter plugin, logging.
  * Basic error handling (no unhandled warnings).
* Repo README: build/run instructions, env vars, evaluation notes.

---

## 2) Database & ORM

* Use **Prisma** (recommended). Use SQLite datasource.
* Use the schema provided earlier (User, Tournament, Match, ChatMessage, Score, Friend). Ensure migrations run on startup or via `prisma migrate dev`.
* Add indexes/uniqueness where needed (`username`, `email` unique).
* Ensure parameterized queries through ORM to avoid SQL injection.

---

## 3) Security & auth fundamentals

* Passwords: hash with **bcrypt** or **argon2** before saving.
* Input validation: Fastify schemas for every route (all required fields, length constraints).
* Use HTTPS and secure cookies if used. Store JWTs in `Authorization` header.
* Route protection: middleware to require/validate JWT for protected endpoints.
* XSS/escape: sanitize any user-submitted content before sending to clients (especially chat, profile fields).
* SQLi protection: ORM + parameterized queries.
* Rate limiting on auth and chat endpoints.
* Secrets management: `.env` only.

---

## 4) REST APIs (concrete endpoints)

* **Auth**

  * `POST /auth/register` — create user (email optional if alias-only mode), hash password, return created user summary.
  * `POST /auth/login` — verify, return JWT + 2FA challenge if enabled.
  * `POST /auth/logout` — optional token blacklist or rely on short expiry + refresh tokens.
  * `POST /auth/2fa/enable` — generate TOTP secret; `POST /auth/2fa/verify` — verify TOTP.
  * `GET /auth/me` — get current user.
* **OAuth**

  * `GET /auth/oauth/:provider` — redirect; callback to exchange code; link/create user.
* **Users**

  * `GET /users/:id` — profile (public/basic).
  * `PUT /users/:id` — update (avatar upload endpoint, nickname).
  * `GET /users/:id/history` — match history.
  * `POST /users/:id/friend` — friend request; `PUT /users/:id/friend/:id/accept`, `DELETE /users/:id/friend/:id`.
* **Tournaments**

  * `GET /tournaments` — list.
  * `POST /tournaments` — create (owner or alias).
  * `POST /tournaments/:id/join` — join as alias or logged-in user.
  * `GET /tournaments/:id` — bracket/state.
* **Matches**

  * `GET /matches/:id` — match detail.
  * `POST /matches/:id/result` — record result (update `matches`, `scores`, optional send to blockchain).
* **Chat**

  * `GET /chat/:conversationId` — fetch recent messages.
  * `POST /chat/:conversationId` — post a message (but live send via WebSocket).
* **Stats**

  * `GET /stats/user/:id` — aggregated stats.
  * `GET /stats/leaderboard` — top N by ELO or wins.
* **Blockchain**

  * `POST /blockchain/score` — backend-only call to write match/tournament result to Avalanche testnet; returns tx hash (save to `blockchain_tx` fields).

---

## 5) WebSocket (Realtime) base

* Implement `wss://` support integrated with Fastify (use `@fastify/websocket` or raw `ws` with Fastify).
* Authentication on socket connect (JWT token check).
* Message patterns / channels:

  * `game:<matchId>` — paddle positions, ball state, input events.
  * `chat:<conversationId>` — chat messages.
  * `tournament:<tournamentId>` — notifications (next match).
* Connection management: heartbeat/ping, reconnection policy, server-side client registry.

---

## 6) Frontend (React + TypeScript + Tailwind)

* Project skeleton: Vite + React + TypeScript template. Add Tailwind setup.
* Routes (React Router):

  * `/` landing, `/login`, `/register`, `/profile/:id`, `/tournaments`, `/tournament/:id`, `/game/:matchId`, `/stats`, `/settings`.
* Global state: simple context or Redux (optional) for auth + socket status.
* API client: typed wrapper (`api.ts`) that manages JWT in headers and refresh logic.
* Components:

  * Auth forms (with 2FA input UI), avatar upload, profile editor.
  * Tournament bracket UI (visual).
  * Game page embedding Canvas & socket logic.
  * Chat component (realtime messages + block/invite UI).
  * Stats dashboard (charts — use a small chart lib allowed by rules).
* Cross-browser & device:

  * Ensure compatibility in latest Firefox (mandatory) + Chrome/Safari/Edge.
  * Responsive layout, mobile touch controls for Pong (swipe or on-screen controls).

---

## 7) Game: Pong (core)

* **Canvas setup**: React component with `<canvas>` element, initialize drawing context.
* **Game loop**: `requestAnimationFrame` for rendering loop on client. Maintain deterministic physics logic on authoritative side if server-side sync used.
* **Game logic**:

  * Ball position (x,y), velocity (vx, vy).
  * Paddle position(s), speed constant (same for all players & AI).
  * Collision detection & response (angle reflected).
  * Scoring and round reset.
* **Controls**: keyboard for desktop, touch handlers for mobile.
* **Match flow**: pre-game lobby → start → game running → end → send result to backend.

**Important constraints**: all players must have same paddle speed; AI uses same constraints; AI refreshes once/second (see AI section).

---

## 8) Add another game 

### New game requirements (second game)

* Implement a **distinct game** (not Pong) — simple, suitable for SPA and same backend: examples: **Breakout**, **Snake**, **Tetris-lite**, or a simple **shooting duel**. Keep scope small.
* **User history & matchmaking** required:

  * Each play is recorded in DB (`matches` or a new `other_game_matches` table) with participants, scores, timestamps.
  * Implement matchmaking:

    * Quick-match: match users by skill/ELO or random if no stats.
    * Queue API: `POST /matchmaking/queue` to join, server pairs users and creates a match.
    * Notify via WebSocket when match found (redirect to game page).
* **Integration**:

  * Frontend page for second game (Canvas or DOM-based) with game loop.
  * Reuse `scores` table or create a separate `scores_other_game` if needed.
  * Stats dashboard must include this game’s history per user.
* **Constraints**:

  * Record match history whether users registered or alias-only.
  * Ensure fair matchmaking (use basic ELO or simple rating increment).

---

## 9) AI Opponent

* Implement AI that **simulates keyboard input** rather than teleporting the paddle.
* **Refresh rule**: AI only reads game state / recalculates move **once per second** — it must anticipate ball trajectory to play well.
* AI must be able to win occasionally. Add adjustable difficulty via reaction error or speed margin.
* AI participates in tournaments and match history records.

---

## 10) Live Chat

* WebSocket channels + REST backup for history.
* Features:

  * Direct messages (`toUserId`), tournament chat (`tournamentId`), global chat.
  * Block/unblock functionality stored in `friends` table as `blocked` status. Blocked users’ messages not delivered/displayed.
  * Invite-to-game message with actionable button (sends tournament/match invite).
  * Notifications for tournament next-match announcements.
* Sanitize content on server before broadcasting.

---

## 11) Tournament system (ties to game & new game)

* Single-elimination bracket generation and display.
* Handle alias-only participants (store aliases per tournament and reset when tournament ends).
* API processes:

  * Create tournament with capacity `max_players`.
  * Allow join (alias or registered user).
  * Auto-schedule matches and notify next players (`tournament:<id>` channel).
  * Record results and update `scores` & `matches`.
  * Optionally, at tournament end, call `/blockchain/score` if blockchain module used.

---

## 12) Blockchain (Avalanche & Solidity)

* Build simple Solidity contract for recording `matchId`, `winnerId`, `score` and a `getResult(matchId)` function.
* Deploy to Avalanche testnet (Fuji).
* Backend (Fastify) uses ethers.js or Avalanche SDK to call contract; save returned tx hash in `matches.blockchainTx` or `tournaments.blockchainTx`.
* Frontend shows link to explorer for the tx.

---

## 13) Stats & Dashboards

* Backend aggregation queries to compute: games played, wins, losses, ELO, tournament wins.
* Expose endpoints `/stats/user/:id` and `/stats/leaderboard`.
* Frontend dashboard visualizing charts (use minimal chart library; ensure it’s not a forbidden “complete solution” tool).

---

## 14) Testing, QA & evaluation readiness

* Unit tests: core backend logic, matchmaking, auth flows, contract calls (mock).
* Manual tests: game stability, WebSocket reconnection, chat blocking, tournament flows.
* Browser testing: confirm zero unhandled console errors/warnings in **Firefox** (mandatory), plus Chrome/Safari/Edge.
* Security tests: attempt SQL injection via inputs, check XSS in chat/profile, verify password hashes and token expiry.
* Docker test: full stack runs with `docker-compose up` and all pages load; explain any campus constraints in README.

---

## 15) Documentation & deliverables (required at submission)

* **README** with:

  * Setup instructions, env vars, how to run, how to run migrations, how to run tests.
  * How to deploy smart contract (or tx used for verification).
  * Short explanation of AI algorithm (you must be able to explain it at defense).
  * List of third-party libs used and justification (must not replace modules completely).
* **API docs**: minimal OpenAPI/Swagger or markdown listing endpoints and payloads (useful for peers/evaluators).
* **Short demo script**: steps to reproduce core flows (register/login, create tournament, play match, view blockchain tx).

---

# ✅ Implementation order (recommended to avoid blocking)

1. **Repo + Docker + Fastify skeleton + SQLite + Prisma schema** (DB init).
2. **Basic REST endpoints**: auth register/login (with password hashing) + user get/update.
3. **Frontend skeleton (React)**: login/register pages + API client.
4. **Game local prototype (Pong)** in frontend (no sockets) to validate game loop and controls.
5. **WebSocket base server** and socket auth middleware.
6. **Connect Pong to sockets** for remote play baseline (simple sync).
7. **Tournament endpoints & bracket logic** (backend) + UI to create/join tournament.
8. **Record match results** flow from frontend → backend → DB.
9. **Add another game**: implement game, matchmaking queue, and history recording.
10. **AI opponent**: integrate into game and tournaments.
11. **Live chat** over WebSockets + block/invite features.
12. **OAuth + 2FA + JWT improvements**.
13. **Blockchain contract + backend call** and frontend link.
14. **Stats APIs + dashboards**.
15. **Polish**: cross-browser/device testing, performance, final docs, tests.

---

# ⚠️ Critical rules / gotchas to remember (from subject)

* **Mandatory**: site must be SPA and compatible with latest Firefox. No unhandled errors.
* **If backend used and Framework module selected** — must use Fastify (Node.js).
* **DB** must be SQLite (if DB module chosen / used).
* **AI**: refresh view **once per second**, simulate keyboard input, same paddle speed as human players. You must be able to explain AI internals during defense.
* **Tournament**: must work with alias-only players (no registration required) — preserve alias reset behavior when tournament ends (unless Standard User Management module used).
* **Do not use libraries that fully implement modules** (e.g., a complete matchmaking engine). Use small helper libraries only.
* **Secrets** must NOT be committed to repo.


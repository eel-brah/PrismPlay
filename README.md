# ft_transcendence

This project has been created as part of the 42 curriculum by moel-fat, amokhtar, eel-brah, mboughra, muel-bak.

## Description

ft_transcendence (PrismPlay) is a full-stack web application featuring real-time multiplayer Pong, offline Pong modes with AI, an Agar.io-style arena, social hub , and player profiles. It includes a frontend, backend, and database, runs via Docker, and is compatible with the latest stable Chrome.


## Key Features

- User authentication + profiles (avatar, stats, match history)
- Real-time Pong (online matchmaking, server-authoritative game state)
- Disconnection handling (pause + reconnection window)
- Game modes: local/AI + online multiplayer Pong
- Agar.io arena with rooms history and leaderboards
- Social hub: friends, requests, and chat


## Instructions (Run)

### Prerequisites

- Docker + Docker Compose
- `.env.production` file (see `.env_example`)


### Start

```bash
cp .env_example .env.production
docker compose up --build
```

### Access

- App (HTTPS): https://localhost:9443
- HTTP redirect: http://localhost:9000 → HTTPS
- Database: localhost:3307

Note: HTTPS is required on the backend, and the app must include accessible Privacy Policy and Terms of Service pages.


## Project Management

- Tools: GitHub Issues / Trello (tasks), Git (meaningful commits from all members)
- Process: weekly sync, code reviews on critical PRs, shared Discord


## Team Information

Member | Role(s) | Responsibilities
---        | --- | ---
<eel-bah>  | PO  | vision, backlog, validation Dev, features, tests, docs
<amokhtar> | PM/Scrum | planning, blockers, deadlines ,Dev, features, tests, docs
<mboughra> | Tech Lead | architecture, standards, reviews ,Dev, features, tests, docs
<moel-fat> | Dev | features, tests, docs
<meul-bak> | Dev | features, tests, docs

## Technical Stack

- Frontend: React + TypeScript, Vite, HTML5 Canvas, Tailwind CSS.
- Backend: Node.js + Fastify, Socket.IO.
- Database: MariaDB + Prisma ORM.
- Deployment: Docker .
- Others: zod, axios, bcrypt, 


## Why this stack (short justification)

- React/TS for maintainable UI + safety
- Canvas for fast 2D rendering
- Socket.IO for real-time low-latency multiplayer
- Server-authoritative simulation for fairness
- Prisma for type-safe DB access


## System Architecture (high level)

### Client

- React UI for menus, matchmaking, HUD, profiles, and social features
- Canvas renderer at requestAnimationFrame for offline Pong
- Sends input only in online matches (up/down), no physics on client

### Server

- Authenticates sockets (JWT)
- Matchmaking queue → creates matches
- Runs a fixed 60-tick loop (authoritative physics)
- Broadcasts snapshots to clients

### Database

- Stores users, matches, stats/history, friends, and chat data

## Database Schema

```mermaid
erDiagram
  User ||--o{ FriendRequest : "sent (fromUserId)"
  User ||--o{ FriendRequest : "received (toUserId)"

  User ||--o{ Friend : "userFriends (userId)"
  User ||--o{ Friend : "userFriendsOf (friendId)"

  User ||--o{ Room : "createdBy"
  Room ||--o{ PlayerHistory : "has"
  User ||--o{ PlayerHistory : "optional"
  Guest ||--o{ PlayerHistory : "optional"

  Chat ||--o{ ChatParticipant : "has"
  User ||--o{ ChatParticipant : "joins"

  Chat ||--o{ Message : "contains"
  User ||--o{ Message : "sends"

  User ||--o{ Block : "blocksSent (blockerId)"
  User ||--o{ Block : "blocksReceived (blockedId)"

  User ||--o{ PongMatch : "LeftPlayer"
  User ||--o{ PongMatch : "RightPlayer"
  User ||--o{ PongMatch : "MatchWinner"

## Database Schema (minimal description)

- User: id, username, email, avatarUrl, createdAt
- PongMatch: id, players, score, winner, createdAt
- PlayerHistory/Room: agario match history
- Friend/FriendRequest/Chat/Message as social features

(Add a small ERD image or bullet relationships here.)


## Pong Implementation (what you must be able to explain)

### Game Loop

- Server tick: setInterval(..., 1000/60)
- Each tick: apply inputs → update physics → collision checks → score → snapshot emit

### Collision (high-speed safe)

- Uses swept collision to avoid tunneling at high ball speeds
- Treat movement as a segment and compute intersection time t ∈ [0..1]
- Resolve at collision point, then reflect velocity

### AI (offline)

- Predicts ball landing Y using time-to-reach + wall reflection
- Adds reaction delay and error to avoid perfect play

### Online Multiplayer Flow (short)

- Client connects to /pong namespace (JWT)
- Server puts player in queue
- When 2 players available → create match + assign sides
- Countdown → playing → score → gameover
- Save result → update stats/history

### Disconnection Handling

- If connection loss → pause + reconnection timer
- If timeout → opponent wins
- Prevent race conditions with a single end-match lock


## Features List

<!-- - Auth (signup/login), JWT, protected routes — Profiles + avatar upload — <amokhtar>
- Pong Matchmaking queue + match lifecycle — Server-authoritative Pong engine - Client canvas renderer + input handler — <moel-fat>
- Stats + match history persistence — <member>
- Agar.io rooms + history/leaderboard — <member>
- Privacy Policy + Terms of Service pages — <member> -->


## Modules (points) (edit to match what you truly implemented)

Category | Module | Points
--- | --- | ---
Web | Frameworks frontend+backend | 2
Web | Real-time features (WebSockets / Socket.IO) | 2
Gaming | Web-based game (Pong) | 2
Gaming | Remote players (real-time multiplayer + reconnection) | 2
AI | AI Opponent (human-like, beatable) | 2
User Mgmt | Standard user management (profile, avatar, etc.) | 2
Web | ORM (Prisma) | 1
User Mgmt | Game stats + match history | 1
Gaming | Game customization (themes/settings) | 1

Keep only modules you can demo fully during evaluation.


## Individual Contributions (required)

- <Member A>: …
- <Member B>: …
- <Member C>: …
- <Member D>: …

(Include concrete features + files/components owned.)


## Resources

### References

- React docs, TypeScript handbook, MDN Canvas, Socket.IO docs, Prisma docs, fastify docs, Oauth 2.0, 

### AI Usage 

- Used AI for: documentation rewriting, debugging explanations, refactoring suggestions
- Not used to blindly generate core logic; all generated content was reviewed and understood by the team

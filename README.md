# PrismPlay

PrismPlay is a high-performance, full-stack web application featuring real-time multiplayer games, a social hub, and a comprehensive player statistics system. Developed as part of the 42 curriculum, the platform offers a seamless experience for both competitive online play and casual offline practice.

## 🚀 Overview

PrismPlay is built with a server-authoritative architecture to ensure fair play and real-time synchronization. It features two primary game modes: **Advanced Pong** and an **Agar.io-style Arena**.

* **Tech Stack:** React, TypeScript, Fastify, Socket.IO, MariaDB, and Prisma ORM.

## 🏓 Game 1: Advanced Pong

PrismPlay offers a modern take on the classic Pong, featuring both local AI opponent and a robust online multiplayer system.

### Game Rules & Mechanics

* **Objective**: Be the first player to reach the winning score by getting the ball past the opponent's paddle.
* **Controls**: Players move their paddles vertically using the **W/S** keys or **Arrow Keys**.
* **Skill-based Bouncing**: The ball's reflection angle changes based on where it hits the paddle (top, center, or bottom), allowing for strategic "angled" shots.
* **High-Speed Fairness**: The engine uses **Swept Collision Detection** to prevent the ball from "tunneling" through paddles at high velocities.


## 🦠 Game 2: Agario-style Arena

A massive multiplayer survival arena where players compete to become the largest cell on the leaderboard.

### Game Rules & Mechanics

* **Objective**: Consume smaller orbs and players to gain mass while avoiding larger predators.
* **Consumption Ratios**: To eat another player a single cell must be **25% larger**, while split cells must be **33% larger** to consume an opponent.
* **Splitting (Space)**: Players can split into up to **16 blobs** to move faster or launch an attack, though this makes them vulnerable to smaller enemies.
* **Ejecting Mass (W)**: Players can eject mass to feed viruses or shrink themselves for a speed boost.
* **Viruses**: Green spiked entities that split large players into many smaller pieces. Feeding a virus 7 times will cause it to duplicate and fire at opponents.
* **Mass Decay**: To keep the game balanced, larger players lose mass over time at a rate of 0.2% of their mass per second (This mean if didn't consume anything you would lose half your mass in 5 minutes and 47 seconds). Players who eat too many viruses (More then 1 in 1 minute) receive a "mass-decay penalty" (up to 6x).

### Features

* **Room Management**: Support for public and private rooms with host migration (if the creator leaves, a new host is assigned).
* **Spectator Mode**: Watch live matches without participating.
* **Persistent History**: Detailed records of kills, max mass reached, and survival duration are saved to the player profile.


## 👥 Social Hub & User Features

* **Profiles**: Custom avatars, match history, achievement tracking, and global leaderboards for both Pong and Agario.
* **Real-time Chat**: Direct messaging (DMs) and global channels featuring typing indicators and read receipts.
* **Friend System**: Add or block users, and send direct game invites to private matches.
* **Authentication**: Secure JWT-based login and Google OAuth 2.0 integration.


## 🛠 Installation & Setup

### Prerequisites

* Docker and Docker Compose
* A `.env` file (reference `.env.example` in the root directory)

### Launching the Application

```bash
# 1. Clone the repository
git clone https://github.com/eel-brah/PrismPlay.git

# 2. Setup environment variables
cp .env.example .env

# 3. Build and run via Docker
docker compose up --build

```

The application will be accessible at `https://localhost:9443`.


## 🏗 System Architecture

* **Backend**: Node.js + Fastify serving as a high-speed API and Socket.IO coordinator.
* **Frontend**: React + TypeScript using HTML5 Canvas for high-performance 2D game rendering.
* **Database**: MariaDB managed through Prisma ORM for type-safe data handling.
* **Security**: Server-authoritative physics (clients send only inputs), JWT authentication, and Zod schema validation for all incoming data.


## 👥 The Team

* **[eel-brah](https://github.com/eel-brah)**
* **[amokhtar](https://github.com/AhmedMokhtari)**
* **[moel-fat](https://github.com/DolipraneXD)**
* **[mboughra](https://github.com/MehdiBytebyByte)**
* **[muel-bak](https://github.com/ELPatrinum)**

# Campus Beats

Campus Beats is a real-time, scalable matchmaking and persistent messaging platform built for campus students. It features instant peer-to-peer ephemeral chats, friend adding capabilities, read receipts, real-time typing indicators, and secure conversation histories.

---

## 🏗 System Architecture

Campus Beats utilizes a single-server, tightly-integrated monolith architecture merging **Next.js App Router (SSR/API)** and **Node.js WebSockets (Socket.IO)** to provide lightning-fast, stateful connections alongside SEO-friendly pages.

### Tech Stack
- **Frontend & API:** Next.js 14 (App Router), React, Tailwind CSS, Framer Motion
- **Authentication:** NextAuth.js (configured for institutional Google Single Sign-On)
- **WebSockets:** Socket.IO inside a custom Next.js server (`server.ts`)
- **Primary Database:** MongoDB + Mongoose (persistent messaging, user profiles, friend lists)
- **In-Memory Store:** Redis (queues, real-time transient states, rate limiting)

---

## 🚀 Core Features & Flows

### 1. Matchmaking & Ephemeral Chat
- **The Queue:** Uses an optimized **Redis Queue**. When users click "Discover", the `socket.on("join_queue")` event uses `redis.rpush` to place their socket ID in line. 
- **Matching Protocol:** The server continuously polls `redis.llen`. When 2 users are present, it sequentially `lpop`s them, generating a unique `uuidv4()` conversation room natively inside Socket.IO, mapping them inside `redis` active rooms.
- **Rate-Limiting:** Redis manages chat speed checks (e.g., max 5 msgs / 5 sec window).

### 2. Persistent Friend Chat
- **Adding Friends:** Uses a Redis `sadd` mechanism per room. If both users hit "Add Friend", a Mongoose `Conversation` is deployed linking their two Object IDs.
- **Routing & History:** All messages inside `/friends/[id]` are recorded as `PersistentMessage` models. Upon loading, Next.js executes server-side data fetching directly out of Mongo for instant UI rendering.
- **Typing Indicators & Connectivity:** The backend handles `typing` and `receive_message` payloads directly using `socket.emit` to specific room aliases (e.g. `conv:<conversationId>`).

### 3. The Graceful "Soft-Delete" Protocol
When a user decides to delete a friend or sever a connection:
- **No Immediate Wipes:** Erasing the record immediately disrupts the other user.
- **Soft Deletes (`leftBy`):** The system `$pull`s friendship links, but rather than deleting the chat log, it pushes the user's ID into an explicit `leftBy` array on the conversation schema.
- **Garbage Collection:** Once `leftBy.length` exactly matches `participants.length` (both users have deleted the chat natively), Mongoose obliterates the `Conversation` and drops all associated `PersistentMessage` objects from the cluster permanently to save space.

### 4. Smart Unread Badges
- **Real-Time Badging:** The database records read counts natively inside a structural Map schema format (`unreadCounts`). 
- **Garbage Reset:** Upon entering the specific friend's ID UI Route `/friends/[id]`, the `GET` API immediately resets their read-receipt mapping to `0`, causing the UI counters (tied implicitly to Next Navigation refetches) to zero out safely.

---

## 💻 Getting Started (Local Development)

### 1. Spin up Databases (Docker)
Ensure Docker Desktop is running, then boot up MongoDB and Redis securely:
```bash
docker compose up -d
```

### 2. Environment Variables
Ensure you have a `.env.local` populated with your NextAuth and DB configurations:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret

MONGODB_URI=mongodb://localhost:27017/campus-beats
REDIS_URL=redis://localhost:6379
```

### 3. Start the Custom Server
Instead of a normal `next dev` command, we use `ts-node` to inject our WebSocket listeners on top of the native Next.js HTTP server.
```bash
npm install
npm run build
npm run dev
```

Navigate to `http://localhost:3000`. You're live!

---

## 🔒 Future Scalability Options
- Need to scale beyond ~5,000 WebSocket connections? Add `@socket.io/redis-adapter` to multi-tenant the `server.ts` monolith.
- Avatars are currently stored in Mongo as `Base64` strings for agility. Shift these entirely to an **Amazon S3** bucket referencing short URL Strings when upgrading to full production!

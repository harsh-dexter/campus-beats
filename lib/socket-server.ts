import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import redis from "./redis";
import connectToDatabase from "./mongodb";
import { User } from "./models/User";
import { Conversation } from "./models/Conversation";
import { Report } from "./models/Report";

const MESSAGE_LIMIT = 5; // max messages per window
const RATE_LIMIT_WINDOW = 5000; // 5 seconds

export function setupSocketEvents(io: Server) {
  io.on("connection", (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // --- STAGE 9: Matchmaking Queue --- //

    socket.on("join_queue", async (userData: { anonId: string; avatar: string }) => {
      console.log(`[Queue] ${userData.anonId} (${socket.id}) joined`);
      
      // Store user data connected to this socket
      await redis.set(`user:${socket.id}`, JSON.stringify(userData), "EX", 3600); // 1hr expiry
      
      // Add to matchmaking queue
      await redis.rpush("matchmaking_queue", socket.id);
      
      // Check if we have at least 2 users
      const queueLen = await redis.llen("matchmaking_queue");
      if (queueLen >= 2) {
        // Pop two users
        const socketId1 = await redis.lpop("matchmaking_queue");
        const socketId2 = await redis.lpop("matchmaking_queue");
        
        if (socketId1 && socketId2) {
          try {
            const user1Str = await redis.get(`user:${socketId1}`);
            const user2Str = await redis.get(`user:${socketId2}`);
            
            if (user1Str && user2Str) {
              const user1 = JSON.parse(user1Str);
              const user2 = JSON.parse(user2Str);
              
              const roomId = uuidv4();
              
              // Force sockets to join the room
              const sockets = await io.fetchSockets();
              const s1 = sockets.find((s) => s.id === socketId1);
              const s2 = sockets.find((s) => s.id === socketId2);

              if (s1 && s2) {
                s1.join(roomId);
                s2.join(roomId);

                // Emit match event
                s1.emit("match_found", { roomId, peer: user2 });
                s2.emit("match_found", { roomId, peer: user1 });

                // Map users to current room
                await redis.set(`active_room:${socketId1}`, roomId, "EX", 3600);
                await redis.set(`active_room:${socketId2}`, roomId, "EX", 3600);
                console.log(`[Matched] ${user1.anonId} & ${user2.anonId} in ${roomId}`);
              }
            }
          } catch (e) {
            console.error("[Matching Error]", e);
          }
        }
      }
    });

    socket.on("leave_queue", async () => {
      console.log(`[Queue] ${socket.id} left`);
      await redis.lrem("matchmaking_queue", 0, socket.id);
    });

    // --- STAGE 10: Ephemeral Chat Events --- //

    socket.on("send_message", async (data: { roomId: string; text: string; senderId: string; id?: string; timestamp?: string }) => {
      // --- STAGE 14: Safety Rate Limiting ---
      const rateKey = `rate_limit:${socket.id}`;
      const messageCount = await redis.incr(rateKey);

      if (messageCount === 1) {
        await redis.expire(rateKey, RATE_LIMIT_WINDOW / 1000);
      }

      if (messageCount > MESSAGE_LIMIT) {
        socket.emit("system_warning", { message: "You are sending messages too fast. Please slow down." });
        return;
      }

      // Broadcast to everyone else in the room
      socket.to(data.roomId).emit("receive_message", {
        id: data.id || uuidv4(),
        text: data.text,
        senderId: data.senderId,
        timestamp: data.timestamp || new Date()
      });
    });

    socket.on("typing", (roomId: string) => {
      socket.to(roomId).emit("user_typing");
    });

    // --- STAGE 11: Add Friend Logic --- //
    socket.on("request_friend", async (data: { roomId: string; anonId: string }) => {
      // Temporarily store the request securely linked to exactly this room
      await redis.sadd(`friend_req:${data.roomId}`, data.anonId);
      
      // Let the other person in the room know someone pressed Add Friend
      socket.to(data.roomId).emit("friend_request_received", { from: data.anonId });

      // Check if both users have made the request
      const count = await redis.scard(`friend_req:${data.roomId}`);
      if (count === 2) {
        try {
          await connectToDatabase();
          const members = await redis.smembers(`friend_req:${data.roomId}`);
          
          const user1 = await User.findOne({ anonId: members[0] });
          const user2 = await User.findOne({ anonId: members[1] });

          if (user1 && user2) {
            // Update Friendships
            if (!user1.friends.includes(user2._id)) {
               user1.friends.push(user2._id);
            }
            if (!user2.friends.includes(user1._id)) {
               user2.friends.push(user1._id);
            }
            await user1.save();
            await user2.save();

            // Check if Conversation exists, otherwise create it
            let conversation = await Conversation.findOne({
              participants: { $all: [user1._id, user2._id] }
            });

            if (!conversation) {
              conversation = await Conversation.create({
                participants: [user1._id, user2._id]
              });
            }

            io.to(data.roomId).emit("friendship_created", { 
              conversationId: conversation._id.toString() 
            });

            // Cleanup Redis after success
            await redis.del(`friend_req:${data.roomId}`);
          }
        } catch (e) {
          console.error("[Friend Add Error]", e);
        }
      }
    });

    // --- STAGE 12: Persistent Chat --- //
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    // --- STAGE 13 & Disconnects --- //
    socket.on("skip_match", async (roomId: string) => {
      socket.to(roomId).emit("match_ended", { reason: "skipped", message: "User skipped to next match" });
      io.socketsLeave(roomId);
      await redis.del(`active_room:${socket.id}`);
      // Clear friend requests
      await redis.del(`friend_req:${roomId}`);
    });

    socket.on("end_chat", async (roomId: string) => {
      socket.to(roomId).emit("match_ended", { reason: "ended", message: "User ended the conversation" });
      io.socketsLeave(roomId); // Boot everyone out
      await redis.del(`active_room:${socket.id}`);
      // Clear friend requests
      await redis.del(`friend_req:${roomId}`);
    });

    socket.on("report_user", async (data: { roomId: string; reporterAnonId: string; reportedAnonId: string; reason: string }) => {
      try {
        await connectToDatabase();
        
        const reporter = await User.findOne({ anonId: data.reporterAnonId });
        const reported = await User.findOne({ anonId: data.reportedAnonId });
        
        if (reporter && reported) {
          await Report.create({
            reportedUserId: reported._id,
            reporterId: reporter._id,
            reason: data.reason || "Inappropriate Behavior"
          });

          // Increment report count using mongoose $inc for atomicity
          const updatedUser = await User.findByIdAndUpdate(
            reported._id, 
            { $inc: { reportCount: 1 } }, 
            { new: true }
          );

          // Simulate auto-ban after threshold
          if (updatedUser && updatedUser.reportCount >= 3) {
            updatedUser.isBanned = true;
            await updatedUser.save();
            console.log(`[Safety] User ${updatedUser.anonId} auto-banned due to report limits.`);
          }

          // Send confirmation back solely to the reporter
          socket.emit("system_warning", { message: "Report submitted successfully." });
          
          // Instantly sever connection for safety (acting as report block limit)
          socket.to(data.roomId).emit("match_ended", { reason: "safety_disconnect", message: "Chat disconnected due to a safety flag." });
          io.socketsLeave(data.roomId);
          await redis.del(`active_room:${socket.id}`);
          await redis.del(`friend_req:${data.roomId}`);
        }
      } catch (err) {
         console.error("[Report Error]", err);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
      // Remove from queue if they were searching
      await redis.lrem("matchmaking_queue", 0, socket.id);
      
      // Clean up user object mapping
      await redis.del(`user:${socket.id}`);
      
      // If they were in a chat, let the peer know
      const roomId = await redis.get(`active_room:${socket.id}`);
      if (roomId) {
        socket.to(roomId).emit("match_ended", { reason: "disconnected" });
        await redis.del(`active_room:${socket.id}`); // Clean self
      }
    });

  });
}
import Redis from "ioredis";

// Use an environment variable for connection, default to localhost for dev
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(redisUrl);

redis.on("error", (err) => {
  console.error("[Redis] Error:", err);
});

export default redis;
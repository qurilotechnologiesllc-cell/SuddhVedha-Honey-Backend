const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        if (times > 3) {
            console.error('Redis: Max retries reached');
            return null;
        }
        return Math.min(times * 200, 2000);
    }
});

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
});

module.exports = redis;
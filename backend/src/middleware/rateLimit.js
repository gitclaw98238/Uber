const buckets = new Map();

function rateLimit(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 200;
  const keyGenerator = options.keyGenerator || ((req) => req.ip || req.connection.remoteAddress || 'unknown');

  return (req, res, next) => {
    const key = `${keyGenerator(req)}:${req.path}`;
    const currentTime = Date.now();
    const entry = buckets.get(key);

    if (!entry || entry.resetAt <= currentTime) {
      buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
      return next();
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - currentTime) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    entry.count += 1;
    return next();
  };
}

module.exports = {
  rateLimit
};

/**
 * Simple queue system to manage API rate limits
 * Ensures we don't exceed 5 requests per minute
 */

class RateLimitQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.requestTimes = [];
    this.maxRequestsPerMinute = 4; // Keep it under 5 to be safe
    this.timeWindow = 60000; // 1 minute in milliseconds
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Clean old request times
      const now = Date.now();
      this.requestTimes = this.requestTimes.filter(
        time => now - time < this.timeWindow
      );

      // Check if we can make a request
      if (this.requestTimes.length >= this.maxRequestsPerMinute) {
        // Wait until we can make another request
        const oldestRequest = Math.min(...this.requestTimes);
        const waitTime = this.timeWindow - (now - oldestRequest) + 1000; // Add 1 second buffer
        console.log(`Rate limit: Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
        await this.sleep(waitTime);
        continue;
      }

      // Process next item in queue
      const item = this.queue.shift();
      this.requestTimes.push(Date.now());

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.processing = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new RateLimitQueue();

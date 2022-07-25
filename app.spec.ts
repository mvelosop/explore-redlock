import Client from "ioredis";
import Redlock from "redlock";

function delay(ms: number) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

describe("RedLock/Redis tests", () => {
   let redlock: Redlock;
   let ioredisClient: Client;

   beforeAll(async () => {

      ioredisClient = new Client({ host: "localhost" });
      // const redisClient = redis.createClient({ host: "localhost", port: 6379 });

      redlock = new Redlock(
         // You should have one client for each independent redis node
         // or cluster.
         [ioredisClient],
         {
            // The expected clock drift; for more details see:
            // http://redis.io/topics/distlock
            driftFactor: 0.01, // multiplied by lock ttl to determine drift time

            // The max number of times Redlock will attempt to lock a resource
            // before erroring.
            retryCount: 5,

            // the time in ms between attempts
            retryDelay: 200, // time in ms

            // the max time in ms randomly added to retries
            // to improve performance under high contention
            // see https://www.awsarchitectureblog.com/2015/03/backoff.html
            retryJitter: 200, // time in ms

            // The minimum remaining time on a lock before an extension is automatically
            // attempted with the `using` API.
            automaticExtensionThreshold: 500, // time in ms
         }
      );

   });

   afterAll(async () => {
      await redlock.quit();
      // await redis.quit();
   });

   test("Shouldn't be able to get a second lock on a resource", async () => {
      // Arrange -----------------------
      const lock1 = await redlock.acquire(["lock:001"], 2000);

      // Act ---------------------------
      try {
         const lock2 = await redlock.acquire(["lock:001"], 1000);

         throw new Error("Should not get here, because we shouldn't be able to get the lock.");
      } catch (err: any) {
         expect(err.name).toBe("ExecutionError");
         expect(err.message).toBe("The operation was unable to achieve a quorum during its retry window.");
      }
   }, 10000);

   test("Should be able to detect if the lock has expired", async () => {
      // Arrange -----------------------
      const lock1 = await redlock.acquire(["lock:001"], 1000);
      await delay(2000);

      // Act ---------------------------
      const isExpired = lock1.expiration - Date.now();

      // Assert ------------------------
      expect(isExpired).toBe(true);
   });

   test("An expired lock should fail with ExecutionError", async () => {
      let lock1 = await redlock.acquire(["lock:001"], 3000);
      let lock2 = await redlock.acquire(["lock:002"], 3000);
      try {
         // Do something...
         await delay(2000);

         // Extend the lock. Note that this returns a new `Lock` instance.
         lock1 = await lock1.extend(1000);
         lock2 = await lock2.extend(1000);

         // Do something else...
         await delay(2000);

         await lock1.release();
         await lock2.release();

         throw new Error("Should not get here, because the lock should have expired and thrown an error.");

      } catch (err: any) {
         expect(err.name).toBe("ExecutionError");
         expect(err.message).toBe("The operation was unable to achieve a quorum during its retry window.");
      }

   }, 10000);

   // We should be able to set a value in redis and get it back.
   test("Set and get a value in redis", async () => {
      // Arrange -----------------------
      const objectValue = { foo: "bar" };
      const objectString = JSON.stringify(objectValue);
      ioredisClient.set("foo", objectString);
      // Act ---------------------------
      const result = await ioredisClient.get("foo");
      console.log(result);
      // Assert ------------------------
      expect(result).toBe(objectString);
   });
});
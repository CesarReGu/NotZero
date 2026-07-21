/**
 * A best-effort hook for continuing work after the HTTP response is returned.
 *
 * In a Cloudflare Worker the fetch handler receives `ctx.waitUntil`, which
 * extends the invocation so background work can finish even after the client
 * disconnects. In a long-lived Node or Miniflare dev process a detached promise
 * simply keeps running on the event loop. Either way this only *accelerates* a
 * job between polls (and lets a server-key deployment finish a job with no
 * client attached). The poll-driven job model remains the correctness
 * guarantee: every stage is checkpointed, so if background work is cut short the
 * next poll resumes from where it left off without repeating completed stages.
 */

const symbol = Symbol.for("notzero.requestWaitUntil");
type WaitUntil = (promise: Promise<unknown>) => void;
type Holder = { waitUntil?: WaitUntil };
type RuntimeGlobal = typeof globalThis & { [symbol]?: Holder };

/** Called once per request at the worker boundary with the invocation's waitUntil. */
export function setRequestWaitUntil(waitUntil: WaitUntil | undefined) {
  (globalThis as RuntimeGlobal)[symbol] = waitUntil ? { waitUntil } : {};
}

/**
 * Runs `task` outside the current response. Uses `waitUntil` when it is
 * available so a Worker keeps the task alive past the response; otherwise the
 * promise is left detached. Background failures are swallowed on purpose because
 * the job's own driver records failures on the persisted job record.
 */
export function scheduleBackground(task: () => Promise<unknown>) {
  const promise = Promise.resolve().then(task).catch(() => { /* recorded on the job record, not here */ });
  const holder = (globalThis as RuntimeGlobal)[symbol];
  if (holder?.waitUntil) {
    try {
      holder.waitUntil(promise);
      return;
    } catch {
      /* fall through to a detached promise */
    }
  }
  void promise;
}

// ─────────────────────────────────────────────────────────────────────────────
// AsyncQueue — a push-driven AsyncIterable used as the Agent SDK's streaming
// `prompt` input. The SDK consumes it with `for await`; we `push()` a
// SDKUserMessage for every user turn (multi-turn live prompting) and `close()`
// it to end the session. Backpressure-free: pushes never block the producer.
// ─────────────────────────────────────────────────────────────────────────────

export class AsyncQueue<T> implements AsyncIterable<T> {
  private readonly values: T[] = [];
  private readonly waiters: Array<(r: IteratorResult<T>) => void> = [];
  private closed = false;

  push(value: T): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value, done: false });
    else this.values.push(value);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    let waiter: ((r: IteratorResult<T>) => void) | undefined;
    while ((waiter = this.waiters.shift())) {
      waiter({ value: undefined as never, done: true });
    }
  }

  get isClosed(): boolean {
    return this.closed;
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        if (this.values.length > 0) {
          return Promise.resolve({ value: this.values.shift() as T, done: false });
        }
        if (this.closed) {
          return Promise.resolve({ value: undefined as never, done: true });
        }
        return new Promise<IteratorResult<T>>((resolve) => this.waiters.push(resolve));
      },
    };
  }
}

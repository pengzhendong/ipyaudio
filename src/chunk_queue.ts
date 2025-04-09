// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

class ChunkQueue {
  private queue: Uint8Array[] = []
  private resolveDequeue: ((value: Uint8Array) => void) | null = null
  private waitingDequeue: Promise<Uint8Array> | null = null

  constructor() { }

  public enqueue(chunk: Uint8Array): void {
    if (this.queue.length < 2) {
      this.queue.push(chunk)
    } else {
      const combined = new Uint8Array(this.queue[1].length + chunk.length)
      combined.set(this.queue[1], 0)
      combined.set(chunk, this.queue[1].length)
      this.queue[1] = combined
    }

    if (this.resolveDequeue) {
      this.resolveDequeue(this.queue.shift()!)
      this.resolveDequeue = null
      this.waitingDequeue = null
    }
  }

  public async dequeue(timeoutMs: number = 0): Promise<Uint8Array> {
    if (this.queue.length > 0) {
      return this.queue.shift()!
    }

    if (!this.waitingDequeue) {
      this.waitingDequeue = new Promise<Uint8Array>((resolve) => {
        this.resolveDequeue = resolve
      })

      if (timeoutMs > 0) {
        const timeout = setTimeout(() => {
          if (this.resolveDequeue) {
            this.resolveDequeue(new Uint8Array(0))
            this.resolveDequeue = null
            this.waitingDequeue = null
          }
        }, timeoutMs)

        this.waitingDequeue.then(() => {
          if (timeout) clearTimeout(timeout);
        }).catch(() => {
          if (timeout) clearTimeout(timeout);
        })
      }
    }
    return this.waitingDequeue
  }

  public get length(): number {
    return this.queue.length
  }
}

export default ChunkQueue

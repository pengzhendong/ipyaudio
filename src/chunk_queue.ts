// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

class ChunkQueue {
  private queue: Uint8Array[] = []
  private resolveDequeue: ((value: Uint8Array) => void) | null = null
  private waitingDequeue: Promise<Uint8Array> | null = null

  constructor() {}

  private mergeAllChunks(): Uint8Array {
    if (this.queue.length === 0) {
      return new Uint8Array(0)
    }
    let totalLength = 0
    for (const chunk of this.queue) {
      totalLength += chunk.length
    }

    const merged = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of this.queue) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    return merged
  }

  public enqueue(chunk: Uint8Array): void {
    this.queue.push(chunk)

    if (this.resolveDequeue) {
      const merged = this.mergeAllChunks()
      this.resolveDequeue(merged)
      this.queue.length = 0
      this.resolveDequeue = null
      this.waitingDequeue = null
    }
  }

  public async dequeue(timeoutMs: number = 0): Promise<Uint8Array> {
    if (this.queue.length > 0) {
      const merged = this.mergeAllChunks()
      this.queue.length = 0
      return merged
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

        this.waitingDequeue
          .then(() => {
            if (timeout) {
              clearTimeout(timeout)
            }
          })
          .catch(() => {
            if (timeout) {
              clearTimeout(timeout)
            }
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

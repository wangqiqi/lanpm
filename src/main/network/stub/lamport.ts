export class LamportClock {
  private value = 0

  tick(): number {
    this.value += 1
    return this.value
  }

  observe(remote: number | undefined): number {
    if (remote !== undefined && remote > this.value) {
      this.value = remote
    }
    return this.tick()
  }

  peek(): number {
    return this.value
  }
}

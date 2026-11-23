/** Shared between the Dreams DOM layer and its scene: a wish releases a lantern. */
export const lanterns = {
  /** Times (seconds, scene clock) when wish lanterns were released. */
  released: [] as number[],
  now: 0,
  release() {
    this.released.push(this.now);
  },
  reset() {
    this.released = [];
  },
};

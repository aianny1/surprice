/**
 * Chapter 08 · Friendship Memories.
 * Real photos (in /public/images/memories/). Add more items any time: see docs/IMAGES_GUIDE.md.
 */
export interface Memory {
  caption: string;
  message: string;
  photo: string | null;
}

export const memories = {
  heading: 'EVERY BEAUTIFUL STORY DESERVES TO BE REMEMBERED.',
  items: [
    {
      caption: 'This smile',
      message: 'Flowers, sunshine and that laugh. Some frames need no colour grade at all.',
      photo: '/images/memories/megha-smile.webp',
    },
    {
      caption: 'Golden hour, natural light',
      message: "No filter, no LUT, no retakes. Proof that the best shots happen when you're not even trying.",
      photo: '/images/memories/megha-flowers.webp',
    },
  ] satisfies Memory[],
  continueLabel: 'ONE MORE THING',
};

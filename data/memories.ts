/**
 * Chapter 08 · Friendship Memories.
 * Replace these with REAL photos and notes: put images in /public/images/memories/ and set `photo`.
 * Until then each polaroid is clearly a placeholder; nothing here pretends to be a real memory.
 */
export interface Memory {
  caption: string;
  message: string;
  photo: string | null;
}

export const memories = {
  heading: 'EVERY BEAUTIFUL STORY DESERVES TO BE REMEMBERED.',
  items: [
    { caption: 'Photo #1 goes here', message: 'Add a real photo and a few lines about it in data/memories.ts.', photo: null },
    { caption: 'Photo #2 goes here', message: 'Add a real photo and a few lines about it in data/memories.ts.', photo: null },
    { caption: 'Photo #3 goes here', message: 'Add a real photo and a few lines about it in data/memories.ts.', photo: null },
    { caption: 'Photo #4 goes here', message: 'Add a real photo and a few lines about it in data/memories.ts.', photo: null },
    { caption: 'Photo #5 goes here', message: 'Add a real photo and a few lines about it in data/memories.ts.', photo: null },
  ] satisfies Memory[],
  continueLabel: 'ONE MORE THING',
};

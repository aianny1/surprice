/**
 * Chapter 03 · Her Wild Side.
 * One message per glowing element along the walk (dawn forest → waterfall → sunset summit).
 * Written from a friend. Photos are optional: set `photo` to e.g. '/images/nature/forest.jpg'.
 */
export interface NatureStop {
  id: 'forest' | 'water' | 'summit';
  /** Small caption on the message card. */
  label: string;
  message: string;
  photo: string | null;
}

export const nature = {
  title: 'HER WILD SIDE',
  heading: 'SOME SOULS FEEL MORE AT HOME IN NATURE.',
  stops: [
    {
      id: 'forest',
      label: 'In the forest',
      message:
        "I bet you're already wondering how many polygons these trees have. Close the mental Blender window for five minutes. The forest does its own lighting, and nobody has to wait for it to render.",
      photo: null,
    },
    {
      id: 'water',
      label: 'By the water',
      message:
        "This waterfall has been playing the same clip on loop for a few thousand years and it still doesn't need a single cut. Sit by it for a bit. You've earned a scene with no timeline in it.",
      photo: null,
    },
    {
      id: 'summit',
      label: 'At the top',
      message:
        "Of course you climbed all the way up here just for the view. The sky is doing its own colour grade tonight, and it's better than any LUT either of us owns, so stay until the last bit of orange is gone.",
      photo: null,
    },
  ] satisfies NatureStop[],
  continueLabel: 'FOLLOW THE BUTTERFLY',
  seedHint: 'Open the light',
} as const;

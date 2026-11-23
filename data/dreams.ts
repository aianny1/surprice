/**
 * Chapter 07 · Her Dreams (route /dreams; internal chapter id stays 'dimension').
 * Wishes for her, one per lantern. Written as wishes, not facts: edit freely.
 * Each wish has a visual: a photo, an animation storyboard (sketch panels) or a film frame with
 * rolling credits. The photos are the illustrative Travel photos, credited on the card.
 */
export interface Wish {
  title: string;
  line: string;
  style: 'photo' | 'storyboard' | 'credits';
  photos: string[];
}

export const dreams = {
  heading: 'EVERY DREAM OF YOURS DESERVES A YES.',
  wishes: [
    {
      title: 'Every dream, ticked off',
      line: 'The big ones you say out loud and the small ones you keep in your notes app. May this year start crossing them off, one by one.',
      style: 'photo',
      photos: ['/images/travel/valley-of-flowers.webp'],
    },
    {
      title: 'Mountains, with the family',
      line: 'A trip to the hills with the people who matter most. Cold mornings, chai at a dhaba, and everyone in the same photo for once.',
      style: 'photo',
      photos: ['/images/travel/sonamarg.webp'],
    },
    {
      title: 'Learning from the best',
      line: 'Time with the animation creators you look up to, and the kind of new trick that makes you rebuild an old project just because you can.',
      style: 'storyboard',
      photos: ['/images/travel/pahalgam.webp', '/images/travel/auli.webp', '/images/travel/kedarnath.webp'],
    },
    {
      title: 'Your name in the credits',
      line: 'A piece of work you are proud of, out in the world, with your name on it.',
      style: 'credits',
      photos: ['/images/travel/srinagar.webp'],
    },
  ] satisfies Wish[],
  continueLabel: 'DEVELOP THE PHOTOS',
};

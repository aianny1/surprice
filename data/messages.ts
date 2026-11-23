/** Every line of copy for the built chapters. Edit freely. */
export const messages = {
  intro: {
    greeting: 'HEY, YOU!',
    subline: 'Someone has created a little universe just for you.',
    /** Written on the letter. Must NOT mention the birthday (that's the surprise). */
    letter: {
      salutation: 'Dear you,',
      lines: [
        'Close your eyes for a second.',
        'Okay, now open them.',
        '',
        'Somewhere between the stars',
        'there is a world that was',
        'built only for you.',
        '',
        'Come with me.',
      ],
      signature: 'someone who believes in your magic',
    },
  },
  universe: {
    welcome: ['WELCOME TO', 'YOUR', 'UNIVERSE.'],
    enterLabel: 'ENTER MY WORLD',
  },
} as const;

/**
 * Everything about her lives here.
 * Components never hard-code personal content: they read from this file.
 */
export const person = {
  /** Shown in Chapter 02 as particle typography and in the finale. */
  name: {
    display: 'Megha',
    short: 'Megha',
    /** Single character pressed into the wax seal on the envelope. */
    initial: 'M',
  },
  /** ISO date, used later for the optional date-lock. TODO: set her real birthday. */
  birthday: '2026-12-01',
} as const;

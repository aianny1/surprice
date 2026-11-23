export type ChapterId =
  | 'intro'
  | 'universe'
  | 'nature'
  | 'travel'
  | 'artist'
  | 'film'
  | 'dimension'
  | 'memories'
  | 'surprise';

export interface ChapterMeta {
  id: ChapterId;
  route: string;
  order: number;
  title: string;
}

export const CHAPTERS: ChapterMeta[] = [
  { id: 'intro', route: '/intro', order: 1, title: 'The Secret Invitation' },
  { id: 'universe', route: '/universe', order: 2, title: 'Her Universe' },
  { id: 'nature', route: '/nature', order: 3, title: 'Her Wild Side' },
  { id: 'travel', route: '/travel', order: 4, title: 'The Wanderer' },
  { id: 'artist', route: '/artist', order: 5, title: 'The Artist' },
  { id: 'film', route: '/film', order: 6, title: 'The Video Editor' },
  // id kept as 'dimension' so the engine and transitions stay untouched; the chapter is now Her Dreams
  { id: 'dimension', route: '/dreams', order: 7, title: 'Her Dreams' },
  { id: 'memories', route: '/memories', order: 8, title: 'Friendship Memories' },
  // Titled neutrally on purpose: the chapter list must not spoil the birthday.
  { id: 'surprise', route: '/surprise', order: 9, title: 'One Last Thing' },
];

/** The chapter that follows `id` in the story, if any. */
export function nextChapter(id: ChapterId): ChapterMeta | null {
  const cur = chapterById(id);
  return CHAPTERS.find((c) => c.order === cur.order + 1) ?? null;
}

export const TOTAL_CHAPTERS = CHAPTERS.length;

export function chapterById(id: ChapterId): ChapterMeta {
  return CHAPTERS.find((c) => c.id === id)!;
}

export function chapterByPath(pathname: string | null): ChapterMeta | null {
  if (!pathname) return null;
  const clean = pathname.replace(/\/+$/, '') || '/';
  return CHAPTERS.find((c) => c.route === clean) ?? null;
}

/**
 * Chapter 06 · The Video Editor.
 * `projects` are placeholders until you add her real work (title, year, what she did, optional thumbnail).
 */
export interface FilmProject {
  title: string;
  role: string;
  year: string;
  thumb: string | null;
  placeholder: boolean;
}

export const film = {
  heading: "SHE DOESN'T JUST EDIT VIDEOS. SHE CREATES EXPERIENCES.",
  projects: [
    { title: 'Her project, coming soon', role: 'Edit · Colour · Sound', year: '—', thumb: null, placeholder: true },
    { title: 'Another one for the reel', role: 'Motion · After Effects', year: '—', thumb: null, placeholder: true },
    { title: 'The next big render', role: '3D · Blender', year: '—', thumb: null, placeholder: true },
  ] satisfies FilmProject[],
  tracks: [
    { name: 'V2', clips: [[8, 18, 'Titles'], [52, 22, 'Lower third']] },
    { name: 'V1', clips: [[0, 30, 'Wide'], [30, 16, 'Close-up'], [46, 34, 'The good take']] },
    { name: 'A1', clips: [[0, 80, 'Music']] },
    { name: 'A2', clips: [[12, 20, 'Ambience'], [40, 28, 'Whoosh']] },
  ] as { name: string; clips: [number, number, string][] }[],
  continueLabel: 'EXPORT TO 3D',
};

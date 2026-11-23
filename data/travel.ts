/**
 * Chapter 04 · The Wanderer.
 * Her favourite kind of place: the mountains of Jammu & Kashmir and Uttarakhand.
 * These are places she loves or dreams about. Nothing here claims she has been to a spot:
 * set `visited: true` only for trips that really happened. Photos are illustrative views of each
 * place from Wikimedia Commons (credited on the postcard); swap in her own photos any time.
 */
export type TravelCategory = 'mountains' | 'forests' | 'waterfalls' | 'adventure' | 'cities' | 'beaches';

export interface Destination {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  category: TravelCategory;
  note: string;
  photo: string | null;
  /** Required by the photo licence (Wikimedia Commons, CC). */
  credit?: string;
  visited: boolean;
}

export const travel = {
  title: 'THE WANDERER',
  heading: 'THE WORLD IS TOO BEAUTIFUL TO STAY IN ONE PLACE.',
  home: { name: 'Jaipur', lat: 26.91, lng: 75.79 },
  destinations: [
    {
      id: 'gulmarg', name: 'Gulmarg', region: 'Jammu & Kashmir', lat: 34.05, lng: 74.38, category: 'mountains',
      note: 'A meadow of flowers in summer and pure snow in winter. Same scene, two completely different colour grades.',
      photo: '/images/travel/gulmarg.webp', credit: "Photo: Anurag Kumar · CC BY-SA 4.0 · Wikimedia Commons", visited: false,
    },
    {
      id: 'sonamarg', name: 'Sonamarg', region: 'Jammu & Kashmir', lat: 34.3, lng: 75.29, category: 'mountains',
      note: 'The "meadow of gold". Glaciers, a river, and light that no render engine can fake.',
      photo: '/images/travel/sonamarg.webp', credit: "Photo: Wikiditot · CC BY-SA 4.0 · Wikimedia Commons", visited: false,
    },
    {
      id: 'pahalgam', name: 'Pahalgam', region: 'Jammu & Kashmir', lat: 34.02, lng: 75.31, category: 'forests',
      note: 'Pine forests along the Lidder river. Perfect place to sit with a sketchbook and no deadlines.',
      photo: '/images/travel/pahalgam.webp', credit: "Photo: Wikimedia Commons · CC0 · Wikimedia Commons", visited: false,
    },
    {
      id: 'srinagar', name: 'Srinagar · Dal Lake', region: 'Jammu & Kashmir', lat: 34.12, lng: 74.84, category: 'cities',
      note: 'Shikaras on still water with the mountains reflected upside down. A ready-made shot.',
      photo: '/images/travel/srinagar.webp', credit: "Photo: Suhail Skindar Sofi · CC BY-SA 4.0 · Wikimedia Commons", visited: false,
    },
    {
      id: 'kedarnath', name: 'Kedarnath', region: 'Uttarakhand', lat: 30.73, lng: 79.07, category: 'mountains',
      note: 'Snow peaks right behind you, and a trek that makes the view feel earned.',
      photo: '/images/travel/kedarnath.webp', credit: "Photo: Shivam Kumar 766 · CC BY-SA 4.0 · Wikimedia Commons", visited: false,
    },
    {
      id: 'auli', name: 'Auli', region: 'Uttarakhand', lat: 30.53, lng: 79.57, category: 'adventure',
      note: 'Slopes, a cable car and a straight view of Nanda Devi. Bring gloves, not excuses.',
      photo: '/images/travel/auli.webp', credit: "Photo: Vaibhav 369 · CC BY-SA 4.0 · Wikimedia Commons", visited: false,
    },
    {
      id: 'valley-of-flowers', name: 'Valley of Flowers', region: 'Uttarakhand', lat: 30.73, lng: 79.6, category: 'forests',
      note: 'A whole valley that blooms every monsoon. Nature doing a colour palette better than any swatch.',
      photo: '/images/travel/valley-of-flowers.webp', credit: "Photo: Original: Rohit Sharma Derivative work: UnpetitproleX · CC BY-SA 4.0 · Wikimedia Commons", visited: false,
    },
    {
      id: 'vasudhara', name: 'Vasudhara Falls', region: 'Uttarakhand', lat: 30.77, lng: 79.49, category: 'waterfalls',
      note: 'A 120-metre waterfall above Mana village. The kind of slow-motion shot that needs no speed ramp.',
      photo: '/images/travel/vasudhara.webp', credit: "Photo: Bodhisattwa · CC BY-SA 4.0 · Wikimedia Commons", visited: false,
    },
    {
      id: 'rishikesh', name: 'Rishikesh', region: 'Uttarakhand', lat: 30.09, lng: 78.27, category: 'adventure',
      note: 'River rafting on the Ganga in the morning, quiet ghats in the evening.',
      photo: '/images/travel/rishikesh.webp', credit: "Photo: VK1983 · CC BY-SA 4.0 · Wikimedia Commons", visited: false,
    },
  ] satisfies Destination[],
  continueLabel: 'TAKE OFF',
};

# Photos kahan lagani hain (Images Guide)

Har photo ke liye sirf **2 kaam** karne hain:

1. Photo file ko `public/images/...` wale folder me daalo.
2. Neeche bataye `data/...` file me uska path likho.

Path hamesha `/images/...` se shuru hota hai (`public` nahi likhna).
Example: file `public/images/memories/1.jpg` hai, to path likhoge `'/images/memories/1.jpg'`.

---

## 1. Memories (sabse zaroori)

Abhi yahan Megha ki 2 photos lagi hain (`megha-smile.webp`, `megha-flowers.webp`). Aur photos jodni ho to neeche jaisa ek naya item jodo.

- **Folder:** `public/images/memories/` (folder na ho to bana lo)
- **File:** [data/memories.ts](../data/memories.ts)
- **Kya badalna hai:** har item me `photo`, `caption` (polaroid ke neeche ki line) aur `message` (photo badi hone par dikhne wala note).

```ts
{ caption: 'Goa, 2023', message: 'Woh din jab ...', photo: '/images/memories/1.jpg' },
```

5 se zyada ya kam photos chahiye to items jod ya hata sakte ho. Page apne aap adjust ho jaata hai.

**Size:** square (1:1) photo sabse achhi lagti hai, lagbhag 1000×1000 px.

---

## 2. Artist: Megha ka portrait

- **Folder:** `public/images/artist/`
- **File:** [data/artist.ts](../data/artist.ts)
- **Kya badalna hai:** `portrait: null` ko badal kar ye likho:

```ts
portrait: '/images/artist/megha.jpg' as string | null,
```

**Size:** lambi (portrait) photo, 4:5, lagbhag 800×1000 px. Abhi `/images/artist/megha.webp` lagi hai.

---

## 3. Nature: teen light-seed cards

- **Folder:** `public/images/nature/`
- **File:** [data/nature.ts](../data/nature.ts)
- **Kya badalna hai:** teeno stops (`forest`, `water`, `summit`) me `photo: null` ki jagah path.

```ts
photo: '/images/nature/forest.jpg',
```

**Size:** 4:3, lagbhag 1200×900 px. Ye optional hai, photo ke bina bhi card achha lagta hai.

---

## 4. Film: uske projects

- **Folder:** `public/images/film/`
- **File:** [data/film.ts](../data/film.ts)
- **Kya badalna hai:** har project me `title`, `role`, `year`, `thumb`, aur `placeholder: false` karo.

```ts
{ title: 'Mera short film', role: 'Edit · Colour', year: '2025', thumb: '/images/film/project1.jpg', placeholder: false },
```

**Size:** 16:9, lagbhag 1280×720 px. Jab tak `thumb` khaali hai, monitor par Travel ki photos chalti rehti hain.

---

## 5. Travel: jagahon ki photos (optional)

Abhi yahan Wikimedia Commons ki free photos lagi hain, credit ke saath. Megha ki apni photos ho to unse badal do.

- **Folder:** `public/images/travel/`
- **File:** [data/travel.ts](../data/travel.ts)
- **Kya badalna hai:** us jagah ka `photo`, aur `credit` wali line **hata do** (apni photo par credit ki zaroorat nahi). Agar wo sach me wahan gayi thi, to `visited: true` kar do.

```ts
photo: '/images/travel/gulmarg-megha.jpg', visited: true,
```

**Size:** 3:2, lagbhag 1200×800 px.

Dhyaan rahe: yahi photos Film page ki reel aur Dreams ke cards me bhi dikhti hain.

---

## 6. Dreams: wish cards (optional)

- **File:** [data/dreams.ts](../data/dreams.ts)
- Har wish ka `photos` ek list hai. `style` ke hisaab se photos lagti hain:
  - `'photo'`: 1 photo
  - `'storyboard'`: 3 photos, pencil-sketch panels ki tarah
  - `'credits'`: 1 photo, film credits ke saath

```ts
style: 'photo',
photos: ['/images/dreams/family.jpg'],
```

---

## 7. Surprise: aakhri page ki photo

- **File:** [data/surprise.ts](../data/surprise.ts), field `photo`.
- Abhi "Happy Birthday Meghaaa" wali photo lagi hai (`/images/surprise/megha-birthday.webp`). Ye gift khulne ke baad cake ke bagal me polaroid ki tarah aati hai, sirf laptop/badi screen par.
- **Dhyaan:** jis photo par "birthday" likha ho, use **sirf yahin** lagana. Baaki pages par lagane se surprise pehle hi khul jaayega.

---

## Photo daalne se pehle

- **Format:** `.jpg` ya `.webp`. `.webp` sabse halki hoti hai.
- **Size:** ek photo 300 KB se kam rakho, taaki phone par site jaldi khule. Badi photo ho to [squoosh.app](https://squoosh.app) par chhoti kar lo.
- **Naam:** chhote akshar, bina space ke. Jaise `goa-trip.jpg`, `Goa Trip.JPG` nahi.
- **Check:** photo daalne ke baad `npx next build` chalao. Path galat hoga to photo khaali dikhegi, to ek baar site khol kar dekh lena.

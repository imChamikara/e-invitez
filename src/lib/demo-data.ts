import type { EventData, EventSection, EventPhoto, OccasionType, Wish } from "./types";

/** Tiny gradient SVG used as a stand-in photo so demos need no image hosting. */
function art(h1: number, h2: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${h1} 60% 70%)'/><stop offset='1' stop-color='hsl(${h2} 55% 45%)'/>` +
    `</linearGradient></defs><rect width='800' height='600' fill='url(#g)'/>` +
    `<circle cx='620' cy='140' r='90' fill='white' fill-opacity='.25'/>` +
    `<circle cx='180' cy='460' r='140' fill='white' fill-opacity='.15'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function photos(h1: number, h2: number): EventPhoto[] {
  return [0, 1, 2, 3].map((i) => ({ id: `p${i}`, url: art(h1 + i * 18, h2 + i * 12) }));
}

function section(
  i: number,
  title: string,
  startsAt: string | null,
  description: string,
  si: [string, string],
  ta: [string, string],
): EventSection {
  return {
    id: `s${i}`,
    title,
    description,
    startsAt,
    sortOrder: i,
    translations: {
      si: { title: si[0], description: si[1] },
      ta: { title: ta[0], description: ta[1] },
    },
  };
}

const wishes: Wish[] = [
  { id: "w1", name: "Aunty Malani", message: "May your life be filled with joy and blessings!", createdAt: "2026-10-01T10:00:00Z" },
  { id: "w2", name: "Kasun & family", message: "We can't wait to celebrate with you. සුබ පැතුම්!", createdAt: "2026-10-02T10:00:00Z" },
  { id: "w3", name: "Priya", message: "வாழ்த்துகள்! Wishing you all the best.", createdAt: "2026-10-03T10:00:00Z" },
];

const base = {
  languageDefault: "en" as const,
  isPublished: true,
  isPrivate: false,
  hasPassword: false,
  rsvpEnabled: true,
  wishesEnabled: true,
  plan: "standard" as const, // demos show the full theme options
  wishes,
};

const wedding: EventData = {
  ...base,
  id: "demo-classic",
  slug: "nimal-weds-sachini",
  occasionType: "wedding",
  templateKey: "classic-wedding",
  title: "Nimal & Sachini",
  eventDate: "2027-02-14T05:00:00Z",
  venueName: "Galadari Hotel",
  venueAddress: "64 Lotus Road, Colombo 01",
  mapsUrl: "https://maps.google.com/?q=Galadari+Hotel+Colombo",
  story:
    "We met at university and have been inseparable ever since. With the blessings of our families, we joyfully invite you to celebrate the beginning of our life together.",
  coverImageUrl: art(36, 24),
  theme: { accent: "#b8892f", fontPair: "serif" },
  photos: photos(36, 24),
  sections: [
    section(1, "Poruwa Ceremony", "2027-02-14T03:30:00Z", "Traditional Poruwa rituals", ["පෝරුව චාරිත්‍ර", "සාම්ප්‍රදායික පෝරුව චාරිත්‍ර"], ["போருவ சடங்கு", "பாரம்பரிய போருவ சடங்குகள்"]),
    section(2, "Registration", "2027-02-14T05:00:00Z", "", ["ලියාපදිංචිය", ""], ["பதிவு", ""]),
    section(3, "Wedding Lunch", "2027-02-14T07:00:00Z", "Lunch for all our guests", ["මංගල දිවා භෝජනය", "සියලු ආගන්තුකයන් සඳහා දිවා භෝජනය"], ["திருமண மதிய விருந்து", "அனைத்து விருந்தினர்களுக்கும் மதிய உணவு"]),
  ],
  translations: {
    si: {
      title: "නිමල් සහ සචිනි",
      story: "අපි විශ්වවිද්‍යාලයේදී මුණගැසී එතැන් පටන් නොබෙදී සිටිමු. අපගේ දෙමාපියන්ගේ ආශීර්වාදයෙන් අපගේ නව ජීවිතයේ ආරම්භය සමරන්නට ඔබ සැමට සතුටින් ආරාධනා කරමු.",
      venueName: "ගලදාරි හෝටලය",
      venueAddress: "64 ලෝටස් පාර, කොළඹ 01",
    },
    ta: {
      title: "நிமல் & சசினி",
      story: "நாங்கள் பல்கலைக்கழகத்தில் சந்தித்தோம், அன்றிலிருந்து பிரியாமல் இருக்கிறோம். எங்கள் குடும்பத்தினரின் ஆசியுடன் எங்கள் புதிய வாழ்க்கையின் தொடக்கத்தைக் கொண்டாட உங்களை மகிழ்ச்சியுடன் அழைக்கிறோம்.",
      venueName: "கலதாரி ஹோட்டல்",
      venueAddress: "64 லோட்டஸ் வீதி, கொழும்பு 01",
    },
  },
};

const modern: EventData = {
  ...wedding,
  id: "demo-modern",
  slug: "dinesh-and-ruwani",
  templateKey: "modern-wedding",
  title: "Dinesh & Ruwani",
  eventDate: "2027-03-20T11:30:00Z",
  venueName: "The Kingsbury",
  venueAddress: "48 Janadhipathi Mawatha, Colombo 01",
  coverImageUrl: art(200, 230),
  theme: { accent: "#0f766e", fontPair: "sans" },
  photos: photos(200, 230),
  sections: [
    section(1, "Ceremony", "2027-03-20T11:30:00Z", "", ["උත්සව චාරිත්‍ර", ""], ["விழா", ""]),
    section(2, "Reception", "2027-03-20T13:30:00Z", "Dinner and dancing", ["පිළිගැනීම", "රාත්‍රී භෝජනය සහ නැටුම්"], ["வரவேற்பு", "இரவு விருந்து மற்றும் நடனம்"]),
  ],
  translations: {
    si: { title: "දිනේෂ් සහ රුවනි", story: wedding.translations.si?.story, venueName: "ද කිංග්ස්බරි", venueAddress: "48 ජනාධිපති මාවත, කොළඹ 01" },
    ta: { title: "தினேஷ் & ருவனி", story: wedding.translations.ta?.story, venueName: "தி கிங்ஸ்பெரி", venueAddress: "48 ஜனாதிபதி மாவத்தை, கொழும்பு 01" },
  },
};

const homecoming: EventData = {
  ...wedding,
  id: "demo-homecoming",
  slug: "kasun-and-tharushi-homecoming",
  occasionType: "homecoming",
  templateKey: "homecoming",
  title: "Kasun & Tharushi",
  eventDate: "2027-04-18T04:30:00Z",
  venueName: "Tharushi's Family Home",
  venueAddress: "25 Temple Road, Kandy",
  mapsUrl: "https://maps.google.com/?q=Kandy",
  story: "Please join us as we welcome Tharushi to her new home with love and blessings.",
  coverImageUrl: art(340, 20),
  theme: { accent: "#be185d", fontPair: "display" },
  photos: photos(340, 20),
  sections: [
    section(1, "Welcome & Blessings", "2027-04-18T04:30:00Z", "", ["පිළිගැනීම සහ ආශීර්වාද", ""], ["வரவேற்பும் ஆசிகளும்", ""]),
    section(2, "Homecoming Lunch", "2027-04-18T06:30:00Z", "", ["ගෙදර එන මංගල දිවා භෝජනය", ""], ["மறுவீடு மதிய விருந்து", ""]),
  ],
  translations: {
    si: { title: "කසුන් සහ තරුෂි", story: "තරුෂි ආදරයෙන් සහ ආශීර්වාදයෙන් නව නිවසට පිළිගැනීමට අප හා එක්වන්න.", venueName: "තරුෂිගේ පවුලේ නිවස", venueAddress: "25 පන්සල් පාර, මහනුවර" },
    ta: { title: "கசுன் & தருஷி", story: "தருஷியை அன்புடனும் ஆசிகளுடனும் புதிய இல்லத்திற்கு வரவேற்க எங்களுடன் இணையுங்கள்.", venueName: "தருஷியின் குடும்ப இல்லம்", venueAddress: "25 கோயில் வீதி, கண்டி" },
  },
};

const bigGirl: EventData = {
  ...wedding,
  id: "demo-biggirl",
  slug: "senuri-big-girl",
  occasionType: "big_girl",
  templateKey: "big-girl",
  title: "Senuri's Special Day",
  eventDate: "2027-05-08T04:00:00Z",
  venueName: "Perera Family Residence",
  venueAddress: "12 Flower Road, Colombo 07",
  mapsUrl: "https://maps.google.com/?q=Colombo+07",
  story: "Our dear Senuri is blossoming into a young lady. Join our family for a day of blessings, good food and happy memories.",
  coverImageUrl: art(300, 340),
  theme: { accent: "#c2410c", fontPair: "display" },
  photos: photos(300, 340),
  sections: [
    section(1, "Auspicious Time (Nekath)", "2027-05-08T04:00:00Z", "Ceremonial bathing and blessings", ["නැකත", "චාරිත්‍රානුකූල නෑම සහ ආශීර්වාද"], ["நல்ல நேரம்", "சடங்கு நீராட்டும் ஆசிகளும்"]),
    section(2, "Lunch", "2027-05-08T06:30:00Z", "", ["දිවා භෝජනය", ""], ["மதிய உணவு", ""]),
  ],
  translations: {
    si: { title: "සෙනුරිගේ විශේෂ දිනය", story: "අපගේ සෙනුරි තරුණියක් වීමේ සතුට අප හා බෙදා ගැනීමට පවුලේ සැමට ආරාධනා කරමු.", venueName: "පෙරේරා පවුලේ නිවස", venueAddress: "12 මල් පාර, කොළඹ 07" },
    ta: { title: "செனூரியின் சிறப்பு நாள்", story: "எங்கள் செனூரி இளம் பெண்ணாக மலர்வதை எங்களுடன் கொண்டாட குடும்பத்தினர் அனைவரையும் அழைக்கிறோம்.", venueName: "பெரேரா குடும்ப இல்லம்", venueAddress: "12 மலர் வீதி, கொழும்பு 07" },
  },
};

const birthday: EventData = {
  ...wedding,
  id: "demo-birthday",
  slug: "amaya-turns-5",
  occasionType: "birthday",
  templateKey: "birthday",
  title: "Amaya turns 5!",
  eventDate: "2027-01-23T09:00:00Z",
  venueName: "Fun Garden Party Hall",
  venueAddress: "Duplication Road, Colombo 04",
  mapsUrl: "https://maps.google.com/?q=Colombo+04",
  story: "Games, cake and lots of fun! Come and celebrate Amaya's 5th birthday with us.",
  coverImageUrl: art(48, 330),
  theme: { accent: "#7c3aed", fontPair: "display" },
  photos: photos(48, 330),
  sections: [
    section(1, "Games & Fun", "2027-01-23T09:00:00Z", "", ["ක්‍රීඩා සහ විනෝදය", ""], ["விளையாட்டுகள்", ""]),
    section(2, "Cake Cutting", "2027-01-23T10:30:00Z", "", ["කේක් කැපීම", ""], ["கேக் வெட்டுதல்", ""]),
  ],
  translations: {
    si: { title: "අමායාට අවුරුදු 5යි!", story: "ක්‍රීඩා, කේක් සහ ගොඩක් විනෝදය! අමායාගේ 5 වන උපන්දිනය අප සමඟ සමරන්න.", venueName: "ෆන් ගාඩ්න් පාටි හෝල්", venueAddress: "ඩුප්ලිකේෂන් පාර, කොළඹ 04" },
    ta: { title: "அமாயாவுக்கு 5 வயது!", story: "விளையாட்டுகள், கேக் மற்றும் நிறைய மகிழ்ச்சி! அமாயாவின் 5வது பிறந்தநாளை எங்களுடன் கொண்டாடுங்கள்.", venueName: "ஃபன் கார்டன் பார்ட்டி ஹால்", venueAddress: "டூப்ளிகேஷன் வீதி, கொழும்பு 04" },
  },
};

const dana: EventData = {
  ...wedding,
  id: "demo-dana",
  slug: "dana-for-father",
  occasionType: "dana",
  templateKey: "dana",
  title: "Alms Giving in Memory of Our Father",
  eventDate: "2027-06-05T02:30:00Z",
  venueName: "Sri Sambodhi Temple",
  venueAddress: "Temple Road, Gampaha",
  mapsUrl: "https://maps.google.com/?q=Gampaha",
  story: "May the merit of this offering reach our beloved father. Your presence and blessings are warmly invited.",
  coverImageUrl: null,
  theme: { accent: "#a16207", fontPair: "serif" },
  photos: [],
  sections: [
    section(1, "Pirith Chanting", "2027-06-05T02:30:00Z", "", ["පිරිත් සජ්ඣායනය", ""], ["பிரித் ஓதுதல்", ""]),
    section(2, "Dana Offering", "2027-06-05T05:00:00Z", "", ["දානය පූජා කිරීම", ""], ["தானம் வழங்கல்", ""]),
  ],
  translations: {
    si: { title: "පියාණන් සඳහා පින්පිණිස දානය", story: "මෙම පින අපගේ ආදරණීය පියාණන්ට අත්වේවා. ඔබගේ සහභාගිත්වය සහ ආශීර්වාදය සාදරයෙන් ඉල්ලමු.", venueName: "ශ්‍රී සම්බෝධි විහාරය", venueAddress: "පන්සල් පාර, ගම්පහ" },
    ta: { title: "எங்கள் தந்தையின் நினைவாக அன்னதானம்", story: "இந்தப் புண்ணியம் எங்கள் அன்புத் தந்தையைச் சென்றடையட்டும். உங்கள் வருகையையும் ஆசிகளையும் அன்புடன் வேண்டுகிறோம்.", venueName: "ஸ்ரீ சம்போதி விகாரை", venueAddress: "கோயில் வீதி, கம்பஹா" },
  },
};

export const DEMO_EVENTS: Record<string, EventData> = {
  "classic-wedding": wedding,
  "modern-wedding": modern,
  homecoming,
  "big-girl": bigGirl,
  birthday,
  dana,
};

export const DEMO_OCCASION: Record<string, OccasionType> = Object.fromEntries(
  Object.entries(DEMO_EVENTS).map(([k, v]) => [k, v.occasionType]),
);

export const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

/**
 * Translations supported by bible-api.com (free / open-licensed).
 * NIV, ESV, NKJV, NLT, NASB are copyright-protected and unavailable via this API.
 */
export const BIBLE_TRANSLATIONS: { label: string; value: string }[] = [
  { label: "KJV — King James Version",           value: "kjv"     },
  { label: "WEB — World English Bible",           value: "web"     },
  { label: "BBE — Bible in Basic English",        value: "bbe"     },
  { label: "DARBY — Darby Translation",           value: "darby"   },
  { label: "WEBBE — WEB British Edition",         value: "webbe"   },
  { label: "RV1960 — Reina Valera (Spanish)",     value: "rv1960"  },
  { label: "LSG — Louis Segond (French)",         value: "lsg"     },
  { label: "ALMEIDA — Ferreira de Almeida (PT)",  value: "almeida" },
];

export const FONTS = [
  "Georgia", "Inter", "Playfair Display", "Cinzel", "Raleway", "Oswald", "Lora", "Montserrat", "EB Garamond", "Open Sans"
];

export const SONG_CATEGORIES = [
  "hymn", "worship", "gospel", "contemporary", "christmas", "shona", "ndebele", "other"
];

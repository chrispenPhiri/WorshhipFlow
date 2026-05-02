export const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

/**
 * Translations served by bible-api.com (free / open-licensed, public domain).
 * NIV, ESV, NKJV, NLT, NASB are copyright-protected and unavailable via this API.
 *
 * value = the code passed to bible-api.com ?translation=
 * abbr  = short badge shown on the broadcast screen
 */
export const BIBLE_TRANSLATIONS: { label: string; value: string; abbr: string }[] = [
  // ── English ───────────────────────────────────────────────────────────────
  { label: "KJV — King James Version (1769)",           value: "kjv",        abbr: "KJV"    },
  { label: "AKJV — Authorized KJV (modernised spelling)", value: "akjv",     abbr: "AKJV"   },
  { label: "ASV — American Standard Version (1901)",    value: "asv",        abbr: "ASV"    },
  { label: "YLT — Young's Literal Translation (1898)",  value: "ylt",        abbr: "YLT"    },
  { label: "WEB — World English Bible",                 value: "web",        abbr: "WEB"    },
  { label: "WEBBE — WEB British Edition",               value: "webbe",      abbr: "WEBBE"  },
  { label: "WMB — World Messianic Bible",               value: "wmb",        abbr: "WMB"    },
  { label: "WMBBE — World Messianic Bible (British)",   value: "wmbbe",      abbr: "WMBBE"  },
  { label: "BBE — Bible in Basic English",              value: "bbe",        abbr: "BBE"    },
  { label: "DARBY — Darby Translation",                 value: "darby",      abbr: "DARBY"  },
  { label: "OEB-US — Open English Bible (US spelling)", value: "oeb-us",     abbr: "OEB"    },
  { label: "OEB-CW — Open English Bible (Commonwealth)", value: "oeb-cw",   abbr: "OEB-CW" },
  // ── Other languages ───────────────────────────────────────────────────────
  { label: "RV1960 — Reina Valera (Spanish)",           value: "rv1960",     abbr: "RV1960" },
  { label: "LSG — Louis Segond (French)",               value: "lsg",        abbr: "LSG"    },
  { label: "ALMEIDA — Ferreira de Almeida (Portuguese)", value: "almeida",   abbr: "ARA"    },
  { label: "CLEMENTINE — Biblia Sacra (Latin)",         value: "clementine", abbr: "VUL"    },
  { label: "TR — Textus Receptus (Greek NT)",           value: "tr",         abbr: "TR"     },
];

export const FONTS = [
  "Georgia", "Inter", "Playfair Display", "Cinzel", "Raleway", "Oswald", "Lora", "Montserrat", "EB Garamond", "Open Sans"
];

export const SONG_CATEGORIES = [
  "hymn", "worship", "gospel", "contemporary", "christmas", "shona", "ndebele", "other"
];

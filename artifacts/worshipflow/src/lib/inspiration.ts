/**
 * Daily inspiration content — verse of the day, Bible facts, Christian liturgical calendar.
 *
 * All content is local / curated (no API calls). The verse and fact rotate deterministically by
 * day-of-year so every operator sees the same item on the same day, but a "Next" control lets
 * them browse the full library on demand.
 */

export interface DailyVerse {
  reference: string;
  text: string;
}

export interface BibleFact {
  topic: "Bible" | "Jesus" | "God" | "Church History" | "Old Testament" | "New Testament";
  fact: string;
}

export interface ChristianEvent {
  /** YYYY-MM-DD in local time. */
  date: string;
  /** Resolved JS Date for sorting / formatting. */
  jsDate: Date;
  name: string;
  description: string;
  /** Movable feasts (Easter-based) vs fixed (e.g. Christmas). */
  kind: "movable" | "fixed";
}

// ───────────────────────────────────────────────────────────────────────────────
//  VERSES — 60+ encouraging passages (KJV, public domain).
// ───────────────────────────────────────────────────────────────────────────────

export const VERSES: DailyVerse[] = [
  { reference: "John 3:16",         text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { reference: "Psalm 23:1",        text: "The LORD is my shepherd; I shall not want." },
  { reference: "Philippians 4:13",  text: "I can do all things through Christ which strengtheneth me." },
  { reference: "Jeremiah 29:11",    text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end." },
  { reference: "Romans 8:28",       text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
  { reference: "Proverbs 3:5-6",    text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths." },
  { reference: "Isaiah 40:31",      text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." },
  { reference: "Joshua 1:9",        text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest." },
  { reference: "Matthew 11:28",     text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  { reference: "Psalm 46:10",       text: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth." },
  { reference: "Romans 12:2",       text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God." },
  { reference: "1 Corinthians 13:4-5", text: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil." },
  { reference: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law." },
  { reference: "Psalm 119:105",     text: "Thy word is a lamp unto my feet, and a light unto my path." },
  { reference: "Matthew 6:33",      text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you." },
  { reference: "Hebrews 11:1",      text: "Now faith is the substance of things hoped for, the evidence of things not seen." },
  { reference: "John 14:6",         text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me." },
  { reference: "Romans 10:9",       text: "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved." },
  { reference: "Ephesians 2:8-9",   text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: not of works, lest any man should boast." },
  { reference: "2 Timothy 1:7",     text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind." },
  { reference: "Psalm 27:1",        text: "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?" },
  { reference: "Isaiah 41:10",      text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness." },
  { reference: "Psalm 34:18",       text: "The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit." },
  { reference: "James 1:5",         text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him." },
  { reference: "1 Peter 5:7",       text: "Casting all your care upon him; for he careth for you." },
  { reference: "Psalm 37:4",        text: "Delight thyself also in the LORD; and he shall give thee the desires of thine heart." },
  { reference: "Matthew 5:16",      text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven." },
  { reference: "Romans 6:23",       text: "For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord." },
  { reference: "John 8:32",         text: "And ye shall know the truth, and the truth shall make you free." },
  { reference: "Psalm 51:10",       text: "Create in me a clean heart, O God; and renew a right spirit within me." },
  { reference: "Lamentations 3:22-23", text: "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness." },
  { reference: "Micah 6:8",         text: "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?" },
  { reference: "Matthew 28:19-20",  text: "Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost: Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world. Amen." },
  { reference: "Acts 1:8",          text: "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth." },
  { reference: "Romans 5:8",        text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us." },
  { reference: "1 John 4:19",       text: "We love him, because he first loved us." },
  { reference: "Psalm 139:14",      text: "I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well." },
  { reference: "Philippians 4:6-7", text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus." },
  { reference: "Colossians 3:23",   text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men." },
  { reference: "Isaiah 53:5",       text: "But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed." },
  { reference: "Matthew 5:8",       text: "Blessed are the pure in heart: for they shall see God." },
  { reference: "Matthew 22:37-39",  text: "Jesus said unto him, Thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind. This is the first and great commandment. And the second is like unto it, Thou shalt love thy neighbour as thyself." },
  { reference: "John 15:13",        text: "Greater love hath no man than this, that a man lay down his life for his friends." },
  { reference: "Revelation 21:4",   text: "And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away." },
  { reference: "Psalm 30:5",        text: "Weeping may endure for a night, but joy cometh in the morning." },
  { reference: "Psalm 91:1-2",      text: "He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty. I will say of the LORD, He is my refuge and my fortress: my God; in him will I trust." },
  { reference: "Romans 8:38-39",    text: "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord." },
  { reference: "1 Corinthians 10:13", text: "There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it." },
  { reference: "Hebrews 4:16",      text: "Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need." },
  { reference: "James 4:7",         text: "Submit yourselves therefore to God. Resist the devil, and he will flee from you." },
  { reference: "Matthew 6:34",      text: "Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof." },
  { reference: "Psalm 121:1-2",     text: "I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth." },
  { reference: "Proverbs 18:10",    text: "The name of the LORD is a strong tower: the righteous runneth into it, and is safe." },
  { reference: "Galatians 2:20",    text: "I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me." },
  { reference: "Ephesians 4:32",    text: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you." },
  { reference: "1 Thessalonians 5:16-18", text: "Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you." },
  { reference: "Psalm 19:14",       text: "Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O LORD, my strength, and my redeemer." },
  { reference: "John 1:1",          text: "In the beginning was the Word, and the Word was with God, and the Word was God." },
  { reference: "John 13:34-35",     text: "A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another. By this shall all men know that ye are my disciples, if ye have love one to another." },
  { reference: "Matthew 7:7",       text: "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you." },
  { reference: "2 Corinthians 5:17", text: "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new." },
];

// ───────────────────────────────────────────────────────────────────────────────
//  FACTS — bite-sized facts about the Bible, Jesus, God, and Church history.
// ───────────────────────────────────────────────────────────────────────────────

export const FACTS: BibleFact[] = [
  { topic: "Bible",           fact: "The Bible was written by about 40 different authors over a span of roughly 1,500 years on three continents — Asia, Africa, and Europe." },
  { topic: "Bible",           fact: "The Bible is the most translated book in history, available in over 3,500 languages." },
  { topic: "Bible",           fact: "The shortest verse in the Bible is John 11:35 — \"Jesus wept.\"" },
  { topic: "Bible",           fact: "Psalm 117 is the shortest chapter in the Bible (2 verses), and Psalm 119 is the longest (176 verses)." },
  { topic: "Bible",           fact: "The middle chapter of the Bible is Psalm 117, and the middle verse is Psalm 118:8." },
  { topic: "Bible",           fact: "The word \"Bible\" comes from the Greek 'biblia,' meaning 'books' — a recognition that scripture is a library, not a single volume." },
  { topic: "Bible",           fact: "There are 66 books in the Protestant Bible: 39 in the Old Testament and 27 in the New Testament." },
  { topic: "Bible",           fact: "The Bible was the first book ever printed on Gutenberg's printing press around 1455." },
  { topic: "Bible",           fact: "Esther is the only book in the Bible that does not mention God by name." },
  { topic: "Bible",           fact: "Methuselah lived 969 years — the longest-recorded life in the Bible (Genesis 5:27)." },
  { topic: "Old Testament",   fact: "The Hebrew Bible (Tanakh) is divided into three sections: Torah (Law), Nevi'im (Prophets), and Ketuvim (Writings)." },
  { topic: "Old Testament",   fact: "The Ten Commandments appear twice in the Old Testament — Exodus 20 and Deuteronomy 5." },
  { topic: "Old Testament",   fact: "King David wrote roughly half of the Psalms (73 of 150)." },
  { topic: "Old Testament",   fact: "The book of Genesis covers more time than any other book in the Bible — over 2,000 years of history." },
  { topic: "New Testament",   fact: "The four Gospels — Matthew, Mark, Luke, and John — each present the life of Jesus from a distinct perspective." },
  { topic: "New Testament",   fact: "The Apostle Paul wrote 13 of the 27 books of the New Testament." },
  { topic: "New Testament",   fact: "The book of Acts is a sequel to the Gospel of Luke; both were written by Luke and addressed to Theophilus." },
  { topic: "New Testament",   fact: "Revelation, the last book of the Bible, was written by the Apostle John while exiled on the island of Patmos." },
  { topic: "Jesus",           fact: "Jesus performed at least 37 recorded miracles in the Gospels, ranging from healings to feeding the 5,000." },
  { topic: "Jesus",           fact: "Jesus's first recorded miracle was turning water into wine at the wedding in Cana (John 2)." },
  { topic: "Jesus",           fact: "Jesus chose 12 apostles to be His closest disciples, mirroring the 12 tribes of Israel." },
  { topic: "Jesus",           fact: "The name 'Jesus' comes from the Hebrew 'Yeshua,' meaning 'The LORD saves.'" },
  { topic: "Jesus",           fact: "Jesus quoted from at least 24 different Old Testament books during His earthly ministry." },
  { topic: "Jesus",           fact: "The Sermon on the Mount (Matthew 5–7) contains the Beatitudes, the Lord's Prayer, and the Golden Rule." },
  { topic: "Jesus",           fact: "Jesus spent 40 days fasting in the wilderness before beginning His public ministry." },
  { topic: "Jesus",           fact: "Jesus appeared to more than 500 people after His resurrection (1 Corinthians 15:6)." },
  { topic: "God",             fact: "The Hebrew name YHWH (often rendered 'LORD' in English Bibles) appears more than 6,800 times in the Old Testament." },
  { topic: "God",             fact: "God reveals Himself by many names in scripture: El Shaddai (Almighty), Jehovah Jireh (Provider), Jehovah Rapha (Healer), and many more." },
  { topic: "God",             fact: "The doctrine of the Trinity — one God in three persons (Father, Son, and Holy Spirit) — is foundational to historic Christian faith." },
  { topic: "God",             fact: "1 John 4:8 declares simply, 'God is love' — one of the shortest and most profound descriptions of God's nature." },
  { topic: "Church History",  fact: "Pentecost — celebrated 50 days after Easter — is widely regarded as the birthday of the Christian Church." },
  { topic: "Church History",  fact: "The Apostles' Creed, dating to the 2nd–4th centuries, is one of the earliest summaries of Christian belief." },
  { topic: "Church History",  fact: "Martin Luther's 95 Theses, posted on October 31, 1517, sparked the Protestant Reformation." },
  { topic: "Church History",  fact: "The Council of Nicaea (AD 325) produced the Nicene Creed, affirming the deity of Christ." },
  { topic: "Church History",  fact: "The word 'Christian' was first used in Antioch (Acts 11:26)." },
  { topic: "Church History",  fact: "Most of the apostles were martyred for their faith — only John is believed to have died of natural causes." },
];

// ───────────────────────────────────────────────────────────────────────────────
//  LITURGICAL CALENDAR — major movable + fixed feasts.
// ───────────────────────────────────────────────────────────────────────────────

/** Anonymous Gregorian / Meeus computation of Easter Sunday for a given year. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build the calendar for a given year.
 * Includes both Western movable feasts (anchored to Easter) and key fixed feasts.
 */
export function buildCalendar(year: number): ChristianEvent[] {
  const easter = easterSunday(year);
  const e = (offset: number) => addDays(easter, offset);

  // Advent Sunday: 4th Sunday before Christmas
  const xmas = new Date(year, 11, 25);
  const xmasDow = xmas.getDay(); // 0 = Sun
  const lastSundayBefore = addDays(xmas, -((xmasDow + 7) % 7 || 7));
  const adventSunday = addDays(lastSundayBefore, -21);

  const events: ChristianEvent[] = [
    { date: ymd(new Date(year, 0, 1)),  jsDate: new Date(year, 0, 1),  name: "New Year's Day",          description: "A traditional time for prayer, watch-night services, and renewed dedication.", kind: "fixed" },
    { date: ymd(new Date(year, 0, 6)),  jsDate: new Date(year, 0, 6),  name: "Epiphany",                description: "Celebrates the manifestation of Christ to the Gentiles, traditionally remembered through the visit of the Magi.", kind: "fixed" },
    { date: ymd(e(-46)),                jsDate: e(-46),                 name: "Ash Wednesday",           description: "The first day of Lent — a season of repentance, fasting, and reflection lasting 40 days (excluding Sundays) before Easter.", kind: "movable" },
    { date: ymd(e(-7)),                 jsDate: e(-7),                  name: "Palm Sunday",             description: "Commemorates Jesus's triumphal entry into Jerusalem, when crowds laid palm branches in His path.", kind: "movable" },
    { date: ymd(e(-3)),                 jsDate: e(-3),                  name: "Maundy Thursday",         description: "Remembers the Last Supper and Jesus's new commandment to love one another (John 13).", kind: "movable" },
    { date: ymd(e(-2)),                 jsDate: e(-2),                  name: "Good Friday",             description: "Remembers the crucifixion and death of Jesus Christ.", kind: "movable" },
    { date: ymd(e(-1)),                 jsDate: e(-1),                  name: "Holy Saturday",           description: "The day of waiting between the cross and the resurrection.", kind: "movable" },
    { date: ymd(easter),                jsDate: easter,                 name: "Easter Sunday",           description: "The central celebration of the Christian year — the resurrection of Jesus Christ from the dead.", kind: "movable" },
    { date: ymd(e(39)),                 jsDate: e(39),                  name: "Ascension Day",           description: "Celebrates Jesus's bodily ascension into heaven 40 days after the resurrection.", kind: "movable" },
    { date: ymd(e(49)),                 jsDate: e(49),                  name: "Pentecost",               description: "Marks the descent of the Holy Spirit on the disciples — widely regarded as the birthday of the Church (Acts 2).", kind: "movable" },
    { date: ymd(e(56)),                 jsDate: e(56),                  name: "Trinity Sunday",          description: "Honors the doctrine of the Trinity — one God in three persons: Father, Son, and Holy Spirit.", kind: "movable" },
    { date: ymd(new Date(year, 9, 31)), jsDate: new Date(year, 9, 31), name: "Reformation Day",         description: "Marks the anniversary of Martin Luther posting the 95 Theses in 1517, sparking the Protestant Reformation.", kind: "fixed" },
    { date: ymd(new Date(year, 10, 1)), jsDate: new Date(year, 10, 1), name: "All Saints' Day",         description: "Honors all saints — both known and unknown — who have entered the eternal kingdom.", kind: "fixed" },
    { date: ymd(adventSunday),          jsDate: adventSunday,           name: "Advent Sunday",           description: "The first Sunday of Advent — a four-week season of preparation and anticipation leading to Christmas.", kind: "movable" },
    { date: ymd(new Date(year, 11, 24)), jsDate: new Date(year, 11, 24), name: "Christmas Eve",          description: "Vigil of the Nativity — many congregations gather for candlelight services.", kind: "fixed" },
    { date: ymd(new Date(year, 11, 25)), jsDate: new Date(year, 11, 25), name: "Christmas Day",          description: "Celebrates the birth of Jesus Christ, the incarnation of God in human flesh.", kind: "fixed" },
    { date: ymd(new Date(year, 11, 31)), jsDate: new Date(year, 11, 31), name: "Watch Night",            description: "A late-evening service welcoming the new year with prayer and thanksgiving — observed especially in many African-American and global congregations.", kind: "fixed" },
  ];

  return events.sort((a, b) => a.jsDate.getTime() - b.jsDate.getTime());
}

/** Day-of-year for deterministic verse / fact rotation. */
export function dayOfYear(d: Date = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Pick today's verse deterministically. */
export function getVerseOfDay(d: Date = new Date()): DailyVerse {
  return VERSES[dayOfYear(d) % VERSES.length];
}

/** Pick today's fact deterministically. */
export function getFactOfDay(d: Date = new Date()): BibleFact {
  return FACTS[dayOfYear(d) % FACTS.length];
}

/**
 * Returns the next N upcoming events from today, spanning the current and next year so that
 * events occurring in early January remain visible after Christmas has passed.
 */
export function getUpcomingEvents(count: number = 8, today: Date = new Date()): ChristianEvent[] {
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const all = [...buildCalendar(today.getFullYear()), ...buildCalendar(today.getFullYear() + 1)];
  return all.filter(ev => ev.jsDate >= todayMid).slice(0, count);
}

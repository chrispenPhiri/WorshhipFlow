/**
 * Bible / Christian Games — local, offline-friendly game data.
 *
 * Four games:
 *   - Bible Trivia      — multiple-choice questions
 *   - Books of the Bible — put books in correct order (OT or NT)
 *   - Who Said It?      — match Bible quotes to the speaker
 *   - Bible Charades    — random prompt cards (no scoring)
 *
 * All content is curated and offline. KJV references where applicable.
 */

// ─── BIBLE TRIVIA ─────────────────────────────────────────────────────────

export type TriviaDifficulty = "Easy" | "Medium" | "Hard";

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];          // exactly 4
  answerIndex: number;        // 0..3
  difficulty: TriviaDifficulty;
  reference?: string;
  explanation?: string;
}

export const TRIVIA: TriviaQuestion[] = [
  // ── Easy ──
  { id: "t1", question: "Who built the ark?", options: ["Moses", "Noah", "Abraham", "David"], answerIndex: 1, difficulty: "Easy", reference: "Genesis 6", explanation: "God commanded Noah to build the ark." },
  { id: "t2", question: "How many days and nights did it rain in the great flood?", options: ["7", "14", "40", "100"], answerIndex: 2, difficulty: "Easy", reference: "Genesis 7:12" },
  { id: "t3", question: "Who was thrown into the lions' den?", options: ["Jonah", "Daniel", "Joseph", "Elijah"], answerIndex: 1, difficulty: "Easy", reference: "Daniel 6" },
  { id: "t4", question: "Who was swallowed by a great fish?", options: ["Jonah", "Job", "Joshua", "Jeremiah"], answerIndex: 0, difficulty: "Easy", reference: "Jonah 1" },
  { id: "t5", question: "Who killed the giant Goliath?", options: ["Saul", "Samuel", "David", "Jonathan"], answerIndex: 2, difficulty: "Easy", reference: "1 Samuel 17" },
  { id: "t6", question: "How many disciples did Jesus choose?", options: ["7", "10", "12", "70"], answerIndex: 2, difficulty: "Easy" },
  { id: "t7", question: "In which town was Jesus born?", options: ["Nazareth", "Jerusalem", "Bethlehem", "Capernaum"], answerIndex: 2, difficulty: "Easy", reference: "Luke 2" },
  { id: "t8", question: "What is the first book of the Bible?", options: ["Exodus", "Genesis", "Leviticus", "Psalms"], answerIndex: 1, difficulty: "Easy" },
  { id: "t9", question: "What is the last book of the Bible?", options: ["Jude", "Revelation", "Hebrews", "Acts"], answerIndex: 1, difficulty: "Easy" },
  { id: "t10", question: "Who led the Israelites out of Egypt?", options: ["Joshua", "Moses", "Aaron", "Caleb"], answerIndex: 1, difficulty: "Easy", reference: "Exodus 3" },
  { id: "t11", question: "What did Jesus turn water into?", options: ["Bread", "Wine", "Oil", "Honey"], answerIndex: 1, difficulty: "Easy", reference: "John 2" },
  { id: "t12", question: "Who denied Jesus three times?", options: ["John", "Peter", "Judas", "Thomas"], answerIndex: 1, difficulty: "Easy", reference: "Luke 22" },
  { id: "t13", question: "Who baptized Jesus?", options: ["Peter", "John the Baptist", "Andrew", "James"], answerIndex: 1, difficulty: "Easy", reference: "Matthew 3" },
  { id: "t14", question: "How many books are in the Bible (Protestant)?", options: ["50", "60", "66", "73"], answerIndex: 2, difficulty: "Easy" },
  { id: "t15", question: "Who was the first man God created?", options: ["Cain", "Abel", "Seth", "Adam"], answerIndex: 3, difficulty: "Easy", reference: "Genesis 2" },

  // ── Medium ──
  { id: "t16", question: "Who interpreted Pharaoh's dreams?", options: ["Joseph", "Daniel", "Moses", "Aaron"], answerIndex: 0, difficulty: "Medium", reference: "Genesis 41" },
  { id: "t17", question: "Which apostle wrote the most books in the New Testament?", options: ["Peter", "John", "Paul", "James"], answerIndex: 2, difficulty: "Medium", explanation: "Paul wrote 13 (or 14 with Hebrews)." },
  { id: "t18", question: "Who was the mother of John the Baptist?", options: ["Mary", "Elizabeth", "Anna", "Hannah"], answerIndex: 1, difficulty: "Medium", reference: "Luke 1" },
  { id: "t19", question: "What city's walls fell after the Israelites marched around them?", options: ["Ai", "Jericho", "Hebron", "Bethel"], answerIndex: 1, difficulty: "Medium", reference: "Joshua 6" },
  { id: "t20", question: "Who was the king when Jesus was born?", options: ["Pilate", "Herod the Great", "Caesar Augustus", "Tiberius"], answerIndex: 1, difficulty: "Medium", reference: "Matthew 2" },
  { id: "t21", question: "What is the shortest verse in the Bible (KJV)?", options: ["God is love.", "Jesus wept.", "Pray always.", "Rejoice evermore."], answerIndex: 1, difficulty: "Medium", reference: "John 11:35" },
  { id: "t22", question: "Which prophet was taken up to heaven in a whirlwind?", options: ["Elisha", "Elijah", "Isaiah", "Ezekiel"], answerIndex: 1, difficulty: "Medium", reference: "2 Kings 2" },
  { id: "t23", question: "Who replaced Judas Iscariot among the twelve?", options: ["Barnabas", "Stephen", "Matthias", "Saul"], answerIndex: 2, difficulty: "Medium", reference: "Acts 1:26" },
  { id: "t24", question: "What was the name of Abraham's wife?", options: ["Rachel", "Rebekah", "Sarah", "Leah"], answerIndex: 2, difficulty: "Medium", reference: "Genesis 17" },
  { id: "t25", question: "How many plagues did God send on Egypt?", options: ["7", "10", "12", "40"], answerIndex: 1, difficulty: "Medium", reference: "Exodus 7-12" },
  { id: "t26", question: "Which gospel was written by a doctor?", options: ["Matthew", "Mark", "Luke", "John"], answerIndex: 2, difficulty: "Medium", explanation: "Luke is called 'the beloved physician' (Col 4:14)." },
  { id: "t27", question: "What is the longest book in the Bible?", options: ["Isaiah", "Genesis", "Psalms", "Jeremiah"], answerIndex: 2, difficulty: "Medium" },
  { id: "t28", question: "What was the name of the garden where Jesus prayed before His arrest?", options: ["Eden", "Gethsemane", "Olives", "Bethany"], answerIndex: 1, difficulty: "Medium", reference: "Matthew 26" },
  { id: "t29", question: "Who was the high priest at Jesus' trial?", options: ["Annas", "Caiaphas", "Gamaliel", "Zacharias"], answerIndex: 1, difficulty: "Medium", reference: "Matthew 26:57" },
  { id: "t30", question: "How many people were saved on Noah's ark?", options: ["4", "6", "8", "12"], answerIndex: 2, difficulty: "Medium", reference: "1 Peter 3:20" },

  // ── Hard ──
  { id: "t31", question: "What was the name of the field bought with Judas' silver?", options: ["Field of Blood (Akeldama)", "Field of Tears", "Potter's House", "Field of Mourning"], answerIndex: 0, difficulty: "Hard", reference: "Acts 1:19" },
  { id: "t32", question: "How old was Methuselah when he died?", options: ["930", "950", "969", "1000"], answerIndex: 2, difficulty: "Hard", reference: "Genesis 5:27" },
  { id: "t33", question: "Who was the king of Babylon during Daniel's interpretation of the writing on the wall?", options: ["Nebuchadnezzar", "Belshazzar", "Darius", "Cyrus"], answerIndex: 1, difficulty: "Hard", reference: "Daniel 5" },
  { id: "t34", question: "Which book is named after a queen?", options: ["Ruth", "Esther", "Judith", "Both Ruth and Esther"], answerIndex: 1, difficulty: "Hard", explanation: "Ruth was not a queen; Esther became queen of Persia." },
  { id: "t35", question: "What was the name of the Roman governor at Jesus' crucifixion?", options: ["Felix", "Festus", "Pilate", "Quirinius"], answerIndex: 2, difficulty: "Hard" },
  { id: "t36", question: "Who is the only female judge mentioned in the book of Judges?", options: ["Jael", "Deborah", "Ruth", "Naomi"], answerIndex: 1, difficulty: "Hard", reference: "Judges 4" },
  { id: "t37", question: "What was the name of Paul's missionary companion who later disagreed with him over John Mark?", options: ["Silas", "Barnabas", "Timothy", "Titus"], answerIndex: 1, difficulty: "Hard", reference: "Acts 15:39" },
  { id: "t38", question: "Which prophet was instructed to marry an unfaithful woman as a sign to Israel?", options: ["Ezekiel", "Hosea", "Amos", "Micah"], answerIndex: 1, difficulty: "Hard", reference: "Hosea 1" },
  { id: "t39", question: "How many years did the Israelites wander in the wilderness?", options: ["30", "40", "50", "70"], answerIndex: 1, difficulty: "Hard", reference: "Numbers 14:33" },
  { id: "t40", question: "What was Saul's name after he became an apostle?", options: ["Peter", "Paul", "Stephen", "Silvanus"], answerIndex: 1, difficulty: "Hard", reference: "Acts 13:9" },
];

// ─── BOOKS OF THE BIBLE ───────────────────────────────────────────────────

export const OLD_TESTAMENT_BOOKS: string[] = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
];

export const NEW_TESTAMENT_BOOKS: string[] = [
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

// ─── WHO SAID IT? ─────────────────────────────────────────────────────────

export interface QuoteRound {
  id: string;
  quote: string;
  speaker: string;          // correct answer
  options: string[];        // 4 choices including the correct speaker
  reference?: string;
  context?: string;
}

export const WHO_SAID_IT: QuoteRound[] = [
  { id: "q1", quote: "Am I my brother's keeper?", speaker: "Cain", options: ["Cain", "Abel", "Esau", "Jacob"], reference: "Genesis 4:9" },
  { id: "q2", quote: "Here am I; send me.", speaker: "Isaiah", options: ["Jeremiah", "Isaiah", "Moses", "Samuel"], reference: "Isaiah 6:8" },
  { id: "q3", quote: "Let my people go.", speaker: "Moses", options: ["Aaron", "Joshua", "Moses", "Caleb"], reference: "Exodus 5:1" },
  { id: "q4", quote: "Whither thou goest, I will go.", speaker: "Ruth", options: ["Naomi", "Ruth", "Esther", "Hannah"], reference: "Ruth 1:16" },
  { id: "q5", quote: "Be not afraid, only believe.", speaker: "Jesus", options: ["Peter", "Paul", "Jesus", "John"], reference: "Mark 5:36" },
  { id: "q6", quote: "Silver and gold have I none; but such as I have give I thee.", speaker: "Peter", options: ["Paul", "Peter", "John", "Stephen"], reference: "Acts 3:6" },
  { id: "q7", quote: "Though he slay me, yet will I trust in him.", speaker: "Job", options: ["David", "Job", "Daniel", "Jeremiah"], reference: "Job 13:15" },
  { id: "q8", quote: "I have fought a good fight, I have finished my course, I have kept the faith.", speaker: "Paul", options: ["Paul", "Peter", "John", "Stephen"], reference: "2 Timothy 4:7" },
  { id: "q9", quote: "If I perish, I perish.", speaker: "Esther", options: ["Esther", "Ruth", "Mary", "Deborah"], reference: "Esther 4:16" },
  { id: "q10", quote: "My Lord and my God.", speaker: "Thomas", options: ["Peter", "Andrew", "Thomas", "Philip"], reference: "John 20:28" },
  { id: "q11", quote: "Behold the handmaid of the Lord; be it unto me according to thy word.", speaker: "Mary (mother of Jesus)", options: ["Mary Magdalene", "Mary (mother of Jesus)", "Elizabeth", "Anna"], reference: "Luke 1:38" },
  { id: "q12", quote: "Lord, remember me when thou comest into thy kingdom.", speaker: "The thief on the cross", options: ["Peter", "Judas", "The thief on the cross", "Barabbas"], reference: "Luke 23:42" },
  { id: "q13", quote: "I find no fault in this man.", speaker: "Pontius Pilate", options: ["Herod", "Caiaphas", "Pontius Pilate", "Annas"], reference: "Luke 23:4" },
  { id: "q14", quote: "Speak; for thy servant heareth.", speaker: "Samuel", options: ["David", "Saul", "Eli", "Samuel"], reference: "1 Samuel 3:10" },
  { id: "q15", quote: "Choose you this day whom ye will serve.", speaker: "Joshua", options: ["Moses", "Joshua", "Caleb", "Samuel"], reference: "Joshua 24:15" },
  { id: "q16", quote: "Get thee behind me, Satan.", speaker: "Jesus", options: ["Peter", "John", "Jesus", "Paul"], reference: "Matthew 16:23" },
  { id: "q17", quote: "I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me.", speaker: "Paul", options: ["John", "Peter", "Paul", "James"], reference: "Galatians 2:20" },
  { id: "q18", quote: "The LORD bless thee, and keep thee.", speaker: "Aaron", options: ["Moses", "Aaron", "Joshua", "Eli"], reference: "Numbers 6:24" },
  { id: "q19", quote: "How can these things be?", speaker: "Nicodemus", options: ["Nicodemus", "Zacchaeus", "Joseph of Arimathea", "Lazarus"], reference: "John 3:9" },
  { id: "q20", quote: "Thou art the Christ, the Son of the living God.", speaker: "Peter", options: ["Peter", "Andrew", "John", "Thomas"], reference: "Matthew 16:16" },
];

// ─── BIBLE CHARADES / PICTIONARY ──────────────────────────────────────────

export interface CharadeCard {
  id: string;
  prompt: string;
  category: "Person" | "Event" | "Object" | "Parable" | "Miracle";
  hint?: string;
}

export const CHARADES: CharadeCard[] = [
  { id: "c1", prompt: "Noah's Ark", category: "Event", hint: "Floating zoo" },
  { id: "c2", prompt: "David and Goliath", category: "Event", hint: "Sling and stone" },
  { id: "c3", prompt: "Daniel in the Lions' Den", category: "Event", hint: "Brave prayer" },
  { id: "c4", prompt: "Jonah and the Whale", category: "Event", hint: "Sea-faring runaway" },
  { id: "c5", prompt: "The Good Samaritan", category: "Parable" },
  { id: "c6", prompt: "Walking on Water", category: "Miracle", hint: "A stormy night" },
  { id: "c7", prompt: "The Last Supper", category: "Event" },
  { id: "c8", prompt: "Jesus' Baptism", category: "Event", hint: "A river and a dove" },
  { id: "c9", prompt: "Crossing the Red Sea", category: "Event" },
  { id: "c10", prompt: "Moses and the Burning Bush", category: "Event" },
  { id: "c11", prompt: "The Prodigal Son", category: "Parable" },
  { id: "c12", prompt: "Feeding the 5,000", category: "Miracle", hint: "Loaves and fishes" },
  { id: "c13", prompt: "Adam and Eve", category: "Person" },
  { id: "c14", prompt: "Joseph's Coat of Many Colors", category: "Object" },
  { id: "c15", prompt: "Samson and Delilah", category: "Event" },
  { id: "c16", prompt: "The Tower of Babel", category: "Event" },
  { id: "c17", prompt: "The Sermon on the Mount", category: "Event" },
  { id: "c18", prompt: "The Lost Sheep", category: "Parable" },
  { id: "c19", prompt: "The Mustard Seed", category: "Parable" },
  { id: "c20", prompt: "Lazarus Raised from the Dead", category: "Miracle" },
  { id: "c21", prompt: "Jericho Walls Falling Down", category: "Event" },
  { id: "c22", prompt: "Jesus Calming the Storm", category: "Miracle" },
  { id: "c23", prompt: "The Wise Men Visiting Baby Jesus", category: "Event" },
  { id: "c24", prompt: "Elijah and the Chariot of Fire", category: "Event" },
  { id: "c25", prompt: "Peter Walking on Water", category: "Miracle" },
  { id: "c26", prompt: "Zacchaeus in the Tree", category: "Event" },
  { id: "c27", prompt: "The Wedding at Cana", category: "Miracle" },
  { id: "c28", prompt: "Pentecost — Tongues of Fire", category: "Event" },
  { id: "c29", prompt: "Paul Shipwrecked on Malta", category: "Event" },
  { id: "c30", prompt: "The Crown of Thorns", category: "Object" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i] as T;
    a[i] = a[j] as T;
    a[j] = t;
  }
  return a;
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

// ─── VERSE SCRAMBLE ───────────────────────────────────────────────────────
//
// Show a familiar verse with its words shuffled and have the group put it
// back in order.  Verses kept short so the scramble is solvable in a group
// setting without paper.  KJV per project preference.

export interface ScrambleVerse {
  id: string;
  reference: string;
  verse: string;        // KJV text
  hint?: string;        // theme / book to nudge the group
}

export const VERSE_SCRAMBLE: ScrambleVerse[] = [
  { id: "vs1",  reference: "John 3:16",        verse: "For God so loved the world",                                            hint: "The most-quoted verse" },
  { id: "vs2",  reference: "Psalm 23:1",       verse: "The Lord is my shepherd I shall not want",                              hint: "A psalm of David" },
  { id: "vs3",  reference: "Proverbs 3:5",     verse: "Trust in the Lord with all thine heart",                                hint: "A famous proverb" },
  { id: "vs4",  reference: "Philippians 4:13", verse: "I can do all things through Christ which strengtheneth me",             hint: "Paul to the Philippians" },
  { id: "vs5",  reference: "Romans 8:28",      verse: "All things work together for good to them that love God",               hint: "Pauline promise" },
  { id: "vs6",  reference: "Matthew 5:9",      verse: "Blessed are the peacemakers for they shall be called the children of God", hint: "From the Beatitudes" },
  { id: "vs7",  reference: "John 14:6",        verse: "I am the way the truth and the life",                                   hint: "Jesus speaking" },
  { id: "vs8",  reference: "Genesis 1:1",      verse: "In the beginning God created the heaven and the earth",                 hint: "The very first verse" },
  { id: "vs9",  reference: "Psalm 119:105",    verse: "Thy word is a lamp unto my feet and a light unto my path",              hint: "About Scripture" },
  { id: "vs10", reference: "Joshua 1:9",       verse: "Be strong and of a good courage be not afraid",                          hint: "God to Joshua" },
  { id: "vs11", reference: "Isaiah 40:31",     verse: "They that wait upon the Lord shall renew their strength",               hint: "An Isaiah promise" },
  { id: "vs12", reference: "Matthew 6:33",     verse: "Seek ye first the kingdom of God and his righteousness",                hint: "Sermon on the Mount" },
  { id: "vs13", reference: "Jeremiah 29:11",   verse: "For I know the thoughts that I think toward you saith the Lord",        hint: "A prophet's promise" },
  { id: "vs14", reference: "John 11:35",       verse: "Jesus wept",                                                              hint: "The shortest verse" },
  { id: "vs15", reference: "Galatians 5:22",   verse: "The fruit of the Spirit is love joy peace",                              hint: "Fruit of the Spirit (start)" },
  { id: "vs16", reference: "Hebrews 11:1",     verse: "Now faith is the substance of things hoped for",                         hint: "On faith" },
  { id: "vs17", reference: "1 John 4:8",       verse: "He that loveth not knoweth not God for God is love",                     hint: "Three little words at the end" },
  { id: "vs18", reference: "Psalm 46:10",      verse: "Be still and know that I am God",                                        hint: "A psalm of stillness" },
];

// ─── BIBLE EMOJI QUIZ ─────────────────────────────────────────────────────
//
// Pure visual fun — guess the Bible person/event/parable from a row of
// emojis.  Each puzzle gives 4 multiple-choice options so the group
// always has a path to a winning guess.

export interface EmojiPuzzle {
  id: string;
  emojis: string;
  answer: string;
  options: string[];                // 4 options including the answer
  category: "Story" | "Person" | "Parable" | "Object";
  hint?: string;
}

export const EMOJI_QUIZ: EmojiPuzzle[] = [
  { id: "e1",  emojis: "🌊🛶🦒🐘🦓",       answer: "Noah's Ark",                  options: ["Noah's Ark", "Crossing the Red Sea", "Jonah's Whale", "Garden of Eden"], category: "Story" },
  { id: "e2",  emojis: "🌊✋",              answer: "Crossing the Red Sea",        options: ["Walking on Water", "Crossing the Red Sea", "Baptism of Jesus", "Jesus Calms the Storm"], category: "Story", hint: "Moses raised his rod" },
  { id: "e3",  emojis: "👨‍🦳🪨🏹",          answer: "David and Goliath",           options: ["Cain and Abel", "Samson", "David and Goliath", "Joshua and Jericho"], category: "Story" },
  { id: "e4",  emojis: "🌳🍎🐍",            answer: "Garden of Eden",              options: ["Tower of Babel", "Garden of Eden", "Jonah and the Vine", "The Lost Sheep"], category: "Story" },
  { id: "e5",  emojis: "🐋🌊🙇",            answer: "Jonah and the Whale",         options: ["Peter Walking on Water", "Jonah and the Whale", "Paul Shipwrecked", "The Net of Fish"], category: "Story" },
  { id: "e6",  emojis: "🦁🦁🙏",            answer: "Daniel in the Lions' Den",    options: ["Samson", "Daniel in the Lions' Den", "David's Sheep", "The Good Shepherd"], category: "Story", hint: "He prayed three times a day" },
  { id: "e7",  emojis: "🍞🐟🐟",            answer: "Feeding the 5,000",           options: ["The Last Supper", "Feeding the 5,000", "Manna from Heaven", "The Loaves of Showbread"], category: "Story" },
  { id: "e8",  emojis: "👶🐑⭐",             answer: "The Nativity",                options: ["The Nativity", "The Baptism", "The Last Supper", "The Ascension"], category: "Story" },
  { id: "e9",  emojis: "✝️📿",              answer: "The Crucifixion",             options: ["The Resurrection", "The Crucifixion", "The Ascension", "Pentecost"], category: "Story" },
  { id: "e10", emojis: "🪨🪦💨",            answer: "The Resurrection",            options: ["The Crucifixion", "The Resurrection", "Lazarus Raised", "The Ascension"], category: "Story", hint: "Three days later" },
  { id: "e11", emojis: "🔥🌳",              answer: "Burning Bush",                options: ["Burning Bush", "Pillar of Fire", "Pentecost", "Elijah on Carmel"], category: "Object", hint: "Moses was a shepherd at the time" },
  { id: "e12", emojis: "🏗️🌍🗣️",          answer: "Tower of Babel",              options: ["Solomon's Temple", "Tower of Babel", "Walls of Jericho", "Noah's Ark"], category: "Story" },
  { id: "e13", emojis: "🎺🧱🚶",            answer: "Walls of Jericho",            options: ["Walls of Jericho", "Tower of Babel", "Pentecost", "Solomon's Temple"], category: "Story", hint: "Marched seven times" },
  { id: "e14", emojis: "🐑🥖🍷",            answer: "The Last Supper",             options: ["Feeding the 5,000", "Wedding at Cana", "The Last Supper", "Passover"], category: "Story" },
  { id: "e15", emojis: "💧🍷",              answer: "Wedding at Cana",             options: ["The Last Supper", "Wedding at Cana", "Baptism of Jesus", "Passover"], category: "Story", hint: "Jesus' first miracle" },
  { id: "e16", emojis: "👑👶✂️",            answer: "Solomon's Wisdom",            options: ["Solomon's Wisdom", "Moses Spared", "Samuel's Birth", "John the Baptist"], category: "Story", hint: "Two mothers, one child" },
  { id: "e17", emojis: "🐟🐟🐟🥅",          answer: "The Miraculous Catch",        options: ["Feeding the 5,000", "The Miraculous Catch", "Jonah's Storm", "Paul's Shipwreck"], category: "Story" },
  { id: "e18", emojis: "👨‍🦱💇✂️",         answer: "Samson and Delilah",          options: ["Esau and Jacob", "Samson and Delilah", "John the Baptist", "David and Bathsheba"], category: "Story", hint: "His strength was in his hair" },
  { id: "e19", emojis: "👨‍🦰🥣🍲",          answer: "Esau Sells Birthright",       options: ["Esau Sells Birthright", "Joseph and the Famine", "Manna in the Wilderness", "Wedding at Cana"], category: "Story", hint: "For a bowl of stew" },
  { id: "e20", emojis: "👨🌈🐑🐑🐑",        answer: "Joseph's Coat",               options: ["Joseph's Coat", "David the Shepherd", "The Good Shepherd", "Jacob's Ladder"], category: "Object" },
];

// ─── BIBLE HANGMAN ────────────────────────────────────────────────────────
//
// Classic word-guessing — pick letters one at a time, six wrong guesses
// before "game over".  Words are uppercased Bible nouns/names; categories
// are shown alongside as a gentle nudge.

export interface HangmanWord {
  id: string;
  word: string;          // letters only (A-Z, possibly with a space for "RED SEA")
  category: "Person" | "Place" | "Object" | "Event";
  hint?: string;
}

export const HANGMAN_WORDS: HangmanWord[] = [
  { id: "h1",  word: "GOLIATH",      category: "Person", hint: "Felled by a stone" },
  { id: "h2",  word: "JERICHO",      category: "Place",  hint: "Walls fell down" },
  { id: "h3",  word: "BETHLEHEM",    category: "Place",  hint: "Birthplace of Jesus" },
  { id: "h4",  word: "MOSES",        category: "Person", hint: "Led the Exodus" },
  { id: "h5",  word: "PHARAOH",      category: "Person", hint: "Egyptian king" },
  { id: "h6",  word: "MANGER",       category: "Object", hint: "A baby's first bed" },
  { id: "h7",  word: "MIRACLE",      category: "Object", hint: "Beyond explanation" },
  { id: "h8",  word: "RESURRECTION", category: "Event",  hint: "Third day" },
  { id: "h9",  word: "CRUCIFIXION",  category: "Event",  hint: "Calvary" },
  { id: "h10", word: "PENTECOST",    category: "Event",  hint: "Tongues of fire" },
  { id: "h11", word: "ABRAHAM",      category: "Person", hint: "Father of nations" },
  { id: "h12", word: "GENESIS",      category: "Object", hint: "Book of beginnings" },
  { id: "h13", word: "REVELATION",   category: "Object", hint: "Last book" },
  { id: "h14", word: "TABERNACLE",   category: "Object", hint: "Portable house of God" },
  { id: "h15", word: "GETHSEMANE",   category: "Place",  hint: "Garden of prayer" },
  { id: "h16", word: "NAZARETH",     category: "Place",  hint: "Hometown of Jesus" },
  { id: "h17", word: "BABYLON",      category: "Place",  hint: "Place of exile" },
  { id: "h18", word: "ZACCHAEUS",    category: "Person", hint: "Climbed a tree" },
  { id: "h19", word: "MAGDALENE",    category: "Person", hint: "Mary the witness" },
  { id: "h20", word: "PARABLE",      category: "Object", hint: "A teaching story" },
  { id: "h21", word: "DISCIPLE",     category: "Person", hint: "A learner" },
  { id: "h22", word: "NEHEMIAH",     category: "Person", hint: "Rebuilt the wall" },
  { id: "h23", word: "ANGEL",        category: "Person", hint: "Heavenly messenger" },
  { id: "h24", word: "PSALMS",       category: "Object", hint: "150 songs" },
  { id: "h25", word: "MOUNTAIN",     category: "Place",  hint: "Sermon delivered here" },
];

// ─── TRUE OR FALSE ────────────────────────────────────────────────────────
//
// Quick-fire binary statements about people, places, and events in the
// Bible.  Great for warming up a group — every statement either has a
// supporting reference or a brief explanation so the operator can speak
// to it after the reveal.

export interface TrueFalseStatement {
  id: string;
  statement: string;
  answer: boolean;        // true = TRUE statement
  explanation: string;    // why it's true / what the actual fact is
  reference?: string;
  difficulty: TriviaDifficulty;
}

export const TRUE_OR_FALSE: TrueFalseStatement[] = [
  { id: "tf1",  statement: "Methuselah lived to be 969 years old.",                                              answer: true,  explanation: "The oldest person recorded in the Bible.",                                                  reference: "Genesis 5:27",        difficulty: "Easy" },
  { id: "tf2",  statement: "Noah's ark had three decks.",                                                        answer: true,  explanation: "Lower, second, and third stories.",                                                          reference: "Genesis 6:16",        difficulty: "Medium" },
  { id: "tf3",  statement: "There are 66 books in the Protestant Bible.",                                        answer: true,  explanation: "39 in the Old Testament and 27 in the New Testament.",                                       difficulty: "Easy" },
  { id: "tf4",  statement: "David wrote all 150 Psalms.",                                                        answer: false, explanation: "David is credited with about 73; others contributed including Asaph, the sons of Korah, and Moses.", difficulty: "Medium" },
  { id: "tf5",  statement: "Jesus turned water into bread at the wedding in Cana.",                              answer: false, explanation: "He turned water into wine — His first miracle.",                                             reference: "John 2:1-11",         difficulty: "Easy" },
  { id: "tf6",  statement: "The KJV says a whale swallowed Jonah.",                                              answer: false, explanation: "It says a 'great fish'. The species is not named.",                                          reference: "Jonah 1:17",          difficulty: "Hard" },
  { id: "tf7",  statement: "The Bible says the Wise Men numbered three.",                                        answer: false, explanation: "Matthew never gives a number — only that they brought three kinds of gifts.",                reference: "Matthew 2:11",        difficulty: "Hard" },
  { id: "tf8",  statement: "Eve was made from one of Adam's ribs.",                                              answer: true,  explanation: "God formed her from a rib taken while Adam slept.",                                          reference: "Genesis 2:21-22",     difficulty: "Easy" },
  { id: "tf9",  statement: "Goliath was over nine feet tall.",                                                   answer: true,  explanation: "He is described as 'six cubits and a span', roughly 9 feet 9 inches.",                       reference: "1 Samuel 17:4",       difficulty: "Medium" },
  { id: "tf10", statement: "Paul wrote the Book of Hebrews.",                                                    answer: false, explanation: "Hebrews is anonymous; authorship has long been debated.",                                    difficulty: "Hard" },
  { id: "tf11", statement: "The shortest verse in the KJV Bible is 'Jesus wept.'",                               answer: true,  explanation: "Just two words.",                                                                            reference: "John 11:35",          difficulty: "Easy" },
  { id: "tf12", statement: "The Ten Commandments first appear in Genesis.",                                      answer: false, explanation: "They appear in Exodus 20 (and again in Deuteronomy 5).",                                     difficulty: "Medium" },
  { id: "tf13", statement: "Moses parted the Jordan River for Israel to cross.",                                 answer: false, explanation: "Moses parted the Red Sea. The Jordan was parted later under Joshua.",                       reference: "Exodus 14",           difficulty: "Medium" },
  { id: "tf14", statement: "There are four Gospels in the New Testament.",                                       answer: true,  explanation: "Matthew, Mark, Luke, and John.",                                                             difficulty: "Easy" },
  { id: "tf15", statement: "Jesus's first miracle was performed at a wedding.",                                  answer: true,  explanation: "The wedding at Cana in Galilee.",                                                            reference: "John 2",              difficulty: "Easy" },
  { id: "tf16", statement: "Genesis names three sons of Adam and Eve.",                                          answer: true,  explanation: "Cain, Abel, and Seth (others are implied but unnamed).",                                     reference: "Genesis 4-5",         difficulty: "Medium" },
  { id: "tf17", statement: "Peter raised Lazarus from the dead.",                                                answer: false, explanation: "Jesus raised Lazarus.",                                                                      reference: "John 11",             difficulty: "Easy" },
  { id: "tf18", statement: "The Sermon on the Mount is recorded in the Gospel of John.",                         answer: false, explanation: "It is in Matthew 5-7.",                                                                      difficulty: "Medium" },
  { id: "tf19", statement: "The Apostle John is traditionally credited with writing Revelation.",                answer: true,  explanation: "He received the vision while exiled on Patmos.",                                             reference: "Revelation 1:9",      difficulty: "Medium" },
  { id: "tf20", statement: "Solomon built the first temple in Jerusalem.",                                       answer: true,  explanation: "It took seven years to build.",                                                              reference: "1 Kings 6",           difficulty: "Easy" },
  { id: "tf21", statement: "Bethlehem was the birthplace of King David.",                                        answer: true,  explanation: "And, centuries later, of Jesus.",                                                            reference: "1 Samuel 16",         difficulty: "Medium" },
  { id: "tf22", statement: "Saul was the first king of Israel.",                                                 answer: true,  explanation: "Anointed by Samuel.",                                                                        reference: "1 Samuel 10",         difficulty: "Easy" },
  { id: "tf23", statement: "The Garden of Eden contained two named trees.",                                      answer: true,  explanation: "The Tree of Life and the Tree of the Knowledge of Good and Evil.",                           reference: "Genesis 2:9",         difficulty: "Medium" },
  { id: "tf24", statement: "Joseph (son of Jacob) had ten brothers.",                                            answer: false, explanation: "He had eleven — Jacob had twelve sons in total.",                                            difficulty: "Medium" },
  { id: "tf25", statement: "The Book of Acts was written by Luke.",                                              answer: true,  explanation: "A companion volume to his Gospel.",                                                          difficulty: "Medium" },
  { id: "tf26", statement: "Pentecost occurred 40 days after the Resurrection.",                                 answer: false, explanation: "It was 50 days after — 'Pentecost' means fiftieth.",                                         difficulty: "Hard" },
  { id: "tf27", statement: "Cain killed Abel out of jealousy.",                                                  answer: true,  explanation: "Because God respected Abel's offering and not Cain's.",                                      reference: "Genesis 4",           difficulty: "Easy" },
  { id: "tf28", statement: "The Tower of Babel was built in Egypt.",                                             answer: false, explanation: "It was built on the plain of Shinar (Babylonia).",                                            reference: "Genesis 11:2",        difficulty: "Hard" },
  { id: "tf29", statement: "Mary Magdalene was the first person to see the risen Jesus.",                        answer: true,  explanation: "She met Him at the empty tomb.",                                                             reference: "John 20:14-16",       difficulty: "Medium" },
  { id: "tf30", statement: "There are twelve Minor Prophets in the Old Testament.",                              answer: true,  explanation: "Hosea through Malachi — 'minor' refers to length, not importance.",                          difficulty: "Medium" },
  { id: "tf31", statement: "The Book of Esther never mentions God by name.",                                     answer: true,  explanation: "Esther is the only Bible book that does not directly name God, though His providence is everywhere implied.", difficulty: "Hard" },
  { id: "tf32", statement: "The KJV Book of Isaiah mentions 'Lucifer' by name.",                                 answer: true,  explanation: "Isaiah 14:12 in the KJV: 'How art thou fallen from heaven, O Lucifer, son of the morning!'",  reference: "Isaiah 14:12",        difficulty: "Hard" },
  { id: "tf33", statement: "Aaron was Moses' younger brother.",                                                  answer: false, explanation: "Aaron was three years older than Moses.",                                                    reference: "Exodus 7:7",          difficulty: "Hard" },
  { id: "tf34", statement: "Pontius Pilate held the title of king.",                                             answer: false, explanation: "Pilate was the Roman governor (prefect) of Judea, not a king.",                              difficulty: "Hard" },
  { id: "tf35", statement: "By the Genesis chronology, Methuselah died in the year of the Flood.",               answer: true,  explanation: "Adding the ages in Genesis 5 places Methuselah's death in the same year the Flood began.",  reference: "Genesis 5; 7:6",      difficulty: "Hard" },
  { id: "tf36", statement: "The Wise Men visited the baby Jesus at the stable on the night He was born.",       answer: false, explanation: "Matthew 2:11 says they came to the 'house' where the young child was — sometime after His birth.", reference: "Matthew 2:11", difficulty: "Hard" },
];

// ─── BIBLE SPELL-IT ───────────────────────────────────────────────────────
//
// Show a clue and a pool of letters; the player taps letters in order to
// spell the answer.  The pool always contains every letter of the answer
// plus a small handful of distractor letters to keep the puzzle honest.

export interface SpellWord {
  id: string;
  word: string;          // uppercase A-Z, no spaces
  clue: string;
  category: "Person" | "Place" | "Concept" | "Object" | "Book";
  /** Extra "decoy" letters added to the pool; keep small (2-4). */
  decoys: string[];
}

export const SPELL_WORDS: SpellWord[] = [
  { id: "sp1",  word: "NAZARETH",  clue: "The hometown of Jesus.",                                                category: "Place",   decoys: ["B", "S", "M"] },
  { id: "sp2",  word: "SAMARITAN", clue: "The 'good ___' from one of Jesus' parables.",                            category: "Person",  decoys: ["O", "P", "F"] },
  { id: "sp3",  word: "PROPHET",   clue: "One who speaks God's message to the people.",                            category: "Concept", decoys: ["A", "S"] },
  { id: "sp4",  word: "APOSTLE",   clue: "A 'sent-out' follower of Christ.",                                       category: "Person",  decoys: ["I", "R"] },
  { id: "sp5",  word: "PSALMS",    clue: "The book of 150 songs and prayers.",                                     category: "Book",    decoys: ["B", "T"] },
  { id: "sp6",  word: "PARABLE",   clue: "A short teaching story Jesus often told.",                               category: "Concept", decoys: ["S", "M"] },
  { id: "sp7",  word: "BAPTISM",   clue: "Immersion in water as a public sign of faith.",                          category: "Concept", decoys: ["O", "R"] },
  { id: "sp8",  word: "GENTILE",   clue: "A non-Jewish person, in New-Testament terms.",                           category: "Person",  decoys: ["S", "B"] },
  { id: "sp9",  word: "SHEPHERD",  clue: "Cares for sheep; a famous metaphor for Jesus.",                          category: "Person",  decoys: ["L", "A"] },
  { id: "sp10", word: "MESSIAH",   clue: "'The Anointed One' — a title for Jesus.",                                category: "Person",  decoys: ["O", "P"] },
  { id: "sp11", word: "JERUSALEM", clue: "The holy city of Israel.",                                                category: "Place",   decoys: ["P", "B"] },
  { id: "sp12", word: "WORSHIP",   clue: "Reverence and praise offered to God.",                                    category: "Concept", decoys: ["A", "L"] },
  { id: "sp13", word: "HARVEST",   clue: "Gathering crops; a metaphor for reaping souls.",                          category: "Concept", decoys: ["I", "L"] },
  { id: "sp14", word: "KINGDOM",   clue: "The realm of God's rule.",                                                category: "Concept", decoys: ["P", "S"] },
  { id: "sp15", word: "COVENANT",  clue: "A binding agreement (e.g. with Abraham).",                                category: "Concept", decoys: ["S", "R"] },
  { id: "sp16", word: "REPENT",    clue: "To turn away from sin.",                                                  category: "Concept", decoys: ["S", "A"] },
  { id: "sp17", word: "TRINITY",   clue: "Father, Son, and Holy Spirit — one God in three Persons.",                category: "Concept", decoys: ["S", "A"] },
  { id: "sp18", word: "WISDOM",    clue: "What Solomon famously asked God to give him.",                            category: "Concept", decoys: ["E", "P"] },
  { id: "sp19", word: "SALVATION", clue: "Deliverance from sin and death.",                                         category: "Concept", decoys: ["B", "M"] },
  { id: "sp20", word: "GOSPEL",    clue: "Literally 'good news'.",                                                  category: "Concept", decoys: ["A", "T"] },
  { id: "sp21", word: "EXODUS",    clue: "The book that tells of Israel's departure from Egypt.",                   category: "Book",    decoys: ["A", "T"] },
  { id: "sp22", word: "GENESIS",   clue: "The first book of the Bible — meaning 'beginning'.",                      category: "Book",    decoys: ["P", "L"] },
  { id: "sp23", word: "EPISTLE",   clue: "A letter, especially in the New Testament.",                              category: "Concept", decoys: ["A", "B"] },
  { id: "sp24", word: "MIRACLE",   clue: "A wonder that points to God's power.",                                    category: "Concept", decoys: ["S", "P"] },
  { id: "sp25", word: "TEMPLE",    clue: "Solomon built the first one in Jerusalem.",                               category: "Place",   decoys: ["A", "S", "R"] },
];

// ─── BIBLE CONNECTIONS ────────────────────────────────────────────────────
//
// NYT-style "Connections" for Bible content.  Each puzzle gives 16 items
// that belong to 4 secret categories of 4.  The player taps 4 they think
// belong together and submits.  Wrong guesses cost a life (4 lives total).
// Difficulty rises across the four categories: Easy → Medium → Hard → Tricky.

export type ConnectionsDifficulty = "Easy" | "Medium" | "Hard" | "Tricky";

export interface ConnectionsCategory {
  /** Short name of the group, revealed on success. */
  name: string;
  difficulty: ConnectionsDifficulty;
  items: string[];   // exactly 4
}

export interface ConnectionsPuzzle {
  id: string;
  title: string;
  /** Exactly 4 categories, each with exactly 4 items — total 16 unique items. */
  categories: ConnectionsCategory[];
}

export const CONNECTIONS: ConnectionsPuzzle[] = [
  {
    id: "cn1",
    title: "Sunday-school starter",
    categories: [
      { name: "12 Disciples", difficulty: "Easy",   items: ["Peter", "John", "Andrew", "Thomas"] },
      { name: "Old Testament Prophets", difficulty: "Medium", items: ["Isaiah", "Jeremiah", "Ezekiel", "Daniel"] },
      { name: "Books of the Pentateuch", difficulty: "Hard", items: ["Genesis", "Exodus", "Numbers", "Deuteronomy"] },
      { name: "Plagues on Egypt", difficulty: "Tricky", items: ["Frogs", "Locusts", "Hail", "Darkness"] },
    ],
  },
  {
    id: "cn2",
    title: "Walking, talking, seeing",
    categories: [
      { name: "Mountains in Scripture", difficulty: "Easy",   items: ["Sinai", "Ararat", "Carmel", "Olives"] },
      { name: "Bodies of water Jesus visited", difficulty: "Medium", items: ["Jordan", "Galilee", "Gennesaret", "Tiberias"] },
      { name: "Cities in Acts", difficulty: "Hard", items: ["Antioch", "Corinth", "Ephesus", "Philippi"] },
      { name: "Bible gardens & vineyards", difficulty: "Tricky", items: ["Eden", "Gethsemane", "Vineyard of Naboth", "King's Garden"] },
    ],
  },
  {
    id: "cn3",
    title: "Numbers, names, food",
    categories: [
      { name: "Foods in the Bible", difficulty: "Easy",   items: ["Manna", "Locusts", "Honey", "Quail"] },
      { name: "Sons of Jacob (a few)", difficulty: "Medium", items: ["Reuben", "Judah", "Joseph", "Benjamin"] },
      { name: "Numbers tied to a story (40)", difficulty: "Hard", items: ["Days of rain", "Years in wilderness", "Days of fasting", "Days after resurrection"] },
      { name: "Pauline epistles", difficulty: "Tricky", items: ["Romans", "Galatians", "Philippians", "Titus"] },
    ],
  },
  {
    id: "cn4",
    title: "Women, kings, miracles",
    categories: [
      { name: "Women in the Bible", difficulty: "Easy",   items: ["Sarah", "Rebekah", "Esther", "Deborah"] },
      { name: "Kings of Israel / Judah", difficulty: "Medium", items: ["Saul", "David", "Solomon", "Hezekiah"] },
      { name: "Miracles of Jesus", difficulty: "Hard", items: ["Walking on water", "Calming the storm", "Feeding 5000", "Raising Lazarus"] },
      { name: "Things Jesus is called", difficulty: "Tricky", items: ["Lamb", "Vine", "Door", "Bread"] },
    ],
  },
  {
    id: "cn5",
    title: "Cast of the Exodus",
    categories: [
      { name: "Egyptian setting", difficulty: "Easy",   items: ["Pharaoh", "Nile", "Pyramids", "Goshen"] },
      { name: "Israel's leaders in the Exodus", difficulty: "Medium", items: ["Moses", "Aaron", "Miriam", "Joshua"] },
      { name: "Items in the Tabernacle", difficulty: "Hard", items: ["Ark", "Lampstand", "Showbread Table", "Altar"] },
      { name: "Things written on stone / metal", difficulty: "Tricky", items: ["Ten Commandments", "Belshazzar's wall (writing)", "Aaron's breastplate names", "Pilate's titulus"] },
    ],
  },
  {
    id: "cn6",
    title: "Friends and foes",
    categories: [
      { name: "David's family / circle", difficulty: "Easy",   items: ["Jesse", "Jonathan", "Bathsheba", "Solomon"] },
      { name: "Jesus' opponents", difficulty: "Medium", items: ["Pharisees", "Sadducees", "Herod", "Caiaphas"] },
      { name: "Paul's helpers", difficulty: "Hard", items: ["Silas", "Timothy", "Barnabas", "Luke"] },
      { name: "Bible villains", difficulty: "Tricky", items: ["Goliath", "Jezebel", "Haman", "Judas"] },
    ],
  },
  {
    id: "cn7",
    title: "Stories you can picture",
    categories: [
      { name: "Animals in famous stories", difficulty: "Easy",   items: ["Lion", "Whale", "Donkey", "Dove"] },
      { name: "Bible objects of wood", difficulty: "Medium", items: ["Ark of Noah", "Cross", "Manger", "Ark of the Covenant"] },
      { name: "Things that fell from heaven", difficulty: "Hard", items: ["Manna", "Fire on Carmel", "Stars (Revelation)", "Holy Spirit (as a dove)"] },
      { name: "Things Jesus touched to heal", difficulty: "Tricky", items: ["Eyes of the blind", "Ear of the deaf", "Leper's skin", "Peter's mother-in-law's hand"] },
    ],
  },
  {
    id: "cn8",
    title: "Last words first",
    categories: [
      { name: "Books named after a person", difficulty: "Easy",   items: ["Ruth", "Esther", "Job", "Daniel"] },
      { name: "Fruits of the Spirit", difficulty: "Medium", items: ["Love", "Joy", "Peace", "Patience"] },
      { name: "Beatitudes — 'Blessed are the…'", difficulty: "Hard", items: ["Poor in spirit", "Meek", "Merciful", "Peacemakers"] },
      { name: "I AM sayings of Jesus", difficulty: "Tricky", items: ["The Light of the World", "The Good Shepherd", "The True Vine", "The Resurrection and the Life"] },
    ],
  },
];

// ─── FILL IN THE BLANK ────────────────────────────────────────────────────
//
// Show a familiar KJV verse with one (or two) consecutive words replaced
// by a blank, then offer four choices.  This is *different* from Verse
// Scramble: scramble reorders every word, this hides one.

export interface FillBlankRound {
  id: string;
  reference: string;
  /** KJV text with `___` marking the missing word(s). */
  verse: string;
  /** The exact word/phrase that fills the blank. */
  answer: string;
  /** Four choices including the correct one (in any order). */
  options: string[];
  difficulty: TriviaDifficulty;
}

export const FILL_BLANK: FillBlankRound[] = [
  { id: "fb1",  reference: "John 3:16",        verse: "For God so ___ the world",                                              answer: "loved",       options: ["loved", "made", "saved", "blessed"], difficulty: "Easy" },
  { id: "fb2",  reference: "Psalm 23:1",       verse: "The Lord is my ___",                                                    answer: "shepherd",    options: ["shepherd", "father", "rock", "light"], difficulty: "Easy" },
  { id: "fb3",  reference: "Genesis 1:1",      verse: "In the ___ God created the heaven and the earth",                       answer: "beginning",   options: ["beginning", "morning", "garden", "spirit"], difficulty: "Easy" },
  { id: "fb4",  reference: "John 11:35",       verse: "Jesus ___",                                                              answer: "wept",        options: ["wept", "rose", "spake", "prayed"], difficulty: "Easy" },
  { id: "fb5",  reference: "Philippians 4:13", verse: "I can do all things through ___ which strengtheneth me",                 answer: "Christ",      options: ["Christ", "God", "faith", "Spirit"], difficulty: "Easy" },
  { id: "fb6",  reference: "Romans 6:23",      verse: "For the wages of sin is ___",                                            answer: "death",       options: ["death", "shame", "judgment", "exile"], difficulty: "Medium" },
  { id: "fb7",  reference: "Proverbs 3:5",     verse: "Trust in the Lord with all thine ___",                                   answer: "heart",       options: ["heart", "mind", "strength", "soul"], difficulty: "Easy" },
  { id: "fb8",  reference: "Matthew 5:9",      verse: "Blessed are the ___ for they shall be called the children of God",       answer: "peacemakers", options: ["peacemakers", "meek", "merciful", "humble"], difficulty: "Medium" },
  { id: "fb9",  reference: "Matthew 6:33",     verse: "But seek ye first the ___ of God, and his righteousness",                answer: "kingdom",     options: ["kingdom", "wisdom", "promise", "favour"], difficulty: "Medium" },
  { id: "fb10", reference: "Isaiah 40:31",     verse: "They that wait upon the Lord shall renew their ___",                     answer: "strength",    options: ["strength", "hope", "spirit", "courage"], difficulty: "Medium" },
  { id: "fb11", reference: "Joshua 1:9",       verse: "Be strong and of a good ___, be not afraid",                             answer: "courage",     options: ["courage", "spirit", "comfort", "cheer"], difficulty: "Medium" },
  { id: "fb12", reference: "Psalm 119:105",    verse: "Thy word is a ___ unto my feet, and a light unto my path",               answer: "lamp",        options: ["lamp", "rod", "guide", "staff"], difficulty: "Medium" },
  { id: "fb13", reference: "John 14:6",        verse: "I am the way, the truth, and the ___",                                   answer: "life",        options: ["life", "light", "vine", "door"], difficulty: "Easy" },
  { id: "fb14", reference: "Galatians 5:22",   verse: "But the fruit of the Spirit is love, joy, ___",                          answer: "peace",       options: ["peace", "patience", "kindness", "gentleness"], difficulty: "Medium" },
  { id: "fb15", reference: "Hebrews 11:1",     verse: "Now ___ is the substance of things hoped for, the evidence of things not seen", answer: "faith",  options: ["faith", "love", "grace", "hope"], difficulty: "Hard" },
  { id: "fb16", reference: "1 John 4:8",       verse: "He that loveth not knoweth not God; for God is ___",                     answer: "love",        options: ["love", "light", "spirit", "near"], difficulty: "Easy" },
  { id: "fb17", reference: "Romans 8:28",      verse: "All things work together for ___ to them that love God",                 answer: "good",        options: ["good", "joy", "peace", "glory"], difficulty: "Hard" },
  { id: "fb18", reference: "Matthew 11:28",    verse: "Come unto me, all ye that labour and are heavy laden, and I will give you ___", answer: "rest",  options: ["rest", "peace", "life", "joy"], difficulty: "Medium" },
  { id: "fb19", reference: "Psalm 46:10",      verse: "Be still, and know that I am ___",                                       answer: "God",         options: ["God", "near", "Lord", "thine"], difficulty: "Easy" },
  { id: "fb20", reference: "Jeremiah 29:11",   verse: "For I know the ___ that I think toward you, saith the Lord",             answer: "thoughts",    options: ["thoughts", "plans", "ways", "promises"], difficulty: "Hard" },
  { id: "fb21", reference: "Acts 1:8",         verse: "But ye shall receive ___, after that the Holy Ghost is come upon you",   answer: "power",       options: ["power", "joy", "wisdom", "tongues"], difficulty: "Hard" },
  { id: "fb22", reference: "Ephesians 2:8",    verse: "For by ___ are ye saved through faith",                                  answer: "grace",       options: ["grace", "love", "mercy", "Christ"], difficulty: "Medium" },
];

// ─── ODD ONE OUT ──────────────────────────────────────────────────────────
//
// Four items — three share a Bible connection, one doesn't.  Tap the odd
// one and the round explains the link the other three had in common.

export interface OddOneOutRound {
  id: string;
  category: "People" | "Places" | "Books" | "Events" | "Things";
  items: string[];          // exactly 4
  oddIndex: number;         // 0..3
  /** What the *other* three have in common. */
  connection: string;
  /** Why the odd item doesn't fit. */
  explanation: string;
  difficulty: TriviaDifficulty;
}

export const ODD_ONE_OUT: OddOneOutRound[] = [
  { id: "oo1",  category: "People",   items: ["Peter", "John", "Andrew", "Paul"],                     oddIndex: 3, connection: "Original 12 disciples chosen by Jesus.", explanation: "Paul was called later, on the road to Damascus.",                                          difficulty: "Easy" },
  { id: "oo2",  category: "Books",    items: ["Matthew", "Mark", "Luke", "Acts"],                      oddIndex: 3, connection: "Synoptic Gospels.",                       explanation: "Acts is a history of the early church, also written by Luke but not a Gospel.",            difficulty: "Easy" },
  { id: "oo3",  category: "Places",   items: ["Bethlehem", "Nazareth", "Capernaum", "Athens"],         oddIndex: 3, connection: "Towns where Jesus lived or ministered.",   explanation: "Athens is in Greece — Paul preached there, but Jesus did not.",                            difficulty: "Easy" },
  { id: "oo4",  category: "People",   items: ["Sarah", "Rebekah", "Rachel", "Mary"],                   oddIndex: 3, connection: "Wives of Old-Testament patriarchs.",       explanation: "Mary (mother of Jesus) is from the New Testament.",                                       difficulty: "Medium" },
  { id: "oo5",  category: "Events",   items: ["Walking on water", "Feeding the 5000", "Raising Lazarus", "Stoning of Stephen"], oddIndex: 3, connection: "Miracles of Jesus.", explanation: "Stephen's death is in Acts 7, after Jesus' ascension.",                                  difficulty: "Easy" },
  { id: "oo6",  category: "Things",   items: ["Ark of the Covenant", "Lampstand", "Altar of incense", "Throne of Solomon"], oddIndex: 3, connection: "Items in the Tabernacle.", explanation: "Solomon's throne was in the palace, not the Tabernacle or Temple proper.",              difficulty: "Hard" },
  { id: "oo7",  category: "People",   items: ["Isaiah", "Jeremiah", "Ezekiel", "Nehemiah"],            oddIndex: 3, connection: "Major Old-Testament prophets.",            explanation: "Nehemiah was a governor and rebuilder, not a prophet — his book is historical.",         difficulty: "Medium" },
  { id: "oo8",  category: "Places",   items: ["Sinai", "Ararat", "Carmel", "Patmos"],                  oddIndex: 3, connection: "Mountains in the Bible.",                  explanation: "Patmos is an island where John received Revelation — not a mountain.",                    difficulty: "Hard" },
  { id: "oo9",  category: "Things",   items: ["Sling", "Sword", "Bow", "Trumpet"],                     oddIndex: 3, connection: "Weapons used by warriors in Scripture.",   explanation: "Trumpets were signal instruments — Jericho's walls fell at their sound, but they're not weapons.", difficulty: "Medium" },
  { id: "oo10", category: "People",   items: ["Abraham", "Isaac", "Jacob", "Joseph"],                  oddIndex: 3, connection: "Three patriarchs of Israel.",              explanation: "Joseph was Jacob's son — the patriarchs are Abraham, Isaac and Jacob.",                   difficulty: "Hard" },
  { id: "oo11", category: "Books",    items: ["Romans", "1 Corinthians", "Galatians", "Hebrews"],      oddIndex: 3, connection: "Epistles clearly written by Paul.",        explanation: "Hebrews is anonymous — its author has long been debated.",                                difficulty: "Hard" },
  { id: "oo12", category: "People",   items: ["Goliath", "Jezebel", "Haman", "Daniel"],                oddIndex: 3, connection: "Famous biblical villains.",               explanation: "Daniel is a hero of faith.",                                                              difficulty: "Easy" },
  { id: "oo13", category: "Events",   items: ["Burning bush", "Parting the Red Sea", "Manna from heaven", "Coat of many colours"], oddIndex: 3, connection: "Events from the Exodus story under Moses.", explanation: "The coat of many colours was given to Joseph by Jacob — generations earlier.",        difficulty: "Medium" },
  { id: "oo14", category: "Places",   items: ["Eden", "Gethsemane", "Garden Tomb", "Babylon"],         oddIndex: 3, connection: "Gardens / garden settings in Scripture.",  explanation: "Babylon is a city / empire, not a garden.",                                               difficulty: "Medium" },
  { id: "oo15", category: "Things",   items: ["Frogs", "Locusts", "Hail", "Floods"],                   oddIndex: 3, connection: "Plagues on Egypt.",                       explanation: "There was no flood plague — those were rivers turning to blood, frogs, lice, flies, etc.", difficulty: "Hard" },
  { id: "oo16", category: "People",   items: ["Mary Magdalene", "Mary of Bethany", "Mary mother of Jesus", "Martha"], oddIndex: 3, connection: "Women named Mary in the Gospels.", explanation: "Martha was Mary of Bethany's sister — different name.",                              difficulty: "Easy" },
  { id: "oo17", category: "Books",    items: ["Genesis", "Exodus", "Leviticus", "Joshua"],             oddIndex: 3, connection: "Books of the Pentateuch (Law of Moses).",  explanation: "Joshua follows Deuteronomy and starts the Historical Books.",                            difficulty: "Medium" },
  { id: "oo18", category: "People",   items: ["Solomon", "David", "Hezekiah", "Pilate"],               oddIndex: 3, connection: "Kings of Israel or Judah.",               explanation: "Pilate was the Roman governor of Judea, not a king.",                                     difficulty: "Easy" },
  { id: "oo19", category: "Things",   items: ["Loaves", "Fishes", "Wine", "Manna"],                    oddIndex: 3, connection: "Foods miraculously provided by Jesus.",    explanation: "Manna was provided by God in the wilderness, centuries before Jesus.",                    difficulty: "Hard" },
  { id: "oo20", category: "Events",   items: ["Pentecost", "Saul's conversion", "Stephen's death", "John's baptism of Jesus"], oddIndex: 3, connection: "Events recorded in the book of Acts.", explanation: "Jesus' baptism is in the Gospels, before Acts begins.",                              difficulty: "Hard" },
];

// ─── TWO TRUTHS AND A LIE ─────────────────────────────────────────────────
//
// Each round names a Bible figure and gives three statements about them —
// two are true, one is a clever-sounding falsehood.  Tap the lie.

export interface TwoTruthsRound {
  id: string;
  subject: string;        // e.g. "Moses"
  statements: string[];   // exactly 3
  lieIndex: number;       // 0, 1, or 2 — which statement is the lie
  explanation: string;    // why the lie is wrong / what the truth actually is
  reference?: string;
}

export const TWO_TRUTHS: TwoTruthsRound[] = [
  {
    id: "tt1",
    subject: "Noah",
    statements: [
      "He built an ark on God's instruction.",
      "He lived to be 950 years old.",
      "He had four sons named in Genesis.",
    ],
    lieIndex: 2,
    explanation: "Noah had three sons: Shem, Ham, and Japheth.",
    reference: "Genesis 5-9",
  },
  {
    id: "tt2",
    subject: "Moses",
    statements: [
      "He was raised in Pharaoh's household.",
      "He led Israel into the Promised Land.",
      "God spoke to him from a burning bush.",
    ],
    lieIndex: 1,
    explanation: "Moses saw the Promised Land from Mount Nebo but did not enter — Joshua led Israel in.",
    reference: "Deuteronomy 34",
  },
  {
    id: "tt3",
    subject: "David",
    statements: [
      "He killed the Philistine Goliath with a sling.",
      "He composed many of the Psalms.",
      "He was the youngest of seven brothers.",
    ],
    lieIndex: 2,
    explanation: "David was the youngest of eight brothers — Jesse had eight sons.",
    reference: "1 Samuel 16:10-11",
  },
  {
    id: "tt4",
    subject: "Solomon",
    statements: [
      "He built the first temple in Jerusalem.",
      "He famously asked God for wisdom.",
      "He had a hundred wives.",
    ],
    lieIndex: 2,
    explanation: "Solomon had 700 wives and 300 concubines, by the Bible's own account.",
    reference: "1 Kings 11:3",
  },
  {
    id: "tt5",
    subject: "Daniel",
    statements: [
      "He interpreted King Nebuchadnezzar's dreams.",
      "He was thrown into a den of lions and survived.",
      "He served as a prophet during the reign of King Saul.",
    ],
    lieIndex: 2,
    explanation: "Daniel served during the Babylonian exile — many centuries after Saul.",
    reference: "Daniel 1-6",
  },
  {
    id: "tt6",
    subject: "Mary, mother of Jesus",
    statements: [
      "She visited her relative Elisabeth while expecting Jesus.",
      "She gave birth to Jesus in Bethlehem.",
      "She lived in Jerusalem her whole life.",
    ],
    lieIndex: 2,
    explanation: "Mary lived in Nazareth — Bethlehem was a temporary visit for the census.",
    reference: "Luke 1-2",
  },
  {
    id: "tt7",
    subject: "Peter",
    statements: [
      "He worked as a fisherman before following Jesus.",
      "He denied Jesus three times.",
      "He wrote one of the four Gospels.",
    ],
    lieIndex: 2,
    explanation: "Peter wrote two epistles (1 & 2 Peter) but none of the Gospels are attributed to him.",
  },
  {
    id: "tt8",
    subject: "Paul",
    statements: [
      "He was once known as Saul of Tarsus.",
      "He wrote many of the New-Testament epistles.",
      "He was one of the original twelve disciples.",
    ],
    lieIndex: 2,
    explanation: "Paul met the risen Christ on the road to Damascus, well after the Twelve were chosen.",
    reference: "Acts 9",
  },
  {
    id: "tt9",
    subject: "John the Baptist",
    statements: [
      "He ate locusts and wild honey.",
      "He baptised Jesus in the Jordan River.",
      "He was Jesus' twin brother.",
    ],
    lieIndex: 2,
    explanation: "John was Jesus' relative — the son of Elisabeth, Mary's cousin.",
    reference: "Luke 1:36",
  },
  {
    id: "tt10",
    subject: "Joseph (son of Jacob)",
    statements: [
      "He was given a coat of many colours by his father.",
      "He was sold into slavery in Egypt by his brothers.",
      "He died and was buried back in Canaan.",
    ],
    lieIndex: 2,
    explanation: "Joseph died in Egypt at 110; his bones were carried back to Canaan generations later, during the Exodus.",
    reference: "Genesis 50:26",
  },
];

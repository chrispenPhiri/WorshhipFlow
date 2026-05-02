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

/**
 * Teachings — local, offline-friendly library of ready-to-use lessons.
 *
 * Lessons are grouped by `category` (Sunday School, Youth, Mothers,
 * Fathers, Adults, plus topical ones like Happiness, Funeral, Baptism,
 * Holy Communion, Marriage, Healing). Each lesson is a self-contained
 * mini-curriculum: a key Bible verse, summary, 3-5 numbered teaching
 * points, discussion questions, an activity, and a closing prayer.
 *
 * The teachings page sends any of these pieces to the projection screen.
 */

export type TeachingCategory =
  | "Sunday School"
  | "Youth"
  | "Mothers"
  | "Fathers"
  | "Adults"
  | "Happiness"
  | "Funeral"
  | "Baptism"
  | "Holy Communion"
  | "Marriage"
  | "Healing";

export interface Teaching {
  id: string;
  title: string;
  category: TeachingCategory;
  theme: string;
  keyVerse: { reference: string; text: string };
  summary: string;
  points: { heading: string; body: string }[];
  discussionQuestions: string[];
  activity: string;
  prayer: string;
  memoryVerse?: string;
}

export const TEACHINGS: Teaching[] = [
  // ─── SUNDAY SCHOOL (8) ──────────────────────────────────────────────────
  {
    id: "ss-creation",
    title: "God Made Everything",
    category: "Sunday School",
    theme: "Creation",
    keyVerse: { reference: "Genesis 1:1", text: "In the beginning God created the heaven and the earth." },
    summary: "Help children see God as the loving Maker of the whole world, including them.",
    points: [
      { heading: "God spoke and it was so", body: "On day one God said 'Let there be light' and there was light. Words are powerful — God's words make things real." },
      { heading: "Each day a new wonder", body: "Sky and water, land and plants, sun moon and stars, fish and birds, animals — and finally people, made in God's image." },
      { heading: "God called it good", body: "Everything God makes is good. You are part of His good creation, made on purpose, with love." },
    ],
    discussionQuestions: [
      "What is your favourite thing God made? Why?",
      "If God made everything, how should we treat the world?",
      "How does it feel to know God made you on purpose?",
    ],
    activity: "Give each child paper and crayons. Have them draw their favourite day of creation and share with the class.",
    prayer: "Thank You, God, for making the sky, the trees, the animals, and me. Help me to take care of Your beautiful world. In Jesus' name, Amen.",
    memoryVerse: "Genesis 1:1",
  },
  {
    id: "ss-noah",
    title: "Noah Trusts God",
    category: "Sunday School",
    theme: "Obedience",
    keyVerse: { reference: "Genesis 6:22", text: "Thus did Noah; according to all that God commanded him, so did he." },
    summary: "Noah obeyed God even when others laughed. God kept his family and the animals safe.",
    points: [
      { heading: "A big job from God", body: "God told Noah to build a huge boat — an ark — because a flood was coming. Noah had never seen rain like that, but he believed God." },
      { heading: "Two by two", body: "God brought animals of every kind to Noah. The ark was full of life, and God shut the door safely." },
      { heading: "The rainbow promise", body: "After the flood, God gave a rainbow as a promise to never flood the whole earth again. God always keeps His promises." },
    ],
    discussionQuestions: [
      "Was it easy or hard for Noah to obey? Why?",
      "When is it hard for you to obey?",
      "What does the rainbow remind us about God?",
    ],
    activity: "Make a paper-plate rainbow with cotton-ball clouds. Write 'God keeps His promises' on the back.",
    prayer: "Dear God, help me to listen and obey, just like Noah. Thank You for keeping Your promises to me. Amen.",
    memoryVerse: "Genesis 9:13",
  },
  {
    id: "ss-david",
    title: "David and the Giant",
    category: "Sunday School",
    theme: "Courage",
    keyVerse: { reference: "1 Samuel 17:47", text: "The battle is the LORD's, and he will give you into our hands." },
    summary: "A young shepherd boy beat a giant — not with size or strength, but with God's help.",
    points: [
      { heading: "A big problem", body: "Goliath was over nine feet tall and frightened the whole army. No one was brave enough to fight him." },
      { heading: "A small shepherd, a big God", body: "David was just a boy with a sling and five smooth stones. But he knew the same God who saved him from a lion and a bear was with him now." },
      { heading: "One stone, one God", body: "David ran toward the giant in God's name. One stone, by God's power, brought Goliath down. The battle belongs to the Lord." },
    ],
    discussionQuestions: [
      "What 'giants' (big problems) do you face?",
      "How does it help to know God is bigger than any giant?",
      "What can you do today that takes courage?",
    ],
    activity: "Bring 5 smooth stones. Let each child write a 'giant' (a fear) on one stone, then put it in a basket as a way of giving it to God.",
    prayer: "God, You are bigger than anything I am afraid of. Help me to be brave like David, because You are with me. Amen.",
  },
  {
    id: "ss-daniel",
    title: "Daniel in the Lions' Den",
    category: "Sunday School",
    theme: "Prayer",
    keyVerse: { reference: "Daniel 6:23", text: "No manner of hurt was found upon him, because he believed in his God." },
    summary: "Daniel kept praying even when it was against the law. God shut the lions' mouths.",
    points: [
      { heading: "A daily habit", body: "Daniel prayed three times a day at his window, every day. Prayer was his lifeline to God." },
      { heading: "A scary law", body: "Bad men tricked the king into making prayer to God illegal. Daniel still prayed. Doing right matters more than being safe." },
      { heading: "God shuts the lions' mouths", body: "Daniel was thrown to hungry lions, but God sent an angel. In the morning Daniel walked out without a scratch." },
    ],
    discussionQuestions: [
      "Why is talking to God every day important?",
      "What if your friends made fun of you for praying?",
      "How did God protect Daniel? How does God protect you?",
    ],
    activity: "Make a 'prayer card' with three boxes (morning, lunch, bedtime). Children check a box each day they pray that week.",
    prayer: "Dear God, help me to pray every day like Daniel and to trust You no matter what. Amen.",
  },
  {
    id: "ss-christmas",
    title: "Jesus is Born",
    category: "Sunday School",
    theme: "Christmas",
    keyVerse: { reference: "Luke 2:11", text: "Unto you is born this day in the city of David a Saviour, which is Christ the Lord." },
    summary: "God sent His Son Jesus into the world as a tiny baby — the greatest gift ever given.",
    points: [
      { heading: "A long journey", body: "Mary and Joseph travelled to Bethlehem. There was no room in the inn, so baby Jesus was laid in a manger where animals ate." },
      { heading: "Angels and shepherds", body: "Angels filled the night sky with songs. The shepherds were the first to hear the good news and ran to meet Jesus." },
      { heading: "The greatest gift", body: "Jesus came to be our Saviour — to bring us back to God. Christmas is about giving Him our hearts." },
    ],
    discussionQuestions: [
      "Why is Jesus the best gift?",
      "Who can you tell about Jesus this week?",
      "What gift can you give Jesus from your heart?",
    ],
    activity: "Wrap a small empty box. Let each child slip a paper inside saying what they want to give Jesus (their kindness, time, songs, etc.).",
    prayer: "Thank You, God, for sending Jesus to be my Saviour. I give You my heart this Christmas. Amen.",
  },
  {
    id: "ss-storm",
    title: "Jesus Calms the Storm",
    category: "Sunday School",
    theme: "Faith",
    keyVerse: { reference: "Mark 4:39", text: "Peace, be still. And the wind ceased, and there was a great calm." },
    summary: "Jesus has power over wind and waves — and over every storm in our lives.",
    points: [
      { heading: "A scary night", body: "The disciples were in a boat when a huge storm came. They thought they would drown. Jesus was asleep!" },
      { heading: "Three powerful words", body: "'Peace, be still.' Jesus spoke and the wind and waves obeyed Him at once. Even nature listens to its Maker." },
      { heading: "Where is your faith?", body: "Jesus asked, 'Why are you afraid?' He is in the boat with us in every storm." },
    ],
    discussionQuestions: [
      "What 'storms' make you afraid?",
      "What does it mean that Jesus is in the boat with you?",
      "How can we have faith when things are scary?",
    ],
    activity: "Sit in a circle and gently rock side to side as if in a boat. When the leader says 'Peace, be still,' everyone freezes — a reminder that Jesus brings calm.",
    prayer: "Jesus, when I am scared, help me remember You are with me and You are in charge of the storm. Amen.",
  },
  {
    id: "ss-samaritan",
    title: "The Good Samaritan",
    category: "Sunday School",
    theme: "Love",
    keyVerse: { reference: "Luke 10:27", text: "Thou shalt love thy neighbour as thyself." },
    summary: "A real neighbour is anyone who needs our help — and we love by what we do, not just what we say.",
    points: [
      { heading: "A hurt man", body: "A man was beaten by robbers and left on the road. A priest and a Levite walked right past — too busy to help." },
      { heading: "An unlikely hero", body: "A Samaritan — someone the Jews did not get along with — stopped, bandaged the man, and paid for his care." },
      { heading: "Go and do likewise", body: "Jesus said, 'Go and do the same.' Real love crosses lines and serves whoever needs help." },
    ],
    discussionQuestions: [
      "Who in your school or street is sometimes left out?",
      "What is one kind thing you can do this week?",
      "Why is it easier to walk past than to stop and help?",
    ],
    activity: "Hand out 'Kindness Mission' cards. Each child writes one specific way to help someone this week and reports back next Sunday.",
    prayer: "Jesus, give me eyes to see people who need help and a brave heart to stop and care. Amen.",
  },
  {
    id: "ss-lost-sheep",
    title: "The Lost Sheep",
    category: "Sunday School",
    theme: "God's Love",
    keyVerse: { reference: "Luke 15:6", text: "Rejoice with me; for I have found my sheep which was lost." },
    summary: "God loves every single one of us so much that He searches for us when we wander.",
    points: [
      { heading: "Ninety-nine and one", body: "A shepherd had 100 sheep. One wandered off. He left the 99 to look for the one. Every sheep matters to him." },
      { heading: "The Good Shepherd", body: "Jesus is our Good Shepherd. He knows your name. He knows when you are lost or sad." },
      { heading: "A big party in heaven", body: "When the lost sheep was found, the shepherd carried him home. Heaven throws a party every time someone comes to Jesus." },
    ],
    discussionQuestions: [
      "How does it feel to know God looks for you?",
      "Have you ever been lost? Who came to find you?",
      "Who can we help bring closer to Jesus?",
    ],
    activity: "Hide a small toy sheep around the room. The child who finds it gets to put it in the 'shepherd's basket' and lead the closing prayer.",
    prayer: "Jesus, thank You for being my Good Shepherd. Thank You for never giving up on me. Amen.",
  },

  // ─── YOUTH (8) ──────────────────────────────────────────────────────────
  {
    id: "y-identity",
    title: "Who I Am in Christ",
    category: "Youth",
    theme: "Identity",
    keyVerse: { reference: "2 Corinthians 5:17", text: "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new." },
    summary: "Your identity is not built on grades, looks, follows, or what others say. It is anchored in Christ.",
    points: [
      { heading: "Chosen, not random", body: "Ephesians 1:4 — God chose you before the foundation of the world. You are not an accident; you are a design." },
      { heading: "A new creation", body: "In Christ the old you — the shame, the failures, the labels — is gone. You get a fresh start, today and every day." },
      { heading: "Heir, not orphan", body: "Romans 8:17 — you are a child of God and a co-heir with Christ. You belong, you are loved, you have a future." },
    ],
    discussionQuestions: [
      "What lies have you believed about who you are?",
      "Which truth about your identity in Christ do you most need today?",
      "How would your week look different if you really lived as a 'new creation'?",
    ],
    activity: "Identity statements: each student writes 3 lies they have believed and 3 Bible truths that replace them. Tear up the lies.",
    prayer: "Father, thank You for choosing me, making me new, and calling me Your child. Help me to live from my true identity in Christ. Amen.",
  },
  {
    id: "y-temptation",
    title: "Standing Strong Against Temptation",
    category: "Youth",
    theme: "Holiness",
    keyVerse: { reference: "1 Corinthians 10:13", text: "God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape." },
    summary: "Temptation is normal, but God always provides an escape route. Spot it before it traps you.",
    points: [
      { heading: "Know the pattern", body: "James 1:14-15 — desire conceives, gives birth to sin, sin to death. Catch it at the first stage." },
      { heading: "Use the escape", body: "Walk away. Call a friend. Quote Scripture (as Jesus did in Matt 4). The escape is real but you must take it." },
      { heading: "Run with company", body: "2 Tim 2:22 — flee youthful lusts and follow righteousness with those who call on the Lord. Solo Christians fall faster." },
    ],
    discussionQuestions: [
      "What situations consistently set you up to stumble?",
      "What would 'taking the escape' look like for you this week?",
      "Who is in your circle that you can be honest with?",
    ],
    activity: "Pair up. Each person identifies one trigger and one specific action plan. Pray for each other right there.",
    prayer: "Lord, give me eyes to see temptation before it grabs me, courage to take the escape, and friends to walk with. Amen.",
  },
  {
    id: "y-armor",
    title: "Putting On the Armor of God",
    category: "Youth",
    theme: "Spiritual Warfare",
    keyVerse: { reference: "Ephesians 6:11", text: "Put on the whole armour of God, that ye may be able to stand against the wiles of the devil." },
    summary: "We have a real enemy and real armor. Get dressed every morning.",
    points: [
      { heading: "Belt of truth", body: "God's truth holds everything else together. Daily Scripture is not optional, it is your foundation." },
      { heading: "Breastplate, shoes, shield", body: "Righteousness guards your heart. The gospel of peace guides your steps. Faith deflects the enemy's lies." },
      { heading: "Helmet and sword", body: "Salvation guards your mind. The Word is your offensive weapon — the only piece you attack with." },
    ],
    discussionQuestions: [
      "Which piece of armor do you most often forget?",
      "How does prayer (v.18) tie all the armor together?",
      "What does 'standing firm' look like in your daily life?",
    ],
    activity: "Draw a stick figure. Label each piece of armor and write one specific application beside it.",
    prayer: "Father, dress me today in Your truth, righteousness, peace, faith, salvation, and Word. Help me to stand. Amen.",
  },
  {
    id: "y-friendship",
    title: "Friends That Sharpen You",
    category: "Youth",
    theme: "Friendship",
    keyVerse: { reference: "Proverbs 27:17", text: "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend." },
    summary: "Your closest friends shape who you become. Choose wisely; be that friend to others.",
    points: [
      { heading: "You become your circle", body: "1 Cor 15:33 — bad company corrupts good character. Show me your five closest friends and I will show you your future." },
      { heading: "Sharpen, do not soften", body: "Real friends tell you the truth in love (Eph 4:15). Comfort that ignores sin is not love, it is cowardice." },
      { heading: "Be the friend you need", body: "Do not just look for great friends — become one. Loyal, honest, available, prayerful." },
    ],
    discussionQuestions: [
      "Are your closest friendships pulling you up or down?",
      "When was the last time a friend told you a hard truth in love?",
      "What kind of friend do you want to be remembered as?",
    ],
    activity: "List your 5 closest friends. Beside each, write one way they shape you and one way you shape them. Pray for them.",
    prayer: "Lord, give me friends who love You and who will sharpen me. Help me be a faithful friend to others. Amen.",
  },
  {
    id: "y-prayer",
    title: "Prayer That Actually Works",
    category: "Youth",
    theme: "Prayer",
    keyVerse: { reference: "James 5:16", text: "The effectual fervent prayer of a righteous man availeth much." },
    summary: "Prayer is not a religious duty; it is real conversation with a Father who hears.",
    points: [
      { heading: "Ask, seek, knock", body: "Matt 7:7 — Jesus invites persistence. God is not annoyed by your asking; He is waiting for it." },
      { heading: "Pray Scripture", body: "Turn Bible verses into prayers. You cannot go wrong praying God's own words back to Him." },
      { heading: "Pray together", body: "Matt 18:19-20 — there is unique power when even two agree. Build a prayer rhythm with friends." },
    ],
    discussionQuestions: [
      "What stops you from praying more often?",
      "Which prayer has God answered for you recently?",
      "How could you build a 5-minute daily prayer rhythm this week?",
    ],
    activity: "Each student writes one bold ask, one sin to confess, and one thanksgiving. Pray in pairs over the bold asks.",
    prayer: "Father, teach me to pray. Help me come boldly, daily, and not give up. Use my prayers to change me and the world. Amen.",
  },
  {
    id: "y-gods-will",
    title: "Discovering God's Will for Your Life",
    category: "Youth",
    theme: "Guidance",
    keyVerse: { reference: "Romans 12:2", text: "Be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God." },
    summary: "Stop hunting for a magic answer. Become the kind of person who naturally walks in God's will.",
    points: [
      { heading: "Start with what God already said", body: "His revealed will (Scripture) covers most decisions. Walk in known obedience and the unknown becomes clearer." },
      { heading: "Renewed mind, clear vision", body: "A mind soaked in Scripture and prayer learns to recognise God's voice and reject the world's." },
      { heading: "Take faithful next steps", body: "God guides moving feet. Make the next obedient step; He will reveal the one after that." },
    ],
    discussionQuestions: [
      "What decision are you wrestling with right now?",
      "Are you obeying what God has already shown you?",
      "What would 'the next faithful step' look like this week?",
    ],
    activity: "Write your decision at the top of a page. List below: (1) what Scripture says, (2) godly counsel you have received, (3) the next step.",
    prayer: "Lord, renew my mind. Show me Your will and give me courage to take the next step in obedience. Amen.",
  },
  {
    id: "y-truth",
    title: "Standing for Truth in a Loud World",
    category: "Youth",
    theme: "Boldness",
    keyVerse: { reference: "1 Peter 3:15", text: "Be ready always to give an answer to every man that asketh you a reason of the hope that is in you with meekness and fear." },
    summary: "You will be challenged about your faith. Be ready, be gentle, be unashamed.",
    points: [
      { heading: "Know what you believe", body: "Vague faith caves under pressure. Study the core: who Jesus is, why the cross, why the Bible can be trusted." },
      { heading: "Speak with grace and salt", body: "Col 4:6 — speak truthfully but kindly. You are not winning an argument, you are inviting a person." },
      { heading: "Live what you say", body: "Your life is your loudest sermon. Hypocrisy silences truth faster than any opponent." },
    ],
    discussionQuestions: [
      "When have you stayed silent when you should have spoken?",
      "How can you study to be 'ready' to answer questions about faith?",
      "Where does your life need to match your words better?",
    ],
    activity: "Practice in pairs: one student plays a skeptic asking 'Why do you believe in God?' The other answers in 60 seconds. Switch.",
    prayer: "Lord, give me a brave, gentle voice and a life that backs up what I say. Use me to point others to You. Amen.",
  },
  {
    id: "y-serving",
    title: "Greatness Through Serving",
    category: "Youth",
    theme: "Service",
    keyVerse: { reference: "Mark 10:45", text: "The Son of man came not to be ministered unto, but to minister, and to give his life a ransom for many." },
    summary: "The world chases the spotlight; Jesus chased the basin and towel. Greatness is measured in serving.",
    points: [
      { heading: "Jesus flipped the pyramid", body: "Mark 10:43 — the greatest among you must be servant of all. Lead from the bottom." },
      { heading: "Serve where you are", body: "You do not need a title. Help in the kitchen, set up chairs, mentor a younger student. Faithful in small things." },
      { heading: "Use your gifts on purpose", body: "1 Pet 4:10 — every believer has been gifted to serve. Find yours and put it to work." },
    ],
    discussionQuestions: [
      "Where could you serve at home, school, or church this week?",
      "What gift or skill could you put on God's altar?",
      "What gets in the way of you serving — pride, time, fear?",
    ],
    activity: "Plan a class service project for the next two weeks (clean a widow's yard, help at a kids' programme, etc.). Assign roles.",
    prayer: "Jesus, You washed feet. Make me a servant. Show me where to serve and free me from needing to be seen. Amen.",
  },

  // ─── MOTHERS (4) ────────────────────────────────────────────────────────
  {
    id: "m-hannah",
    title: "The Praying Mother — Hannah",
    category: "Mothers",
    theme: "Prayer",
    keyVerse: { reference: "1 Samuel 1:27", text: "For this child I prayed; and the LORD hath given me my petition which I asked of him." },
    summary: "Hannah's tearful prayers gave us Samuel. A mother's prayers shape a generation.",
    points: [
      { heading: "Pour out your heart", body: "1 Sam 1:15 — Hannah prayed in bitterness, in detail, in tears. God hears every silent word and counts every tear." },
      { heading: "Vow what you will give back", body: "Hannah promised to lend Samuel back to the Lord all his days. Mothers raise children to release them to God's purposes, not to keep them for themselves." },
      { heading: "God remembers", body: "1 Sam 1:19 — 'the LORD remembered her.' Persistent, surrendered prayer is never wasted." },
    ],
    discussionQuestions: [
      "What burden are you carrying in prayer for your children right now?",
      "Have you fully released your children to God's purposes — even costly ones?",
      "Where do you most need to know that God remembers you?",
    ],
    activity: "Start a prayer journal — one page per child with verses, requests, and answered prayers. Bring it next month and share.",
    prayer: "Lord, like Hannah I pour out my heart for my children. Hear me. I dedicate them to You — not to my plans. Amen.",
  },
  {
    id: "m-prov31",
    title: "The Proverbs 31 Woman",
    category: "Mothers",
    theme: "Identity",
    keyVerse: { reference: "Proverbs 31:30", text: "Favour is deceitful, and beauty is vain: but a woman that feareth the LORD, she shall be praised." },
    summary: "True womanhood is built on the fear of the Lord, not appearance, applause, or perfection.",
    points: [
      { heading: "Strength and dignity", body: "v.25 — she is clothed with strength and dignity and laughs at the days to come. The fear of the Lord makes her unafraid of tomorrow." },
      { heading: "Hands and heart engaged", body: "vv.13-19 — she works willingly with her hands, plans, provides. Faith is practical, not just emotional." },
      { heading: "Words of kindness", body: "v.26 — 'in her tongue is the law of kindness.' The home she builds is shaped by what comes out of her mouth." },
    ],
    discussionQuestions: [
      "Which trait of the Proverbs 31 woman do you most need today?",
      "How does the fear of the Lord change the way you approach your day?",
      "What would change in your home if 'the law of kindness' ruled your tongue?",
    ],
    activity: "Each mother picks one verse from Proverbs 31:10-31 to memorise this week and live by.",
    prayer: "Father, make me strong in You, kind in word, faithful in work. Above all, give me a heart that fears You. Amen.",
    memoryVerse: "Proverbs 31:30",
  },
  {
    id: "m-mary",
    title: "Mary, Servant of the Lord",
    category: "Mothers",
    theme: "Surrender",
    keyVerse: { reference: "Luke 1:38", text: "Behold the handmaid of the Lord; be it unto me according to thy word." },
    summary: "Mary surrendered her plans to God's purposes — the model response to God's call on a mother's life.",
    points: [
      { heading: "Surrender precedes blessing", body: "Mary said yes before she fully understood what it would cost. Faithful mothering begins with 'be it unto me.'" },
      { heading: "Treasure things in your heart", body: "Luke 2:19 — she pondered God's works rather than rushing to explain them. Mothers cultivate the deep, quiet life of the soul." },
      { heading: "Stand by them to the end", body: "John 19:25 — at the cross, Mary was still there. Faithful presence, not perfect words, is what your children remember." },
    ],
    discussionQuestions: [
      "Where is God asking for your 'be it unto me' as a mother?",
      "What promises about your children do you need to treasure rather than worry over?",
      "What does faithful presence look like in your home this week?",
    ],
    activity: "Write down one specific area of motherhood you surrender to God today. Keep it in your Bible as a marker.",
    prayer: "Lord, like Mary I say yes. Use my motherhood for Your glory, even when it costs me. Amen.",
  },
  {
    id: "m-deut6",
    title: "Raising Children in the Lord",
    category: "Mothers",
    theme: "Discipleship",
    keyVerse: { reference: "Deuteronomy 6:6-7", text: "These words, which I command thee this day, shall be in thine heart: and thou shalt teach them diligently unto thy children, and shalt talk of them when thou sittest in thine house, and when thou walkest by the way, and when thou liest down, and when thou risest up." },
    summary: "Faith is caught more than taught — in the rhythms of everyday life at home.",
    points: [
      { heading: "On your heart first", body: "v.6 — the Word must be in your heart before you can teach it to your children. You cannot give what you do not have." },
      { heading: "In the everyday", body: "v.7 — sit, walk, lie down, rise up. Talk about God in normal moments, not just church moments. Discipleship is woven into the day." },
      { heading: "Make Him visible", body: "vv.8-9 — bind on your hand, write on your doorposts. Let your home, your phone, your fridge declare what you live for." },
    ],
    discussionQuestions: [
      "What part of your day could become a faith conversation?",
      "What does your home declare about who you serve?",
      "Where are you tempted to outsource discipleship to the church?",
    ],
    activity: "Pick one daily moment (mealtime, bedtime, school drop-off) to begin a regular faith conversation this week.",
    prayer: "Lord, fill my home with You. Make every meal, every drive, every bedtime a chance to point my children to Christ. Amen.",
  },

  // ─── FATHERS (4) ────────────────────────────────────────────────────────
  {
    id: "f-joshua",
    title: "As For Me and My House",
    category: "Fathers",
    theme: "Leadership",
    keyVerse: { reference: "Joshua 24:15", text: "Choose you this day whom ye will serve... but as for me and my house, we will serve the LORD." },
    summary: "Spiritual leadership starts with a father's clear, public, unashamed choice for God.",
    points: [
      { heading: "Make the decision visible", body: "Joshua spoke for his whole house — out loud, in public. Do not be a secret believer at home." },
      { heading: "Lead, do not boss", body: "Serve your family by being the first to obey, the first to forgive, the first to pray. Authority is earned by example." },
      { heading: "Stand against the culture", body: "Joshua's neighbours worshipped other gods. Your home is counter-cultural by design — anchor it in the Word." },
    ],
    discussionQuestions: [
      "Does your family see you as a man of God or just a man who attends church?",
      "What is one habit that would visibly anchor your home in God this month?",
      "What pressure from the surrounding culture do you most need to push back against?",
    ],
    activity: "Write your own 'as for me and my house' statement. Read it aloud to your family this week.",
    prayer: "Lord, help me lead my family in following You. Make me first to repent, first to serve, first to pray. Amen.",
  },
  {
    id: "f-joseph",
    title: "Joseph — A Quiet, Faithful Father",
    category: "Fathers",
    theme: "Obedience",
    keyVerse: { reference: "Matthew 1:24", text: "Then Joseph being raised from sleep did as the angel of the Lord had bidden him." },
    summary: "Joseph never says a word in Scripture — he just obeys. The world needs more such fathers.",
    points: [
      { heading: "Obey without spotlight", body: "Joseph's obedience was unseen and unsung. God notices what no one else does." },
      { heading: "Protect what is entrusted", body: "He fled to Egypt to save Jesus' life and returned at the right time. Fathers shield, even at cost." },
      { heading: "Provide and disciple", body: "He taught Jesus carpentry and the Scriptures. Use what is in your hands to shape your children." },
    ],
    discussionQuestions: [
      "Where are you tempted to need recognition at home?",
      "Are you protecting and providing in ways that match your children's real needs?",
      "What one skill or truth can you intentionally pass on this season?",
    ],
    activity: "Identify one quiet, faithful action you will take this week with no one knowing. Do it.",
    prayer: "Father, make me a Joseph — quiet, faithful, obedient. Use my unseen labour for Your purposes. Amen.",
  },
  {
    id: "f-eph6",
    title: "Bring Them Up in the Lord",
    category: "Fathers",
    theme: "Discipleship",
    keyVerse: { reference: "Ephesians 6:4", text: "And, ye fathers, provoke not your children to wrath: but bring them up in the nurture and admonition of the Lord." },
    summary: "Discipline without exasperation; nurture without neglect; the Lord at the centre.",
    points: [
      { heading: "Do not provoke", body: "Harshness, sarcasm, broken promises, and inconsistency wound. When you fail, apologise to your children." },
      { heading: "Nurture the relationship", body: "Tender, consistent care comes before rules. Without relationship, rules breed rebellion." },
      { heading: "The Lord is the centre", body: "Your discipline aims at God-ward hearts, not just obedient behaviour. The goal is sons and daughters who love Christ." },
    ],
    discussionQuestions: [
      "When are you most likely to provoke your children?",
      "Where does relationship need to grow alongside the rules in your home?",
      "Are you discipling toward God or just managing behaviour?",
    ],
    activity: "Sit with each child this week. Ask, 'Is there anything I do that frustrates you?' Listen without defending.",
    prayer: "Father, give me Your patience and Your wisdom. Heal any wounds I have caused. Bring my children up in You. Amen.",
  },
  {
    id: "f-abraham",
    title: "Abraham — Father of Faith",
    category: "Fathers",
    theme: "Faith",
    keyVerse: { reference: "Genesis 15:6", text: "And he believed in the LORD; and he counted it to him for righteousness." },
    summary: "Abraham believed God when nothing was visible. Fathers of faith trust God for what they do not yet see.",
    points: [
      { heading: "Believe the promise", body: "Abraham staked his life on God's word. Read God's promises and trust them — for yourself and your family." },
      { heading: "Walk by faith", body: "He left Ur for an unknown land. Faith costs comfort. Move where God leads even when it is risky." },
      { heading: "Pass it on", body: "Genesis 18:19 — God chose Abraham because he would teach his children. Your faith must outlive you." },
    ],
    discussionQuestions: [
      "What promise of God do you need to believe for your family right now?",
      "What faith-step have you been putting off out of comfort?",
      "What faith are you actively passing to your children?",
    ],
    activity: "Write down one promise of God for your family. Read it to them this week and pray it over them.",
    prayer: "Lord, give me Abraham's faith. Help me believe You for what I cannot yet see — and to lead my family in the same. Amen.",
  },

  // ─── ADULTS (5) ─────────────────────────────────────────────────────────
  {
    id: "a-lords-prayer",
    title: "Praying the Lord's Prayer",
    category: "Adults",
    theme: "Prayer",
    keyVerse: { reference: "Matthew 6:9", text: "After this manner therefore pray ye: Our Father which art in heaven, Hallowed be thy name." },
    summary: "Not a script to recite but a pattern that disciples every part of our prayer life.",
    points: [
      { heading: "Father — relationship first", body: "Prayer starts with sonship, not performance. We approach God as His own children, welcomed and heard." },
      { heading: "Kingdom and bread", body: "Order matters: God's name, kingdom, and will before our daily needs. He cares about both, but priority shapes us." },
      { heading: "Forgiveness and protection", body: "Forgiven people forgive. Pray for daily deliverance from temptation and the evil one." },
    ],
    discussionQuestions: [
      "Which part of this prayer do you usually skip?",
      "How would your week look if 'Thy will be done' was a real prayer, not just a phrase?",
      "Is there someone you need to forgive this week?",
    ],
    activity: "Pray the Lord's Prayer slowly together, pausing at each phrase to expand it with personal words.",
    prayer: "Father, teach us to pray as Your children, kingdom-first, daily-dependent, forgiving and forgiven. Amen.",
  },
  {
    id: "a-fruit",
    title: "The Fruit of the Spirit",
    category: "Adults",
    theme: "Discipleship",
    keyVerse: { reference: "Galatians 5:22-23", text: "The fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law." },
    summary: "Maturity is not measured by gifts displayed but by fruit produced.",
    points: [
      { heading: "Fruit, not works", body: "Fruit grows from a healthy tree connected to its source (John 15). You cannot force it; you abide and it appears." },
      { heading: "All nine, not pick-and-choose", body: "It is one fruit with many flavours. The Spirit grows the whole character of Christ in you, not just the parts you like." },
      { heading: "Tested in real life", body: "Patience grows in delays, gentleness in conflicts, self-control in temptation. God uses your circumstances to ripen you." },
    ],
    discussionQuestions: [
      "Which fruit is most evident in your life right now? Which is least?",
      "What circumstance is God currently using to grow your character?",
      "What does 'abiding in Christ' look like in your weekly rhythm?",
    ],
    activity: "Personal inventory: rate yourself 1-10 on each fruit. Pick the lowest one and ask the Spirit to grow it this month.",
    prayer: "Holy Spirit, grow Your fruit in me. I cannot manufacture it. I abide in Christ; produce Your character through me. Amen.",
  },
  {
    id: "a-faith-works",
    title: "Faith That Works",
    category: "Adults",
    theme: "Faith",
    keyVerse: { reference: "James 2:17", text: "Even so faith, if it hath not works, is dead, being alone." },
    summary: "Real faith always shows up in real action. Belief that costs nothing changes nothing.",
    points: [
      { heading: "Two wings of one bird", body: "We are saved by grace through faith (Eph 2:8) AND created for good works (Eph 2:10). Never separate what God joined." },
      { heading: "Show me your faith", body: "James 2:18 — invisible faith is a contradiction. The proof is in the pattern of life." },
      { heading: "Faith risks something", body: "Hebrews 11 lists people who acted on what they believed. Where is your faith costing you something?" },
    ],
    discussionQuestions: [
      "Where does your life show your faith most clearly?",
      "Is there an area where you say you trust God but have not acted on it?",
      "What would it look like to take a faith-risk this month?",
    ],
    activity: "Identify one area where God is asking you to act in faith (a conversation, a gift, an apology). Write the next step and a date.",
    prayer: "Father, give me faith that works. Move me from belief in my head to obedience with my hands. Amen.",
  },
  {
    id: "a-stewardship",
    title: "Stewardship and Generosity",
    category: "Adults",
    theme: "Money",
    keyVerse: { reference: "2 Corinthians 9:7", text: "Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver." },
    summary: "Everything you have belongs to God. You manage it for His glory and others' good.",
    points: [
      { heading: "Owners or managers?", body: "Ps 24:1 — the earth is the Lord's. We never own; we steward. That single shift changes everything about money." },
      { heading: "Give first, joyfully, sacrificially", body: "Honour God with the firstfruits (Prov 3:9). Give with joy, not pressure. Let the gift cost something." },
      { heading: "Treasure follows heart", body: "Matt 6:21 — where your treasure is, there your heart is. Want a heart for God's mission? Put treasure there." },
    ],
    discussionQuestions: [
      "What does your bank statement reveal about your priorities?",
      "When did you last give a gift that actually cost you something?",
      "How are you teaching the next generation about godly money?",
    ],
    activity: "Review your giving honestly. Plan one specific increase or one new way to give this quarter.",
    prayer: "Lord, every cent is Yours. Free me from the love of money. Make me a generous, joyful steward of all You entrust to me. Amen.",
  },
  {
    id: "a-great-commission",
    title: "The Great Commission",
    category: "Adults",
    theme: "Mission",
    keyVerse: { reference: "Matthew 28:19", text: "Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost." },
    summary: "Jesus' last command is our first priority. Make disciples — wherever you are.",
    points: [
      { heading: "All authority, therefore go", body: "Matt 28:18 — Jesus has all authority, in heaven and on earth. We go on His name and under His power, not our own." },
      { heading: "Make disciples, not just converts", body: "The goal is followers who follow — baptised, taught, obeying. Decisions are a start; discipleship is the goal." },
      { heading: "Lo, I am with you always", body: "The Commission ends with the Companion. Jesus does not send and disappear; He goes with us, every day." },
    ],
    discussionQuestions: [
      "Who are the people in your everyday life who do not yet know Jesus?",
      "Are you discipling anyone? Is anyone discipling you?",
      "What 'all nations' could look like for you — across the street and across the sea?",
    ],
    activity: "Write down 3 names you commit to praying for and intentionally sharing with this month. Tell the group next Sunday.",
    prayer: "Lord Jesus, You went to the cross for the nations. Send me. Use me where I live and beyond. I go with You. Amen.",
  },

  // ─── HAPPINESS (3) ──────────────────────────────────────────────────────
  {
    id: "h-beatitudes",
    title: "The Beatitudes — Kingdom Blessing",
    category: "Happiness",
    theme: "Joy",
    keyVerse: { reference: "Matthew 5:3", text: "Blessed are the poor in spirit: for theirs is the kingdom of heaven." },
    summary: "Jesus opens the greatest sermon ever preached by redefining who is truly blessed — and so, truly happy.",
    points: [
      { heading: "Upside-down blessing", body: "The world says blessed are the rich, strong, full. Jesus says blessed are the poor in spirit, the mourning, the meek." },
      { heading: "Hunger that gets filled", body: "Those who hunger for righteousness will be filled. Pursue God Himself, not just His benefits, and lasting joy follows." },
      { heading: "Peacemakers and the persecuted", body: "Reconciliation is family work; rejection for righteousness is a badge, not a defeat. The kingdom belongs to such." },
    ],
    discussionQuestions: [
      "Which Beatitude challenges your idea of happiness most?",
      "How does Jesus' definition of 'blessed' clash with our culture?",
      "Where is God calling you to be a peacemaker?",
    ],
    activity: "Each member chooses one Beatitude to memorise and apply for the week. Share next Sunday what changed.",
    prayer: "Lord, make me poor in spirit, hungry for righteousness, merciful, pure, a peacemaker. Form Your kingdom in me — and so, true joy. Amen.",
  },
  {
    id: "h-philippians",
    title: "Rejoice in the Lord Always",
    category: "Happiness",
    theme: "Joy",
    keyVerse: { reference: "Philippians 4:4", text: "Rejoice in the Lord alway: and again I say, Rejoice." },
    summary: "Christian joy is not based on circumstances — it is rooted in the Lord Himself.",
    points: [
      { heading: "Joy is a command", body: "If God commands it, He provides for it. Joy is not a personality type; it is a fruit of the Spirit available to you today." },
      { heading: "The source is the Lord", body: "Not 'rejoice in good news' but 'in the Lord.' Circumstances change; the Lord does not. Anchor your joy where it cannot be shaken." },
      { heading: "Anxiety's antidote", body: "vv.6-7 — be careful for nothing; in everything by prayer with thanksgiving. The peace of God will guard your heart and mind." },
    ],
    discussionQuestions: [
      "What is stealing your joy right now?",
      "How does joy 'in the Lord' differ from happiness in things?",
      "What would change if you obeyed v.6 today?",
    ],
    activity: "List 5 specific things you are thankful for. Pray each one out loud as a thanksgiving before asking for anything.",
    prayer: "Father, return my joy. Anchor it not in circumstances but in You. Guard my heart with Your peace. Amen.",
  },
  {
    id: "h-james1",
    title: "Joy in Trials",
    category: "Happiness",
    theme: "Joy",
    keyVerse: { reference: "James 1:2-3", text: "My brethren, count it all joy when ye fall into divers temptations; Knowing this, that the trying of your faith worketh patience." },
    summary: "Trials are not the end of joy — they are the workshop where joy is forged.",
    points: [
      { heading: "Reframe the trial", body: "'Count it joy' — choose how you label it. The trial is the same; the meaning you give it changes everything." },
      { heading: "Trust the process", body: "Testing produces patience; patience makes us mature and complete (v.4). God wastes nothing." },
      { heading: "Ask for wisdom", body: "v.5 — God gives generously and without reproach when we do not know what to do. Ask Him." },
    ],
    discussionQuestions: [
      "What trial are you walking through right now?",
      "What might God be growing in you through it?",
      "Have you actually asked Him for wisdom about it?",
    ],
    activity: "Take your hardest current trial. Write next to it: 'God is producing ___ in me through this.' Pray over it.",
    prayer: "Father, I count this hard thing as joy because You are at work in it. Give me wisdom and patience. Amen.",
  },

  // ─── FUNERAL (3) ────────────────────────────────────────────────────────
  {
    id: "fu-psalm23",
    title: "The Lord is My Shepherd",
    category: "Funeral",
    theme: "Comfort",
    keyVerse: { reference: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want." },
    summary: "When we walk through the valley of the shadow of death, we are not alone. The Shepherd is with us.",
    points: [
      { heading: "He leads, He restores", body: "Even in grief, the Shepherd guides our footsteps and restores our weary souls. He does not abandon us in the dark." },
      { heading: "He walks the valley with us", body: "Not around, not over — through. 'Thou art with me.' His presence is the comfort, not the absence of pain." },
      { heading: "Goodness and mercy follow", body: "And we will dwell in the house of the Lord forever. The story does not end at the grave for those who are His." },
    ],
    discussionQuestions: [
      "Where do you most need to know God is with you today?",
      "What does it mean for goodness and mercy to follow you, even now?",
      "How does the promise of dwelling with Him forever change your grief?",
    ],
    activity: "Read Psalm 23 aloud together. Pause after each line for silent prayer.",
    prayer: "Shepherd of my soul, walk with me through this valley. Comfort me with Your rod and Your staff. Lead me home. Amen.",
  },
  {
    id: "fu-john11",
    title: "I Am the Resurrection",
    category: "Funeral",
    theme: "Hope",
    keyVerse: { reference: "John 11:25", text: "I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live." },
    summary: "Death does not have the last word. Jesus is the resurrection.",
    points: [
      { heading: "Jesus weeps with us", body: "v.35 — 'Jesus wept.' He felt every grief Mary and Martha felt. He feels yours. Tears are not weakness." },
      { heading: "Jesus calls the dead to life", body: "Lazarus heard His voice and came forth. So will every believer at the last day. The grave hears its Master." },
      { heading: "Death is not goodbye", body: "For those in Christ, death is 'see you soon.' We grieve, but we do not say a final goodbye." },
    ],
    discussionQuestions: [
      "How does the resurrection change the way Christians grieve?",
      "Which promise of Jesus do you need to hold onto today?",
      "Have you placed your trust in Him who is the resurrection?",
    ],
    activity: "Read John 11:21-26 together. Pause and let each person quietly receive Jesus' words.",
    prayer: "Lord Jesus, You wept at the grave and conquered it. Comfort us with the certainty of resurrection and the hope of seeing our loved ones again. Amen.",
  },
  {
    id: "fu-1thess4",
    title: "Comfort One Another with These Words",
    category: "Funeral",
    theme: "Hope",
    keyVerse: { reference: "1 Thessalonians 4:13-14", text: "I would not have you to be ignorant, brethren, concerning them which are asleep, that ye sorrow not, even as others which have no hope. For if we believe that Jesus died and rose again, even so them also which sleep in Jesus will God bring with him." },
    summary: "Christians grieve — but not as those without hope. We will see them again.",
    points: [
      { heading: "Grief is real", body: "Even Jesus wept. Paul does not say 'do not grieve.' He says do not grieve as those who have no hope. We do not pretend." },
      { heading: "Hope is real", body: "Christ rose, and so will those who are His. The reunion is certain. Jesus brings them with Him." },
      { heading: "Comfort comes by speaking these truths", body: "v.18 — 'comfort one another with these words.' Not platitudes. Promises. Speak Scripture into grief." },
    ],
    discussionQuestions: [
      "How is Christian grief different from the world's?",
      "Who can you comfort with these very words this week?",
      "What promise do you most need to hear today?",
    ],
    activity: "Each person writes one comforting Scripture they want spoken at their own funeral. Share if comfortable.",
    prayer: "Father of all comfort, hold us close. Strengthen our hope in resurrection. Help us comfort one another with Your truth. Amen.",
  },

  // ─── BAPTISM (2) ────────────────────────────────────────────────────────
  {
    id: "b-romans6",
    title: "Buried and Raised with Christ",
    category: "Baptism",
    theme: "New Life",
    keyVerse: { reference: "Romans 6:4", text: "Therefore we are buried with him by baptism into death: that like as Christ was raised up from the dead by the glory of the Father, even so we also should walk in newness of life." },
    summary: "Baptism is a public picture of what already happened spiritually — death to sin, new life in Christ.",
    points: [
      { heading: "Going under", body: "Your old life is dead — buried with Christ. Do not go back to fish it out of the grave." },
      { heading: "Coming up", body: "You now walk in newness of life. You are a new creation (2 Cor 5:17). Live like the resurrected person you are." },
      { heading: "Identification with Christ", body: "His death is your death; His life is your life. Baptism declares to heaven, hell, and earth: I belong to Jesus." },
    ],
    discussionQuestions: [
      "What old patterns is God calling you to leave in the water?",
      "What does walking in newness of life look like for you this week?",
      "Have you publicly declared what God has done for you?",
    ],
    activity: "Each baptismal candidate shares a one-sentence testimony before going under the water.",
    prayer: "Lord Jesus, I am buried with You and raised with You. Help me walk in newness of life every day. Amen.",
  },
  {
    id: "b-matt28",
    title: "Why Be Baptised?",
    category: "Baptism",
    theme: "Obedience",
    keyVerse: { reference: "Matthew 28:19", text: "Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost." },
    summary: "Baptism is not optional — it is Jesus' clear command to every disciple.",
    points: [
      { heading: "Jesus commanded it", body: "And Jesus Himself was baptised (Matt 3:15) to fulfil all righteousness. We follow His example and His command." },
      { heading: "It is a public confession", body: "Of faith in the Father, Son, and Holy Spirit. Faith that refuses public confession is faith that is hiding." },
      { heading: "It begins a discipled life", body: "Baptism is the start, not the end. The next steps are teaching, obeying, and making more disciples." },
    ],
    discussionQuestions: [
      "If you have believed in Christ but not been baptised, what is holding you back?",
      "Who has helped disciple you so far?",
      "Whom can you help disciple next?",
    ],
    activity: "If anyone has not yet been baptised, talk with the pastor today about the next opportunity.",
    prayer: "Lord Jesus, You commanded baptism. Give me boldness to obey publicly what I believe privately. Amen.",
  },

  // ─── HOLY COMMUNION (2) ─────────────────────────────────────────────────
  {
    id: "hc-luke22",
    title: "This Is My Body, This Is My Blood",
    category: "Holy Communion",
    theme: "Remembrance",
    keyVerse: { reference: "Luke 22:19", text: "This is my body which is given for you: this do in remembrance of me." },
    summary: "Communion is Jesus' family meal — a remembrance of His sacrifice and a foretaste of His coming.",
    points: [
      { heading: "The bread — His body broken", body: "He gave Himself completely for you. Not partly. Not reluctantly. Wholly, willingly, for you." },
      { heading: "The cup — His blood poured out", body: "The new covenant is sealed by His sacrifice. Forgiveness is not free — it is bought with His blood, and freely given to you." },
      { heading: "Until He comes", body: "1 Cor 11:26 — we proclaim His death until He returns. This meal is memory and hope held together." },
    ],
    discussionQuestions: [
      "What does it mean that His body was broken 'for you' personally?",
      "How does remembering His sacrifice change you?",
      "How is communion also a hope-filled meal that looks forward?",
    ],
    activity: "Receive communion together with extended silence after each element. Let the truth land before moving on.",
    prayer: "Lord Jesus, thank You for Your body broken and Your blood shed. We remember. We proclaim. We wait for You. Amen.",
  },
  {
    id: "hc-1cor11",
    title: "Examine Yourselves",
    category: "Holy Communion",
    theme: "Worthiness",
    keyVerse: { reference: "1 Corinthians 11:28", text: "But let a man examine himself, and so let him eat of that bread, and drink of that cup." },
    summary: "Communion is sacred. Approach the table with self-examination, not casualness.",
    points: [
      { heading: "Examine yourself", body: "Is there sin to confess? A relationship to mend? Do not rush past v.28. The table is no place for hidden things." },
      { heading: "Discern the body", body: "v.29 — this is not just bread; this is the Lord's body. Treat it with reverence, not as a snack between songs." },
      { heading: "Reconcile if needed", body: "If you are holding a grudge or hiding a wrong, lay it down before you partake. The table is a place of peace." },
    ],
    discussionQuestions: [
      "How do you usually prepare for communion?",
      "Is there a sin to confess or a relationship to mend before next Sunday?",
      "What does 'discerning the body' mean to you?",
    ],
    activity: "Spend two minutes in silent self-examination before serving the bread and cup.",
    prayer: "Lord, search me. Cleanse me. Reconcile me. Then meet me at Your table in peace. Amen.",
  },

  // ─── MARRIAGE (1) ───────────────────────────────────────────────────────
  {
    id: "ma-eph5",
    title: "Christ-Centred Marriage",
    category: "Marriage",
    theme: "Family",
    keyVerse: { reference: "Ephesians 5:21", text: "Submitting yourselves one to another in the fear of God." },
    summary: "Marriage is a picture of Christ and the church. Family is the first place we practise the gospel.",
    points: [
      { heading: "Mutual submission first", body: "Eph 5:21 frames everything that follows. Husbands and wives both lay down their preferences for one another." },
      { heading: "Sacrificial love and respect", body: "Husbands love as Christ loved the church — to the cross. Wives respond with respect. Both reflect the gospel." },
      { heading: "Children and the long obedience", body: "Eph 6:4 — fathers, do not provoke; bring them up in the nurture of the Lord. Faith is caught in the everyday." },
    ],
    discussionQuestions: [
      "Where does your marriage best reflect Christ and the church? Where does it struggle?",
      "What needs to change in how you speak to or about your spouse?",
      "How are you intentionally discipling your children at home?",
    ],
    activity: "Couples: spend 10 minutes this week asking each other, 'How can I love and serve you better?' Singles: pray for the families in the church.",
    prayer: "Father, make our marriages and homes a picture of Your gospel. Heal what is broken; strengthen what is good. Amen.",
  },

  // ─── HEALING (2) ────────────────────────────────────────────────────────
  {
    id: "he-isa53",
    title: "By His Stripes We Are Healed",
    category: "Healing",
    theme: "Healing",
    keyVerse: { reference: "Isaiah 53:5", text: "But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed." },
    summary: "Christ's wounds purchased our wholeness — body, soul, and spirit.",
    points: [
      { heading: "For our sin", body: "The deepest sickness is sin. The cross addresses it first. Spiritual healing is the foundation for every other kind." },
      { heading: "For our peace", body: "The chastisement of our peace was upon Him. Anxiety and turmoil meet the Prince of Peace at the cross." },
      { heading: "For our healing", body: "Whatever your wound — body, mind, memory — bring it to His. He bore it. Trust Him with the timing." },
    ],
    discussionQuestions: [
      "Where do you need healing today — body, soul, or spirit?",
      "Have you brought it specifically and honestly to the cross?",
      "What would it mean to trust God's timing as well as His power?",
    ],
    activity: "Pray over those needing healing, anointing with oil if appropriate (James 5:14).",
    prayer: "Lord Jesus, by Your stripes I am healed. I bring my wounds to Your wounds. Heal me, in Your time, in Your way. Amen.",
  },
  {
    id: "he-james5",
    title: "The Prayer of Faith",
    category: "Healing",
    theme: "Healing",
    keyVerse: { reference: "James 5:14-15", text: "Is any sick among you? let him call for the elders of the church; and let them pray over him, anointing him with oil in the name of the Lord: And the prayer of faith shall save the sick, and the Lord shall raise him up." },
    summary: "God invites the local church into the ministry of healing. Pray with faith, in love, together.",
    points: [
      { heading: "Call for the elders", body: "v.14 — healing is a community matter. Do not suffer alone. Bring your need to those who will pray with authority and love." },
      { heading: "Anoint with oil", body: "A physical sign of the Spirit's invisible work. The oil does not heal — God does — but the act builds faith." },
      { heading: "Pray in faith", body: "Believing God can, trusting Him with the outcome. Not 'name it and claim it' but 'Thy will be done.'" },
    ],
    discussionQuestions: [
      "Have you ever asked the church to pray for healing? Why or why not?",
      "What gets in the way of community prayer for sickness?",
      "Who in our church needs prayer for healing right now?",
    ],
    activity: "Make a list of people in the church who need prayer. Commit to pray for one this week and follow up.",
    prayer: "Father, You invite us to pray. Hear our prayers. Heal Your people. Build our faith. Amen.",
  },
];

export const TEACHING_CATEGORIES: TeachingCategory[] = [
  "Sunday School",
  "Youth",
  "Mothers",
  "Fathers",
  "Adults",
  "Happiness",
  "Funeral",
  "Baptism",
  "Holy Communion",
  "Marriage",
  "Healing",
];

export function getThemes(): string[] {
  const set = new Set<string>();
  TEACHINGS.forEach(l => set.add(l.theme));
  return Array.from(set).sort();
}

export function countByCategory(): Record<TeachingCategory, number> {
  const counts = Object.fromEntries(
    TEACHING_CATEGORIES.map(c => [c, 0])
  ) as Record<TeachingCategory, number>;
  TEACHINGS.forEach(t => { counts[t.category] = (counts[t.category] ?? 0) + 1; });
  return counts;
}

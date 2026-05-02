/**
 * Sunday School Teachings — local, offline-friendly lesson library.
 *
 * Each lesson is a self-contained mini-curriculum: a key Bible verse,
 * a short teacher summary, 3-5 numbered teaching points, discussion
 * questions, an activity idea, and a closing prayer. The projection
 * helper on the page sends any of these pieces to the screen.
 */

export type AgeGroup = "Children" | "Youth" | "Adult";

export interface SundaySchoolLesson {
  id: string;
  title: string;
  ageGroup: AgeGroup;
  theme: string;
  keyVerse: { reference: string; text: string };
  summary: string;
  points: { heading: string; body: string }[];
  discussionQuestions: string[];
  activity: string;
  prayer: string;
  memoryVerse?: string;
}

export const LESSONS: SundaySchoolLesson[] = [
  // ─── CHILDREN (8) ───────────────────────────────────────────────────────
  {
    id: "c-creation",
    title: "God Made Everything",
    ageGroup: "Children",
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
    id: "c-noah",
    title: "Noah Trusts God",
    ageGroup: "Children",
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
    id: "c-david",
    title: "David and the Giant",
    ageGroup: "Children",
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
    id: "c-daniel",
    title: "Daniel in the Lions' Den",
    ageGroup: "Children",
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
    id: "c-christmas",
    title: "Jesus is Born",
    ageGroup: "Children",
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
    id: "c-storm",
    title: "Jesus Calms the Storm",
    ageGroup: "Children",
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
    id: "c-samaritan",
    title: "The Good Samaritan",
    ageGroup: "Children",
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
    id: "c-lost-sheep",
    title: "The Lost Sheep",
    ageGroup: "Children",
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
    ageGroup: "Youth",
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
    ageGroup: "Youth",
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
    ageGroup: "Youth",
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
    ageGroup: "Youth",
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
    ageGroup: "Youth",
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
    ageGroup: "Youth",
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
    ageGroup: "Youth",
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
    ageGroup: "Youth",
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

  // ─── ADULT (8) ──────────────────────────────────────────────────────────
  {
    id: "a-beatitudes",
    title: "The Beatitudes — Kingdom Blessing",
    ageGroup: "Adult",
    theme: "Kingdom Living",
    keyVerse: { reference: "Matthew 5:3", text: "Blessed are the poor in spirit: for theirs is the kingdom of heaven." },
    summary: "Jesus opens the greatest sermon ever preached by redefining who is truly blessed.",
    points: [
      { heading: "Upside-down blessing", body: "The world says blessed are the rich, strong, full. Jesus says blessed are the poor in spirit, the mourning, the meek." },
      { heading: "Hunger that gets filled", body: "Those who hunger for righteousness will be filled. Pursue God Himself, not just His benefits." },
      { heading: "Peacemakers and the persecuted", body: "Reconciliation is family work; rejection for righteousness is a badge, not a defeat. The kingdom belongs to such." },
    ],
    discussionQuestions: [
      "Which Beatitude challenges you most right now?",
      "How does Jesus' definition of 'blessed' clash with our culture?",
      "Where is God calling you to be a peacemaker?",
    ],
    activity: "Each member chooses one Beatitude to memorise and apply for the week. Share next Sunday what changed.",
    prayer: "Lord, make me poor in spirit, hungry for righteousness, merciful, pure, a peacemaker. Form Your kingdom in me. Amen.",
  },
  {
    id: "a-lords-prayer",
    title: "Praying the Lord's Prayer",
    ageGroup: "Adult",
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
    ageGroup: "Adult",
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
    activity: "Do a personal inventory: rate yourself 1-10 on each fruit. Pick the lowest one and ask the Spirit to grow it this month.",
    prayer: "Holy Spirit, grow Your fruit in me. I cannot manufacture it. I abide in Christ; produce Your character through me. Amen.",
  },
  {
    id: "a-faith-works",
    title: "Faith That Works",
    ageGroup: "Adult",
    theme: "Faith",
    keyVerse: { reference: "James 2:17", text: "Even so faith, if it hath not works, is dead, being alone." },
    summary: "Real faith always shows up in real action. Belief that costs nothing changes nothing.",
    points: [
      { heading: "Two wings of one bird", body: "We are saved by grace through faith (Eph 2:8) AND created for good works (Eph 2:10). Never separate what God joined." },
      { heading: "Show me your faith", body: "James 2:18 — invisible faith is a contradiction. The proof is in the pattern of life." },
      { heading: "Faith risks something", body: "Heb 11 lists people who acted on what they believed. Where is your faith costing you something?" },
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
    id: "a-marriage",
    title: "Christ-Centred Marriage and Family",
    ageGroup: "Adult",
    theme: "Family",
    keyVerse: { reference: "Ephesians 5:21", text: "Submitting yourselves one to another in the fear of God." },
    summary: "Marriage is a picture of Christ and the church. Family is the first place we practice the gospel.",
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
  {
    id: "a-stewardship",
    title: "Stewardship and Generosity",
    ageGroup: "Adult",
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
    id: "a-gifts",
    title: "Spiritual Gifts in the Body",
    ageGroup: "Adult",
    theme: "Church",
    keyVerse: { reference: "1 Corinthians 12:7", text: "The manifestation of the Spirit is given to every man to profit withal." },
    summary: "Every believer is gifted for the common good. No spectators in the body of Christ.",
    points: [
      { heading: "Gifts are given, not earned", body: "1 Cor 12:11 — the same Spirit distributes as He wills. You did not pick yours; you steward it." },
      { heading: "Different parts, one body", body: "An eye is not a hand. Stop comparing; start contributing. The body needs your specific gift." },
      { heading: "Love is the channel", body: "1 Cor 13 sits between two gift chapters on purpose. Without love, the most spectacular gift is noise." },
    ],
    discussionQuestions: [
      "What gift(s) do others most often affirm in you?",
      "Where in the body of Christ are you currently using them?",
      "Is there a gift you are sitting on out of fear or comparison?",
    ],
    activity: "Pair up. Tell each other one gift you see in them and how the church benefits from it. Pray for boldness to use it more.",
    prayer: "Holy Spirit, You gifted me on purpose. Show me what I have, where to use it, and grow love as the channel. Amen.",
  },
  {
    id: "a-great-commission",
    title: "The Great Commission",
    ageGroup: "Adult",
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
];

export const AGE_GROUPS: AgeGroup[] = ["Children", "Youth", "Adult"];

export function getThemes(): string[] {
  const set = new Set<string>();
  LESSONS.forEach(l => set.add(l.theme));
  return Array.from(set).sort();
}

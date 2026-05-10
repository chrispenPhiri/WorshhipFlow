export interface FreeHymn {
  title: string;
  author: string;
  lyrics: string;
  category: "hymn";
  key?: string;
}

export const FREE_HYMN_PACKS: { id: string; name: string; description: string; emoji: string; hymns: FreeHymn[] }[] = [
  {
    id: "classic-hymns",
    name: "Classic Hymns",
    description: "30 beloved public domain hymns",
    emoji: "🎵",
    hymns: [
      {
        title: "Amazing Grace",
        author: "John Newton",
        key: "G",
        category: "hymn",
        lyrics: `[Verse 1]
Amazing grace! how sweet the sound
That saved a wretch like me
I once was lost, but now am found
Was blind, but now I see

[Verse 2]
'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed

[Verse 3]
Through many dangers, toils and snares
I have already come
'Tis grace hath brought me safe thus far
And grace will lead me home

[Verse 4]
When we've been there ten thousand years
Bright shining as the sun
We've no less days to sing God's praise
Than when we'd first begun`,
      },
      {
        title: "How Great Thou Art",
        author: "Carl Boberg / Stuart K. Hine (trans.)",
        key: "Bb",
        category: "hymn",
        lyrics: `[Verse 1]
O Lord my God, when I in awesome wonder
Consider all the worlds Thy hands have made
I see the stars, I hear the rolling thunder
Thy power throughout the universe displayed

[Chorus]
Then sings my soul, my Saviour God to Thee
How great Thou art, how great Thou art
Then sings my soul, my Saviour God to Thee
How great Thou art, how great Thou art

[Verse 2]
When through the woods and forest glades I wander
And hear the birds sing sweetly in the trees
When I look down from lofty mountain grandeur
And hear the brook and feel the gentle breeze

[Verse 3]
And when I think that God, His Son not sparing
Sent Him to die, I scarce can take it in
That on the cross, my burden gladly bearing
He bled and died to take away my sin

[Verse 4]
When Christ shall come with shout of acclamation
And take me home, what joy shall fill my heart
Then I shall bow in humble adoration
And there proclaim, my God, how great Thou art`,
      },
      {
        title: "Great Is Thy Faithfulness",
        author: "Thomas Chisholm",
        key: "D",
        category: "hymn",
        lyrics: `[Verse 1]
Great is Thy faithfulness, O God my Father
There is no shadow of turning with Thee
Thou changest not, Thy compassions they fail not
As Thou hast been, Thou forever wilt be

[Chorus]
Great is Thy faithfulness, great is Thy faithfulness
Morning by morning new mercies I see
All I have needed Thy hand hath provided
Great is Thy faithfulness, Lord, unto me

[Verse 2]
Summer and winter, and springtime and harvest
Sun, moon and stars in their courses above
Join with all nature in manifold witness
To Thy great faithfulness, mercy and love

[Verse 3]
Pardon for sin and a peace that endureth
Thy own dear presence to cheer and to guide
Strength for today and bright hope for tomorrow
Blessings all mine, with ten thousand beside`,
      },
      {
        title: "Holy, Holy, Holy",
        author: "Reginald Heber",
        key: "D",
        category: "hymn",
        lyrics: `[Verse 1]
Holy, holy, holy! Lord God Almighty
Early in the morning our song shall rise to Thee
Holy, holy, holy! Merciful and mighty
God in three persons, blessed Trinity

[Verse 2]
Holy, holy, holy! All the saints adore Thee
Casting down their golden crowns around the glassy sea
Cherubim and seraphim falling down before Thee
Which wert, and art, and evermore shalt be

[Verse 3]
Holy, holy, holy! Though the darkness hide Thee
Though the eye of sinful man Thy glory may not see
Only Thou art holy; there is none beside Thee
Perfect in power, in love, and purity

[Verse 4]
Holy, holy, holy! Lord God Almighty
All Thy works shall praise Thy name in earth and sky and sea
Holy, holy, holy! Merciful and mighty
God in three persons, blessed Trinity`,
      },
      {
        title: "What a Friend We Have in Jesus",
        author: "Joseph Scriven",
        key: "F",
        category: "hymn",
        lyrics: `[Verse 1]
What a friend we have in Jesus
All our sins and griefs to bear
What a privilege to carry
Everything to God in prayer
O what peace we often forfeit
O what needless pain we bear
All because we do not carry
Everything to God in prayer

[Verse 2]
Have we trials and temptations
Is there trouble anywhere
We should never be discouraged
Take it to the Lord in prayer
Can we find a friend so faithful
Who will all our sorrows share
Jesus knows our every weakness
Take it to the Lord in prayer

[Verse 3]
Are we weak and heavy laden
Cumbered with a load of care
Precious Saviour, still our refuge
Take it to the Lord in prayer
Do your friends despise, forsake you
Take it to the Lord in prayer
In His arms He'll take and shield you
You will find a solace there`,
      },
      {
        title: "Blessed Assurance",
        author: "Fanny Crosby",
        key: "D",
        category: "hymn",
        lyrics: `[Verse 1]
Blessed assurance, Jesus is mine
O what a foretaste of glory divine
Heir of salvation, purchase of God
Born of His Spirit, washed in His blood

[Chorus]
This is my story, this is my song
Praising my Saviour all the day long
This is my story, this is my song
Praising my Saviour all the day long

[Verse 2]
Perfect submission, perfect delight
Visions of rapture now burst on my sight
Angels descending, bring from above
Echoes of mercy, whispers of love

[Verse 3]
Perfect submission, all is at rest
I in my Saviour am happy and blest
Watching and waiting, looking above
Filled with His goodness, lost in His love`,
      },
      {
        title: "Be Thou My Vision",
        author: "Dallan Forgaill (trans. Mary Byrne)",
        key: "Bb",
        category: "hymn",
        lyrics: `[Verse 1]
Be Thou my vision, O Lord of my heart
Naught be all else to me, save that Thou art
Thou my best thought, by day or by night
Waking or sleeping, Thy presence my light

[Verse 2]
Be Thou my wisdom, and Thou my true word
I ever with Thee and Thou with me, Lord
Thou my great Father, and I Thy true son
Thou in me dwelling, and I with Thee one

[Verse 3]
Riches I heed not, nor man's empty praise
Thou mine inheritance, now and always
Thou and Thou only, first in my heart
High King of heaven, my treasure Thou art

[Verse 4]
High King of heaven, my victory won
May I reach heaven's joys, O bright heaven's Sun
Heart of my own heart, whatever befall
Still be my vision, O Ruler of all`,
      },
      {
        title: "It Is Well with My Soul",
        author: "Horatio Spafford",
        key: "C",
        category: "hymn",
        lyrics: `[Verse 1]
When peace like a river attendeth my way
When sorrows like sea billows roll
Whatever my lot, Thou hast taught me to say
It is well, it is well with my soul

[Chorus]
It is well with my soul
It is well, it is well with my soul

[Verse 2]
Though Satan should buffet, though trials should come
Let this blest assurance control
That Christ hath regarded my helpless estate
And hath shed His own blood for my soul

[Verse 3]
My sin, oh the bliss of this glorious thought
My sin, not in part, but the whole
Is nailed to His cross and I bear it no more
Praise the Lord, praise the Lord, O my soul

[Verse 4]
And Lord, haste the day when the faith shall be sight
The clouds be rolled back as a scroll
The trump shall resound and the Lord shall descend
Even so, it is well with my soul`,
      },
      {
        title: "Come Thou Fount of Every Blessing",
        author: "Robert Robinson",
        key: "G",
        category: "hymn",
        lyrics: `[Verse 1]
Come, Thou Fount of every blessing
Tune my heart to sing Thy grace
Streams of mercy, never ceasing
Call for songs of loudest praise
Teach me some melodious sonnet
Sung by flaming tongues above
Praise the mount, I'm fixed upon it
Mount of Thy redeeming love

[Verse 2]
Here I raise mine Ebenezer
Hither by Thy help I'm come
And I hope, by Thy good pleasure
Safely to arrive at home
Jesus sought me when a stranger
Wandering from the fold of God
He, to rescue me from danger
Interposed His precious blood

[Verse 3]
O to grace how great a debtor
Daily I'm constrained to be
Let that goodness like a fetter
Bind my wandering heart to Thee
Prone to wander, Lord, I feel it
Prone to leave the God I love
Here's my heart, O take and seal it
Seal it for Thy courts above`,
      },
      {
        title: "Crown Him with Many Crowns",
        author: "Matthew Bridges / Godfrey Thring",
        key: "Eb",
        category: "hymn",
        lyrics: `[Verse 1]
Crown Him with many crowns
The Lamb upon His throne
Hark how the heavenly anthem drowns
All music but its own
Awake, my soul, and sing
Of Him who died for thee
And hail Him as thy matchless King
Through all eternity

[Verse 2]
Crown Him the Lord of life
Who triumphed o'er the grave
Who rose victorious in the strife
For those He came to save
His glories now we sing
Who died and rose on high
Who died eternal life to bring
And lives that death may die

[Verse 3]
Crown Him the Lord of peace
Whose power a sceptre sways
From pole to pole, that wars may cease
And all be prayer and praise
His reign shall know no end
And round His pierced feet
Fair flowers of paradise extend
Their fragrance ever sweet`,
      },
      {
        title: "I Need Thee Every Hour",
        author: "Annie Sherwood Hawks",
        key: "G",
        category: "hymn",
        lyrics: `[Verse 1]
I need Thee every hour, most gracious Lord
No tender voice like Thine can peace afford

[Chorus]
I need Thee, O I need Thee
Every hour I need Thee
O bless me now, my Saviour
I come to Thee

[Verse 2]
I need Thee every hour, stay Thou nearby
Temptations lose their power when Thou art nigh

[Verse 3]
I need Thee every hour, in joy or pain
Come quickly and abide, or life is vain

[Verse 4]
I need Thee every hour, teach me Thy will
And Thy rich promises in me fulfil`,
      },
      {
        title: "Jesus Loves Me",
        author: "Anna Warner",
        key: "G",
        category: "hymn",
        lyrics: `[Verse 1]
Jesus loves me, this I know
For the Bible tells me so
Little ones to Him belong
They are weak but He is strong

[Chorus]
Yes, Jesus loves me
Yes, Jesus loves me
Yes, Jesus loves me
The Bible tells me so

[Verse 2]
Jesus loves me, He who died
Heaven's gate to open wide
He will wash away my sin
Let His little child come in

[Verse 3]
Jesus loves me, He will stay
Close beside me all the way
He's prepared a home for me
And some day His face I'll see`,
      },
      {
        title: "Joyful, Joyful, We Adore Thee",
        author: "Henry van Dyke",
        key: "D",
        category: "hymn",
        lyrics: `[Verse 1]
Joyful, joyful, we adore Thee
God of glory, Lord of love
Hearts unfold like flowers before Thee
Opening to the sun above
Melt the clouds of sin and sadness
Drive the dark of doubt away
Giver of immortal gladness
Fill us with the light of day

[Verse 2]
All Thy works with joy surround Thee
Earth and heaven reflect Thy rays
Stars and angels sing around Thee
Center of unbroken praise
Field and forest, vale and mountain
Flowery meadow, flashing sea
Singing bird and flowing fountain
Call us to rejoice in Thee

[Verse 3]
Mortals, join the mighty chorus
Which the morning stars began
Father love is reigning o'er us
Brother love binds man to man
Ever singing, march we onward
Victors in the midst of strife
Joyful music leads us sunward
In the triumph song of life`,
      },
      {
        title: "Nearer, My God, to Thee",
        author: "Sarah Flower Adams",
        key: "Eb",
        category: "hymn",
        lyrics: `[Verse 1]
Nearer, my God, to Thee
Nearer to Thee
E'en though it be a cross
That raiseth me
Still all my song would be
Nearer, my God, to Thee
Nearer, my God, to Thee
Nearer to Thee

[Verse 2]
Though like the wanderer
The sun gone down
Darkness be over me
My rest a stone
Yet in my dreams I'd be
Nearer, my God, to Thee
Nearer, my God, to Thee
Nearer to Thee

[Verse 3]
There let the way appear
Steps unto heaven
All that Thou sendest me
In mercy given
Angels to beckon me
Nearer, my God, to Thee
Nearer, my God, to Thee
Nearer to Thee`,
      },
      {
        title: "O for a Thousand Tongues to Sing",
        author: "Charles Wesley",
        key: "G",
        category: "hymn",
        lyrics: `[Verse 1]
O for a thousand tongues to sing
My great Redeemer's praise
The glories of my God and King
The triumphs of His grace

[Verse 2]
My gracious Master and my God
Assist me to proclaim
To spread through all the earth abroad
The honours of Thy name

[Verse 3]
Jesus, the name that charms our fears
That bids our sorrows cease
'Tis music in the sinner's ears
'Tis life and health and peace

[Verse 4]
He breaks the power of cancelled sin
He sets the prisoner free
His blood can make the foulest clean
His blood availed for me`,
      },
      {
        title: "Rock of Ages",
        author: "Augustus Toplady",
        key: "C",
        category: "hymn",
        lyrics: `[Verse 1]
Rock of Ages, cleft for me
Let me hide myself in Thee
Let the water and the blood
From Thy wounded side which flowed
Be of sin the double cure
Save from wrath and make me pure

[Verse 2]
Not the labour of my hands
Can fulfil Thy law's demands
Could my zeal no respite know
Could my tears forever flow
All for sin could not atone
Thou must save and Thou alone

[Verse 3]
Nothing in my hand I bring
Simply to the cross I cling
Naked, come to Thee for dress
Helpless, look to Thee for grace
Foul, I to the Fountain fly
Wash me, Saviour, or I die

[Verse 4]
While I draw this fleeting breath
When my eyelids close in death
When I soar to worlds unknown
See Thee on Thy judgement throne
Rock of Ages, cleft for me
Let me hide myself in Thee`,
      },
      {
        title: "The Old Rugged Cross",
        author: "George Bennard",
        key: "C",
        category: "hymn",
        lyrics: `[Verse 1]
On a hill far away stood an old rugged cross
The emblem of suffering and shame
And I love that old cross where the dearest and best
For a world of lost sinners was slain

[Chorus]
So I'll cherish the old rugged cross
Till my trophies at last I lay down
I will cling to the old rugged cross
And exchange it someday for a crown

[Verse 2]
O that old rugged cross so despised by the world
Has a wondrous attraction for me
For the dear Lamb of God left His glory above
To bear it to dark Calvary

[Verse 3]
In that old rugged cross, stained with blood so divine
A wondrous beauty I see
For 'twas on that old cross Jesus suffered and died
To pardon and sanctify me`,
      },
      {
        title: "Praise to the Lord, the Almighty",
        author: "Joachim Neander",
        key: "F",
        category: "hymn",
        lyrics: `[Verse 1]
Praise to the Lord, the Almighty, the King of creation
O my soul, praise Him, for He is thy health and salvation
All ye who hear, now to His temple draw near
Praise Him in glad adoration

[Verse 2]
Praise to the Lord, who o'er all things so wondrously reigneth
Shelters thee under His wings, yea, so gently sustaineth
Hast thou not seen how thy desires e'er have been
Granted in what He ordaineth

[Verse 3]
Praise to the Lord, who doth prosper thy work and defend thee
Surely His goodness and mercy here daily attend thee
Ponder anew what the Almighty can do
If with His love He befriend thee

[Verse 4]
Praise to the Lord! O let all that is in me adore Him
All that hath life and breath come now with praises before Him
Let the Amen sound from His people again
Gladly for aye we adore Him`,
      },
      {
        title: "Take My Life and Let It Be",
        author: "Frances Ridley Havergal",
        key: "A",
        category: "hymn",
        lyrics: `[Verse 1]
Take my life and let it be
Consecrated, Lord, to Thee
Take my moments and my days
Let them flow in ceaseless praise

[Verse 2]
Take my hands and let them move
At the impulse of Thy love
Take my feet and let them be
Swift and beautiful for Thee

[Verse 3]
Take my voice and let me sing
Always, only for my King
Take my lips and let them be
Filled with messages from Thee

[Verse 4]
Take my silver and my gold
Not a mite would I withhold
Take my intellect and use
Every power as Thou shalt choose

[Verse 5]
Take my will and make it Thine
It shall be no longer mine
Take my heart, it is Thine own
It shall be Thy royal throne

[Verse 6]
Take my love, my Lord, I pour
At Thy feet its treasure store
Take myself and I will be
Ever, only, all for Thee`,
      },
      {
        title: "To God Be the Glory",
        author: "Fanny Crosby",
        key: "Bb",
        category: "hymn",
        lyrics: `[Verse 1]
To God be the glory, great things He hath taught us
Great things He hath done and great our rejoicing
Through Jesus the Son, but purer and higher
And greater our wonder, His glory the more

[Chorus]
Praise the Lord, praise the Lord
Let the earth hear His voice
Praise the Lord, praise the Lord
Let the people rejoice
O come to the Father through Jesus the Son
And give Him the glory, great things He hath done

[Verse 2]
O perfect redemption, the purchase of blood
To every believer the promise of God
The vilest offender who truly believes
That moment from Jesus a pardon receives

[Verse 3]
Great things He hath taught us, great things He hath done
And great our rejoicing through Jesus the Son
But purer and higher and greater will be
Our wonder, our transport, when Jesus we see`,
      },
      {
        title: "Softly and Tenderly",
        author: "Will Thompson",
        key: "Eb",
        category: "hymn",
        lyrics: `[Verse 1]
Softly and tenderly Jesus is calling
Calling for you and for me
See, on the portals He's waiting and watching
Watching for you and for me

[Chorus]
Come home, come home
Ye who are weary, come home
Earnestly, tenderly, Jesus is calling
Calling, O sinner, come home

[Verse 2]
Why should we tarry when Jesus is pleading
Pleading for you and for me
Why should we linger and heed not His mercies
Mercies for you and for me

[Verse 3]
Time is now fleeting, the moments are passing
Passing from you and from me
Shadows are gathering, deathbeds are coming
Coming for you and for me`,
      },
      {
        title: "Sweet Hour of Prayer",
        author: "William Walford",
        key: "D",
        category: "hymn",
        lyrics: `[Verse 1]
Sweet hour of prayer, sweet hour of prayer
That calls me from a world of care
And bids me at my Father's throne
Make all my wants and wishes known
In seasons of distress and grief
My soul has often found relief
And oft escaped the tempter's snare
By thy return, sweet hour of prayer

[Verse 2]
Sweet hour of prayer, sweet hour of prayer
The joys I feel, the bliss I share
Of those whose anxious spirits burn
With strong desires for thy return
With such I hasten to the place
Where God my Saviour shows His face
And gladly take my station there
And wait for thee, sweet hour of prayer`,
      },
      {
        title: "Trust and Obey",
        author: "John Sammis",
        key: "F",
        category: "hymn",
        lyrics: `[Verse 1]
When we walk with the Lord
In the light of His word
What a glory He sheds on our way
While we do His good will
He abides with us still
And with all who will trust and obey

[Chorus]
Trust and obey
For there's no other way
To be happy in Jesus
But to trust and obey

[Verse 2]
Not a shadow can rise
Not a cloud in the skies
But His smile quickly drives it away
Not a doubt or a fear
Not a sigh or a tear
Can abide while we trust and obey

[Verse 3]
Then in fellowship sweet
We will sit at His feet
Or we'll walk by His side in the way
What He says we will do
Where He sends we will go
Never fear, only trust and obey`,
      },
      {
        title: "Onward, Christian Soldiers",
        author: "Sabine Baring-Gould",
        key: "G",
        category: "hymn",
        lyrics: `[Verse 1]
Onward, Christian soldiers
Marching as to war
With the cross of Jesus
Going on before
Christ, the royal Master
Leads against the foe
Forward into battle
See His banners go

[Chorus]
Onward, Christian soldiers
Marching as to war
With the cross of Jesus
Going on before

[Verse 2]
Like a mighty army
Moves the Church of God
Brothers, we are treading
Where the saints have trod
We are not divided
All one body we
One in hope and doctrine
One in charity

[Verse 3]
Crowns and thrones may perish
Kingdoms rise and wane
But the Church of Jesus
Constant will remain
Gates of hell can never
'Gainst that Church prevail
We have Christ's own promise
And that cannot fail`,
      },
      {
        title: "Guide Me, O Thou Great Jehovah",
        author: "William Williams",
        key: "G",
        category: "hymn",
        lyrics: `[Verse 1]
Guide me, O Thou great Jehovah
Pilgrim through this barren land
I am weak, but Thou art mighty
Hold me with Thy powerful hand
Bread of heaven, bread of heaven
Feed me till I want no more
Feed me till I want no more

[Verse 2]
Open now the crystal fountain
Whence the healing stream doth flow
Let the fire and cloudy pillar
Lead me all my journey through
Strong Deliverer, strong Deliverer
Be Thou still my strength and shield
Be Thou still my strength and shield

[Verse 3]
When I tread the verge of Jordan
Bid my anxious fears subside
Death of death and hell's Destruction
Land me safe on Canaan's side
Songs of praises, songs of praises
I will ever give to Thee
I will ever give to Thee`,
      },
      {
        title: "Fairest Lord Jesus",
        author: "Anonymous (German, 17th c.)",
        key: "Db",
        category: "hymn",
        lyrics: `[Verse 1]
Fairest Lord Jesus, ruler of all nature
O Thou of God and man the Son
Thee will I cherish, Thee will I honour
Thou my soul's glory, joy, and crown

[Verse 2]
Fair are the meadows, fairer still the woodlands
Robed in the blooming garb of spring
Jesus is fairer, Jesus is purer
Who makes the woeful heart to sing

[Verse 3]
Fair is the sunshine, fairer still the moonlight
And all the twinkling, starry host
Jesus shines brighter, Jesus shines purer
Than all the angels heaven can boast

[Verse 4]
Beautiful Saviour! Lord of the nations
Son of God and Son of Man
Glory and honour, praise, adoration
Now and forevermore be Thine`,
      },
      {
        title: "My Faith Looks Up to Thee",
        author: "Ray Palmer",
        key: "Eb",
        category: "hymn",
        lyrics: `[Verse 1]
My faith looks up to Thee
Thou Lamb of Calvary
Saviour divine
Now hear me while I pray
Take all my guilt away
O let me from this day
Be wholly Thine

[Verse 2]
May Thy rich grace impart
Strength to my fainting heart
My zeal inspire
As Thou hast died for me
O may my love to Thee
Pure, warm, and changeless be
A living fire

[Verse 3]
While life's dark maze I tread
And griefs around me spread
Be Thou my guide
Bid darkness turn to day
Wipe sorrow's tears away
Nor let me ever stray
From Thee aside`,
      },
      {
        title: "Shall We Gather at the River",
        author: "Robert Lowry",
        key: "C",
        category: "hymn",
        lyrics: `[Verse 1]
Shall we gather at the river
Where bright angel feet have trod
With its crystal tide forever
Flowing by the throne of God

[Chorus]
Yes, we'll gather at the river
The beautiful, the beautiful river
Gather with the saints at the river
That flows by the throne of God

[Verse 2]
On the margin of the river
Washing up its silver spray
We will walk and worship ever
All the happy golden day

[Verse 3]
Ere we reach the shining river
Lay we every burden down
Grace our spirits will deliver
And provide a robe and crown`,
      },
      {
        title: "There Is a Fountain Filled with Blood",
        author: "William Cowper",
        key: "Bb",
        category: "hymn",
        lyrics: `[Verse 1]
There is a fountain filled with blood
Drawn from Emmanuel's veins
And sinners plunged beneath that flood
Lose all their guilty stains

[Chorus]
Lose all their guilty stains
Lose all their guilty stains
And sinners plunged beneath that flood
Lose all their guilty stains

[Verse 2]
The dying thief rejoiced to see
That fountain in his day
And there have I, though vile as he
Washed all my sins away

[Verse 3]
Dear dying Lamb, Thy precious blood
Shall never lose its power
Till all the ransomed church of God
Be saved to sin no more`,
      },
      {
        title: "Pass Me Not, O Gentle Saviour",
        author: "Fanny Crosby",
        key: "F",
        category: "hymn",
        lyrics: `[Verse 1]
Pass me not, O gentle Saviour
Hear my humble cry
While on others Thou art calling
Do not pass me by

[Chorus]
Saviour, Saviour
Hear my humble cry
While on others Thou art calling
Do not pass me by

[Verse 2]
Let me at a throne of mercy
Find a sweet relief
Kneeling there in deep contrition
Help my unbelief

[Verse 3]
Trusting only in Thy merit
Would I seek Thy face
Heal my wounded, broken spirit
Save me by Thy grace`,
      },
      {
        title: "Abide with Me",
        author: "Henry Francis Lyte",
        key: "Eb",
        category: "hymn",
        lyrics: `[Verse 1]
Abide with me, fast falls the eventide
The darkness deepens, Lord, with me abide
When other helpers fail and comforts flee
Help of the helpless, O abide with me

[Verse 2]
Swift to its close ebbs out life's little day
Earth's joys grow dim, its glories pass away
Change and decay in all around I see
O Thou who changest not, abide with me

[Verse 3]
I need Thy presence every passing hour
What but Thy grace can foil the tempter's power
Who like Thyself my guide and stay can be
Through cloud and sunshine, Lord, abide with me

[Verse 4]
I fear no foe with Thee at hand to bless
Ills have no weight and tears no bitterness
Where is death's sting, where grave thy victory
I triumph still, if Thou abide with me`,
      },
    ],
  },
];

export const ALL_FREE_HYMNS = FREE_HYMN_PACKS.flatMap(p => p.hymns);

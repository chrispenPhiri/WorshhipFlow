import { ReactNode, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  HelpCircle, Search, Rocket, Book, Music, Type, Palette, Video, Calendar,
  BookOpen, Sparkles, Settings, Monitor, Keyboard, Lightbulb, ChevronRight, GraduationCap,
} from "lucide-react";
import { Link } from "wouter";

interface Section {
  id: string;
  icon: typeof Book;
  title: string;
  summary: string;
  to?: string;
  steps: { heading: string; body: ReactNode }[];
  tips?: ReactNode[];
}

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    icon: Rocket,
    title: "Getting Started",
    summary: "Set up your projection screen and learn how the app is laid out.",
    steps: [
      {
        heading: "Understand the layout",
        body: (
          <>
            <p>The app has three areas: the <strong>main menu</strong> on the left, your <strong>working area</strong> in the middle, and the <strong>Live Preview</strong> on the right.</p>
            <p className="mt-2">The Live Preview shows exactly what your audience is seeing, updated every two seconds. Use the <strong>Black</strong> and <strong>Clear</strong> buttons there at any time to instantly hide or restore content.</p>
          </>
        ),
      },
      {
        heading: "Open the projection screen",
        body: (
          <>
            <p>Connect your second monitor or projector. Open <strong>Media &amp; Broadcast → Broadcast</strong> tab. The app will detect available displays and offer to fullscreen the projection there. The projection runs at <code>/broadcast</code> — drag that browser tab to the second screen if your browser does not support automatic display picking.</p>
          </>
        ),
      },
      {
        heading: "Send your first content",
        body: (
          <>
            <p>Go to <strong>Bible</strong> in the menu, pick any book and chapter, click any verse, and press <em>Send to screen</em>. You should see the verse appear on your projection within a second or two.</p>
          </>
        ),
      },
    ],
    tips: [
      <>The Live Preview always reflects the projection. If something looks wrong, check it there before going on stage.</>,
      <>Use <strong>Black</strong> between songs to keep the screen calm; use <strong>Clear</strong> to show only the background/theme without text.</>,
    ],
  },
  {
    id: "bible",
    icon: Book,
    title: "Bible",
    to: "/",
    summary: "Look up scripture in 17 translations and present verses one-by-one or all together.",
    steps: [
      {
        heading: "Choose a translation",
        body: <p>Pick from the translation dropdown — KJV, ESV, NIV, ASV, and 13 more public-domain translations are available. Your choice persists across sessions.</p>,
      },
      {
        heading: "Look up a passage",
        body: <p>Select a book, then a chapter. Verses load as numbered cards. Toggle verse numbers on or off with the eye icon.</p>,
      },
      {
        heading: "Present verses",
        body: (
          <>
            <p>Use <strong>Send mode</strong> to control how verses go up:</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li><strong>One at a time</strong> — click any verse to send it solo, then use Next/Previous to navigate.</li>
              <li><strong>All together</strong> — sends the entire chapter at once.</li>
            </ul>
          </>
        ),
      },
      {
        heading: "Highlight words and phrases",
        body: (
          <>
            <p><strong>Word highlight</strong>: type comma-separated words; matching words glow amber on the projection.</p>
            <p className="mt-1"><strong>Phrase search</strong>: filter the verses you've loaded down to ones containing your search.</p>
          </>
        ),
      },
      {
        heading: "Compare two translations side-by-side",
        body: <p>Toggle <strong>Compare</strong> and pick a second translation. The projection switches to a 2-column layout with translation labels.</p>,
      },
    ],
    tips: [
      <>Sent verses are remembered in <em>Recently Presented</em> at the top of the page — click any item to re-send it instantly.</>,
    ],
  },
  {
    id: "songs",
    icon: Music,
    title: "Songs",
    to: "/songs",
    summary: "Build a song library with verses and choruses, then send sections live.",
    steps: [
      {
        heading: "Add a song",
        body: <p>Click <strong>New Song</strong>, give it a title and author, then add sections (Verse 1, Chorus, Bridge, etc.). Each section becomes a "slide" you can send.</p>,
      },
      {
        heading: "Present a song",
        body: <p>Open a song and click any section to send it. Use the section buttons to jump around — Chorus, Verse 2, etc.</p>,
      },
      {
        heading: "Edit on the fly",
        body: <p>Songs can be edited at any time. Changes are saved instantly and don't interrupt anything currently being projected.</p>,
      },
    ],
  },
  {
    id: "custom",
    icon: Type,
    title: "Custom Text",
    to: "/custom",
    summary: "Free-form text for announcements, prayers, or anything you want on screen.",
    steps: [
      {
        heading: "Type your message",
        body: <p>Enter title and body text. Adjust font, size, alignment, and color in the controls.</p>,
      },
      {
        heading: "Send to screen",
        body: <p>Hit <strong>Send</strong>. The projection updates immediately with your formatting choices.</p>,
      },
    ],
    tips: [
      <>Great for one-off welcome slides, prayer requests, or offering reminders.</>,
    ],
  },
  {
    id: "themes",
    icon: Palette,
    title: "Themes",
    to: "/themes",
    summary: "Set the projection background — solid colors, gradients, or animated wallpapers.",
    steps: [
      {
        heading: "Pick a preset",
        body: <p>12 color and gradient presets cover most worship moods. Tap one to apply it instantly.</p>,
      },
      {
        heading: "Use a live wallpaper",
        body: <p>8 animated wallpapers are available — particle, aurora, matrix, starfield, flame, ocean, geometric, and neon. Run smoothly even on modest hardware.</p>,
      },
      {
        heading: "Customize Control Screen colors",
        body: <p>Operator-only theming lives in <strong>Settings → Control Screen Appearance</strong>. It changes only what YOU see — the projection is unaffected.</p>,
      },
    ],
  },
  {
    id: "media",
    icon: Video,
    title: "Media & Broadcast",
    to: "/media",
    summary: "Upload images and videos, use a live camera feed, or fullscreen the projection on a second display.",
    steps: [
      {
        heading: "Upload images and videos",
        body: <p>On the <strong>Upload</strong> tab, drag files from your computer or use the file picker. Files are session-scoped — re-upload after refreshing the page.</p>,
      },
      {
        heading: "Cut media",
        body: <p>The <strong>Cut Media</strong> button on the Upload tab stops whatever image or video is on screen and restores the previous theme. If nothing was set, the screen blacks out.</p>,
      },
      {
        heading: "Live camera feed",
        body: <p>The <strong>Camera</strong> tab streams your webcam to the projection. Useful for showing a speaker or pulpit. Click <strong>Cut</strong> to stop the feed.</p>,
      },
      {
        heading: "Broadcast to a second screen",
        body: <p>The <strong>Broadcast</strong> tab detects connected displays and can auto-fullscreen the projection on one. Cursor is hidden, video loops are configurable.</p>,
      },
    ],
    tips: [
      <>If your browser does not support display picking, just open <code>/broadcast</code> in a new tab and drag it to the second screen, then press F11 to fullscreen.</>,
    ],
  },
  {
    id: "schedule",
    icon: Calendar,
    title: "Schedule",
    to: "/schedule",
    summary: "Plan your service order with drag-and-drop.",
    steps: [
      {
        heading: "Add items",
        body: <p>Add songs, scripture readings, sermon points, and announcements in the order they'll happen.</p>,
      },
      {
        heading: "Reorder",
        body: <p>Drag and drop any item to rearrange. The order saves automatically.</p>,
      },
    ],
  },
  {
    id: "notes",
    icon: BookOpen,
    title: "Sermon Notes",
    to: "/notes",
    summary: "Write sermon notes and project them when needed.",
    steps: [
      {
        heading: "Create a note",
        body: <p>Click <strong>New Note</strong>, fill in title, speaker, date, content, and tag any scriptures. Save.</p>,
      },
      {
        heading: "Search",
        body: <p>The search box matches title, speaker, and content text.</p>,
      },
      {
        heading: "Present a note",
        body: <p>Click <strong>Present to screen</strong> on any card, then adjust font, size, and alignment in the dialog before sending.</p>,
      },
    ],
  },
  {
    id: "inspiration",
    icon: Sparkles,
    title: "Daily Inspiration",
    to: "/inspiration",
    summary: "Verse of the day, interesting Bible facts, and the Christian liturgical calendar.",
    steps: [
      {
        heading: "Verse of the Day",
        body: <p>A different verse appears each day from a curated library of 60. Click <strong>Next</strong> to browse others, or <strong>Send to screen</strong> to project the current one.</p>,
      },
      {
        heading: "Did you know?",
        body: <p>Bite-sized facts about the Bible, Jesus, God, the Old and New Testaments, and Church history. Same Next/Send controls.</p>,
      },
      {
        heading: "Christian Calendar",
        body: <p>Upcoming Christian feasts including Easter (computed correctly each year), Ash Wednesday, Palm Sunday, Good Friday, Pentecost, Advent, Christmas, and more. A "Today" badge appears if the date matches an observance. Each event has its own send button.</p>,
      },
    ],
    tips: [
      <>All content works <strong>offline</strong> — no internet needed during a service.</>,
    ],
  },
  {
    id: "sunday-school",
    icon: GraduationCap,
    title: "Sunday School Teachings",
    to: "/sunday-school",
    summary: "Ready-to-use lessons for Children, Youth, and Adult classes.",
    steps: [
      {
        heading: "Pick an age group",
        body: <p>Filter by <strong>Children</strong>, <strong>Youth</strong>, or <strong>Adult</strong> at the top. Each group has 8 carefully written lessons that match their stage.</p>,
      },
      {
        heading: "Filter by theme",
        body: <p>Browse by topic — Faith, Prayer, Identity, Family, Mission, and more. Combine with the search box to find exactly what you need.</p>,
      },
      {
        heading: "Use a lesson live",
        body: (
          <>
            <p>Open a lesson from the list on the left. The full lesson appears on the right with a Key Verse, numbered Teaching Points, Discussion Questions, an Activity, and a Closing Prayer.</p>
            <p className="mt-1">Each section has its own <strong>Send to screen</strong> button so you can project content step-by-step as you teach.</p>
          </>
        ),
      },
      {
        heading: "Send all questions at once",
        body: <p>The Discussion Questions card has a <strong>Send All Questions to Screen</strong> button — perfect for small-group breakout time.</p>,
      },
    ],
    tips: [
      <>Lessons load instantly and work <strong>offline</strong> — no setup needed before class.</>,
      <>Use the <strong>Black Screen</strong> button between sections so the class can focus on you, not the projector.</>,
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "Settings",
    to: "/settings",
    summary: "Church name, default font, and operator screen appearance.",
    steps: [
      {
        heading: "Church identity",
        body: <p>Set your church name and default font. Used as defaults across the app.</p>,
      },
      {
        heading: "Control Screen Appearance",
        body: <p>Customize the operator interface — theme color and font. Affects only the operator side, never the projection.</p>,
      },
    ],
  },
  {
    id: "live-preview",
    icon: Monitor,
    title: "Live Preview Sidebar",
    summary: "The right-hand panel that's always visible — your safety net.",
    steps: [
      {
        heading: "What it shows",
        body: <p>A 16:9 mini-version of exactly what's on the projection right now. Refreshes every two seconds.</p>,
      },
      {
        heading: "Quick controls",
        body: (
          <>
            <p><strong>Black Screen</strong> — instantly blacks out the projection. Click again to restore.</p>
            <p className="mt-1"><strong>Clear</strong> — hides text but keeps the background.</p>
            <p className="mt-1"><strong>Broadcast</strong> — opens the multi-display picker for fullscreening.</p>
          </>
        ),
      },
      {
        heading: "Recently Presented",
        body: <p>The list of the last 12 things you sent (verses, songs, notes, inspiration). Click any item to re-send it. Remove or clear them with the X buttons.</p>,
      },
    ],
  },
  {
    id: "tips",
    icon: Lightbulb,
    title: "Pro Tips",
    summary: "Small habits that make services smoother.",
    steps: [
      {
        heading: "Run a 5-minute pre-flight",
        body: <p>Before the service: open Broadcast, fullscreen the projection, send one verse to confirm the connection, then click Black Screen so you're ready.</p>,
      },
      {
        heading: "Stage your slides",
        body: <p>Build the Schedule before service. During the service, just click down the list — no hunting for content.</p>,
      },
      {
        heading: "Use Black between transitions",
        body: <p>A second of black between songs and announcements feels much more polished than a hard cut.</p>,
      },
      {
        heading: "Lean on Recently Presented",
        body: <p>If the speaker calls back to a verse from earlier, tap it in Recently Presented instead of re-navigating.</p>,
      },
    ],
  },
];

export default function HowToPage() {
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useLocalStorage<string[]>("wf-howto-open", []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? SECTIONS.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.steps.some(st => st.heading.toLowerCase().includes(q))
      )
    : SECTIONS;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary"><HelpCircle className="w-6 h-6" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">How To</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Quick guide to every feature in Phiri WorshipFlow.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search topics…"
            className="pl-8 w-64"
            data-testid="input-howto-search"
          />
        </div>
      </div>

      {/* Quick-jump tiles */}
      {!q && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3" data-testid="howto-quick-tiles">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setOpenItems(prev => prev.includes(s.id) ? prev : [...prev, s.id]);
                setTimeout(() => document.getElementById(`howto-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
              }}
              className="text-left p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-colors group"
              data-testid={`tile-howto-${s.id}`}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary"><s.icon className="w-4 h-4" /></div>
                <h3 className="font-semibold text-sm flex-1">{s.title}</h3>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.summary}</p>
            </button>
          ))}
        </div>
      )}

      {/* Detailed sections */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
          No topics match "{search}".
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={openItems}
          onValueChange={setOpenItems}
          className="space-y-3"
          data-testid="howto-accordion"
        >
          {filtered.map(s => (
            <AccordionItem
              key={s.id}
              value={s.id}
              id={`howto-${s.id}`}
              className="border border-border rounded-xl bg-card px-4 scroll-mt-4"
              data-testid={`section-${s.id}`}
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left flex-1">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0"><s.icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{s.title}</h3>
                      {s.to && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-mono">{s.to}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-normal">{s.summary}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4 pl-9">
                  {s.steps.map((step, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="font-semibold text-sm">{step.heading}</h4>
                      </div>
                      <div className="pl-7 text-sm text-muted-foreground leading-relaxed [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-foreground [&_strong]:text-foreground">
                        {step.body}
                      </div>
                    </div>
                  ))}

                  {s.tips && s.tips.length > 0 && (
                    <div className="pt-2 mt-3 border-t border-border space-y-2">
                      {s.tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                          <p className="leading-relaxed [&_strong]:text-foreground">{tip}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.to && (
                    <div className="pt-2">
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <Link href={s.to} data-testid={`button-open-${s.id}`}>
                          Open {s.title} <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Keyboard / final note */}
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Need more help?</CardTitle>
          </div>
          <CardDescription className="text-xs">
            The Live Preview on the right always shows what your audience sees — when in doubt, look there first. The Black Screen button is your fastest reset.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}

import { ReactNode, useState, useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  HelpCircle, Search, Rocket, Book, Music, Type, Palette, Video, Calendar,
  BookOpen, Sparkles, Settings, Monitor, Keyboard, Lightbulb, ChevronRight, GraduationCap,
  Gamepad2, Plus, Download, Bot, Image as ImageIcon, TextCursorInput, Smile,
  Users, MessageSquare, Mic, SlidersHorizontal, FileText, Star, Zap, Globe, Shield,
  Printer,
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
    id: "bible-search",
    icon: Search,
    title: "Bible Reference & Phrase Search",
    to: "/",
    summary: "Jump directly to any passage by typing a reference, or search the entire Bible for a phrase — all from one input.",
    steps: [
      {
        heading: "Open Bible Search",
        body: <p>Scroll down on the Bible page to find the <strong>Bible Search</strong> panel (below the verse results). Click it to expand.</p>,
      },
      {
        heading: "Jump to a reference",
        body: (
          <>
            <p>Type a Bible reference and press Enter or click <strong>Go to</strong>:</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-sm">
              <li><code>John 3:16</code> — jump to a specific verse</li>
              <li><code>John 1:1-5</code> — jump to a verse range</li>
              <li><code>John 1 V1-5</code> — alternative "V" notation</li>
              <li><code>1 Cor 13</code> — jump to an entire chapter</li>
              <li><code>jn 3:16</code>, <code>gen 1</code>, <code>ps 23</code> — abbreviations work too</li>
            </ul>
            <p className="mt-1">A blue preview card confirms what will load before you press Go to.</p>
          </>
        ),
      },
      {
        heading: "Search for a phrase",
        body: <p>Type any word or phrase (e.g. <em>love</em>, <em>fear not</em>) and press <strong>Search</strong>. Results show matching verses with the phrase highlighted. Choose scope: <strong>Chapter</strong> (instant, current verses only), <strong>Book</strong>, or <strong>Whole Bible</strong>.</p>,
      },
      {
        heading: "Use a result",
        body: <p>Hover any result to reveal the <strong>→ Go to</strong> and <strong>Cast</strong> buttons — navigate to that passage or send that verse directly to screen without navigating away.</p>,
      },
    ],
    tips: [
      <>The search panel automatically detects whether you typed a reference or a phrase — no separate inputs needed.</>,
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
    summary: "Upload images and videos, use a live camera feed, edit photos, or fullscreen the projection on a second display.",
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
    id: "photo-studio",
    icon: SlidersHorizontal,
    title: "Photo Studio",
    to: "/media",
    summary: "Edit photos with filters, add text overlays, merge images, remove backgrounds — all without leaving the app.",
    steps: [
      {
        heading: "Open Photo Studio",
        body: <p>Go to <strong>Media → Photo Studio</strong> tab. Drop an image, pick a file, or start with a <strong>poster background</strong> (for text-only graphics).</p>,
      },
      {
        heading: "Apply filters",
        body: <p>Use the <strong>Filters</strong> sub-tab to adjust Brightness, Contrast, Saturation, Hue, Sepia, Grayscale, and Blur with sliders. Click <strong>Reset Filters</strong> to restore defaults without losing your image.</p>,
      },
      {
        heading: "Add text overlays",
        body: <p>Go to the <strong>Text</strong> sub-tab. Type your message, choose font, size, color, alignment, and bold/italic/shadow options. Drag the text anchor point on the preview to reposition it. Add multiple text layers.</p>,
      },
      {
        heading: "Merge two images",
        body: <p>Use the <strong>Merge</strong> sub-tab to overlay a second image with adjustable opacity and blend mode, or switch to <strong>Side-by-Side</strong> layout with a draggable split line.</p>,
      },
      {
        heading: "Remove the background",
        body: <p>The <strong>Remove BG</strong> sub-tab uses the remove.bg API (requires a free API key). Enter your key and click Remove Background. The result replaces the photo with a transparent version.</p>,
      },
      {
        heading: "Clear and close",
        body: <p>Click the <strong>✕</strong> button in the top-right corner of the preview to clear the current image and start fresh. Use <strong>Reset Filters</strong> to undo only the filter adjustments.</p>,
      },
      {
        heading: "Export or present",
        body: <p>Click <strong>Download</strong> to save the edited image as a JPG, or <strong>Send to Screen</strong> to project it immediately on the presentation display.</p>,
      },
    ],
    tips: [
      <>The preview canvas reflects all edits in real time — what you see is what gets exported.</>,
      <>Poster backgrounds are great for creating sermon title slides without needing a photo.</>,
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
    id: "live-session",
    icon: Users,
    title: "Live Session",
    summary: "Connect your whole worship team in real time — shared screen control, team chat, and free voice comms.",
    steps: [
      {
        heading: "Start a session",
        body: <p>Click the <strong>Live Session</strong> button in the top bar. Enter your name and click <strong>Create Session</strong>. You'll get a 6-character room code to share with your team.</p>,
      },
      {
        heading: "Join a session",
        body: <p>On another device, click <strong>Live Session</strong>, enter your name and the room code, then click <strong>Join Session</strong>. You can also open the invite link the master copies — it auto-fills the code.</p>,
      },
      {
        heading: "Roles",
        body: (
          <>
            <p>Every member has a role:</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-sm">
              <li><strong>Master</strong> — creates the session, manages roles, full control</li>
              <li><strong>Operator</strong> — can send content to the projection screen</li>
              <li><strong>Viewer</strong> — sees the current screen state, read-only</li>
            </ul>
            <p className="mt-1">The master can toggle any member between Operator and Viewer in the Members list.</p>
          </>
        ),
      },
      {
        heading: "Team Chat",
        body: <p>While in a session, open the <strong>Chat</strong> tab inside the Live Session panel. Type a message and press Enter or the send button. All members see messages in real time — great for quiet coordination during a service without speaking aloud.</p>,
      },
      {
        heading: "Voice comms",
        body: <p>Open the <strong>Voice</strong> tab and click <strong>Enable Microphone</strong>. Allow browser microphone access when prompted. Your browser uses free WebRTC peer-to-peer audio to connect you with other members who also enable their mic — no server cost, no subscriptions. Works best on the same network or via a reliable internet connection.</p>,
      },
      {
        heading: "Remote control",
        body: <p>Masters and operators see a <strong>Remote Control</strong> panel on the Control tab — font size ± buttons and a Blank/Unblank screen toggle. This lets a second person control the display without sitting at the main operator device.</p>,
      },
      {
        heading: "Reconnection",
        body: <p>If the connection drops, the app automatically reconnects and rejoins your session. An amber indicator appears while reconnecting — you don't need to do anything.</p>,
      },
    ],
    tips: [
      <>The master device is the source of truth. If someone's screen looks out of sync, they can leave and rejoin to resync.</>,
      <>Chat messages are session-scoped — they clear when everyone leaves.</>,
      <>Voice works entirely in your browser using WebRTC — no third-party service, no cost.</>,
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
    id: "teachings",
    icon: GraduationCap,
    title: "Teachings",
    to: "/teachings",
    summary: "Ready-to-use lessons for every audience and occasion — Sunday School, Youth, Mothers, Fathers, Adults, plus Happiness, Funeral, Baptism, Holy Communion, Marriage, and Healing.",
    steps: [
      {
        heading: "Pick a category",
        body: <p>Filter by audience (<strong>Sunday School</strong>, <strong>Youth</strong>, <strong>Mothers</strong>, <strong>Fathers</strong>, <strong>Adults</strong>) or by occasion / topic (<strong>Happiness</strong>, <strong>Funeral</strong>, <strong>Baptism</strong>, <strong>Holy Communion</strong>, <strong>Marriage</strong>, <strong>Healing</strong>). Each category contains lessons written specifically for that group or moment.</p>,
      },
      {
        heading: "Filter by theme or search",
        body: <p>Narrow further by theme — Faith, Prayer, Identity, Joy, Comfort, and more — or use the search box to find lessons by title, verse, or category.</p>,
      },
      {
        heading: "Use a lesson live",
        body: (
          <>
            <p>Open a lesson from the list on the left. The full lesson appears on the right with a Key Verse, numbered Teaching Points, Discussion Questions, an Activity, and a Closing Prayer.</p>
            <p className="mt-1">Each section has its own <strong>Send to screen</strong> button so you can project content step-by-step as you teach. The category and lesson title are shown on screen so the audience always knows the context.</p>
          </>
        ),
      },
      {
        heading: "Send all questions at once",
        body: <p>The Discussion Questions card has a <strong>Send All Questions to Screen</strong> button — perfect for small-group breakout time.</p>,
      },
    ],
    tips: [
      <>Lessons load instantly and work <strong>offline</strong> — no setup needed before class or service.</>,
      <>Use the <strong>Black Screen</strong> button between sections so the class can focus on you, not the projector.</>,
    ],
  },
  {
    id: "custom-teachings",
    icon: Plus,
    title: "Add Your Own Teachings",
    to: "/teachings",
    summary: "Write your own lessons by hand or have AI draft one for you, then edit and use it just like the built-in teachings.",
    steps: [
      {
        heading: "Open the Teachings page",
        body: <p>Go to <strong>Teachings</strong> in the menu. Press the <strong>Add Teaching</strong> button at the top right.</p>,
      },
      {
        heading: "Write it manually",
        body: (
          <>
            <p>Fill in the title, category, theme, key verse (reference + KJV text), summary, three or more teaching points, discussion questions, an activity, and a closing prayer. You can add or remove points and questions with the <em>+</em> / trash buttons. Press <strong>Save Teaching</strong> when done.</p>
          </>
        ),
      },
      {
        heading: "Or have AI draft it for you",
        body: (
          <>
            <p>In the same dialog, type a topic (for example <em>Patience</em>, <em>Naomi</em>, or <em>Forgiveness</em>), pick a category, and press <strong>Generate</strong>. The form fills in automatically with a complete lesson — you can still edit anything before saving.</p>
            <p className="mt-1 text-sm text-muted-foreground">Generation needs an internet connection. Reading and presenting saved teachings still works fully offline.</p>
          </>
        ),
      },
      {
        heading: "Find your custom lessons",
        body: <p>Custom lessons appear at the top of the lesson list with a small star and a yellow <strong>Custom</strong> badge. They mix in with the built-in teachings and respond to the same category, theme, and search filters.</p>,
      },
      {
        heading: "Edit or delete",
        body: <p>Open any custom lesson. <strong>Edit</strong> and <strong>Delete</strong> buttons appear next to the title — these only show up for your own teachings; built-in lessons cannot be changed.</p>,
      },
    ],
    tips: [
      <>Custom teachings are saved to <strong>this device</strong>. Use the same browser to find them again.</>,
      <>The AI draft is a starting point — always read it through and adjust before sharing with your church.</>,
    ],
  },
  {
    id: "games",
    icon: Gamepad2,
    title: "Bible Games",
    to: "/games",
    summary: "Ten offline Bible games for youth nights, fellowship meetings, family time, or as a service warm-up.",
    steps: [
      {
        heading: "Pick a game",
        body: (
          <>
            <p>Open <strong>Bible Games</strong> from the menu. You can choose from Bible Trivia, Books of the Bible, Who Said It?, Bible Charades, Verse Scramble, Bible Emoji Quiz, Bible Hangman, True or False, Bible Spell-It, and Two Truths and a Lie.</p>
          </>
        ),
      },
      {
        heading: "Show the game on the projector",
        body: (
          <>
            <p>Most games have a <strong>Show on screen</strong> button so the whole group can read the question or puzzle on the projection.</p>
          </>
        ),
      },
      {
        heading: "Restart anytime",
        body: <p>Each game has a <strong>Restart</strong> button to reshuffle.</p>,
      },
    ],
    tips: [
      <>Every game works fully <strong>offline</strong>.</>,
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
    id: "install-offline",
    icon: Download,
    title: "Install & Offline Use",
    to: "/settings",
    summary: "Install the app on your computer and run it without internet.",
    steps: [
      {
        heading: "Install as a desktop app",
        body: <p>Open <strong>Settings → Install &amp; Offline</strong> and click <strong>Install App</strong>. On Chrome and Edge you can also click the install icon in the address bar. The app then opens in its own window with a desktop icon — no browser tabs.</p>,
      },
      {
        heading: "On Mac / iPad / iPhone",
        body: <p>Safari doesn't show an install button — instead use <strong>Share → Add to Home Screen</strong> (or <strong>Add to Dock</strong> on macOS Sonoma+).</p>,
      },
      {
        heading: "Your data lives on this device",
        body: <p>Songs, sermon notes, schedule, custom teachings, themes, screen settings, and recently presented items are saved in your browser's local storage. They survive closing the app, restarting your computer, and going offline. Clearing browser data or using a different device will start you fresh.</p>,
      },
      {
        heading: "What works without internet",
        body: <p>Songs, notes, schedule, custom teachings, Bible Games, Daily Inspiration, all themes, screen control, and the broadcast window. The first time you open the app online, it caches itself for offline use automatically.</p>,
      },
      {
        heading: "What still needs internet",
        body: <p>Looking up <em>new</em> Bible verses (uses bible-api.com — verses you've already seen are cached), and the AI <strong>Generate</strong> button on the Add Teaching dialog. Everything else is fully offline.</p>,
      },
    ],
    tips: [
      <>The operator window and broadcast window stay in sync even offline — they communicate directly through the browser.</>,
    ],
  },
  {
    id: "ai-features",
    icon: Bot,
    title: "AI Features",
    to: "/ai",
    summary: "Ask a Prophet (theological Q&A), AI Chapter Summary, and Context Lens. All require your own AI provider API key.",
    steps: [
      {
        heading: "Set up your AI provider",
        body: <p>Go to <strong>Settings → AI Features</strong> and enter your API key for OpenAI, Gemini, OpenRouter, DeepSeek, or Groq. Your key is stored locally on this device only — it is never sent to anyone except your chosen AI provider.</p>,
      },
      {
        heading: "Ask a Prophet",
        body: <p>Type any theological question and get a rich, contextual answer grounded in Scripture. You can have a multi-turn conversation — the AI keeps track of what was said earlier.</p>,
      },
      {
        heading: "AI Chapter Summary (TL;DR)",
        body: <p>Enter a book name and chapter number and click <strong>Summarise</strong>. You get a 3-bullet TL;DR — great for understanding Leviticus, Numbers, Revelation, or any long chapter before a service.</p>,
      },
      {
        heading: "Send AI content to the screen",
        body: <p>After any AI response appears, click <strong>Send to screen</strong> to project it on the presentation display. Use this to share an AI-generated explanation or summary with your congregation in real time.</p>,
      },
      {
        heading: "Export AI content as PDF",
        body: <p>Click <strong>Export PDF</strong> next to any AI response to open a clean, print-ready document in a new tab. Use your browser's <em>Print</em> dialog to save as PDF or send to a printer. Great for handouts or study notes.</p>,
      },
    ],
    tips: [
      <>AI features require an active internet connection and your own API key. All other app features still work offline and without an API key.</>,
      <>AI responses are a starting point for study — always review them against Scripture before sharing with your church.</>,
    ],
  },
  {
    id: "graphic-presentations",
    icon: ImageIcon,
    title: "Send as Graphic",
    summary: "Project content with category-specific gradient backgrounds at the click of a button — no theme changes needed.",
    steps: [
      {
        heading: "Inspiration graphics",
        body: <p>On the <strong>Daily Inspiration</strong> page, each Verse of the Day and "Did You Know?" card has a plain <strong>Send to screen</strong> button and a purple <strong>Send as graphic</strong> button. The graphic version uses a beautiful, category-specific gradient.</p>,
      },
      {
        heading: "Teaching graphics",
        body: <p>On the <strong>Teachings</strong> page, the Key Verse and Closing Prayer cards each have a <strong>Send as graphic</strong> button. The gradient color matches the lesson category.</p>,
      },
      {
        heading: "Prayer Wall graphics",
        body: <p>On the <strong>Prayer Wall</strong> page, each prayer request has a <strong>Graphic</strong> button and there is a <strong>Full graphic</strong> button at the top to project all active requests together.</p>,
      },
    ],
    tips: [
      <>Graphic mode sets its own background, overriding whatever theme is currently active — only for that one send.</>,
    ],
  },
  {
    id: "auto-fit-text",
    icon: TextCursorInput,
    title: "Auto-Fit Text",
    summary: "The broadcast screen automatically shrinks text that would overflow the display area.",
    steps: [
      {
        heading: "How it works",
        body: <p>When you send a long passage, the broadcast window measures the text height after rendering. If it overflows the available space, it automatically reduces the font size proportionally so all the text fits within the screen without cutting off.</p>,
      },
      {
        heading: "Manual font size still wins",
        body: <p>Auto-fit only scales <em>down</em> — it never makes text larger than your configured font size. If text is too small after auto-fit shrinks it, reduce the amount of text or increase the <strong>Text Width</strong> percentage in Settings.</p>,
      },
    ],
    tips: [
      <>For the cleanest look, prefer to send shorter, focused passages rather than entire chapters at once.</>,
    ],
  },
  {
    id: "emoji-icons",
    icon: Smile,
    title: "Emoji Menu Icons",
    to: "/settings",
    summary: "Switch the sidebar icons to emojis for a more colourful, personal look.",
    steps: [
      {
        heading: "Enable emoji mode",
        body: <p>Go to <strong>Settings → Menu Customisation</strong> and toggle <strong>Use Emoji Icons</strong>. The sidebar icons immediately switch from Lucide icons to their default emoji equivalents — 📖 for Bible, 🎵 for Songs, 🎨 for Themes, and so on.</p>,
      },
      {
        heading: "It's per-device",
        body: <p>Emoji mode is saved locally on this device and browser. It only affects the operator interface — the projection screen is unaffected.</p>,
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
      {
        heading: "Use Live Session for team coordination",
        body: <p>Start a session before service. Use Chat for silent coordination. Give a trusted team member Operator role so they can assist with the screen. Use Voice for hands-free comms during large services.</p>,
      },
    ],
  },
];

function AdvertBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/30 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent pointer-events-none" />

      <div className="relative space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/20 border border-primary/30 shrink-0">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Phiri WorshipFlow</h2>
            <p className="text-sm text-muted-foreground mt-0.5">The complete worship presentation platform — built for churches of all sizes.</p>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: Book,           label: "17 Bible Translations",   desc: "KJV, NIV, ESV, ASV & 13 more" },
            { icon: Globe,          label: "Works Offline",            desc: "Full functionality without internet" },
            { icon: Users,          label: "Live Team Sessions",       desc: "Multi-device control with chat & voice" },
            { icon: Zap,            label: "Instant Broadcast",        desc: "Zero-delay to any connected display" },
            { icon: Bot,            label: "AI-Powered Content",       desc: "Sermons, prayers, devotionals & more" },
            { icon: SlidersHorizontal, label: "Photo Studio",          desc: "Filters, overlays, merge & BG removal" },
            { icon: GraduationCap,  label: "Ready-Made Teachings",    desc: "100+ lessons for every occasion" },
            { icon: Shield,         label: "100% Private",             desc: "All data stays on your device" },
          ].map(f => (
            <div key={f.label} className="flex items-start gap-3 p-3 rounded-xl bg-background/60 border border-border/50">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <f.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div className="flex flex-wrap gap-2">
          {[
            "10 Bible Games", "Animated Wallpapers", "Live Captions", "YouTube Player",
            "Photo Studio", "Prayer Wall", "Service Schedule", "Teleprompter",
          ].map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Star className="w-2.5 h-2.5" />{tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4 text-primary" />
            <span>Free to use · No subscriptions · No account required</span>
          </div>
          <span className="ml-auto text-xs font-semibold text-primary/80 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
            phiriworshipflow.replit.app
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HowToPage() {
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useLocalStorage<string[]>("wf-howto-open", []);

  const printPdf = useCallback(() => {
    // Clear search so all sections are in the DOM, then expand all, then print
    setSearch("");
    setOpenItems(SECTIONS.map(s => s.id));
    // Give React time to re-render fully open before the browser captures the page
    setTimeout(() => window.print(), 600);
  }, [setOpenItems]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? SECTIONS.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.steps.some(st => st.heading.toLowerCase().includes(q))
      )
    : SECTIONS;

  return (
    <div className="space-y-6 max-w-4xl print:space-y-3">
      {/* Print-only title */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Phiri WorshipFlow — How To Guide</h1>
        <p className="text-sm text-muted-foreground">Complete feature reference</p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary"><HelpCircle className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">How To</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Quick guide to every feature in Phiri WorshipFlow.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search topics…"
              className="pl-8 w-48 sm:w-64"
              data-testid="input-howto-search"
            />
          </div>
          <Button variant="outline" size="sm" onClick={printPdf} className="gap-1.5 shrink-0" title="Download as PDF">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Download PDF</span>
          </Button>
        </div>
      </div>

      {/* Quick-jump tiles */}
      {!q && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 print:hidden" data-testid="howto-quick-tiles">
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
              className="border border-border rounded-xl bg-card px-4 scroll-mt-4 print:border-0 print:rounded-none print:border-b print:border-border/30 print:px-0"
              data-testid={`section-${s.id}`}
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left flex-1">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 print:hidden"><s.icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{s.title}</h3>
                      {s.to && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-mono print:hidden">{s.to}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-normal">{s.summary}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4 pl-9 print:pl-0">
                  {s.steps.map((step, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold shrink-0 print:hidden">
                          {idx + 1}
                        </span>
                        <h4 className="font-semibold text-sm">{step.heading}</h4>
                      </div>
                      <div className="pl-7 text-sm text-muted-foreground leading-relaxed print:pl-4 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-foreground [&_strong]:text-foreground">
                        {step.body}
                      </div>
                    </div>
                  ))}

                  {s.tips && s.tips.length > 0 && (
                    <div className="pt-2 mt-3 border-t border-border space-y-2">
                      {s.tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0 print:hidden" />
                          <p className="leading-relaxed [&_strong]:text-foreground">{tip}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.to && (
                    <div className="pt-2 print:hidden">
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
      <Card className="bg-muted/30 border-dashed print:hidden">
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

      {/* Advert */}
      <div className="print:hidden">
        <AdvertBanner />
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          /* Hide app chrome */
          aside, nav, header, footer,
          [data-sidebar], [data-sidebar-wrapper],
          .live-preview, [data-sonner-toaster] { display: none !important; }
          /* Force the main content area to take full width */
          main, [data-main-content] { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          /* Force Radix accordion/collapsible content visible regardless of open/closed state */
          [data-radix-accordion-content],
          [data-radix-collapsible-content] {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            animation: none !important;
            opacity: 1 !important;
          }
          /* Ensure accordion trigger chevrons don't show */
          [data-radix-accordion-trigger] svg { display: none !important; }
          /* Page breaks between major sections */
          [data-testid^="section-"] { page-break-inside: avoid; margin-bottom: 12pt; }
        }
      `}</style>
    </div>
  );
}

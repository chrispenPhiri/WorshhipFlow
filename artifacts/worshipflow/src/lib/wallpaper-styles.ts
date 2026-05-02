export const WALLPAPER_CSS = `
/* ===== LIVE WALLPAPERS ===== */

/* -- Aurora -- */
@keyframes wf-aurora-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes wf-aurora-blob1 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(80px,-60px) scale(1.3); }
  66%      { transform: translate(-50px,80px) scale(0.8); }
}
@keyframes wf-aurora-blob2 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(-100px,60px) scale(1.2); }
  66%      { transform: translate(70px,-90px) scale(0.9); }
}
@keyframes wf-aurora-blob3 {
  0%,100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(50px,50px) scale(1.4); }
}
.wf-wallpaper-aurora {
  background: #06001a;
  overflow: hidden;
}
.wf-wallpaper-aurora::before,
.wf-wallpaper-aurora::after,
.wf-wallpaper-aurora .aurora-blob {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
}
.wf-wallpaper-aurora::before {
  width: 60%; height: 60%;
  top: -10%; left: -10%;
  background: radial-gradient(ellipse, #7c3aed 0%, #4338ca 40%, transparent 70%);
  animation: wf-aurora-blob1 14s ease-in-out infinite;
}
.wf-wallpaper-aurora::after {
  width: 50%; height: 50%;
  bottom: -10%; right: -10%;
  background: radial-gradient(ellipse, #0d9488 0%, #0891b2 40%, transparent 70%);
  animation: wf-aurora-blob2 18s ease-in-out infinite;
}

/* -- Starfield -- */
@keyframes wf-star-twinkle {
  0%,100% { opacity: 0.2; }
  50%      { opacity: 1; }
}
@keyframes wf-star-drift {
  from { transform: translateY(0px); }
  to   { transform: translateY(-20px); }
}
.wf-wallpaper-starfield {
  background: radial-gradient(ellipse at center, #0d1b3e 0%, #020510 60%, #000005 100%);
}
.wf-wallpaper-starfield .star {
  position: absolute;
  background: white;
  border-radius: 50%;
  animation: wf-star-twinkle var(--dur, 3s) ease-in-out var(--delay, 0s) infinite,
             wf-star-drift 20s ease-in-out alternate infinite;
}

/* -- Holy Fire -- */
@keyframes wf-fire-flicker {
  0%,100% { opacity: 1; transform: scaleY(1) scaleX(1); }
  25%      { opacity: 0.9; transform: scaleY(1.03) scaleX(0.98); }
  50%      { opacity: 0.95; transform: scaleY(0.97) scaleX(1.02); }
  75%      { opacity: 0.85; transform: scaleY(1.05) scaleX(0.97); }
}
@keyframes wf-fire-glow {
  0%,100% { opacity: 0.7; }
  50%      { opacity: 1; }
}
.wf-wallpaper-fire {
  background: radial-gradient(ellipse at bottom, #7c2d12 0%, #450a0a 40%, #1c0200 80%, #000 100%);
  animation: wf-fire-flicker 0.8s ease-in-out infinite;
}
.wf-wallpaper-fire::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 100%, #f97316aa 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 50% 100%, #fbbf2488 0%, transparent 60%);
  animation: wf-fire-glow 1.2s ease-in-out infinite alternate;
}

/* -- Ocean -- */
@keyframes wf-ocean-wave1 {
  0%,100% { transform: translateX(0) scaleY(1); }
  50%      { transform: translateX(-5%) scaleY(1.05); }
}
@keyframes wf-ocean-wave2 {
  0%,100% { transform: translateX(0) scaleY(1); }
  50%      { transform: translateX(5%) scaleY(0.95); }
}
.wf-wallpaper-ocean {
  background: linear-gradient(180deg, #0c1a4a 0%, #0a3d62 40%, #051428 100%);
}
.wf-wallpaper-ocean::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 120% 40% at 50% 60%, #0284c755 0%, transparent 60%),
    radial-gradient(ellipse 80% 30% at 30% 80%, #06b6d433 0%, transparent 50%);
  animation: wf-ocean-wave1 8s ease-in-out infinite;
}
.wf-wallpaper-ocean::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 100% 30% at 70% 70%, #0ea5e922 0%, transparent 55%);
  animation: wf-ocean-wave2 12s ease-in-out infinite;
}

/* -- Bokeh -- */
@keyframes wf-bokeh-rise {
  0%   { transform: translateY(0) scale(var(--s,1)); opacity: 0; }
  10%  { opacity: var(--op,0.4); }
  90%  { opacity: var(--op,0.4); }
  100% { transform: translateY(-110vh) scale(var(--s,1)); opacity: 0; }
}
.wf-wallpaper-bokeh {
  background: radial-gradient(ellipse at center, #1e1b4b 0%, #0f0a1e 100%);
}
.wf-wallpaper-bokeh .bokeh-dot {
  position: absolute;
  border-radius: 50%;
  filter: blur(12px);
  animation: wf-bokeh-rise var(--dur,12s) ease-in var(--delay,0s) infinite;
}

/* -- Matrix -- */
@keyframes wf-matrix-fall {
  from { top: -100px; opacity: 1; }
  to   { top: 110%; opacity: 0; }
}
.wf-wallpaper-matrix {
  background: #000;
}
.wf-wallpaper-matrix .matrix-col {
  position: absolute;
  top: 0;
  color: #00ff41;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.2;
  white-space: pre;
  text-shadow: 0 0 8px #00ff41;
  animation: wf-matrix-fall var(--dur, 8s) linear var(--delay, 0s) infinite;
  opacity: 0.8;
}

/* -- Sunset -- */
@keyframes wf-sunset-pulse {
  0%,100% { opacity: 1; background-position: 0% 50%; }
  50%      { opacity: 0.85; background-position: 100% 50%; }
}
.wf-wallpaper-sunset {
  background: linear-gradient(160deg, #1c0a00, #7c2d12, #92400e, #451a03, #1c0a00);
  background-size: 300% 300%;
  animation: wf-sunset-pulse 10s ease-in-out infinite;
}
.wf-wallpaper-sunset::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 50% at 50% 100%, #f97316aa 0%, transparent 60%);
  animation: wf-fire-glow 4s ease-in-out infinite alternate;
}

/* -- Storm -- */
@keyframes wf-storm-shift {
  0%   { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}
@keyframes wf-lightning {
  0%,96%,100% { opacity: 0; }
  97%          { opacity: 0.3; }
  98%          { opacity: 0; }
  99%          { opacity: 0.5; }
}
.wf-wallpaper-storm {
  background: linear-gradient(160deg, #030712, #111827, #1f2937, #111827, #030712);
  background-size: 400% 400%;
  animation: wf-storm-shift 20s ease infinite;
}
.wf-wallpaper-storm::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 60% at 50% 30%, #374151aa, transparent);
  animation: wf-storm-shift 15s ease-in-out infinite reverse;
}
.wf-wallpaper-storm::after {
  content: '';
  position: absolute;
  inset: 0;
  background: white;
  animation: wf-lightning 8s ease infinite;
  pointer-events: none;
}
`;

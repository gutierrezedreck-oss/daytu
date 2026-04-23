import React, { useState, useMemo } from "react";

// Inline logo — lets the "eyes" react to light/dark mode via .daytu-logo-eye CSS.
// SVG source still lives at src/assets/daytu-logo.svg (used for the favicon).
const DaytuLogo = ({ size = 48, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width={size} height={size} style={style} aria-label="Daytu">
    <path d="M 620 40 L 860 40 A 100 100 0 0 1 960 140 L 960 860 A 100 100 0 0 1 860 960 L 140 960 A 100 100 0 0 1 40 860 L 40 140 A 100 100 0 0 1 140 40 L 380 40"
      fill="none" stroke="#5a3fbf" strokeWidth="40" strokeLinecap="butt" />
    <path d="M 610 120 L 780 120 A 90 90 0 0 1 870 210 L 870 790 A 90 90 0 0 1 780 880 L 220 880 A 90 90 0 0 1 130 790 L 130 210 A 90 90 0 0 1 220 120 L 390 120"
      fill="none" stroke="#6b4fd0" strokeWidth="40" strokeLinecap="butt" />
    <path d="M 600 200 L 700 200 A 80 80 0 0 1 780 280 L 780 720 A 80 80 0 0 1 700 800 L 300 800 A 80 80 0 0 1 220 720 L 220 280 A 80 80 0 0 1 300 200 L 400 200"
      fill="none" stroke="#b49cf0" strokeWidth="40" strokeLinecap="butt" />
    <rect x="390" y="370" width="24" height="240" rx="12" className="daytu-logo-eye" />
    <rect x="586" y="370" width="24" height="240" rx="12" className="daytu-logo-eye" />
  </svg>
);

// ── FEATURE FLAGS ─────────────────────────────────────
// Hidden until a proper backend supports them.
// Flip to true when ready — everything comes back, no re-work.
const FEATURES = {
  groups:       false, // Groups tab, group sharing, group events
  sharing:      false, // Event visibility field, share to groups
  friends:      false, // Friend list, requests, discoverable users
  activityFeed: false, // Who did what in a group (requires multi-user)
  attendees:    false, // Event attendees (can't invite anyone without backend)
};

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const seed = {
  user: { id: "u1", name: "Alex Morgan", email: "" },
  groups: [
    { id: "g1", name: "Family", owner: "u1", color: "#f97316" },
    { id: "g2", name: "Work Team", owner: "u1", color: "#6366f1" },
    { id: "g3", name: "Roommates", owner: "u1", color: "#10b981" },
  ],
  groupMembers: [
    { groupId: "g1", userId: "u2", name: "Jordan", role: "viewer" },
    { groupId: "g1", userId: "u3", name: "Casey", role: "editor" },
    { groupId: "g2", userId: "u4", name: "Riley", role: "editor" },
    { groupId: "g2", userId: "u5", name: "Sam", role: "viewer" },
    { groupId: "g3", userId: "u6", name: "Drew", role: "viewer" },
  ],
  calendars: [
    { id: "c1", name: "Personal", color: "#6366f1" },
    { id: "c2", name: "Work", color: "#f59e0b" },
    { id: "c3", name: "Family", color: "#f97316" },
  ],
  events: (() => {
    // Seed events built relative to TODAY so they feel fresh every time.
    const y = TODAY.getFullYear(), m = TODAY.getMonth(), d = TODAY.getDate();
    const mk = (dayOffset, h, min, lenMin = 60) => ({
      start: new Date(y, m, d + dayOffset, h, min),
      end: new Date(y, m, d + dayOffset, h, min + lenMin),
    });
    const base = { allDay: false, visibility: "private", groupIds: [], reminder: "15", frequency: "none", location: "", color: null, url: "", attendees: [], pinned: false, notes: "" };
    return [
      // ── TODAY ──
      { id: "e1", title: "Morning Run", calendarId: "c1", ...base, ...mk(0, 7, 0, 45), location: "Riverside Park", notes: "5k loop", reminder: "10" },
      { id: "e2", title: "Team Standup", calendarId: "c2", ...base, ...mk(0, 9, 30, 30), location: "Conference Room B", notes: "Daily sync", frequency: "daily", visibility: "groups", groupIds: ["g2"], attendees: ["Riley", "Sam"], url: "https://meet.google.com/abc-defg-hij" },
      { id: "e3", title: "Focus block — design review", calendarId: "c2", ...base, ...mk(0, 10, 30, 90), notes: "Heads-down time" },
      { id: "e4", title: "Lunch with Jordan", calendarId: "c1", ...base, ...mk(0, 12, 30, 60), location: "Blue Bottle Cafe", attendees: ["Jordan"] },
      { id: "e5", title: "Family Dinner", calendarId: "c3", ...base, ...mk(0, 19, 0, 120), location: "Mom's house", notes: "Mom's birthday", visibility: "groups", groupIds: ["g1"], attendees: ["Jordan", "Casey"], color: "#ec4899", pinned: true, reminder: "60" },

      // ── TOMORROW ──
      { id: "e6", title: "Morning Run", calendarId: "c1", ...base, ...mk(1, 7, 0, 45), location: "Riverside Park" },
      { id: "e7", title: "Dentist appointment", calendarId: "c1", ...base, ...mk(1, 10, 0, 45), location: "Dr. Patel · 210 Oak Ave", notes: "Cleaning", reminder: "60" },
      { id: "e8", title: "Project Review", calendarId: "c2", ...base, ...mk(1, 14, 0, 90), notes: "Quarterly check-in", visibility: "groups", groupIds: ["g2"], attendees: ["Riley", "Sam", "Jordan"], url: "https://zoom.us/j/123456789" },

      // ── DAY AFTER ──
      { id: "e9", title: "1:1 with Casey", calendarId: "c2", ...base, ...mk(2, 11, 0, 30), location: "Virtual", url: "https://meet.google.com/xyz-1234" },
      { id: "e10", title: "Gym — Leg day", calendarId: "c1", ...base, ...mk(2, 17, 30, 75), location: "Equinox" },

      // ── THIS WEEKEND ──
      { id: "e11", title: "Farmers Market", calendarId: "c3", ...base, ...mk(3, 9, 0, 90), location: "Union Square", visibility: "groups", groupIds: ["g1"] },
      { id: "e12", title: "Movie night", calendarId: "c3", ...base, ...mk(3, 20, 0, 150), location: "AMC Lincoln Square", visibility: "groups", groupIds: ["g1"], attendees: ["Casey"] },

      // ── NEXT WEEK ──
      { id: "e13", title: "Client pitch — Acme Co", calendarId: "c2", ...base, ...mk(5, 10, 0, 90), location: "Acme HQ, 500 Main St", notes: "Bring printed decks", reminder: "1440", visibility: "groups", groupIds: ["g2"] },
      { id: "e14", title: "Team Offsite", calendarId: "c2", start: new Date(y, m, d + 7), end: new Date(y, m, d + 9, 23, 59), allDay: true, notes: "Retreat at Cavallo Point", visibility: "groups", groupIds: ["g2"], reminder: "1440", location: "Cavallo Point", frequency: "none", color: null, url: "", attendees: [], pinned: false },

      // ── RECURRING ──
      { id: "e15", title: "Book club", calendarId: "c1", ...base, ...mk(4, 19, 30, 90), location: "Casey's place", frequency: "weekly", visibility: "groups", groupIds: ["g1"] },
      { id: "e16", title: "Pay rent", calendarId: "c1", ...base, start: new Date(y, m, 1, 9, 0), end: new Date(y, m, 1, 9, 15), frequency: "monthly", reminder: "1440" },
    ];
  })(),
  majorEvents: (() => {
    const ymd = (dayOffset) => {
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + dayOffset);
      return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    };
    return [
      {
        id: "m1", title: "Summer Vacation", color: "#f59e0b", showCountdown: true,
        startDate: ymd(21), endDate: ymd(28), allDay: true,
        notes: "Beach trip with the family", location: "Miami, FL", url: "",
        visibility: "groups", groupIds: ["g1"],
      },
      {
        id: "m2", title: "Marathon Training", color: "#22c55e", showCountdown: true,
        startDate: ymd(-14), endDate: ymd(56), allDay: true,
        notes: "12-week program ramping to 26.2", location: "",
        url: "", visibility: "private", groupIds: [],
      },
      {
        id: "m3", title: "Casey's Wedding", color: "#ec4899", showCountdown: true,
        startDate: ymd(45), endDate: ymd(45), allDay: true,
        notes: "RSVP by month-end · dress code: formal", location: "Napa Valley",
        url: "", visibility: "groups", groupIds: ["g1"],
      },
    ];
  })(),
  friends: [
    { id: "f1", userId: "u2", name: "Jordan Lee",   handle: "@jordanlee",   avatar: "JL", mutualGroups: 1, status: "accepted" },
    { id: "f2", userId: "u3", name: "Casey Rivera", handle: "@caseyrivera", avatar: "CR", mutualGroups: 2, status: "accepted" },
    { id: "f3", userId: "d3", name: "Riley Patel",  handle: "@rileypatel",  avatar: "RP", mutualGroups: 0, status: "pending_received" },
  ],
  discoverableUsers: [
    { id: "d1", name: "Taylor Kim",   handle: "@taylorkim",   avatar: "TK" },
    { id: "d2", name: "Morgan Chen",  handle: "@morganchen",  avatar: "MC" },
    { id: "d3", name: "Riley Patel",  handle: "@rileypatel",  avatar: "RP" },
    { id: "d4", name: "Drew Santos",  handle: "@drewsantos",  avatar: "DS" },
    { id: "d5", name: "Sam Nakamura", handle: "@samnakamura", avatar: "SN" },
  ],
  shifts: [
    {
      id: "p1", name: "3 On / 2 Off", type: "rotation", color: "#6366f1", priority: 0,
      config: { sequence: [{ type: "work", days: 3 }, { type: "off", days: 2 }], startDate: TODAY.toISOString() },
    },
    {
      id: "p2", name: "Weekdays", type: "weekly", color: "#f59e0b", priority: 1,
      config: { days: [1, 2, 3, 4, 5] },
    },
    {
      id: "p3", name: "Hospital Schedule", type: "monthly", color: "#06b6d4", priority: 2,
      config: {
        months: {
          [`${TODAY.getFullYear()}-${TODAY.getMonth()}`]: [2,5,6,9,10,13,14,17,20,21,24,25,28],
        }
      },
    },
  ],
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
// User's time-format preference: undefined = locale default, true = 12-hour, false = 24-hour.
// Updated synchronously from App() during render when the setting changes so child
// renders in the same pass pick up the new value.
let _timeHour12 = undefined;
const setTimeHour12Pref = (v) => { _timeHour12 = v; };
const fmtTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: _timeHour12 });
// Format an "HH:MM" string using the same preference as fmtTime.
const fmtClock = (s) => {
  if (!s) return "";
  const [h, m] = s.split(":").map(Number);
  if (isNaN(h)) return s;
  const d = new Date(); d.setHours(h, m || 0, 0, 0);
  return fmtTime(d);
};
const fmtDate = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
const fmtDateShort = (d) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const uid = () => Math.random().toString(36).slice(2, 9);
// Unified color palette — used by every color picker in the app.
// Defined once at module level so every picker stays in sync.
const PALETTE = [
  { label:"Red",     value:"#ef4444" },
  { label:"Orange",  value:"#f97316" },
  { label:"Amber",   value:"#f59e0b" },
  { label:"Yellow",  value:"#eab308" },
  { label:"Lime",    value:"#84cc16" },
  { label:"Green",   value:"#22c55e" },
  { label:"Emerald", value:"#10b981" },
  { label:"Teal",    value:"#14b8a6" },
  { label:"Cyan",    value:"#06b6d4" },
  { label:"Sky",     value:"#0ea5e9" },
  { label:"Blue",    value:"#3b82f6" },
  { label:"Indigo",  value:"#6366f1" },
  { label:"Violet",  value:"#8b5cf6" },
  { label:"Pink",    value:"#ec4899" },
];

// 70 shades for the "custom color" popup — 14 hues × 5 rows (light/regular/deep/dark/extras)
const SHADES = [
  ["#f87171","#fb923c","#fbbf24","#facc15","#a3e635","#4ade80","#34d399","#2dd4bf","#22d3ee","#38bdf8","#60a5fa","#818cf8","#a78bfa","#f472b6"],
  ["#ef4444","#f97316","#f59e0b","#eab308","#84cc16","#22c55e","#10b981","#14b8a6","#06b6d4","#0ea5e9","#3b82f6","#6366f1","#8b5cf6","#ec4899"],
  ["#dc2626","#ea580c","#d97706","#ca8a04","#65a30d","#16a34a","#059669","#0d9488","#0891b2","#0284c7","#2563eb","#4f46e5","#7c3aed","#db2777"],
  ["#b91c1c","#c2410c","#b45309","#a16207","#4d7c0f","#15803d","#047857","#0f766e","#0e7490","#0369a1","#1d4ed8","#4338ca","#6d28d9","#be185d"],
  ["#1f2937","#374151","#4b5563","#6b7280","#9ca3af","#d1d5db","#000000","#ffffff","#1e1b4b","#581c87","#881337","#7f1d1d","#854d0e","#365314"],
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
// True if color isn't one of the 14 PALETTE values → it's a "custom" color
const isCustomColor = (c) => !!c && !PALETTE.some(p => p.value === c);

function buildCycleMap(sequence) {
  const map = [];
  for (var i = 0; i < sequence.length; i++)
    for (var j = 0; j < sequence[i].days; j++) map.push(sequence[i].type);
  return map;
}

function getRotationStatus(shift, date) {
  const { sequence, startDate } = shift.config;
  const start = new Date(startDate); start.setHours(0,0,0,0);
  const diff = Math.floor((date - start) / 86400000);
  const cycleMap = buildCycleMap(sequence);
  const pos = ((diff % cycleMap.length) + cycleMap.length) % cycleMap.length;
  return cycleMap[pos];
}

// Date key used for per-occurrence overrides: "YYYY-M-D"
const occurrenceKey = (d) => d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();

function expandEvents(events, from, to) {
  const result = [];
  // Helper: emit a single occurrence at the given start, honoring overrides.
  const emit = (ev, occStart, endOffset, idSuffix) => {
    const key = occurrenceKey(occStart);
    const ovr = ev.overrides?.[key];
    if (ovr?.skip) return;
    const baseStart = new Date(occStart);
    const baseEnd = new Date(occStart.getTime() + endOffset);
    const instanceStart = ovr?.start ? new Date(ovr.start) : baseStart;
    const instanceEnd = ovr?.end ? new Date(ovr.end) : baseEnd;
    const { skip: _s, start: _os, end: _oe, ...ovrFields } = ovr || {};
    result.push({
      ...ev,
      ...ovrFields,
      start: instanceStart,
      end: instanceEnd,
      id: ev.id + "_" + idSuffix,
      _seriesId: ev.id,
      _occurrenceKey: key,
    });
  };

  for (var i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev.frequency || ev.frequency === "none") {
      if (ev.start <= to && ev.end >= from) result.push(ev);
      continue;
    }
    const endOffset = ev.end - ev.start;

    // Specific days — emit one occurrence per tapped day, using the event's time-of-day
    if (ev.frequency === "specific") {
      const monthDays = ev.monthDays || {};
      const fromY = from.getFullYear(), fromM = from.getMonth();
      const toY = to.getFullYear(), toM = to.getMonth();
      const hh = ev.start.getHours(), mm = ev.start.getMinutes();
      let y = fromY, m = fromM, guard = 0;
      while ((y < toY || (y === toY && m <= toM)) && guard < 400) {
        guard++;
        const key = y + "-" + m;
        const days = monthDays[key] || [];
        for (var di = 0; di < days.length; di++) {
          const occStart = new Date(y, m, days[di], hh, mm, 0, 0);
          if (occStart > to || occStart < from) continue;
          emit(ev, occStart, endOffset, y + "-" + m + "-" + days[di]);
        }
        m++; if (m > 11) { m = 0; y++; }
      }
      continue;
    }

    const cursor = new Date(ev.start);
    let limit = 0;
    while (cursor <= to && limit < 400) {
      limit++;
      if (cursor >= from) emit(ev, cursor, endOffset, String(limit));
      if (ev.frequency === "daily") cursor.setDate(cursor.getDate() + 1);
      else if (ev.frequency === "weekly") cursor.setDate(cursor.getDate() + 7);
      else if (ev.frequency === "biweekly") cursor.setDate(cursor.getDate() + 14);
      else if (ev.frequency === "monthly") cursor.setMonth(cursor.getMonth() + 1);
      else break;
    }
  }
  return result;
}

function isMonthlyWorkDay(shift, date) {
  if (shift.type !== "monthly") return false;
  const key = `${date.getFullYear()}-${date.getMonth()}`;
  const days = shift.config?.months?.[key] || [];
  return days.includes(date.getDate());
}

function getBusyScore(date, events) {
  const from = new Date(date); from.setHours(0,0,0,0);
  const to = new Date(date); to.setHours(23,59,59,999);
  const dayEvs = expandEvents(events, from, to).filter(e => sameDay(e.start, date));
  let mins = 0;
  dayEvs.forEach(e => { if (!e.allDay) mins += (e.end - e.start) / 60000; else mins += 120; });
  return Math.min(1, mins / 480); // 480 min = 8 hour full day
}

function getConflicts(events) {
  const sorted = [...events].filter(e => !e.allDay).sort((a,b) => a.start - b.start);
  const conflicts = new Set();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i+1; j < sorted.length; j++) {
      if (sorted[j].start < sorted[i].end) {
        conflicts.add(sorted[i].id.split("_")[0]);
        conflicts.add(sorted[j].id.split("_")[0]);
      } else break;
    }
  }
  return conflicts;
}

function shiftTimeLabel(config) {
  const st = config?.shiftTime;
  if (!st?.enabled) return null;
  // Detect overnight (end is earlier than or equal to start)
  const [sh, sm] = st.start.split(":").map(Number);
  const [eh, em] = st.end.split(":").map(Number);
  const isOvernight = (eh * 60 + em) <= (sh * 60 + sm);
  return fmtClock(st.start) + " - " + fmtClock(st.end) + (isOvernight ? " (overnight)" : "");
}

const visibilityIcon = (v) => {
  const s = { display:"inline-flex", width:13, height:13, verticalAlign:"middle" };
  if (v === "private") return <span style={{...s, color:"#a0a0b8"}} title="Only me"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>;
  if (v === "groups") return <span style={{...s, color:"#6ee7b7"}} title="Groups"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>;
  if (v === "full_access") return <span style={{...s, color:"#93c5fd"}} title="Public"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>;
  return null;
};
const visibilityLabel = (v) => ({ private:"Only me", groups:"Groups", full_access:"Everyone", inherit:"Calendar default" }[v] || v);
const reminderLabel = (r) => ({ "0":"At event time", "10":"10 min before", "15":"15 min before", "30":"30 min before", "60":"1 hour before", "1440":"1 day before", "none":"No reminder" }[r] || "No reminder");

const Icon = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  groups: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  shifts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chevL: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>,
  chevR: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  pin2: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  repeat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  externalLink: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  mapPin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  checkSmall: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>,
  help: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-2.5 3v1.5"/><circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none"/></svg>,
  threeDays: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
  flag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
};

// ── LOCALSTORAGE HELPERS ─────────────────────────────────
const LS_KEY = "daytu_v1";
const SCHEMA_VERSION = 2;

// Migrations: each key is the FROM version; the function returns data at FROM+1.
// Register new migrations here when the stored shape changes, and bump SCHEMA_VERSION.
const migrations = {
  // v1 → v2: renamed "patterns" to "shifts"
  1: (data) => {
    const { patterns, ...rest } = data;
    return patterns !== undefined ? { ...rest, shifts: patterns } : rest;
  },
};

const lsLoad = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    let data = JSON.parse(raw);
    // Pre-versioned blobs (written before we added SCHEMA_VERSION) are treated as v1
    let v = typeof data?.version === "number" ? data.version : 1;
    while (v < SCHEMA_VERSION && migrations[v]) {
      data = migrations[v](data);
      v += 1;
    }
    return data;
  } catch { return null; }
};

const lsSave = (data) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ version: SCHEMA_VERSION, ...data })); } catch {}
};

// Revive Date objects after JSON parse
const reviveEvents = (evs) => evs.map(e => ({
  ...e,
  start: new Date(e.start),
  end:   new Date(e.end),
}));

const reviveFeed = (feed) => feed.map(f => ({
  ...f,
  ts:        new Date(f.ts),
  eventDate: f.eventDate ? new Date(f.eventDate) : null,
}));

// ── MAP PROVIDER ─────────────────────────────────────────
// We can't detect which map apps are installed from a browser, so we stick
// to providers that work universally: Apple Maps (pre-installed on iOS/macOS)
// and Google Maps (web or app on every platform). "Auto" picks a platform
// default; users can override in Settings.
// On iOS the `maps://` custom scheme launches the Apple Maps app directly —
// `https://maps.apple.com/` is a universal link but can resolve to the web
// view when triggered via window.open inside a SPA, which isn't what we want.
const isIOS = () => typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
const MAP_PROVIDERS = {
  apple:  (q) => (isIOS() ? "maps://?q=" : "https://maps.apple.com/?q=") + encodeURIComponent(q),
  google: (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
};
const resolveMapProvider = (pref) => {
  if (pref && MAP_PROVIDERS[pref]) return pref;
  return isIOS() ? "apple" : "google";
};
const mapUrl = (query, pref) => MAP_PROVIDERS[resolveMapProvider(pref)](query);

// ── HOLIDAY CALCULATOR ───────────────────────────────────
// Returns { month (1-12), day } for a given year
// Types: fixed | nthWeekday | lastWeekday | easter
// ── iCal (.ics) export ─────────────────────────────────
// Formats events + major events as an RFC-5545 iCalendar string.
// RRULE support is kept simple — daily/weekly/monthly/yearly with no complex expansions.
function buildICS({ events = [], majorEvents = [], calendarName = "My Calendar" }) {
  const pad = (n) => String(n).padStart(2, "0");
  // iCal UTC stamp: YYYYMMDDTHHMMSSZ
  const fmtUTC = (d) => {
    const dt = new Date(d);
    return dt.getUTCFullYear() + pad(dt.getUTCMonth()+1) + pad(dt.getUTCDate())
      + "T" + pad(dt.getUTCHours()) + pad(dt.getUTCMinutes()) + pad(dt.getUTCSeconds()) + "Z";
  };
  // iCal DATE-only (all-day): YYYYMMDD
  const fmtDate = (d) => {
    const dt = new Date(d);
    return dt.getFullYear() + pad(dt.getMonth()+1) + pad(dt.getDate());
  };
  // Escape commas, semicolons, backslashes, newlines per spec
  const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  const stamp = fmtUTC(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Daytu//Daytu//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + esc(calendarName),
  ];
  // Regular events
  events.forEach((ev) => {
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + ev.id + "@daytu.app");
    lines.push("DTSTAMP:" + stamp);
    if (ev.allDay) {
      const endDate = new Date(ev.end); endDate.setDate(endDate.getDate()+1); // DTEND is exclusive
      lines.push("DTSTART;VALUE=DATE:" + fmtDate(ev.start));
      lines.push("DTEND;VALUE=DATE:" + fmtDate(endDate));
    } else {
      lines.push("DTSTART:" + fmtUTC(ev.start));
      lines.push("DTEND:" + fmtUTC(ev.end));
    }
    lines.push("SUMMARY:" + esc(ev.title));
    if (ev.notes) lines.push("DESCRIPTION:" + esc(ev.notes));
    if (ev.location) lines.push("LOCATION:" + esc(ev.location));
    if (ev.url) lines.push("URL:" + esc(ev.url));
    // Recurrence
    if (ev.frequency && ev.frequency !== "none") {
      const freqMap = { daily:"DAILY", weekly:"WEEKLY", monthly:"MONTHLY", yearly:"YEARLY" };
      const f = freqMap[ev.frequency];
      if (f) lines.push("RRULE:FREQ=" + f);
    }
    lines.push("END:VEVENT");
  });
  // Major events as multi-day VEVENTs
  majorEvents.forEach((me) => {
    const [sy,sm,sd] = me.startDate.slice(0,10).split("-").map(Number);
    const [ey,em,ed] = me.endDate.slice(0,10).split("-").map(Number);
    const start = new Date(sy, sm-1, sd);
    const end = new Date(ey, em-1, ed);
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + me.id + "@daytu.app");
    lines.push("DTSTAMP:" + stamp);
    if (me.allDay !== false) {
      const endPlus = new Date(end); endPlus.setDate(endPlus.getDate()+1);
      lines.push("DTSTART;VALUE=DATE:" + fmtDate(start));
      lines.push("DTEND;VALUE=DATE:" + fmtDate(endPlus));
    } else {
      const [shh, smm] = (me.startTime || "09:00").split(":").map(Number);
      const [ehh, emm] = (me.endTime   || "17:00").split(":").map(Number);
      const s = new Date(start); s.setHours(shh, smm, 0, 0);
      const e = new Date(end);   e.setHours(ehh, emm, 0, 0);
      lines.push("DTSTART:" + fmtUTC(s));
      lines.push("DTEND:" + fmtUTC(e));
    }
    lines.push("SUMMARY:" + esc(me.title));
    if (me.notes) lines.push("DESCRIPTION:" + esc(me.notes));
    if (me.location) lines.push("LOCATION:" + esc(me.location));
    if (me.url) lines.push("URL:" + esc(me.url));
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  // iCal requires CRLF line endings
  return lines.join("\r\n");
}

// Trigger a browser download of an .ics file
function downloadICS(filename, text) {
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

// Share-first export: on iOS/Android, opens native share sheet (→ Calendar app → one tap).
// Falls back to traditional download on desktop or older devices.
// Returns a tag indicating what actually happened, so the UI can show the right toast.
async function shareOrDownloadICS(filename, text) {
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  // Web Share API with files is supported on iOS Safari + Chrome Android (2020+)
  try {
    if (typeof navigator !== "undefined" && navigator.canShare) {
      const file = new File([blob], filename, { type: "text/calendar" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Daytu calendar",
          text: "My calendar events",
        });
        return "shared";
      }
    }
  } catch (err) {
    // AbortError = user canceled share sheet; treat as neutral, don't fall through to download
    if (err && err.name === "AbortError") return "canceled";
    // Any other error → fall through to download as a fallback
  }
  // Fallback: traditional download (desktop browsers, older devices)
  downloadICS(filename, text);
  return "downloaded";
}

function computeHolidays(year) {
  // Helper: nth weekday of a month (e.g. 2nd Monday of January)
  // weekday: 0=Sun..6=Sat, n: 1-based
  const nthWeekday = (y, m, weekday, n) => {
    const first = new Date(y, m-1, 1).getDay();
    const offset = (weekday - first + 7) % 7;
    return offset + 1 + (n-1)*7;
  };
  // Helper: last weekday of a month
  const lastWeekday = (y, m, weekday) => {
    const last = new Date(y, m, 0);
    const diff = (last.getDay() - weekday + 7) % 7;
    return last.getDate() - diff;
  };
  // Easter (Gregorian, Anonymous algorithm)
  const easter = (y) => {
    const a=y%19, b=Math.floor(y/100), c=y%100;
    const d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25);
    const g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
    const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
    const m2=Math.floor((a+11*h+22*l)/451);
    const month=Math.floor((h+l-7*m2+114)/31);
    const day=((h+l-7*m2+114)%31)+1;
    return { month, day };
  };

  // Shift an anchor (month, day) by delta days using real Date arithmetic,
  // so Easter-relative holidays cross month boundaries correctly
  // (e.g. Easter = Apr 1 → Good Friday = Mar 30, not Apr 30).
  const shiftDate = (y, month, day, delta) => {
    const d = new Date(y, month-1, day);
    d.setDate(d.getDate() + delta);
    return { month: d.getMonth()+1, day: d.getDate() };
  };

  const e = easter(year);
  const gf = shiftDate(year, e.month, e.day, -2);  // Good Friday
  const em = shiftDate(year, e.month, e.day, +1);  // Easter Monday
  return [
    // ── US ────────────────────────────────────────────────
    { id:"hol_ny",    name:"New Year's Day",      color:"#f59e0b", country:"US",     month:1,  day:1 },
    { id:"hol_mlk",   name:"MLK Day",              color:"#f59e0b", country:"US",     month:1,  day:nthWeekday(year,1,1,3) },
    { id:"hol_pres",  name:"Presidents' Day",     color:"#f59e0b", country:"US",     month:2,  day:nthWeekday(year,2,1,3) },
    { id:"hol_usgf",  name:"Good Friday",          color:"#a78bfa", country:"US",     month:gf.month, day:gf.day },
    { id:"hol_mem",   name:"Memorial Day",         color:"#f59e0b", country:"US",     month:5,  day:lastWeekday(year,5,1) },
    { id:"hol_mom",   name:"Mother's Day",        color:"#ec4899", country:"US",     month:5,  day:nthWeekday(year,5,0,2) },
    { id:"hol_jun",   name:"Juneteenth",           color:"#f59e0b", country:"US",     month:6,  day:19 },
    { id:"hol_dad",   name:"Father's Day",        color:"#3b82f6", country:"US",     month:6,  day:nthWeekday(year,6,0,3) },
    { id:"hol_ind",   name:"Independence Day",     color:"#f59e0b", country:"US",     month:7,  day:4 },
    { id:"hol_lab",   name:"Labor Day",            color:"#f59e0b", country:"US",     month:9,  day:nthWeekday(year,9,1,1) },
    { id:"hol_col",   name:"Columbus Day",         color:"#f59e0b", country:"US",     month:10, day:nthWeekday(year,10,1,2) },
    { id:"hol_vet",   name:"Veterans Day",         color:"#f59e0b", country:"US",     month:11, day:11 },
    { id:"hol_thx",   name:"Thanksgiving",         color:"#f59e0b", country:"US",     month:11, day:nthWeekday(year,11,4,4) },
    { id:"hol_xmas",  name:"Christmas",            color:"#f59e0b", country:"US",     month:12, day:25 },
    // ── GLOBAL ───────────────────────────────────────────
    { id:"hol_gny",   name:"New Year's Day",      color:"#f59e0b", country:"GLOBAL", month:1,  day:1 },
    { id:"hol_val",   name:"Valentine's Day",     color:"#ec4899", country:"GLOBAL", month:2,  day:14 },
    { id:"hol_iwd",   name:"International Women's Day", color:"#ec4899", country:"GLOBAL", month:3,  day:8 },
    { id:"hol_stp",   name:"St. Patrick's Day",   color:"#10b981", country:"GLOBAL", month:3,  day:17 },
    { id:"hol_apr",   name:"April Fools' Day",    color:"#f97316", country:"GLOBAL", month:4,  day:1 },
    { id:"hol_easter",name:"Easter Sunday",        color:"#a78bfa", country:"GLOBAL", month:e.month, day:e.day },
    { id:"hol_earth", name:"Earth Day",            color:"#10b981", country:"GLOBAL", month:4,  day:22 },
    { id:"hol_hal",   name:"Halloween",            color:"#f97316", country:"GLOBAL", month:10, day:31 },
    { id:"hol_xeve",  name:"Christmas Eve",        color:"#f59e0b", country:"GLOBAL", month:12, day:24 },
    { id:"hol_ny2",   name:"New Year's Eve",      color:"#f59e0b", country:"GLOBAL", month:12, day:31 },
    // ── CA ────────────────────────────────────────────────
    { id:"hol_cny",   name:"New Year's Day",      color:"#ef4444", country:"CA",     month:1,  day:1 },
    { id:"hol_cfam",  name:"Family Day",           color:"#ef4444", country:"CA",     month:2,  day:nthWeekday(year,2,1,3) },
    { id:"hol_cgf",   name:"Good Friday",          color:"#a78bfa", country:"CA",     month:gf.month, day:gf.day },
    { id:"hol_cem",   name:"Easter Monday",        color:"#a78bfa", country:"CA",     month:em.month, day:em.day },
    { id:"hol_vic",   name:"Victoria Day",         color:"#ef4444", country:"CA",     month:5,  day:lastWeekday(year,5,1)-7 },
    { id:"hol_can",   name:"Canada Day",           color:"#ef4444", country:"CA",     month:7,  day:1 },
    { id:"hol_clab",  name:"Labour Day",           color:"#ef4444", country:"CA",     month:9,  day:nthWeekday(year,9,1,1) },
    { id:"hol_cthx",  name:"Thanksgiving (CA)",    color:"#f59e0b", country:"CA",     month:10, day:nthWeekday(year,10,1,2) },
    { id:"hol_crem",  name:"Remembrance Day",      color:"#ef4444", country:"CA",     month:11, day:11 },
    { id:"hol_cxm",   name:"Christmas Day",        color:"#ef4444", country:"CA",     month:12, day:25 },
    { id:"hol_box",   name:"Boxing Day",           color:"#f59e0b", country:"CA",     month:12, day:26 },
    // ── UK ────────────────────────────────────────────────
    { id:"hol_ukny",  name:"New Year's Day",      color:"#3b82f6", country:"UK",     month:1,  day:1 },
    { id:"hol_ukeg",  name:"Good Friday",          color:"#a78bfa", country:"UK",     month:gf.month, day:gf.day },
    { id:"hol_ukem",  name:"Easter Monday",        color:"#a78bfa", country:"UK",     month:em.month, day:em.day },
    { id:"hol_ukbh",  name:"Early May Bank Hol",   color:"#3b82f6", country:"UK",     month:5,  day:nthWeekday(year,5,1,1) },
    { id:"hol_ukbs",  name:"Spring Bank Holiday",  color:"#3b82f6", country:"UK",     month:5,  day:lastWeekday(year,5,1) },
    { id:"hol_ukba",  name:"Summer Bank Holiday",  color:"#3b82f6", country:"UK",     month:8,  day:lastWeekday(year,8,1) },
    { id:"hol_ukxm",  name:"Christmas Day",        color:"#3b82f6", country:"UK",     month:12, day:25 },
    { id:"hol_ukbx",  name:"Boxing Day",           color:"#3b82f6", country:"UK",     month:12, day:26 },
    // ── AU ────────────────────────────────────────────────
    { id:"hol_auny",  name:"New Year's Day",      color:"#10b981", country:"AU",     month:1,  day:1 },
    { id:"hol_auday", name:"Australia Day",        color:"#10b981", country:"AU",     month:1,  day:26 },
    { id:"hol_augf",  name:"Good Friday",          color:"#a78bfa", country:"AU",     month:gf.month, day:gf.day },
    { id:"hol_auem",  name:"Easter Monday",        color:"#a78bfa", country:"AU",     month:em.month, day:em.day },
    { id:"hol_auanz", name:"ANZAC Day",            color:"#10b981", country:"AU",     month:4,  day:25 },
    { id:"hol_aukb",  name:"King's Birthday",      color:"#10b981", country:"AU",     month:6,  day:nthWeekday(year,6,1,2) },
    { id:"hol_auxm",  name:"Christmas Day",        color:"#10b981", country:"AU",     month:12, day:25 },
    { id:"hol_aubx",  name:"Boxing Day",           color:"#10b981", country:"AU",     month:12, day:26 },
  ].map(h => ({ ...h, year }));
}

export default function App() {
  const [tab, setTab] = useState("home");
  // Load persisted data once — fallback to seed data
  const _ls = React.useMemo(() => lsLoad(), []);
  // Close fab menu on tab switch — handled inline in nav buttons
  const [events, setEvents] = useState(() => _ls?.events ? reviveEvents(_ls.events) : seed.events);
  const [calendars, setCalendars] = useState(() => _ls?.calendars ?? seed.calendars);
  const [groups, setGroups] = useState(() => _ls?.groups ?? seed.groups);
  const [groupMembers, setGroupMembers] = useState(() => _ls?.groupMembers ?? seed.groupMembers);
  const [shifts, setShifts] = useState(() => _ls?.shifts ?? seed.shifts);
  const [sheet, setSheet] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeMajorEvent, setActiveMajorEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date(TODAY));
  const [calMonth, setCalMonth] = useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  const [calView, setCalView] = useState("month"); // "month" | "week" | "day"
  // Week view layout — "columns" shows the whole week at once (default),
  // "grid" shows a 24-hour scrollable grid for precise time inspection.
  const [weekLayout, setWeekLayout] = useState(() => _ls?.weekLayout ?? "columns");
  const [weekAnchor, setWeekAnchor] = useState(() => { const d = new Date(TODAY); d.setDate(d.getDate() - d.getDay()); return d; });
  const [calShiftFilter, setCalShiftFilter] = useState(null);
  const [shiftOverrides, setShiftOverrides] = useState(new Set());
  // Per-date time overrides for individual shifts, e.g. "half day this Thursday".
  // Keyed by `${shiftId}:${y}-${m}-${d}`, value `{ start: "HH:MM", end: "HH:MM" }`.
  const [shiftTimeOverrides, setShiftTimeOverrides] = useState(() => _ls?.shiftTimeOverrides ?? {});
  // UI state for the inline time editor inside dayPopup.
  const [editingShiftTime, setEditingShiftTime] = useState(null); // { shiftId, start, end } | null
  // Tracks which day's "different schedule today" home banner the user has dismissed.
  // Stored as a YMD string so the banner auto-returns when a new day begins.
  const [shiftNoticeDismissed, setShiftNoticeDismissed] = useState(() => _ls?.shiftNoticeDismissed ?? null);
  const [majorEvents, setMajorEvents] = useState(() => _ls?.majorEvents ?? seed.majorEvents);
  const [friends, setFriends] = useState(() => _ls?.friends ?? seed.friends);
  const [friendSearch, setFriendSearch] = useState("");
  const [groupsSubTab, setGroupsSubTab] = useState("groups");
  const [feedSeenAt, setFeedSeenAt] = useState(() => _ls?.feedSeenAt ? new Date(_ls.feedSeenAt) : new Date(0));
  const [activityFeed, setActivityFeed] = useState(() => _ls?.activityFeed
    ? reviveFeed(_ls.activityFeed)
    : [
        { id:"a1", groupId:"g1", userId:"u2", userName:"Jordan", action:"added",   eventTitle:"Mom's Birthday Dinner", eventDate: new Date(Date.now()+3*24*60*60*1000), ts: new Date(Date.now()-2*60*60*1000) },
        { id:"a2", groupId:"g2", userId:"u4", userName:"Riley",  action:"updated", eventTitle:"Team Standup",          eventDate: new Date(Date.now()+1*24*60*60*1000), ts: new Date(Date.now()-5*60*60*1000) },
        { id:"a3", groupId:"g1", userId:"u3", userName:"Casey",  action:"added",   eventTitle:"Family Game Night",     eventDate: new Date(Date.now()+7*24*60*60*1000), ts: new Date(Date.now()-24*60*60*1000) },
        { id:"a4", groupId:"g2", userId:"u5", userName:"Sam",    action:"deleted", eventTitle:"Sprint Planning",       eventDate: new Date(Date.now()+2*24*60*60*1000), ts: new Date(Date.now()-2*24*60*60*1000) },
      ]);

  const addActivity = (groupId, action, eventTitle, eventDate) => {
    setActivityFeed(prev => [{
      id: "a"+uid(), groupId, userId:"u1", userName:"You", action, eventTitle, eventDate: eventDate||null, ts: new Date()
    }, ...prev.slice(0,49)]);
  };
  const [fabVisible, setFabVisible] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);

  const [freeTimeQuery, setFreeTimeQuery] = useState("");
  const [themeMode, setThemeMode] = useState(() => _ls?.themeMode ?? "auto");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = _ls?.themeMode ?? "auto";
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  // Accessibility: text size scale (1.0 = default, up to 1.5 = XL)
  const [textSize, setTextSize] = useState(() => _ls?.textSize ?? 1.0);
  // Accessibility: high-contrast mode — brightens muted text & strengthens borders
  const [highContrast, setHighContrast] = useState(() => _ls?.highContrast ?? false);
  // Preferred map provider for opening locations (auto | apple | google | waze)
  const [mapProvider, setMapProvider] = useState(() => _ls?.mapProvider ?? "auto");
  // Clock format preference (auto | 12 | 24). Applied synchronously below so
  // children render with the right format in the same pass.
  const [timeFormat, setTimeFormat] = useState(() => _ls?.timeFormat ?? "auto");
  if (timeFormat === "12") setTimeHour12Pref(true);
  else if (timeFormat === "24") setTimeHour12Pref(false);
  else setTimeHour12Pref(undefined);
  // View mode: "auto" (width-based) | "mobile" (force phone layout) | "desktop" (force sidebar layout)
  const [viewMode, setViewMode] = useState(() => _ls?.viewMode ?? "auto");
  // Live-preview state for real-time calendar reactions in split mode
  // Set by form sheets while in-progress, cleared on close/save
  const [previewEvent, setPreviewEvent] = useState(null);      // { date: Date, color: "#xx", title: string } | null
  const [previewShift, setPreviewShift] = useState(null);  // { type, color, weekDays, sequence, cycleStart } | null
  const [previewMajor, setPreviewMajor] = useState(null);      // { startDate, endDate, color, title } | null
  // Current viewport width (updates on resize). Used to auto-detect desktop.
  const [viewportWidth, setViewportWidth] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1000);
  React.useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // Resolved layout: honor user's explicit choice, else auto-detect based on width.
  // viewMode values:
  //   "mobile"  — always the phone layout
  //   "compact" — desktop sidebar, no persistent calendar panel (the "in-between")
  //   "desktop" — full split layout (sidebar + content + calendar panel)
  //   "auto"    — pick based on viewport
  const isDesktop =
    viewMode === "desktop" || viewMode === "compact" ||
    (viewMode === "auto" && viewportWidth >= 900);
  // Split is only picked when explicitly chosen, or auto + viewport ≥ 1100px.
  // "compact" stays non-split regardless of viewport.
  const isSplit =
    viewMode === "desktop" ? true
    : viewMode === "compact" ? false
    : (isDesktop && viewportWidth >= 1100);
  // In split mode, the Calendar tab is redundant (calendar is always visible). Redirect to Home.
  React.useEffect(() => {
    if (isSplit && tab === "calendar") setTab("home");
  }, [isSplit, tab]);
  // In split mode, keep calMonth in sync when the user picks a date from another month.
  // One-way: selectedDate → calMonth. Don't depend on calMonth, or prev/next buttons
  // will loop-reset back to selectedDate's month.
  React.useEffect(() => {
    if (!isSplit) return;
    setCalMonth(m => {
      if (selectedDate.getFullYear() === m.year && selectedDate.getMonth() === m.month) return m;
      return { year: selectedDate.getFullYear(), month: selectedDate.getMonth() };
    });
  }, [isSplit, selectedDate]);

  // Apply text size scale by setting html root font-size (all rem units scale with this)
  React.useEffect(() => {
    document.documentElement.style.fontSize = (16 * textSize) + "px";
  }, [textSize]);

  const [notifPermission, setNotifPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const notifTimers = React.useRef({});
  const shiftNotifTimers = React.useRef({});

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  // Schedule/cancel notifications whenever events change
  React.useEffect(() => {
    if (notifPermission !== "granted") return;
    const timers = notifTimers.current;
    // Clear old timers
    Object.values(timers).forEach(clearTimeout);
    notifTimers.current = {};
    const now = Date.now();
    // Expand recurring events so each occurrence gets its own notification
    const windowStart = new Date(now);
    const windowEnd   = new Date(now + 7 * 24 * 60 * 60 * 1000);
    const occurrences = expandEvents(events, windowStart, windowEnd);
    occurrences.forEach(ev => {
      if (!ev.reminder || ev.reminder === "none" || ev.allDay) return;
      const mins = Number(ev.reminder);
      const fireAt = ev.start.getTime() - mins * 60 * 1000;
      const delay = fireAt - now;
      if (delay < 0 || delay > 7 * 24 * 60 * 60 * 1000) return; // only schedule up to 7 days ahead
      timers[ev.id] = setTimeout(() => {
        new Notification(ev.title, {
          body: mins > 0 ? `Starting in ${mins >= 60 ? (mins/60)+"hr" : mins+"min"}` : "Starting now",
          icon: "/favicon.ico",
          tag: ev.id,
        });
      }, delay);
    });
    return () => Object.values(notifTimers.current).forEach(clearTimeout);
  }, [events, notifPermission]);

  // Schedule a one-off notification at the start of a shift that has a time
  // override for today, so the user gets a heads-up of the adjusted hours.
  React.useEffect(() => {
    if (notifPermission !== "granted") return;
    Object.values(shiftNotifTimers.current).forEach(clearTimeout);
    shiftNotifTimers.current = {};
    const today = new Date();
    const ymdKey = today.getFullYear()+"-"+today.getMonth()+"-"+today.getDate();
    shifts.forEach(p => {
      const key = p.id+":"+ymdKey;
      if (!shiftTimeOverrides[key]) return;
      const isNatural = p.type === "rotation" ? getRotationStatus(p, today) === "work"
        : p.type === "monthly" ? isMonthlyWorkDay(p, today)
        : (p.config?.days ?? []).includes(today.getDay());
      const isHidden = shiftOverrides.has(key);
      const isExtra = shiftOverrides.has("extra:" + key);
      const isWorkToday = (isNatural && !isHidden) || (!isNatural && isExtra);
      if (!isWorkToday) return;
      const eff = shiftTimeOverrides[key];
      const [sh, sm] = eff.start.split(":").map(Number);
      const fireAt = new Date(today); fireAt.setHours(sh, sm, 0, 0);
      const delay = fireAt.getTime() - Date.now();
      if (delay < 0) return;
      shiftNotifTimers.current[p.id] = setTimeout(() => {
        new Notification(p.name + " starts now", {
          body: `Today's shift: ${fmtClock(eff.start)} – ${fmtClock(eff.end)}. You're off at ${fmtClock(eff.end)}.`,
          icon: "/favicon.ico",
          tag: "shift-override-"+p.id+"-"+ymdKey,
        });
      }, delay);
    });
    return () => Object.values(shiftNotifTimers.current).forEach(clearTimeout);
  }, [shifts, shiftOverrides, shiftTimeOverrides, notifPermission]);

  // Keep darkMode in sync with themeMode on every change:
  //   "dark"  → always dark
  //   "light" → always light
  //   "auto"  → follow system, live-updated via matchMedia
  React.useEffect(() => {
    if (themeMode === "dark") { setDarkMode(true); return; }
    if (themeMode === "light") { setDarkMode(false); return; }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDarkMode(mq.matches);
    const handler = (e) => setDarkMode(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeMode]);
  const [homeOrder, setHomeOrder] = useState(() => {
    const stored = (_ls?.homeOrder ?? ["shiftstatus","status","pinned","nextup","major","freetime"]).filter(k => k !== "today");
    return stored.includes("shiftstatus") ? stored : ["shiftstatus", ...stored];
  });
  const [dayPopup, setDayPopup] = useState(null);
  // Home page: collapse the major-events stack when there are more than a couple
  const [majorExpanded, setMajorExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Recent searches: last 5 non-trivial queries (persisted to localStorage)
  const [recentSearches, setRecentSearches] = useState(() => _ls?.recentSearches ?? []);
  // Push a query into recents: dedupes, moves to front, caps at 5, ignores short/empty
  const rememberSearch = React.useCallback((q) => {
    const trimmed = (q || "").trim();
    if (trimmed.length < 2) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(p => p.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, 5);
    });
  }, []);
  const [showSearch, setShowSearch] = useState(false);
  const [nowClock, setNowClock] = React.useState(new Date());
  const [hiddenCalendars, setHiddenCalendars] = useState(() => new Set(_ls?.hiddenCalendars ?? []));
  const [hiddenGroups, setHiddenGroups] = useState(() => new Set(_ls?.hiddenGroups ?? []));
  // Compute holidays for a ±1 year window so Dec/Jan edges work correctly
  const holidays = useMemo(() => [
    ...computeHolidays(TODAY.getFullYear() - 1),
    ...computeHolidays(TODAY.getFullYear()),
    ...computeHolidays(TODAY.getFullYear() + 1),
  ], []);
  const [holidayCountries, setHolidayCountries] = useState(() => new Set(_ls?.holidayCountries ?? ["US","GLOBAL"]));
  const [findTimeGroup, setFindTimeGroup] = useState(null); // groupId or null
  const [pinnedEvents, setPinnedEvents] = useState(() => new Set(_ls?.pinnedEvents ?? seed.events.filter(e=>e.pinned).map(e=>e.id)));
  const [dayNotes, setDayNotes] = useState(() => _ls?.dayNotes ?? {});
  const [editingNoteKey, setEditingNoteKey] = useState(null);
  const [hiddenDayExpanded, setHiddenDayExpanded] = useState(false);
  // Extract original event ID (strip recurring "_N" suffix)
  const baseEventId = (id) => id ? id.split("_")[0] : id;
  const togglePin = (id) => {
    const base = baseEventId(id);
    setPinnedEvents(prev => { const n=new Set(prev); n.has(base)?n.delete(base):n.add(base); return n; });
  };
  const [userProfile, setUserProfile] = useState(() => {
    const loaded = _ls?.userProfile ?? { name: "Alex Morgan", email: "", handle: "", defaultCalendar: "c1", defaultReminder: "15", avatar: null };
    // Ensure badges sub-object exists for users with older localStorage
    if (!loaded.badges) loaded.badges = { friendRequests: true, feed: true, todayEvents: true };
    return loaded;
  });
  // Onboarding: true the very first time the app runs. Once finished it's stored as false permanently.
  const [onboardingActive, setOnboardingActive] = useState(() => _ls?.onboardingComplete !== true);
  // Timestamp of when onboarding finished — used to fade the home ? icon after 7 days
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState(() => _ls?.onboardingCompletedAt ?? null);
  // Is the on-demand tour modal currently open
  const [tourOpen, setTourOpen] = useState(false);
  // Custom color memory — picked colors outside the 14-swatch palette
  const [customColorRecents, setCustomColorRecents] = useState(() => _ls?.customColorRecents ?? []);
  const [customColorFavorites, setCustomColorFavorites] = useState(() => _ls?.customColorFavorites ?? []);
  // Toast system — fire-and-forget user feedback for save/delete/etc
  const [toast, setToast] = useState(null);
  const toastTimerRef = React.useRef(null);
  const showToast = (msg, tone = "ok") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, tone, id: Date.now() });
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  };
  // Refs for tour targets — the CoachmarkTour component reads these to spotlight real elements
  const tourRefs = React.useRef({});
  const setTourRef = (name) => (el) => { if (el) tourRefs.current[name] = el; };
  // Is the first-time hint card still showing (dismissed on "Got it")
  // Show ? icon on home for 7 days after onboarding
  const showHomeHelp = onboardingCompletedAt && (Date.now() - onboardingCompletedAt) < 7 * 86400000;
  // Per-placeholder dismissal. Each home empty-state card is dismissible and
  // its dismissal is remembered independently so adding a major event doesn't
  // silently hide the "your events will appear here" hint, etc.
  const [dismissedPlaceholders, setDismissedPlaceholders] = useState(() => new Set(_ls?.dismissedPlaceholders ?? []));
  const dismissPlaceholder = (id) => setDismissedPlaceholders(prev => { const next = new Set(prev); next.add(id); return next; });
  const canShowPlaceholder = (id) => showHomeHelp && !dismissedPlaceholders.has(id);
  const toggleCalendarVisibility = (id) => setHiddenCalendars(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  React.useEffect(() => {
    const t = setInterval(() => setNowClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const now = nowClock;

  const overrideKey = (shiftId, date) => shiftId + ":" + date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
  const toggleShiftOverride = (shiftId, date) => {
    const key = overrideKey(shiftId, date);
    setShiftOverrides(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };
  const isOverridden = (shiftId, date) => shiftOverrides.has(overrideKey(shiftId, date));
  // Returns the effective shiftTime (override beats base config) for a given date.
  const getEffectiveShiftTime = (shift, date) => {
    const ov = shiftTimeOverrides[overrideKey(shift.id, date)];
    if (ov) return { enabled: true, start: ov.start, end: ov.end };
    return shift.config?.shiftTime || null;
  };
  const setShiftTimeForDate = (shiftId, date, start, end) => {
    setShiftTimeOverrides(prev => ({ ...prev, [overrideKey(shiftId, date)]: { start, end } }));
  };
  const clearShiftTimeForDate = (shiftId, date) => {
    setShiftTimeOverrides(prev => {
      const next = { ...prev };
      delete next[overrideKey(shiftId, date)];
      return next;
    });
  };
  const hasShiftTimeOverride = (shiftId, date) => !!shiftTimeOverrides[overrideKey(shiftId, date)];

  const closeSheet = () => { setSheet(null); setActiveEvent(null); setActiveShift(null); setActiveGroup(null); setActiveMajorEvent(null); setPreviewEvent(null); setPreviewShift(null); setPreviewMajor(null); };
  const openEvent = (ev) => { setActiveEvent(ev); setSheet("eventDetail"); };
  const openEditEvent = (ev) => { setActiveEvent(ev); setSheet("editEvent"); };
  const openNewEvent = () => setSheet("newEvent");
  // Double-tap/click on a calendar cell opens a small chooser — event vs major event
  const openAddChooser = (date) => { setSelectedDate(date); setSheet("addChooser"); };
  const openEditGroup = (g) => { setActiveGroup(g); setSheet("editGroup"); };
  const openEditShift = (p) => { setActiveShift(p); setSheet("editShift"); };
  const addCalendar    = (cal) => { setCalendars(prev => [...prev, { ...cal, id: "c" + uid() }]); closeSheet(); showToast("Calendar created"); };
  const updateCalendar = (cal) => { setCalendars(prev => prev.map(c => c.id === cal.id ? cal : c)); closeSheet(); showToast("Calendar updated"); };
  const deleteCalendar = (id) => {
    // Move events to first remaining calendar
    const fallback = calendars.find(c => c.id !== id)?.id;
    if (fallback) setEvents(prev => prev.map(e => e.calendarId === id ? { ...e, calendarId: fallback } : e));
    setCalendars(prev => prev.filter(c => c.id !== id));
    closeSheet();
  };
  const [activeCalendar, setActiveCalendar] = useState(null);
  const [homeOrderExpanded, setHomeOrderExpanded] = useState(false);
  const [confirmSoftReset, setConfirmSoftReset] = useState(false);
  const [confirmFullReset, setConfirmFullReset] = useState(false);
  const [fullResetInput, setFullResetInput] = useState("");

  // Soft reset: clears user-generated data, keeps name/color/theme and onboarding
  const doSoftReset = () => {
    setEvents([]);
    setMajorEvents([]);
    setShifts([]);
    setGroups([]);
    setGroupMembers([]);
    setFriends([]);
    setActivityFeed([]);
    setPinnedEvents(new Set());
    setHiddenCalendars(new Set());
    setHiddenGroups(new Set());
    setDayNotes({});
    setShiftOverrides(new Set());
    setFeedSeenAt(new Date());
    // Keep only the first calendar, clear the rest
    setCalendars(prev => prev.slice(0, 1));
    setConfirmSoftReset(false);
    setTab("home");
  };

  // Full reset: nukes everything including onboarding — user starts completely fresh
  const doFullReset = () => {
    // Clear localStorage — if the browser blocks it, we silently continue with in-memory reset
    try { localStorage.removeItem(LS_KEY); } catch {}
    // Reset all persisted state directly so we don't depend on a page reload
    setEvents([]);
    setCalendars(seed.calendars);
    setGroups([]);
    setGroupMembers([]);
    setShifts([]);
    setMajorEvents([]);
    setFriends([]);
    setActivityFeed([]);
    setFeedSeenAt(new Date());
    setPinnedEvents(new Set());
    setHiddenCalendars(new Set());
    setHiddenGroups(new Set());
    setHolidayCountries(new Set(["us"]));
    setDayNotes({});
    setShiftOverrides(new Set());
    setHomeOrder(["shiftstatus","status","pinned","nextup","major","freetime"]);
    setThemeMode("auto");
    setUserProfile({ name: "Alex Morgan", email: "", handle: "", defaultCalendar: "c1", defaultReminder: "15", avatar: null, badges: { friendRequests: true, feed: true, todayEvents: true } });
    // Trigger onboarding to run fresh
    setCustomColorRecents([]);
    setCustomColorFavorites([]);
    setOnboardingCompletedAt(null);
    setOnboardingActive(true);
    // Close the confirmation UI
    setConfirmFullReset(false);
    setFullResetInput("");
  };

  // Persist all data to localStorage on any relevant change
  React.useEffect(() => {
    // Debounced save — avoids sync localStorage writes on every keystroke
    const saveHandle = setTimeout(() => {
      lsSave({
        events,
        calendars,
        groups,
        groupMembers,
        shifts,
        majorEvents,
        friends,
        activityFeed,
        feedSeenAt:       feedSeenAt.toISOString(),
        onboardingComplete:   !onboardingActive,
        onboardingCompletedAt,
        customColorRecents,
        customColorFavorites,
        pinnedEvents:     [...pinnedEvents],
        hiddenCalendars:  [...hiddenCalendars],
        hiddenGroups:     [...hiddenGroups],
        holidayCountries: [...holidayCountries],
        dayNotes,
        homeOrder,
        themeMode, weekLayout, textSize, highContrast, viewMode, mapProvider, recentSearches,
        userProfile, shiftTimeOverrides, shiftNoticeDismissed, timeFormat,
        dismissedPlaceholders: [...dismissedPlaceholders],
      });
    }, 300);
    return () => clearTimeout(saveHandle);
  }, [events, calendars, groups, groupMembers, shifts, majorEvents, friends,
      activityFeed, feedSeenAt, onboardingActive, onboardingCompletedAt,
      customColorRecents, customColorFavorites,
      pinnedEvents, hiddenCalendars, hiddenGroups, holidayCountries,
      dayNotes, homeOrder, themeMode, weekLayout, textSize, highContrast, viewMode, mapProvider, recentSearches, userProfile, shiftTimeOverrides, shiftNoticeDismissed, timeFormat, dismissedPlaceholders]);
  const openNewCalendar  = () => { setActiveCalendar(null); setSheet("editCalendar"); };
  const openEditCalendar = (cal) => { setActiveCalendar(cal); setSheet("editCalendar"); };
  const openNewMajorEvent = () => setSheet("newMajorEvent");
  const openEditMajorEvent = (me) => { setActiveMajorEvent(me); setSheet("editMajorEvent"); };
  const openMajorEventDetail = (me) => { setActiveMajorEvent(me); setSheet("majorEventDetail"); };
  const duplicateMajorEvent = (me) => {
    const copy = { ...me, id: "m" + uid(), title: me.title + " (copy)" };
    setMajorEvents(prev => [...prev, copy]);
    closeSheet();
  };

  const addEvent = (ev) => {
    setEvents(prev => [...prev, { ...ev, id: "e" + uid() }]);
    (ev.groupIds||[]).forEach(gid => addActivity(gid, "added", ev.title, ev.start));
    closeSheet();
    showToast("Event created");
  };
  const deleteEvent = (id, opts = {}) => {
    const base = baseEventId(id);
    // Scope: "instance" deletes a single occurrence via override; "series" (default) deletes the whole event.
    if (opts.scope === "instance" && opts.dateKey) {
      setEvents(prev => prev.map(e => {
        if (e.id !== base) return e;
        return { ...e, overrides: { ...(e.overrides||{}), [opts.dateKey]: { skip: true } } };
      }));
      closeSheet();
      showToast("Occurrence removed", "err");
      return;
    }
    setEvents(prev => {
      const ev = prev.find(e => e.id === base);
      if (ev) (ev.groupIds||[]).forEach(gid => addActivity(gid, "deleted", ev.title, ev.start));
      return prev.filter(e => e.id !== base);
    });
    closeSheet();
    showToast("Event deleted", "err");
  };
  const duplicateEvent = (ev) => {
    const newEv = { ...ev, id: "e" + uid(), title: ev.title + " (copy)" };
    setEvents(prev => [...prev, newEv]);
    closeSheet();
    showToast("Event duplicated");
  };
  const updateEvent = (ev, opts = {}) => {
    const base = baseEventId(ev.id);
    // Scope: "instance" writes an override for a single occurrence; "series" (default) updates the whole event.
    if (opts.scope === "instance" && opts.dateKey) {
      // Series-level fields (frequency, monthDays, overrides, id) must not leak into a per-date override.
      const { id: _id, _seriesId, _occurrenceKey, start, end, overrides: _ovr, frequency: _fq, monthDays: _md, ...rest } = ev;
      const override = { ...rest, start: start.toISOString(), end: end.toISOString() };
      setEvents(prev => prev.map(e => {
        if (e.id !== base) return e;
        return { ...e, overrides: { ...(e.overrides||{}), [opts.dateKey]: override } };
      }));
      closeSheet();
      showToast("Occurrence updated");
      return;
    }
    // Series edit from an occurrence: preserve the base series' anchor dates but carry time-of-day
    // and other fields forward. Otherwise the series would jump to the edited occurrence's date.
    const { _seriesId, _occurrenceKey, ...clean } = ev;
    setEvents(prev => prev.map(e => {
      if (e.id !== base) return e;
      const saved = { ...clean, id: base };
      if (opts.scope === "series" && _occurrenceKey && e.start && e.end) {
        const baseStart = new Date(e.start);
        const baseEnd = new Date(e.end);
        baseStart.setHours(ev.start.getHours(), ev.start.getMinutes(), 0, 0);
        baseEnd.setHours(ev.end.getHours(), ev.end.getMinutes(), 0, 0);
        saved.start = baseStart;
        saved.end = baseEnd;
      }
      return saved;
    }));
    (ev.groupIds||[]).forEach(gid => addActivity(gid, "updated", ev.title, ev.start));
    closeSheet();
    showToast("Event updated");
  };
  const addGroup = (g) => { setGroups(prev => [...prev, { ...g, id: "g" + uid(), owner: "u1" }]); closeSheet(); showToast("Group created"); };
  const updateGroup = (g, members) => {
    setGroups(prev => prev.map(x => x.id === g.id ? { ...x, ...g } : x));
    setGroupMembers(prev => [...prev.filter(m => m.groupId !== g.id), ...members.map(m => ({ ...m, groupId: g.id }))]);
    closeSheet();
    showToast("Group updated");
  };
  const deleteGroup = (id) => { setGroups(prev => prev.filter(g => g.id !== id)); setGroupMembers(prev => prev.filter(m => m.groupId !== id)); closeSheet(); showToast("Group deleted", "err"); };
  const toggleMemberRole = (groupId, userId) => {
    setGroupMembers(prev => prev.map(m => m.groupId === groupId && m.userId === userId ? { ...m, role: m.role === "editor" ? "viewer" : "editor" } : m));
  };
  const addMajorEvent = (me) => {
    const saved = { ...me, id: "m" + uid() };
    setMajorEvents(prev => [...prev, saved]);
    const startDate = typeof saved.startDate === "string" ? new Date(saved.startDate) : saved.startDate;
    (saved.groupIds||[]).forEach(gid => addActivity(gid, "added", saved.title, startDate));
    closeSheet();
    showToast("Major event created");
  };
  const updateMajorEvent = (me) => {
    setMajorEvents(prev => prev.map(x => x.id === me.id ? me : x));
    const startDate = typeof me.startDate === "string" ? new Date(me.startDate) : me.startDate;
    (me.groupIds||[]).forEach(gid => addActivity(gid, "updated", me.title, startDate));
    closeSheet();
    showToast("Major event updated");
  };
  // Quick pin/unpin without opening the edit form — used by the detail sheet.
  const toggleMajorPin = (id) => {
    setMajorEvents(prev => prev.map(me => me.id === id ? { ...me, pinned: !me.pinned } : me));
  };

  const deleteMajorEvent = (id) => {
    setMajorEvents(prev => {
      const me = prev.find(x => x.id === id);
      if (me) {
        const startDate = typeof me.startDate === "string" ? new Date(me.startDate) : me.startDate;
        (me.groupIds||[]).forEach(gid => addActivity(gid, "deleted", me.title, startDate));
      }
      return prev.filter(x => x.id !== id);
    });
    closeSheet();
    showToast("Major event deleted", "err");
  };
  const sendFriendRequest = (user) => { setFriends(prev => [...prev, { id: "f" + uid(), userId: user.id, name: user.name, handle: user.handle, avatar: user.avatar, mutualGroups: 0, status: "pending_sent" }]); setGroupsSubTab("friends"); };
  const acceptFriendRequest = (id) => setFriends(prev => prev.map(f => f.id === id ? { ...f, status: "accepted" } : f));
  const declineFriendRequest = (id) => setFriends(prev => prev.filter(f => f.id !== id));
  const cancelFriendRequest = (id) => setFriends(prev => prev.filter(f => f.id !== id));
  const removeFriend = (id) => setFriends(prev => prev.filter(f => f.id !== id));
  const addShift = (p) => { setShifts(prev => { const maxP = prev.reduce((m,x) => Math.max(m, x.priority ?? 0), -1); return [...prev, { ...p, id: "p" + uid(), priority: maxP + 1 }]; }); closeSheet(); showToast("Shift created"); };
  const updateShift = (p) => { setShifts(prev => prev.map(x => x.id === p.id ? p : x)); closeSheet(); showToast("Shift updated"); };

  const deleteShift = (id) => { setShifts(prev => prev.filter(p => p.id !== id)); closeSheet(); showToast("Shift deleted", "err"); };

  const visibleEvents = useMemo(() => events.filter(e => {
    if (hiddenCalendars.has(e.calendarId)) return false;
    // Hide if ALL groups the event belongs to are hidden (or event has groups and they're all hidden)
    if (e.groupIds && e.groupIds.length > 0 && e.groupIds.every(id => hiddenGroups.has(id))) return false;
    return true;
  }), [events, hiddenCalendars, hiddenGroups]);
  const visibleMajorEvents = useMemo(() => majorEvents.filter(me => {
    // Hide if ALL groups the major event belongs to are hidden
    if (me.groupIds && me.groupIds.length > 0 && me.groupIds.every(id => hiddenGroups.has(id))) return false;
    return true;
  }), [majorEvents, hiddenGroups]);
  const todayEvents = useMemo(() => {
    const from = new Date(TODAY); from.setHours(0,0,0,0);
    const to = new Date(TODAY); to.setHours(23,59,59,999);
    return expandEvents(visibleEvents, from, to)
      .filter(e => sameDay(e.start, TODAY))
      .sort((a, b) => a.start - b.start);
  }, [visibleEvents]);
  const selectedDayEvents = useMemo(() => {
    const from = new Date(selectedDate); from.setHours(0,0,0,0);
    const to = new Date(selectedDate); to.setHours(23,59,59,999);
    return expandEvents(visibleEvents, from, to)
      .filter(e => sameDay(e.start, selectedDate))
      .sort((a, b) => a.start - b.start);
  }, [visibleEvents, selectedDate]);
  const calForCalendar = (id) => calendars.find(c => c.id === id) || {};
  const holidaysForDate = (date) => holidays.filter(h =>
    holidayCountries.has(h.country) &&
    h.year === date.getFullYear() &&
    h.month === date.getMonth()+1 &&
    h.day === date.getDate()
  );
  const currentEvent = todayEvents.find(e => e.start <= nowClock && e.end >= nowClock);

  // Universal search — returns a typed list of results across all categories
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    // Accent-insensitive normalizer: "café" → "cafe", "Núñez" → "nunez"
    const stripAccents = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const qNorm = stripAccents(q);
    // Simple fuzzy: allows small typos (edit distance 1 for short queries, 2 for longer)
    // Only used when substring match fails. Returns true if s "approximately contains" q.
    const fuzzyContains = (s, q) => {
      if (!s || !q || q.length < 4) return false;  // too short = too noisy
      const sNorm = stripAccents(s.toLowerCase());
      if (sNorm.includes(q)) return true;
      // Sliding window: check if any substring of s is within edit distance k of q
      const k = q.length > 6 ? 2 : 1;
      for (let i = 0; i <= sNorm.length - q.length + k; i++) {
        const window = sNorm.slice(i, i + q.length + k);
        if (editDistLte(window.slice(0, q.length), q, k)) return true;
        if (k >= 1 && editDistLte(window, q, k)) return true;
      }
      return false;
    };
    // Bounded edit distance: returns true iff dist(a, b) <= maxK. Faster than full Levenshtein.
    function editDistLte(a, b, maxK) {
      if (Math.abs(a.length - b.length) > maxK) return false;
      if (a === b) return true;
      let prev = Array(b.length + 1).fill(0).map((_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        const curr = [i];
        let rowMin = i;
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i-1] === b[j-1] ? 0 : 1;
          const v = Math.min(curr[j-1] + 1, prev[j] + 1, prev[j-1] + cost);
          curr.push(v);
          if (v < rowMin) rowMin = v;
        }
        if (rowMin > maxK) return false;
        prev = curr;
      }
      return prev[b.length] <= maxK;
    }
    // Multi-word AND search: all terms must appear (any order, any field)
    // "jordan lunch" → matches "Lunch with Jordan"
    const terms = qNorm.split(/\s+/).filter(t => t.length > 0);
    const matches = (s) => {
      if (!s) return false;
      const sNorm = stripAccents(s.toLowerCase());
      // Every term must appear as a substring (order-independent)
      if (terms.every(t => sNorm.includes(t))) return true;
      // For single-term queries, fall back to fuzzy
      if (terms.length === 1 && fuzzyContains(s, terms[0])) return true;
      return false;
    };
    const results = [];

    // Events (from visible, respects hidden calendars/groups)
    visibleEvents.forEach(e => {
      if (matches(e.title) || matches(e.notes) || matches(e.location)) {
        results.push({ type:"event", id:e.id, item:e });
      }
    });
    // Major events
    visibleMajorEvents.forEach(me => {
      if (matches(me.title) || matches(me.notes) || matches(me.location)) {
        results.push({ type:"major", id:me.id, item:me });
      }
    });
    // Holidays
    holidays.forEach(h => {
      if (holidayCountries.has(h.country) && matches(h.name)) {
        results.push({ type:"holiday", id:h.id+":"+h.year, item:h });
      }
    });
    // Shifts
    shifts.forEach(p => {
      if (matches(p.name)) {
        results.push({ type:"shift", id:p.id, item:p });
      }
    });
    // Calendars
    calendars.forEach(c => {
      if (matches(c.name)) {
        results.push({ type:"calendar", id:c.id, item:c });
      }
    });
    // Groups (hidden unless FEATURES.groups)
    if (FEATURES.groups) {
      groups.forEach(g => {
        if (matches(g.name)) {
          results.push({ type:"group", id:g.id, item:g });
        }
      });
    }
    // Friends (hidden unless FEATURES.friends)
    if (FEATURES.friends) {
      friends.forEach(f => {
        if (matches(f.name) || matches(f.handle)) {
          results.push({ type:"friend", id:f.id, item:f });
        }
      });
    }
    // Date parsing — "june 3", "jun 3", "6/3", "6/3/2026", "2026-06-03", "today", "tomorrow"
    const parseSearchDate = (txt) => {
      const t = txt.toLowerCase().trim();
      if (t === "today") return new Date(TODAY);
      if (t === "tomorrow") { const d = new Date(TODAY); d.setDate(d.getDate()+1); return d; }
      const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
      const monthShort = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
      // "june 3" or "jun 3" or "june 3, 2026"
      const m1 = t.match(/^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
      if (m1) {
        const monIdx = monthNames.indexOf(m1[1]) >= 0 ? monthNames.indexOf(m1[1]) : monthShort.indexOf(m1[1]);
        if (monIdx >= 0) {
          const day = parseInt(m1[2]);
          const year = m1[3] ? parseInt(m1[3]) : TODAY.getFullYear();
          if (day >= 1 && day <= 31) {
            const d = new Date(year, monIdx, day);
            // Validate no rollover (feb 30 → mar 2 is invalid)
            if (d.getMonth() === monIdx && d.getDate() === day) return d;
          }
        }
      }
      // "6/3" or "6/3/2026" or "6-3-2026"
      const m2 = t.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/);
      if (m2) {
        const mon = parseInt(m2[1])-1, day = parseInt(m2[2]);
        let year = m2[3] ? parseInt(m2[3]) : TODAY.getFullYear();
        if (year < 100) year += 2000;
        if (mon >= 0 && mon < 12 && day >= 1 && day <= 31) {
          const d = new Date(year, mon, day);
          // Validate no rollover
          if (d.getMonth() === mon && d.getDate() === day) return d;
        }
      }
      // ISO "2026-06-03"
      const m3 = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m3) {
        const year = parseInt(m3[1]), mon = parseInt(m3[2])-1, day = parseInt(m3[3]);
        if (mon >= 0 && mon < 12 && day >= 1 && day <= 31) return new Date(year, mon, day);
      }
      // Weekday matching: "monday", "tue", "this friday", "next monday"
      const weekdays = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
      const weekdaysShort = ["sun","mon","tue","wed","thu","fri","sat"];
      const dayMatch = t.match(/^(?:(this|next)\s+)?([a-z]+)$/);
      if (dayMatch) {
        const modifier = dayMatch[1];
        const dayName = dayMatch[2];
        let idx = weekdays.indexOf(dayName);
        if (idx < 0) idx = weekdaysShort.indexOf(dayName);
        if (idx >= 0) {
          const todayIdx = TODAY.getDay();
          let diff = (idx - todayIdx + 7) % 7;
          if (diff === 0) diff = 7; // "monday" when today is monday → next monday
          if (modifier === "next" && diff < 7) diff += 7; // "next" pushes to the following week
          const d = new Date(TODAY);
          d.setDate(d.getDate() + diff);
          return d;
        }
      }
      // "in N days" / "in N weeks"
      const inMatch = t.match(/^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/);
      if (inMatch) {
        const n = parseInt(inMatch[1]);
        const unit = inMatch[2];
        const d = new Date(TODAY);
        if (unit.startsWith("day")) d.setDate(d.getDate() + n);
        else if (unit.startsWith("week")) d.setDate(d.getDate() + n * 7);
        else if (unit.startsWith("month")) d.setMonth(d.getMonth() + n);
        return d;
      }
      // "yesterday" as a convenience
      if (t === "yesterday") { const d = new Date(TODAY); d.setDate(d.getDate()-1); return d; }
      // "next week" / "this week" / "next month" / "this month"
      if (t === "next week") { const d = new Date(TODAY); d.setDate(d.getDate() + (7 - d.getDay() + 1)); return d; }
      if (t === "this week")  { const d = new Date(TODAY); d.setDate(d.getDate() - d.getDay()); return d; } // start of this week (Sunday)
      if (t === "next month") { const d = new Date(TODAY.getFullYear(), TODAY.getMonth()+1, 1); return d; }
      if (t === "this month") { const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1); return d; }
      // Word-number equivalents: "in a week", "in one week", "in a month"
      const wordNumMap = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
      const wordMatch = t.match(/^in\s+(a|an|one|two|three|four|five|six|seven)\s+(day|days|week|weeks|month|months)$/);
      if (wordMatch) {
        const n = wordNumMap[wordMatch[1]];
        const unit = wordMatch[2];
        const d = new Date(TODAY);
        if (unit.startsWith("day")) d.setDate(d.getDate() + n);
        else if (unit.startsWith("week")) d.setDate(d.getDate() + n * 7);
        else if (unit.startsWith("month")) d.setMonth(d.getMonth() + n);
        return d;
      }
      return null;
    };
    const parsedDate = parseSearchDate(searchQuery);
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      results.unshift({ type:"date", id:"_date:"+parsedDate.getTime(), item:{ date: parsedDate } });
    }

    // Settings keywords — map common search terms to the settings tab
    const settingsKeywords = ["setting","profile","theme","dark","light","notification","calendar setting","holiday setting","home screen","account","name",
      "accessibility","high contrast","contrast","text size","font size","bigger text","larger text",
      "export","download","backup","icalendar","ical","calendar file",
      "privacy","private","data","reset","clear","start over",
      "notif","reminder","reminders","badge","badges",
      "language","appearance","mode","dark mode","light mode","auto mode",
      "preferences","prefs","config","setup"
    ];
    if (settingsKeywords.some(kw => q.includes(kw))) {
      results.push({ type:"settings", id:"_settings", item:{ name:"Settings" } });
    }

    return results.slice(0, 30);
  }, [searchQuery, visibleEvents, visibleMajorEvents, holidays, holidayCountries, shifts, calendars, groups, friends]);

  // Core gap finder — returns gaps on a given day from a start time
  const findDayGaps = React.useCallback((dayStart, fromMs) => {
    const endOfDay = new Date(dayStart).setHours(23,59,59,999);
    const winEndMs = Math.max(endOfDay, fromMs + 86400000);
    const scanEnd  = new Date(winEndMs);
    const rawBusy  = expandEvents(events, new Date(fromMs), scanEnd)
      .filter(ev => !ev.allDay)
      .map(ev => [Math.max(ev.start.getTime(), fromMs),
                  Math.min(ev.end.getTime(), winEndMs)]);
    for (var pi = 0; pi < shifts.length; pi++) {
      const p = shifts[pi];
      // Use per-day override when present so half-days etc. reflect correctly.
      var st = getEffectiveShiftTime(p, dayStart);
      if (!st?.enabled) continue;
      const oKey = p.id+":"+dayStart.getFullYear()+"-"+dayStart.getMonth()+"-"+dayStart.getDate();
      if (shiftOverrides.has(oKey)) continue;
      const isWork = p.type==="rotation" ? getRotationStatus(p,dayStart)==="work" : (p.config.days||[]).includes(dayStart.getDay());
      if (!isWork && !shiftOverrides.has("extra:"+oKey)) continue;
      const shP=st.start.split(":").map(Number), enP=st.end.split(":").map(Number);
      const shMs=new Date(dayStart).setHours(shP[0],shP[1],0,0);
      let enMs=new Date(dayStart).setHours(enP[0],enP[1],0,0);
      if (enMs<=shMs) enMs+=86400000;
      rawBusy.push([shMs, enMs]);
    }
    rawBusy.sort((a,b)=>a[0]-b[0]);
    const merged=[];
    for (var bi=0;bi<rawBusy.length;bi++) {
      const [bs,be]=rawBusy[bi];
      if (merged.length && bs<=merged[merged.length-1][1]) merged[merged.length-1][1]=Math.max(merged[merged.length-1][1],be);
      else merged.push([bs,be]);
    }
    const gaps=[]; var cursor=fromMs;
    for (var j=0;j<=merged.length;j++) {
      const blockStart=j<merged.length?merged[j][0]:endOfDay;
      const gapEnd=Math.min(blockStart,endOfDay);
      const gapMs=gapEnd-cursor;
      if (gapMs>60000) gaps.push({ startMs:cursor, endMs:gapEnd, gapMs });
      if (j<merged.length) cursor=Math.max(cursor,merged[j][1]);
    }
    return gaps;
  }, [events, shifts, shiftOverrides]);

  // Parse free time query and return a plain-language answer
  const freeTimeAnswer = useMemo(() => {
    const q = freeTimeQuery.trim().toLowerCase();
    if (!q) return null;
    const now = new Date();

    // What's competing with free time on a given day: active shifts (with their
    // effective time), major events covering the day, and regular events — all
    // merged into one chronological list so the preview reads top-to-bottom
    // like a mini agenda instead of grouping by type.
    const computeWhatsOn = (day) => {
      const dayStart = new Date(day); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(day); dayEnd.setHours(23,59,59,999);
      const ymd = day.getFullYear()+"-"+day.getMonth()+"-"+day.getDate();
      const items = [];
      // Shifts — use effective time (override beats base)
      shifts.forEach(p => {
        const key = p.id + ":" + ymd;
        if (shiftOverrides.has(key)) return;
        const isExtra = shiftOverrides.has("extra:" + key);
        const isNatural = p.type === "rotation" ? getRotationStatus(p, day) === "work"
          : p.type === "monthly" ? isMonthlyWorkDay(p, day)
          : (p.config?.days ?? []).includes(day.getDay());
        if (!isNatural && !isExtra) return;
        const ov = shiftTimeOverrides[key];
        const eff = ov ? { enabled: true, start: ov.start, end: ov.end } : (p.config?.shiftTime || null);
        const color = p.color || "#6366f1";
        if (eff?.enabled) {
          const [sh, sm] = eff.start.split(":").map(Number);
          const [eh, em] = eff.end.split(":").map(Number);
          const startMs = new Date(day).setHours(sh, sm, 0, 0);
          let endMs = new Date(day).setHours(eh, em, 0, 0);
          if (endMs <= startMs) endMs += 86400000; // overnight
          items.push({ kind:"shift", title: p.name, color, startMs, endMs, allDay: false });
        } else {
          items.push({ kind:"shift", title: p.name, color, allDay: true });
        }
      });
      // Major events covering this day
      majorEvents.forEach(me => {
        const [sy,sm,sd] = me.startDate.slice(0,10).split("-").map(Number);
        const [ey,em,ed] = me.endDate.slice(0,10).split("-").map(Number);
        const s = new Date(sy,sm-1,sd); s.setHours(0,0,0,0);
        const e = new Date(ey,em-1,ed); e.setHours(23,59,59,999);
        if (day < s || day > e) return;
        const color = me.color || "#f59e0b";
        // Majors have per-day times only when allDay === false. Otherwise they're all-day.
        if (me.allDay === false && me.startTime && me.endTime) {
          const [sh, sm2] = me.startTime.split(":").map(Number);
          const [eh, em2] = me.endTime.split(":").map(Number);
          const startMs = new Date(day).setHours(sh, sm2, 0, 0);
          const endMs = new Date(day).setHours(eh, em2, 0, 0);
          items.push({ kind:"major", title: me.title, color, startMs, endMs, allDay: false });
        } else {
          items.push({ kind:"major", title: me.title, color, allDay: true });
        }
      });
      // Regular events on this day
      expandEvents(events, dayStart, dayEnd)
        .filter(ev => sameDay(ev.start, day) || (ev.allDay && ev.start <= dayEnd && ev.end >= dayStart))
        .forEach(ev => {
          const cal = calendars.find(c => c.id === ev.calendarId);
          const color = ev.color || cal?.color || "#888";
          items.push({ kind:"event", title: ev.title, color,
            startMs: ev.start.getTime(), endMs: ev.end.getTime(), allDay: !!ev.allDay });
        });
      // Sort: all-day items first, then by start time
      items.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return (a.startMs || 0) - (b.startMs || 0);
      });
      return { items };
    };

    // ── STEP 1: parse duration from the query ───────────────────────────
    // Handles "20 min", "2 hours", "an hour", "half hour", "all day"
    let neededMs = 0; // 0 = any gap
    const hrMatch   = q.match(/(\d+\.?\d*)\s*(?:hr|hour|hours|h)\b/);
    const minMatch  = q.match(/(\d+)\s*(?:min|mins|minute|minutes|m)\b/);
    const halfHour  = /half\s*(?:an\s*)?hour/.test(q);
    const anHour    = /\ban?\s*hour\b/.test(q);
    const allDay    = /(?:all|whole|full)\s*day/.test(q);
    if (allDay)        neededMs = 480 * 60000;     // "all day" = 8hr block
    else if (halfHour) neededMs = 30 * 60000;
    else if (hrMatch)  neededMs = parseFloat(hrMatch[1]) * 3600000;
    else if (minMatch) neededMs = parseInt(minMatch[1]) * 60000;
    else if (anHour)   neededMs = 3600000;

    // ── STEP 1b: parse time-of-day filter ────────────────────────────────
    // Windows are given in hours-of-day (start inclusive, end exclusive)
    // Morning: 00:01 – 12:00, Afternoon: 12:00 – 17:00, Evening: 17:00 – 21:00, Night: 21:00 – 24:00
    let todStart = null, todEnd = null, todLabel = "";
    if (/\bmorning\b/.test(q))        { todStart = 0.0167; todEnd = 12; todLabel = "morning"; }
    else if (/\bafternoon\b/.test(q)) { todStart = 12;     todEnd = 17; todLabel = "afternoon"; }
    else if (/\bevening\b/.test(q))   { todStart = 17;     todEnd = 21; todLabel = "evening"; }
    else if (/\bnight\b/.test(q))     { todStart = 21;     todEnd = 24; todLabel = "night"; }

    // ── STEP 2: parse time range ─────────────────────────────────────────
    const DAYS_OF_WEEK  = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const MONTH_NAMES   = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    let targetDate   = null;     // day to start searching
    let searchDays   = 1;        // how many consecutive days to check
    let maxResults   = 3;        // max number of day-results to return
    let strict       = false;    // true = start window at 6am not now
    let rangeLabel   = "";       // human label for "no availability" messages
    let wantsFullClearDay = false; // "next free day" gets an extra fully-clear-day option

    // ── Precise date checks first (most specific wins) ─────────────────
    // "month name + day" e.g. "April 25", "apr 25", "May 3rd"
    const monthDayRe = new RegExp(
      "\\b(" + MONTH_NAMES.concat(MONTH_NAMES.map(m => m.slice(0,3))).join("|") +
      ")\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b", "i"
    );
    const monthDayMatch = q.match(monthDayRe);

    // "4/25" or "04/25" or "4-25"
    const numDateMatch = q.match(/\b(\d{1,2})[\/-](\d{1,2})\b/);

    // "the 25th" / "on the 3rd" / "25th" — day-of-month only
    const domMatch = q.match(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/);

    // ── Relative offsets: "in 3 days", "in 2 weeks" ────────────────────
    const inDaysMatch  = q.match(/\bin\s+(\d+)\s+days?\b/);
    const inWeeksMatch = q.match(/\bin\s+(\d+)\s+weeks?\b/);

    // ── Month references ────────────────────────────────────────────────
    const endOfMonth   = /end\s+of\s+(?:the\s+)?(?:this\s+)?month/.test(q);
    const endNextMonth = /end\s+of\s+next\s+month/.test(q);
    const thisMonth    = /\bthis\s+month\b/.test(q);
    const nextMonth    = /\bnext\s+month\b/.test(q);

    // ── Weekend variants (more specific than "weekend" alone) ──────────
    const followingWeekend =
      q.includes("following weekend") ||
      q.includes("weekend after next") ||
      q.includes("weekend after this");
    const isNextWeekend = !followingWeekend && q.includes("next weekend");
    const isWeekend     = q.includes("weekend");

    // ── Day-after-tomorrow ──────────────────────────────────────────────
    const dayAfterTomorrow = q.includes("day after tomorrow");

    // ── "next [weekday]" vs "this [weekday]" ───────────────────────────
    const nextWeekdayMatch = q.match(new RegExp("\\bnext\\s+(" + DAYS_OF_WEEK.join("|") + ")\\b", "i"));
    const thisWeekdayMatch = q.match(new RegExp("\\bthis\\s+(" + DAYS_OF_WEEK.join("|") + ")\\b", "i"));

    // Now decide which branch wins — most specific first
    if (monthDayMatch) {
      // "April 25" / "apr 25"
      const monStr = monthDayMatch[1].toLowerCase().slice(0,3);
      const monIdx = MONTH_NAMES.findIndex(m => m.startsWith(monStr));
      const dom    = parseInt(monthDayMatch[2]);
      const d = new Date(now.getFullYear(), monIdx, dom);
      // Validate the date didn't roll over (e.g. Feb 30 → Mar 2 is invalid input)
      if (d.getMonth() === monIdx && d.getDate() === dom) {
        // If it's already past, assume next year
        if (d < new Date(now.toDateString())) d.setFullYear(d.getFullYear()+1);
        targetDate = d; strict = true;
        rangeLabel = d.toLocaleDateString([],{month:"short", day:"numeric"});
      }
    } else if (numDateMatch) {
      // "4/25"
      const mo  = parseInt(numDateMatch[1]) - 1;
      const dom = parseInt(numDateMatch[2]);
      if (mo >= 0 && mo <= 11 && dom >= 1 && dom <= 31) {
        const d = new Date(now.getFullYear(), mo, dom);
        // Validate no rollover (e.g. 2/30 → 3/2 is invalid)
        if (d.getMonth() === mo && d.getDate() === dom) {
          if (d < new Date(now.toDateString())) d.setFullYear(d.getFullYear()+1);
          targetDate = d; strict = true;
          rangeLabel = d.toLocaleDateString([],{month:"short", day:"numeric"});
        }
      }
    }

    if (!targetDate && domMatch && !q.includes("today") && !q.includes("tomorrow")) {
      // "the 25th" / "on the 3rd" — day of current month
      const dom = parseInt(domMatch[1]);
      if (dom >= 1 && dom <= 31) {
        const d = new Date(now.getFullYear(), now.getMonth(), dom);
        // If already past this month, assume next month
        if (d < new Date(now.toDateString())) d.setMonth(d.getMonth()+1);
        targetDate = d; strict = true;
        rangeLabel = "the " + dom + (["th","st","nd","rd"][(dom%10<4 && (dom<11||dom>13)) ? dom%10 : 0]);
      }
    }

    if (!targetDate && inDaysMatch) {
      const n = parseInt(inDaysMatch[1]);
      const d = new Date(now); d.setDate(now.getDate()+n); d.setHours(0,0,0,0);
      targetDate = d; strict = true;
      rangeLabel = n + " days from now";
    } else if (!targetDate && inWeeksMatch) {
      const n = parseInt(inWeeksMatch[1]);
      const d = new Date(now); d.setDate(now.getDate()+n*7); d.setHours(0,0,0,0);
      targetDate = d; strict = true; searchDays = 7;
      rangeLabel = n + " weeks from now";
    }

    if (!targetDate && dayAfterTomorrow) {
      const d = new Date(now); d.setDate(now.getDate()+2); d.setHours(0,0,0,0);
      targetDate = d; strict = true;
      rangeLabel = "the day after tomorrow";
    }

    if (!targetDate && nextWeekdayMatch) {
      // "next Tuesday" = the Tuesday after this one (always 7+ days out)
      const wd = DAYS_OF_WEEK.indexOf(nextWeekdayMatch[1].toLowerCase());
      const d = new Date(now); d.setHours(0,0,0,0);
      let diff = (wd - d.getDay() + 7) % 7;
      if (diff === 0) diff = 7;   // today is that day → jump a week
      diff += 7;                  // "next" always adds another week
      d.setDate(d.getDate() + diff);
      targetDate = d; strict = true;
      rangeLabel = "next " + DAYS_OF_WEEK[wd];
    } else if (!targetDate && thisWeekdayMatch) {
      // "this Tuesday" = the upcoming Tuesday (this week, or next if already past)
      const wd = DAYS_OF_WEEK.indexOf(thisWeekdayMatch[1].toLowerCase());
      const d = new Date(now); d.setHours(0,0,0,0);
      const diff = (wd - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      targetDate = d; strict = true;
      rangeLabel = "this " + DAYS_OF_WEEK[wd];
    }

    // Now the broader phrases
    if (!targetDate) {
      if (q.includes("today")) {
        targetDate = new Date(now); targetDate.setHours(0,0,0,0);
        rangeLabel = "today";
      } else if (q.includes("tonight")) {
        targetDate = new Date(now); targetDate.setHours(0,0,0,0);
        strict = true; rangeLabel = "tonight";
      } else if (q.includes("tomorrow")) {
        targetDate = new Date(now); targetDate.setDate(now.getDate()+1); targetDate.setHours(0,0,0,0);
        strict = true; rangeLabel = "tomorrow";
      } else if (followingWeekend) {
        // "following weekend" = 2 weekends out
        const d = new Date(now); d.setHours(0,0,0,0);
        const daysToSat = d.getDay() === 6 ? 7 : (6 - d.getDay() + 7) % 7;
        d.setDate(d.getDate() + daysToSat + 7); // one extra week
        targetDate = d; searchDays = 2; strict = true; maxResults = 2;
        rangeLabel = "the following weekend";
      } else if (isNextWeekend) {
        // "next weekend" = the upcoming Sat+Sun from a weekday, or the one after if today is Sat/Sun
        const d = new Date(now); d.setHours(0,0,0,0);
        const dow = d.getDay();
        if (dow === 6 || dow === 0) {
          // Already on a weekend — "next weekend" means the one after
          const daysToSat = dow === 6 ? 7 : 6;
          d.setDate(d.getDate() + daysToSat);
        } else {
          const daysToSat = (6 - dow + 7) % 7;
          d.setDate(d.getDate() + daysToSat);
        }
        targetDate = d; searchDays = 2; strict = true; maxResults = 2;
        rangeLabel = "next weekend";
      } else if (isWeekend) {
        // "this weekend" / "weekend" — upcoming Sat+Sun
        const d = new Date(now); d.setHours(0,0,0,0);
        const dow = d.getDay();
        if (dow !== 6 && dow !== 0) while (d.getDay() !== 6) d.setDate(d.getDate()+1);
        targetDate = d; searchDays = dow === 0 ? 1 : 2; strict = true; maxResults = 2;
        rangeLabel = "this weekend";
      } else if (endNextMonth) {
        const d = new Date(now.getFullYear(), now.getMonth()+2, 0); // last day of next month
        d.setDate(d.getDate() - 6); // last 7 days
        d.setHours(0,0,0,0);
        targetDate = d; searchDays = 7; strict = true;
        rangeLabel = "end of next month";
      } else if (endOfMonth) {
        const d = new Date(now.getFullYear(), now.getMonth()+1, 0); // last day of this month
        d.setDate(d.getDate() - 6);
        d.setHours(0,0,0,0);
        if (d < new Date(now.toDateString())) { d.setTime(now.getTime()); d.setHours(0,0,0,0); }
        targetDate = d; searchDays = 7; strict = true;
        rangeLabel = "end of this month";
      } else if (nextMonth) {
        const d = new Date(now.getFullYear(), now.getMonth()+1, 1);
        targetDate = d; searchDays = 30; strict = true;
        rangeLabel = "next month";
      } else if (thisMonth) {
        targetDate = new Date(now); targetDate.setHours(0,0,0,0);
        const last = new Date(now.getFullYear(), now.getMonth()+1, 0);
        searchDays = Math.max(1, last.getDate() - now.getDate() + 1);
        rangeLabel = "this month";
      } else if (q.includes("next week")) {
        const d = new Date(now); d.setHours(0,0,0,0);
        const daysToMon = d.getDay() === 1 ? 7 : (1 - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + daysToMon);
        targetDate = d; searchDays = 7; strict = true; rangeLabel = "next week";
      } else if (q.includes("this week") || q.includes("week")) {
        targetDate = new Date(now); targetDate.setHours(0,0,0,0);
        searchDays = 7; rangeLabel = "this week";
      } else {
        // Bare weekday name (e.g. "friday") = next occurrence
        for (var di = 0; di < DAYS_OF_WEEK.length; di++) {
          if (q.includes(DAYS_OF_WEEK[di])) {
            const d = new Date(now); d.setHours(0,0,0,0);
            const diff = (di - d.getDay() + 7) % 7 || 7;
            d.setDate(d.getDate() + diff);
            targetDate = d; strict = true;
            rangeLabel = d.toLocaleDateString([],{weekday:"long"});
            break;
          }
        }
        if (!targetDate) {
          // Generic catch-all: "next 20 minutes", "next free day", "when am I free"
          const afterToday = q.includes("next free day") || q.includes("next available day");
          targetDate = new Date(now);
          if (afterToday) { targetDate.setDate(now.getDate()+1); strict = true; }
          targetDate.setHours(0,0,0,0);
          searchDays = 30;
          const isNextKeyword = q.includes("next free") || q.includes("next available") ||
                                q.includes("free day") || q.startsWith("next ");
          maxResults = (neededMs > 0 || isNextKeyword || afterToday) ? 1 : 3;
          rangeLabel = "the next 30 days";
          // "next free day" → also compute a fully-clear day option
          if (afterToday) wantsFullClearDay = true;
        }
      }
    }

    // ── STEP 3: walk the day range and collect qualifying gaps ───────────
    // For "next free day" queries we also check if each day is fully clear
    // (no events at all midnight-to-midnight) — those become the secondary option
    const answers = [];
    let fullClearDay = null;
    const scanDays = wantsFullClearDay ? 60 : searchDays;
    for (let offset = 0; offset < scanDays; offset++) {
      if (answers.length >= maxResults && (!wantsFullClearDay || fullClearDay)) break;
      const day = new Date(targetDate);
      day.setDate(day.getDate() + offset);
      day.setHours(0,0,0,0);
      const dayEnd = new Date(day); dayEnd.setHours(23,59,59,999);
      // For "next free day" we always check from midnight to detect fully clear days
      // Otherwise use the normal window: now for today, 6am for future
      const fromMs = wantsFullClearDay
        ? day.getTime()
        : (!strict && sameDay(day, now)) ? now.getTime() : day.getTime();
      const fullDayGaps = findDayGaps(day, day.getTime());
      const isFullyClear = fullDayGaps.length === 1 && fullDayGaps[0].gapMs >= 86400000 - 120000;
      // Fully clear day — becomes the secondary option (skip adding as a regular answer)
      if (wantsFullClearDay && isFullyClear) {
        if (!fullClearDay) fullClearDay = { day, startMs: day.getTime(), endMs: dayEnd.getTime() };
        continue;
      }
      // Regular gap search using the normal window
      const gaps = findDayGaps(day, fromMs);
      // Apply time-of-day filter by clipping gaps to the window
      const dayMid = new Date(day); dayMid.setHours(0,0,0,0);
      const clipped = todStart !== null
        ? gaps.map(g => {
            const winStart = dayMid.getTime() + todStart * 3600000;
            const winEnd   = dayMid.getTime() + todEnd * 3600000;
            const s = Math.max(g.startMs, winStart);
            const e = Math.min(g.endMs, winEnd);
            if (e <= s) return null;
            return { startMs:s, endMs:e, gapMs:e-s };
          }).filter(Boolean)
        : gaps;
      const qualifying = neededMs > 0 ? clipped.filter(g => g.gapMs >= neededMs) : clipped;
      if (qualifying.length > 0 && answers.length < maxResults) {
        const topGaps = neededMs > 0 && maxResults === 1 ? [qualifying[0]] : qualifying.slice(0,3);
        answers.push({ day, gaps: topGaps, whatsOn: computeWhatsOn(day) });
      }
    }

    // ── STEP 4: return the answer or a no-availability message ──────────
    if (answers.length === 0 && !fullClearDay) {
      const needLabel = neededMs > 0
        ? (neededMs >= 3600000 ? Math.round(neededMs/360000)/10 + " hr" : Math.round(neededMs/60000) + " min")
        : "";
      const whenLabel = rangeLabel.startsWith("the next") ? "in " + rangeLabel
        : rangeLabel === "today" ? "for the rest of today"
        : "on " + rangeLabel;
      const todSuffix = todLabel ? " in the " + todLabel : "";
      const busyMsg = needLabel
        ? "No " + needLabel + " slots found " + whenLabel + todSuffix + "."
        : "No availability " + whenLabel + todSuffix + ".";
      // For a single-day query ("next Friday", "April 25") surface what's
      // actually taking up the day so the user can see why they're booked.
      const busyWhatsOn = searchDays === 1 ? computeWhatsOn(targetDate) : null;
      return { busy: true, text: busyMsg, whatsOn: busyWhatsOn };
    }

    return { busy: false, answers, neededMs, fullClearDay, todLabel };
  }, [freeTimeQuery, findDayGaps, events, shifts, shiftOverrides, shiftTimeOverrides, majorEvents, calendars]);

  const stillTimerRef = React.useRef(null);
  const setScreenRef = () => {};

  // Listen on window scroll — most reliable across environments
  React.useEffect(() => {
    const onScroll = () => {
      setFabVisible(false);
      setFabOpen(false);
      if (stillTimerRef.current) clearTimeout(stillTimerRef.current);
      stillTimerRef.current = setTimeout(() => setFabVisible(true), 900);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Also try the document element and body for artifact environments
    document.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll);
      if (stillTimerRef.current) clearTimeout(stillTimerRef.current);
    };
  }, []);

  // Week view helpers
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(weekAnchor); d.setDate(d.getDate() + i); return d; });
  }, [weekAnchor]);

  const prevWeek = () => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

  if (onboardingActive) {
    return (
      <>
        <style>{css}</style>
        <div className={"app" + (darkMode ? "" : " light-mode") + (highContrast ? " hc-mode" : "")}>
          <OnboardingFlow
            defaultName=""
            defaultColor="#6366f1"
            textSize={textSize}
            setTextSize={setTextSize}
            customColors={{ recents: customColorRecents, favorites: customColorFavorites, setRecents: setCustomColorRecents, setFavorites: setCustomColorFavorites }}
            onFinish={({ name, color, startTour }) => {
              setUserProfile(p => ({ ...p, name: name || "Friend" }));
              setCalendars(prev => {
                const first = prev[0];
                if (!first) return prev;
                return [{ ...first, color }, ...prev.slice(1)];
              });
              // Clear ALL seed data — blank slate for real first-time users
              setEvents([]);
              setMajorEvents([]);
              setShifts([]);
              setGroups([]);
              setGroupMembers([]);
              setFriends([]);
              setActivityFeed([]);
              setPinnedEvents(new Set());
              setHiddenCalendars(new Set());
              setHiddenGroups(new Set());
              setDayNotes({});
              setShiftOverrides(new Set());
              setOnboardingActive(false);
              setOnboardingCompletedAt(Date.now());
              if (startTour) { setTab("home"); setTourOpen(true); }
            }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className={"app" + (darkMode ? "" : " light-mode") + (highContrast ? " hc-mode" : "") + (isDesktop ? " desktop-mode" : "") + (isSplit ? " split-mode" : "")}>

        {/* Toast */}
        {toast && (
          <div className={"toast toast-"+(toast.tone||"ok")} key={toast.id}>
            <span style={{ display:"flex", width:14, height:14 }}>
              {toast.tone === "err" ? Icon.close : Icon.check}
            </span>
            {toast.msg}
          </div>
        )}

        {/* Desktop sidebar — renders in both desktop (full) and split (icon-only) modes */}
        {(isDesktop || isSplit) && (() => {
          const todayHasEvents = todayEvents.length > 0;
          const hasConflicts = getConflicts(todayEvents).size > 0;
          const shiftOverrideCount = shiftOverrides.size;
          const friendRequestsRaw = friends.filter(f => f.status === "pending_received").length;
          const feedUnseenRaw = activityFeed.filter(a => a.userId !== "u1" && a.ts > feedSeenAt).length;
          const friendRequests = userProfile.badges?.friendRequests !== false ? friendRequestsRaw : 0;
          const feedUnseen = userProfile.badges?.feed !== false ? feedUnseenRaw : 0;
          const groupsBadge = friendRequests + feedUnseen;
          // In split mode, calendar is the right panel — so we drop it from the nav
          const navItems = [
            { id:"home", label:"Home", icon:Icon.home, dot: hasConflicts ? "#ef4444" : null },
            ...(!isSplit ? [{ id:"calendar", label:"Calendar", icon:Icon.calendar, dot: (todayHasEvents && userProfile.badges?.todayEvents !== false) ? "var(--accent2)" : null }] : []),
            ...(FEATURES.groups ? [{ id:"groups", label:"Groups", icon:Icon.groups, badge: groupsBadge }] : []),
            { id:"shifts", label:"Shifts", icon:Icon.shifts, dot: shiftOverrideCount > 0 ? "#f59e0b" : null },
            { id:"settings", label:"Settings", icon:Icon.settings },
          ];
          if (isSplit) {
            // Icon-only sidebar with tooltips on hover
            return (
              <nav className="split-sidebar">
                <div className="split-sidebar-brand">
                  <DaytuLogo size={36} style={{ display:"block" }} />
                </div>
                {navItems.map(n => (
                  <button key={n.id} ref={setTourRef("nav-"+n.id)}
                    className={"split-nav-btn " + (tab===n.id ? "active" : "")}
                    data-label={n.label}
                    onClick={() => { setTab(n.id); setFabOpen(false); }}>
                    <div style={{ position:"relative", display:"inline-flex" }}>
                      {n.icon}
                      {n.badge > 0 && <div style={{ position:"absolute", top:-5, right:-5, minWidth:14, height:14, borderRadius:7, background:"#ef4444", fontSize:"0.6875rem", fontWeight:700, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 2px" }}>{n.badge}</div>}
                      {!n.badge && n.dot && <div style={{ position:"absolute", top:-2, right:-2, width:7, height:7, borderRadius:"50%", background:n.dot, border:"1.5px solid var(--surface)" }} />}
                    </div>
                  </button>
                ))}
                {/* Quick-add button at the bottom of the icon sidebar */}
                <div style={{ flex:1 }} />
                <button className="split-add-btn" ref={setTourRef("fab")} onClick={() => setFabOpen(o => !o)}
                  title="Quick add"
                  style={{ transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)", transition:"transform .2s ease" }}>
                  {Icon.plus}
                </button>
              </nav>
            );
          }
          // Full sidebar for desktop mode
          return (
            <nav className="desktop-sidebar">
              <div className="desktop-sidebar-brand" style={{ display:"flex", alignItems:"center", gap:10 }}>
                <DaytuLogo size={28} style={{ flexShrink:0 }} />
                <span><span className="desktop-sidebar-brand-accent">day</span>tu</span>
              </div>
              {navItems.map(n => (
                <button key={n.id} ref={setTourRef("nav-"+n.id)}
                  className={"desktop-nav-btn " + (tab===n.id ? "active" : "")}
                  onClick={() => { setTab(n.id); setFabOpen(false); }}>
                  <div style={{ position:"relative", display:"inline-flex" }}>
                    {n.icon}
                    {n.badge > 0 && <div style={{ position:"absolute", top:-5, right:-5, minWidth:14, height:14, borderRadius:7, background:"#ef4444", fontSize:"0.6875rem", fontWeight:700, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 2px" }}>{n.badge}</div>}
                    {!n.badge && n.dot && <div style={{ position:"absolute", top:-2, right:-2, width:7, height:7, borderRadius:"50%", background:n.dot, border:"1.5px solid var(--surface)" }} />}
                  </div>
                  <span>{n.label}</span>
                </button>
              ))}
            </nav>
          );
        })()}

        {/* SEARCH OVERLAY */}
        {showSearch && (
          <div style={{ position:"fixed", inset:0, zIndex:300, background:"var(--bg)", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"max(20px, calc(env(safe-area-inset-top, 0px) + 16px)) 16px 8px", display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:"var(--surface2)", borderRadius:12, padding:"10px 14px" }}>
                <span style={{ display:"flex", width:16, height:16, color:"var(--muted)", flexShrink:0 }}>{Icon.search}</span>
                <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search everything..." style={{ background:"none", border:"none", outline:"none", color:"var(--text)", fontSize:"1rem", flex:1, fontFamily:"var(--font)" }} />
                {searchQuery && <button onClick={() => setSearchQuery("")} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", display:"flex", width:18, height:18 }}><span style={{ display:"flex", width:18, height:18 }}>{Icon.x}</span></button>}
              </div>
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} style={{ background:"none", border:"none", color:"var(--accent2)", fontSize:"0.875rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--font)", whiteSpace:"nowrap" }}>Cancel</button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"0 16px 32px" }}>
              {searchQuery.trim() === "" && (
                <div style={{ padding:"16px 0" }}>
                  {/* Recent searches */}
                  {recentSearches.length > 0 && (
                    <div style={{ marginBottom:24 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                        <div style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"var(--muted)" }}>Recent</div>
                        <button onClick={() => setRecentSearches([])}
                          style={{ background:"none", border:"none", color:"var(--muted)", fontSize:"0.6875rem", fontWeight:600, cursor:"pointer", fontFamily:"var(--font)" }}>
                          Clear
                        </button>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                        {recentSearches.map((q, i) => (
                          <div key={i} onClick={() => setSearchQuery(q)}
                            style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 2px",
                              cursor:"pointer", borderBottom: i < recentSearches.length-1 ? "1px solid var(--border)" : "none" }}>
                            <div style={{ display:"flex", width:14, height:14, color:"var(--muted)", flexShrink:0 }}>{Icon.search}</div>
                            <div style={{ flex:1, fontSize:"0.875rem", color:"var(--text)" }}>{q}</div>
                            <button onClick={(e) => { e.stopPropagation(); setRecentSearches(prev => prev.filter(p => p !== q)); }}
                              style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", display:"flex", width:14, height:14, padding:0 }}>
                              {Icon.x}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Search hints */}
                  <div>
                    <div style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"var(--muted)", marginBottom:10 }}>
                      Try searching
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {[
                        { label: "An event or person — e.g. \"lunch\", \"dentist\", \"Jordan\"" },
                        { label: "A date — \"tomorrow\", \"friday\", \"6/15\", \"in 2 weeks\"" },
                        { label: "Settings — \"theme\", \"notifications\", \"text size\"" },
                      ].map((hint, i) => (
                        <div key={i} style={{ padding:"10px 12px", background:"var(--surface2)", borderRadius:10,
                          fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.5 }}>
                          {hint.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {searchQuery.trim() !== "" && searchResults.length === 0 && <div style={{ textAlign:"center", padding:"48px 0", color:"var(--muted)", fontSize:"0.875rem" }}>No results for "{searchQuery}"</div>}
                            {/* Shared per-result renderer */}
              {(() => {
                const TYPE_ORDER = ["date","event","major","holiday","shift","calendar","group","friend","settings"];
                const TYPE_LABELS = { date:"Jump to date", event:"Events", major:"Major events", holiday:"Holidays", shift:"Shifts", calendar:"Calendars", group:"Groups", friend:"Friends", settings:"Settings" };
                const renderResult = (r) => {
                  const handleClick = () => {
                    rememberSearch(searchQuery);
                    if (r.type === "event")    { openEvent(r.item); }
                    else if (r.type === "major")    { openMajorEventDetail(r.item); }
                    else if (r.type === "date")     { setSelectedDate(r.item.date); setCalMonth({year:r.item.date.getFullYear(),month:r.item.date.getMonth()}); setCalView("day"); setTab("calendar"); }
                    else if (r.type === "holiday")  { const d = new Date(r.item.year, r.item.month-1, r.item.day); setSelectedDate(d); setTab("calendar"); }
                    else if (r.type === "shift")  { openEditShift(r.item); }
                    else if (r.type === "calendar") { setActiveCalendar(r.item); setSheet("editCalendar"); }
                    else if (r.type === "group")    { setActiveGroup(r.item); setTab("groups"); setGroupsSubTab("groups"); }
                    else if (r.type === "friend")   { setTab("groups"); setGroupsSubTab("friends"); }
                    else if (r.type === "settings") { setTab("settings"); }
                    setShowSearch(false); setSearchQuery("");
                  };
                  if (r.type === "date") {
                    const d = r.item.date;
                    return (
                      <div key={r.type+r.id} onClick={handleClick} className="event-pill" style={{ marginTop:8, background:"rgba(124,106,247,0.08)", borderColor:"rgba(124,106,247,0.3)" }}>
                        <div className="event-dot" style={{ background:"var(--accent)" }} />
                        <div className="event-pill-info">
                          <div className="event-pill-title">Jump to {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}</div>
                          <div className="event-pill-time">Calendar · Day view</div>
                        </div>
                      </div>
                    );
                  }
                  if (r.type === "event") {
                    const ev = r.item;
                    return (
                      <div key={r.type+r.id} onClick={handleClick} className="event-pill" style={{ marginTop:8 }}>
                        <div className="event-dot" style={{ background: calForCalendar(ev.calendarId).color || "#888" }} />
                        <div className="event-pill-info">
                          <div className="event-pill-title">
                            {ev.pinned && <span style={{ display:"inline-flex", width:11, height:11, color:"#f59e0b", marginRight:4, verticalAlign:"middle" }}>{Icon.pin2}</span>}
                            {ev.title}
                          </div>
                          <div className="event-pill-time">Event · {fmtDate(ev.start)} · {ev.allDay ? "All day" : fmtTime(ev.start)}</div>
                        </div>
                      </div>
                    );
                  }
                  if (r.type === "major") {
                    const me = r.item;
                    return (
                      <div key={r.type+r.id} onClick={handleClick} className="event-pill" style={{ marginTop:8 }}>
                        <div className="event-dot" style={{ background: me.color || "#888" }} />
                        <div className="event-pill-info">
                          <div className="event-pill-title">{me.title}</div>
                          <div className="event-pill-time">Major event · {me.startDate.slice(0,10)}</div>
                        </div>
                      </div>
                    );
                  }
                  if (r.type === "holiday") {
                    const h = r.item;
                    return (
                      <div key={r.type+r.id} onClick={handleClick} className="event-pill" style={{ marginTop:8 }}>
                        <div className="event-dot" style={{ background: h.color || "#888" }} />
                        <div className="event-pill-info">
                          <div className="event-pill-title">{h.name}</div>
                          <div className="event-pill-time">Holiday · {h.country} · {h.month}/{h.day}</div>
                        </div>
                      </div>
                    );
                  }
                  if (r.type === "shift") {
                    const p = r.item;
                    return (
                      <div key={r.type+r.id} onClick={handleClick} className="event-pill" style={{ marginTop:8 }}>
                        <div className="event-dot" style={{ background: p.color || "#888" }} />
                        <div className="event-pill-info">
                          <div className="event-pill-title">{p.name}</div>
                          <div className="event-pill-time">Shift · {p.type}</div>
                        </div>
                      </div>
                    );
                  }
                  if (r.type === "calendar") {
                    const c = r.item;
                    return (
                      <div key={r.type+r.id} onClick={handleClick} className="event-pill" style={{ marginTop:8 }}>
                        <div className="event-dot" style={{ background: c.color || "#888" }} />
                        <div className="event-pill-info">
                          <div className="event-pill-title">{c.name}</div>
                          <div className="event-pill-time">Calendar</div>
                        </div>
                      </div>
                    );
                  }
                  if (r.type === "group") {
                    const g = r.item;
                    return (
                      <div key={r.type+r.id} onClick={handleClick} className="event-pill" style={{ marginTop:8 }}>
                        <div className="event-dot" style={{ background:"var(--accent2)" }} />
                        <div className="event-pill-info">
                          <div className="event-pill-title">{g.name}</div>
                          <div className="event-pill-time">Group</div>
                        </div>
                      </div>
                    );
                  }
                  if (r.type === "friend") {
                    const f = r.item;
                    return (
                      <div key={r.type+r.id} onClick={handleClick} className="event-pill" style={{ marginTop:8 }}>
                        <div className="event-dot" style={{ background:"#34d399" }} />
                        <div className="event-pill-info">
                          <div className="event-pill-title">{f.name}</div>
                          <div className="event-pill-time">Friend · {f.handle} · {f.status === "accepted" ? "friends" : f.status.replace("_"," ")}</div>
                        </div>
                      </div>
                    );
                  }
                  if (r.type === "settings") {
                    return (
                      <div key={r.type+r.id} onClick={handleClick} className="event-pill" style={{ marginTop:8 }}>
                        <div className="event-dot" style={{ background:"var(--muted)" }} />
                        <div className="event-pill-info">
                          <div className="event-pill-title">Settings</div>
                          <div className="event-pill-time">Go to Settings tab</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                };

                // Group results by type; display grouped when total > 5 AND types > 1
                const buckets = {};
                searchResults.forEach(r => { if (!buckets[r.type]) buckets[r.type] = []; buckets[r.type].push(r); });
                const typesPresent = TYPE_ORDER.filter(t => buckets[t]);
                const shouldGroup = searchResults.length > 5 && typesPresent.length > 1;

                if (!shouldGroup) {
                  return searchResults.map(renderResult);
                }

                return typesPresent.map(t => (
                  <div key={t} style={{ marginTop:16 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <div style={{ fontSize:"0.6875rem", fontWeight:800, color:"var(--accent2)",
                        textTransform:"uppercase", letterSpacing:"0.5px" }}>{TYPE_LABELS[t] || t}</div>
                      <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--muted)",
                        background:"var(--surface2)", padding:"1px 6px", borderRadius:8 }}>
                        {buckets[t].length}
                      </div>
                      <div style={{ flex:1, height:1, background:"var(--border)" }} />
                    </div>
                    {buckets[t].map(renderResult)}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* HOME TAB */}
        {tab === "home" && (
          <div className="screen" ref={setScreenRef}>
            <div className="header">
              <div>
                <div className="header-sub">{DAYS[TODAY.getDay()]}, {fmtDate(TODAY)}</div>
                <h1>Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, {userProfile.name.split(" ")[0]}</h1>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {showHomeHelp && (
                  <button onClick={() => { setTab("home"); setTourOpen(true); }} style={{ background:"rgba(124,106,247,0.15)", border:"1px solid rgba(124,106,247,0.3)", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--accent2)" }}>
                    <span style={{ display:"flex", width:16, height:16 }}>{Icon.help}</span>
                  </button>
                )}
                <button onClick={() => setShowSearch(true)} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--muted)" }}>
                  <span style={{ display:"flex", width:16, height:16 }}>{Icon.search}</span>
                </button>
              </div>
            </div>

            {/* Shift time-override banner — a dismissible reminder that today's
                hours differ from the usual schedule. Comes back tomorrow. */}
            {(() => {
              const today = new Date();
              const ymdKey = today.getFullYear()+"-"+today.getMonth()+"-"+today.getDate();
              if (shiftNoticeDismissed === ymdKey) return null;
              const affected = shifts.filter(p => {
                const key = p.id+":"+ymdKey;
                if (!shiftTimeOverrides[key]) return false;
                const isNatural = p.type === "rotation" ? getRotationStatus(p, today) === "work"
                  : p.type === "monthly" ? isMonthlyWorkDay(p, today)
                  : (p.config?.days ?? []).includes(today.getDay());
                const isHidden = shiftOverrides.has(key);
                const isExtra = shiftOverrides.has("extra:" + key);
                return (isNatural && !isHidden) || (!isNatural && isExtra);
              });
              if (affected.length === 0) return null;
              return (
                <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.35)",
                  borderRadius:12, padding:"12px 14px", marginBottom:16,
                  display:"flex", alignItems:"flex-start", gap:10 }}>
                  <span style={{ display:"flex", width:18, height:18, color:"#f59e0b", flexShrink:0, marginTop:1 }}>{Icon.bell}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.8125rem", fontWeight:700, color:"var(--text)", marginBottom:4 }}>
                      Different schedule today
                    </div>
                    {affected.map(p => {
                      const ov = shiftTimeOverrides[p.id+":"+ymdKey];
                      const base = p.config?.shiftTime;
                      return (
                        <div key={p.id} style={{ fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.5 }}>
                          <span style={{ color: p.color || "var(--accent)", fontWeight:700 }}>{p.name}</span>
                          <span style={{ fontFamily:"var(--mono)" }}> · {fmtClock(ov.start)} – {fmtClock(ov.end)}</span>
                          {base?.enabled && (base.start !== ov.start || base.end !== ov.end) && (
                            <span> (usually {fmtClock(base.start)} – {fmtClock(base.end)})</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setShiftNoticeDismissed(ymdKey)}
                    title="Dismiss for today"
                    style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)",
                      display:"flex", alignItems:"center", justifyContent:"center", width:24, height:24,
                      padding:0, flexShrink:0 }}>
                    <span style={{ display:"flex", width:14, height:14 }}>{Icon.close}</span>
                  </button>
                </div>
              );
            })()}

            {/* Selected day preview — shows when user clicked a non-today date on the persistent calendar in split mode */}
            {isSplit && !sameDay(selectedDate, TODAY) && (() => {
              const dayEvs = visibleEvents.filter(e => sameDay(e.start, selectedDate)).sort((a,b) => a.start - b.start);
              const dayHolidays = holidaysForDate(selectedDate);
              const isPast = selectedDate < new Date(TODAY.getTime());
              return (
                <div className="card" style={{ marginBottom:16, border:"1px solid rgba(124,106,247,0.4)", background:"rgba(124,106,247,0.06)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"var(--accent2)" }}>
                        {isPast ? "Looking back" : "Looking ahead"}
                      </div>
                      <div style={{ fontSize:"1rem", fontWeight:700, color:"var(--text)", marginTop:2 }}>
                        {DAYS[selectedDate.getDay()]}, {fmtDate(selectedDate)}
                      </div>
                    </div>
                    <button onClick={() => { setSelectedDate(new Date(TODAY)); setCalMonth({year:TODAY.getFullYear(),month:TODAY.getMonth()}); }}
                      style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, padding:"6px 10px", fontSize:"0.6875rem", fontWeight:600, cursor:"pointer", color:"var(--muted)", fontFamily:"var(--font)" }}>
                      Back to today
                    </button>
                  </div>
                  {dayHolidays.length > 0 && dayHolidays.map(h => (
                    <div key={h.id+":"+h.year} style={{ fontSize:"0.75rem", color:"#fbbf24", marginBottom:6 }}>
                      🎉 {h.name}
                    </div>
                  ))}
                  {dayEvs.length === 0 ? (
                    <div style={{ fontSize:"0.8125rem", color:"var(--muted)", padding:"6px 0" }}>
                      Nothing scheduled
                    </div>
                  ) : (
                    dayEvs.map(e => {
                      const cal = calForCalendar(e.calendarId);
                      const col = e.color || cal.color || "var(--accent)";
                      return (
                        <div key={e.id} onClick={() => openEvent(e)}
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", cursor:"pointer" }}>
                          <div style={{ width:3, height:28, borderRadius:2, background:col, flexShrink:0 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:"0.8125rem", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.title}</div>
                            <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontFamily:"var(--mono)", marginTop:1 }}>
                              {e.allDay ? "All day" : fmtTime(e.start)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {homeOrder.map(id => {
              const now2 = new Date();
              if (id === "major") {
                const visible = visibleMajorEvents
                  .filter(me => { const e=new Date(me.endDate); e.setHours(23,59,59,999); return now2 <= e; })
                  .sort((a, b) => {
                    // Pinned events first, then earliest start date (ongoing events
                    // have start in the past, so they naturally sort above upcoming).
                    const pinDelta = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
                    if (pinDelta !== 0) return pinDelta;
                    return new Date(a.startDate) - new Date(b.startDate);
                  });
                if (visible.length === 0) {
                  if (canShowPlaceholder("major") && majorEvents.length === 0) {
                    return (
                      <div key="major-empty" ref={setTourRef("major")}>
                        <EmptyStateCard
                          icon={Icon.star}
                          title="Track the big days"
                          body="Vacations, weddings, birthdays, trips home — major events live here with a live countdown. Add one to see how it looks."
                          cta="Add a major event"
                          onCta={() => openNewMajorEvent()}
                          onDismiss={() => dismissPlaceholder("major")}
                        />
                      </div>
                    );
                  }
                  return null;
                }
                // Collapse the stack when there are more than a couple of cards —
                // shows the first card with a "peek" hint of the rest behind it.
                const COLLAPSE_THRESHOLD = 2;
                const canCollapse = visible.length > COLLAPSE_THRESHOLD;
                const shownCards = canCollapse && !majorExpanded ? visible.slice(0, 1) : visible;
                const peekCards = canCollapse && !majorExpanded ? visible.slice(1, 3) : [];
                const hiddenCount = visible.length - shownCards.length;
                return (
                  <div key="major" ref={setTourRef("major")}>
                    {shownCards.map(me => {
                      const [hsy,hsm,hsd]=me.startDate.slice(0,10).split("-").map(Number);
                      const [hey,hem,hed]=me.endDate.slice(0,10).split("-").map(Number);
                      const start = new Date(hsy,hsm-1,hsd); start.setHours(0,0,0,0);
                      const end   = new Date(hey,hem-1,hed); end.setHours(23,59,59,999);
                      // Calendar-day span (midnight-to-midnight) so single-day
                      // events correctly report 1 day, not 2.
                      const totalDays = Math.round((new Date(hey,hem-1,hed) - new Date(hsy,hsm-1,hsd)) / 86400000) + 1;
                      const isActive = now2 >= start;
                      const totalSec = Math.max(0, Math.floor((start - now2) / 1000));
                      const days = Math.floor(totalSec / 86400), hours = Math.floor((totalSec % 86400) / 3600), mins = Math.floor((totalSec % 3600) / 60), secs = totalSec % 60;
                      const dayOf = isActive ? Math.floor((now2 - start) / 86400000) + 1 : null;
                      const progressPct = isActive ? Math.min(100, Math.round(((now2 - start) / (end - start)) * 100)) : 0;
                      return (
                        <div key={me.id} className="major-event-card"
                          style={{ background:"linear-gradient(135deg,"+me.color+"dd,"+me.color+"99)", border:"1px solid "+me.color+"44", boxShadow:"0 4px 20px "+me.color+"33" }}
                          onClick={() => openMajorEventDetail(me)}>

                          {/* Top row — status badge + days count (pin marker left of status when pinned) */}
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              {me.pinned && (
                                <span title="Pinned to top"
                                  style={{ display:"flex", alignItems:"center", justifyContent:"center",
                                    width:20, height:20, borderRadius:"50%",
                                    background:"rgba(0,0,0,0.22)", color:"rgba(255,255,255,0.95)" }}>
                                  <span style={{ display:"flex", width:11, height:11 }}>{Icon.pin2}</span>
                                </span>
                              )}
                              <div style={{ fontSize:"0.6875rem", fontWeight:800, letterSpacing:"1px", textTransform:"uppercase",
                                background:"rgba(0,0,0,0.18)", borderRadius:20, padding:"3px 10px", color:"rgba(255,255,255,0.9)" }}>
                                {isActive ? "Ongoing" : "Upcoming"}
                              </div>
                            </div>
                            <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"rgba(255,255,255,0.7)", letterSpacing:"0.3px" }}>
                              {isActive ? `Day ${dayOf} of ${totalDays}` : totalDays > 1 ? `${totalDays} days` : "1 day"}
                            </div>
                          </div>

                          {/* Title */}
                          <div className="major-event-title">{me.title}</div>

                          {/* Date row */}
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: (me.location || me.notes || isActive || me.showCountdown) ? 10 : 0 }}>
                            <div className="major-event-dates">
                              {totalDays > 1 ? fmtDate(start)+" – "+fmtDate(end) : fmtDate(start)}
                            </div>
                            {me.location && (
                              <div style={{ display:"flex", alignItems:"center", gap:3, fontSize:"0.6875rem", color:"rgba(255,255,255,0.65)", minWidth:0 }}>
                                <span style={{ display:"flex", width:10, height:10, flexShrink:0 }}>{Icon.mapPin}</span>
                                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{me.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Notes — only when not active */}
                          {me.notes && !isActive && (
                            <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.65)", marginBottom:10, lineHeight:1.5,
                              borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:8 }}>
                              {me.notes.slice(0,72)}{me.notes.length>72?"…":""}
                            </div>
                          )}

                          {/* Progress bar — active events */}
                          {isActive && (
                            <div style={{ borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:10 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.6875rem",
                                color:"rgba(255,255,255,0.7)", marginBottom:5, fontWeight:600 }}>
                                <span>{progressPct}% complete</span>
                                <span>{totalDays - dayOf} day{totalDays-dayOf!==1?"s":""} left</span>
                              </div>
                              <div style={{ height:3, background:"rgba(0,0,0,0.2)", borderRadius:2, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:progressPct+"%", background:"rgba(255,255,255,0.8)", borderRadius:2, transition:"width .3s" }} />
                              </div>
                            </div>
                          )}

                          {/* Countdown — upcoming events */}
                          {me.showCountdown && !isActive && (
                            <div style={{ borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:10 }}>
                              <div className="countdown-block">
                                {days > 0 && (
                                  <><div className="countdown-unit">
                                    <div className="countdown-num">{days}</div>
                                    <div className="countdown-label">days</div>
                                  </div><div className="countdown-sep">:</div></>
                                )}
                                <div className="countdown-unit"><div className="countdown-num">{String(hours).padStart(2,"0")}</div><div className="countdown-label">hrs</div></div>
                                <div className="countdown-sep">:</div>
                                <div className="countdown-unit"><div className="countdown-num">{String(mins).padStart(2,"0")}</div><div className="countdown-label">min</div></div>
                                <div className="countdown-sep">:</div>
                                <div className="countdown-unit"><div className="countdown-num">{String(secs).padStart(2,"0")}</div><div className="countdown-label">sec</div></div>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                    {/* Peek stack — narrower pills behind the first card hint at hidden ones */}
                    {peekCards.length > 0 && (
                      <div style={{ position:"relative", height: peekCards.length * 8 + 4, marginTop: -6, marginBottom: 10 }}>
                        {peekCards.map((peek, pi) => (
                          <div key={peek.id+"-peek"} onClick={() => setMajorExpanded(true)}
                            style={{ position:"absolute", top: pi*6, left:(pi+1)*8, right:(pi+1)*8,
                              height: 12, borderRadius: 18, cursor:"pointer",
                              background:"linear-gradient(135deg,"+peek.color+"dd,"+peek.color+"99)",
                              border:"1px solid "+peek.color+"44",
                              boxShadow:"0 2px 8px "+peek.color+"33" }} />
                        ))}
                      </div>
                    )}
                    {canCollapse && (
                      <button onClick={() => setMajorExpanded(v => !v)}
                        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                          gap:6, padding:"8px 12px", marginBottom:12,
                          background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10,
                          color:"var(--muted)", fontFamily:"var(--font)", fontSize:"0.75rem", fontWeight:600,
                          cursor:"pointer" }}>
                        {majorExpanded ? "Show less" : `Show ${hiddenCount} more`}
                        <span style={{ display:"inline-flex", width:14, height:14,
                          transform: majorExpanded ? "rotate(-90deg)" : "rotate(90deg)", transition:"transform .15s" }}>
                          {Icon.chevR}
                        </span>
                      </button>
                    )}
                  </div>
                );
              }

              if (id === "pinned") {
                const pinned = visibleEvents.filter(e => pinnedEvents.has(baseEventId(e.id))).sort((a,b)=>a.start-b.start);
                if (pinned.length === 0) return null;
                return (
                  <div key="pinned" style={{ marginBottom:4 }}>
                    <div className="section-label" style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ display:"flex", width:11, height:11, color:"#f59e0b" }}>{Icon.pin2}</span> Pinned
                    </div>
                    {pinned.map(ev => (
                      <EventPill key={ev.id} ev={ev} cal={calForCalendar(ev.calendarId)} showDate onClick={() => openEvent(ev)} onDelete={() => deleteEvent(ev.id)} />
                    ))}
                  </div>
                );
              }
              if (id === "nextup") {
                // Today's full schedule (upcoming first, then passed); fall back to tomorrow.
                // Use expanded events so recurring occurrences show up — filtering
                // against `visibleEvents` directly misses them because the base
                // event's start date may be well in the past.
                const todayAll = todayEvents;
                const tomorrow = new Date(TODAY); tomorrow.setDate(tomorrow.getDate()+1);
                const tomFrom = new Date(tomorrow); tomFrom.setHours(0,0,0,0);
                const tomTo = new Date(tomorrow); tomTo.setHours(23,59,59,999);
                const tomorrowEvs = expandEvents(visibleEvents, tomFrom, tomTo)
                  .filter(e => sameDay(e.start, tomorrow))
                  .sort((a,b) => a.start - b.start)
                  .slice(0,4);
                // In non-split views (mobile + compact) show past and upcoming
                // events from today side-by-side — separate caps so earlier
                // events don't crowd out what's coming up. In split mode the
                // persistent calendar handles past visibility, so keep the
                // tighter top-4 list there.
                const upNext = (!isSplit && todayAll.length > 0)
                  ? [
                      ...todayAll.filter(e => e.end < now2).slice(-3),
                      ...todayAll.filter(e => e.end >= now2).slice(0, 5),
                    ]
                  : (todayAll.length > 0 ? todayAll.slice(0,4) : tomorrowEvs);
                const anyFutureToday = todayAll.some(e => e.start > now2);
                const sectionLabel = todayAll.length > 0 ? (anyFutureToday ? "Today" : "Earlier today") : tomorrowEvs.length > 0 ? "Tomorrow" : null;
                if (upNext.length === 0) {
                  if (canShowPlaceholder("nextup") && events.length === 0) {
                    return (
                      <EmptyStateCard key="nextup-empty"
                        icon={Icon.plus}
                        title="Your events will appear here"
                        body="Tap the + button to create your first event. Daytu will show what's coming up today and tomorrow right here."
                        cta="Create an event"
                        onCta={() => openNewEvent()}
                        onDismiss={() => dismissPlaceholder("nextup")}
                      />
                    );
                  }
                  return null;
                }
                return (
                  <div key="nextup" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:14, marginBottom:16 }}>
                    <div style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"var(--muted)", marginBottom:10 }}>{sectionLabel}</div>
                    {upNext.map((ev, idx) => {
                      const isPast = ev.end < now2;
                      const isNow = !isPast && ev.start <= now2;
                      const secUntil = Math.floor((ev.start - now2) / 1000);
                      const daysU = Math.floor(Math.abs(secUntil)/86400), hoursU = Math.floor((Math.abs(secUntil)%86400)/3600), minsU = Math.floor((Math.abs(secUntil)%3600)/60);
                      const duration = isPast ? "done"
                        : isNow ? "now"
                        : daysU > 0 ? `${daysU}d ${hoursU}h`
                        : hoursU > 0 ? `${hoursU}h ${minsU}m`
                        : `${minsU}m`;
                      const countdownLabel = isPast || isNow ? duration : "Upcoming in " + duration;
                      const cal = calForCalendar(ev.calendarId);
                      const col = ev.color || cal.color || "var(--accent)";
                      // Pretty URL → hostname (matches EventPill's fallback chain)
                      const urlHost = (() => {
                        const raw = ev.url && ev.url.trim();
                        if (!raw) return null;
                        try { return new URL(raw).hostname.replace(/^www\./, ""); } catch {}
                        try { return new URL("https://"+raw).hostname.replace(/^www\./, ""); } catch {}
                        return raw;
                      })();
                      const hasMeta = ev.location || ev.notes || urlHost;
                      return (
                        <div key={ev.id} onClick={() => openEvent(ev)}
                          style={{ display:"flex", alignItems:"stretch", gap:10, padding:"10px 0",
                            borderBottom: idx < upNext.length-1 ? "1px solid var(--border)" : "none",
                            cursor:"pointer", opacity: isPast ? 0.5 : 1 }}>
                          <div style={{ width:3, alignSelf:"stretch", borderRadius:2, background:col, flexShrink:0 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            {/* Title row + countdown */}
                            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                              <div style={{ fontSize:"0.875rem", fontWeight:600, whiteSpace:"nowrap",
                                overflow:"hidden", textOverflow:"ellipsis", flex:1, minWidth:0,
                                textDecoration: isPast ? "line-through" : "none" }}>
                                {ev.title}
                              </div>
                              <div style={{ fontSize:"0.6875rem", fontWeight:700,
                                color: isPast ? "var(--muted)" : col, fontFamily:"var(--mono)",
                                flexShrink:0, whiteSpace:"nowrap" }}>
                                {countdownLabel}
                              </div>
                            </div>
                            {/* Time range */}
                            <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontFamily:"var(--mono)", marginTop:2 }}>
                              {ev.allDay ? "All day" : fmtTime(ev.start) + " – " + fmtTime(ev.end)}
                            </div>
                            {/* Location / URL / Notes — compact inline pills so the card
                                stays one scan-line. Each pill truncates on its own; the row
                                wraps if there's not enough width. */}
                            {hasMeta && (
                              <div style={{ marginTop:5, display:"flex", flexWrap:"wrap", gap:4 }}>
                                {ev.location && (
                                  <span style={{ display:"inline-flex", alignItems:"center", gap:3,
                                    background:"var(--surface2)", borderRadius:6, padding:"2px 7px",
                                    fontSize:"0.625rem", color:"var(--muted)", maxWidth:160 }}>
                                    <span style={{ display:"inline-flex", width:10, height:10, flexShrink:0 }}>{Icon.mapPin}</span>
                                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0 }}>{ev.location}</span>
                                  </span>
                                )}
                                {urlHost && (
                                  <span style={{ display:"inline-flex", alignItems:"center", gap:3,
                                    background:"rgba(96,165,250,0.14)", borderRadius:6, padding:"2px 7px",
                                    fontSize:"0.625rem", color:"#60a5fa", maxWidth:160 }}>
                                    <span style={{ fontWeight:700 }}>URL:</span>
                                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0 }}>{urlHost}</span>
                                  </span>
                                )}
                                {ev.notes && (
                                  <span style={{ display:"inline-flex", alignItems:"center", gap:3,
                                    background:"var(--surface2)", borderRadius:6, padding:"2px 7px",
                                    fontSize:"0.625rem", color:"var(--muted)", maxWidth:180 }}>
                                    <span style={{ fontWeight:700 }}>Notes:</span>
                                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0 }}>{ev.notes}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (id === "shiftstatus") {
                if (!shifts || shifts.length === 0) return null;
                const todayY = TODAY.getFullYear(), todayM = TODAY.getMonth(), todayD = TODAY.getDate();
                const oKeyOf = (pid) => pid + ":" + todayY + "-" + todayM + "-" + todayD;
                const minsNow = now2.getHours() * 60 + now2.getMinutes();
                const parseHM = (s) => { const [h,m] = s.split(":").map(Number); return h*60 + m; };
                const fmtHM = (s) => fmtClock(s);
                const rows = shifts.map(p => {
                  const isNatural = p.type === "rotation" ? getRotationStatus(p, TODAY) === "work"
                    : p.type === "monthly" ? isMonthlyWorkDay(p, TODAY)
                    : (p.config?.days ?? []).includes(TODAY.getDay());
                  const isHidden = shiftOverrides.has(oKeyOf(p.id));
                  const isExtra = shiftOverrides.has("extra:" + oKeyOf(p.id));
                  const isWorkToday = (isNatural && !isHidden) || (!isNatural && isExtra);
                  const st = getEffectiveShiftTime(p, TODAY);
                  if (!isWorkToday) return { p, state:"off", sub:"off today" };
                  if (!st?.enabled) return { p, state:"on-allday", sub:"all day" };
                  const startM = parseHM(st.start), endM = parseHM(st.end);
                  const overnight = endM <= startM;
                  let active;
                  if (overnight) active = minsNow >= startM || minsNow < endM;
                  else active = minsNow >= startM && minsNow < endM;
                  if (active) return { p, state:"on", sub:"until " + fmtHM(st.end) };
                  if (!overnight && minsNow < startM) return { p, state:"upcoming", sub:"starts " + fmtHM(st.start) };
                  return { p, state:"ended", sub:"ended " + fmtHM(st.end) };
                });
                rows.sort((a,b) => {
                  const rank = { on:0, "on-allday":1, upcoming:2, ended:3, off:4 };
                  return rank[a.state] - rank[b.state];
                });
                const goToShift = (pid) => { setCalShiftFilter(pid); setTab("calendar"); };
                return (
                  <div key="shiftstatus" style={{ marginBottom:16 }}>
                    <div className="section-label" style={{ marginBottom:8 }}>Shifts today</div>
                    <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, WebkitOverflowScrolling:"touch" }}>
                      {rows.map(({ p, state, sub }) => {
                        const c = p.color || "#6366f1";
                        const isOn = state === "on" || state === "on-allday";
                        const bg = state === "on" ? c + "26"
                          : state === "on-allday" ? c + "1a"
                          : state === "upcoming" ? "transparent"
                          : "var(--surface2)";
                        const border = state === "on" ? "1.5px solid " + c
                          : state === "on-allday" ? "1px solid " + c + "55"
                          : state === "upcoming" ? "1px dashed " + c + "88"
                          : "1px solid var(--border)";
                        const textColor = isOn ? "var(--text)" : "var(--muted)";
                        const dotColor = state === "off" ? "var(--muted)"
                          : state === "ended" ? c + "66"
                          : c;
                        return (
                          <button key={p.id} onClick={() => goToShift(p.id)}
                            style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6,
                              padding:"6px 10px", borderRadius:20, background:bg, border,
                              cursor:"pointer", fontFamily:"var(--font)",
                              opacity: state === "off" ? 0.7 : 1 }}>
                            <span style={{ width:8, height:8, borderRadius:"50%", background:dotColor,
                              animation: state === "on" ? "nowPulse 2s ease-in-out infinite" : undefined,
                              flexShrink:0 }} />
                            <span style={{ fontSize:"0.75rem", fontWeight:700, color:textColor,
                              textDecoration: state === "off" ? "line-through" : "none" }}>{p.name}</span>
                            <span style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:500 }}>{sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (id === "status") {
                if (!currentEvent) return null;
                const evColor = currentEvent.color || calForCalendar(currentEvent.calendarId).color || "var(--accent)";
                return (
                  <div key="status" className="now-card">
                    <div className="now-card-bar" style={{ background:evColor, boxShadow:"0 0 12px "+evColor+"66" }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                        <div className="now-card-pulse" />
                        <div style={{ fontSize:"0.6875rem", color:"var(--accent2)", fontWeight:800, letterSpacing:"1px" }}>HAPPENING NOW</div>
                      </div>
                      <div style={{ fontSize:"0.9375rem", fontWeight:700, color:"var(--text)" }}>{currentEvent.title}</div>
                      <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:1 }}>
                        {fmtTime(currentEvent.start)} – {fmtTime(currentEvent.end)}
                        {currentEvent.location ? " · " + currentEvent.location : ""}
                      </div>
                    </div>
                  </div>
                );
              }

              if (id === "freetime") {
                const fmtGapDur = (ms) => {
                  const hrs = Math.round(ms/360000)/10;
                  return hrs >= 1 ? hrs + " hr" : Math.round(ms/60000) + " min";
                };
                return (
                  <div key="freetime" ref={setTourRef("search")} style={{ background:"linear-gradient(135deg,rgba(52,211,153,0.18),rgba(16,185,129,0.1))", border:"1px solid rgba(52,211,153,0.35)", borderRadius:16, padding:16, marginBottom:16 }}>
                    <div className="freetime-label" style={{ fontSize:"0.8125rem", fontWeight:700, marginBottom:10 }}>When am I free?</div>

                    {/* Search input */}
                    <div style={{ display:"flex", gap:8, alignItems:"center", background:"rgba(0,0,0,0.15)", borderRadius:10, padding:"8px 12px", marginBottom:12 }}>
                      <span style={{ display:"flex", width:14, height:14, color:"#34d399", flexShrink:0 }}>{Icon.search}</span>
                      <input
                        value={freeTimeQuery}
                        onChange={e => setFreeTimeQuery(e.target.value)}
                        placeholder="e.g. free today, next 2 hours, Friday..."
                        style={{ background:"none", border:"none", outline:"none", flex:1,
                          fontSize:"1rem", color:"var(--text)", fontFamily:"var(--font)" }}
                      />
                      {freeTimeQuery.length > 0 && (
                        <span onClick={() => setFreeTimeQuery("")}
                          style={{ display:"flex", width:14, height:14, color:"var(--muted)", cursor:"pointer", flexShrink:0 }}>{Icon.close}</span>
                      )}
                    </div>

                    {/* Hint chips */}
                    {!freeTimeQuery && (
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:4 }}>
                        {["Free today","Next free day","Free afternoon","This weekend"].map(hint => (
                          <div key={hint} onClick={() => setFreeTimeQuery(hint)}
                            style={{ fontSize:"0.6875rem", padding:"4px 10px", borderRadius:20, cursor:"pointer",
                              background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.3)",
                              color:"var(--text)", fontWeight:500 }}>
                            {hint}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Time-of-day filter pill */}
                    {freeTimeAnswer && !freeTimeAnswer.busy && freeTimeAnswer.todLabel && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, marginBottom:4, flexWrap:"wrap" }}>
                        <div className="freetime-label" style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", opacity:0.7 }}>Filter:</div>
                        <div style={{ fontSize:"0.6875rem", fontWeight:600, background:"rgba(124,106,247,0.2)",
                          color:"var(--accent2)", padding:"2px 8px", borderRadius:10 }}>
                          {freeTimeAnswer.todLabel}
                        </div>
                      </div>
                    )}

                    {/* Answer */}
                    {freeTimeAnswer && (() => {
                      // Unified chronological preview: all-day items (shifts with
                      // no time, all-day majors/events) sit at the top, then each
                      // timed item is listed with its start – end range.
                      const renderWhatsOn = (whatsOn) => {
                        if (!whatsOn || !whatsOn.items || whatsOn.items.length === 0) return null;
                        const shapeFor = (kind) => kind === "shift" ? 2 : 99; // square for shift, round otherwise
                        return (
                          <div style={{ marginTop:6, padding:"8px 10px", background:"var(--surface2)",
                            border:"1px solid var(--border)", borderRadius:8 }}>
                            <div style={{ fontSize:"0.625rem", fontWeight:700, textTransform:"uppercase",
                              letterSpacing:"0.6px", color:"var(--muted)", marginBottom:5 }}>On this day</div>
                            {whatsOn.items.map((it, ii) => (
                              <div key={ii} style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.75rem",
                                color:"var(--text)", lineHeight:1.5, minWidth:0 }}>
                                <div style={{ width:6, height:6, borderRadius:shapeFor(it.kind), background:it.color, flexShrink:0 }} />
                                <span style={{ fontWeight: it.kind === "event" ? 500 : 600,
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0, flex:1 }}>
                                  {it.title}
                                </span>
                                <span style={{ color:"var(--muted)", fontFamily:"var(--mono)", fontSize:"0.6875rem", flexShrink:0 }}>
                                  {it.allDay ? "all day"
                                    : fmtTime(new Date(it.startMs)) + " – " + fmtTime(new Date(it.endMs))}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      };
                      return freeTimeAnswer.busy ? (
                        <div style={{ marginTop:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10,
                            background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.3)",
                            borderRadius:10, padding:"10px 12px" }}>
                            <div style={{ width:3, alignSelf:"stretch", borderRadius:2, background:"#f87171", flexShrink:0 }} />
                            <div style={{ fontSize:"0.8125rem", color:"var(--text)", fontWeight:500 }}>{freeTimeAnswer.text}</div>
                          </div>
                          {renderWhatsOn(freeTimeAnswer.whatsOn)}
                        </div>
                      ) : (
                        <div style={{ marginTop:4 }}>
                          {/* Primary option — day with any gaps */}
                          {freeTimeAnswer.answers.map((a, ai) => {
                            const dLabel = sameDay(a.day, new Date()) ? "Today"
                              : sameDay(a.day, (() => { const t=new Date(); t.setDate(t.getDate()+1); return t; })()) ? "Tomorrow"
                              : a.day.toLocaleDateString([],{weekday:"long", month:"short", day:"numeric"});
                            return (
                              <div key={ai} style={{ marginBottom: 10 }}>
                                {freeTimeAnswer.fullClearDay && (
                                  <div className="freetime-label" style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", opacity:0.7, marginBottom:4 }}>Soonest with free time</div>
                                )}
                                <div className="freetime-label" style={{ fontSize:"0.75rem", fontWeight:700, marginBottom:4 }}>{dLabel}</div>
                                {a.gaps.map((g, gi) => (
                                  <div key={gi} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                                    background:"rgba(52,211,153,0.12)", border:"1px solid rgba(52,211,153,0.25)",
                                    borderRadius:8, padding:"8px 12px", marginBottom: gi < a.gaps.length-1 ? 4 : 0 }}>
                                    <div className="freetime-slot-time" style={{ fontSize:"0.8125rem", fontFamily:"var(--mono)", fontWeight:600 }}>
                                      {fmtTime(new Date(g.startMs))} – {fmtTime(new Date(g.endMs))}
                                    </div>
                                    <div className="freetime-label" style={{ fontSize:"0.75rem", fontWeight:600 }}>
                                      {fmtGapDur(g.gapMs)} free
                                    </div>
                                  </div>
                                ))}
                                {renderWhatsOn(a.whatsOn)}
                              </div>
                            );
                          })}
                          {/* Secondary option — fully clear day */}
                          {freeTimeAnswer.fullClearDay && (() => {
                            const fd = freeTimeAnswer.fullClearDay;
                            const tomorrow = (() => { const t=new Date(); t.setDate(t.getDate()+1); return t; })();
                            const dLabel = sameDay(fd.day, tomorrow) ? "Tomorrow"
                              : fd.day.toLocaleDateString([],{weekday:"long", month:"short", day:"numeric"});
                            return (
                              <div>
                                <div className="freetime-label" style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", opacity:0.7, marginBottom:4 }}>First fully clear day</div>
                                <div className="freetime-label" style={{ fontSize:"0.75rem", fontWeight:700, marginBottom:4 }}>{dLabel}</div>
                                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                                  background:"rgba(52,211,153,0.18)", border:"1px solid rgba(52,211,153,0.4)",
                                  borderRadius:8, padding:"8px 12px" }}>
                                  <div className="freetime-slot-time" style={{ fontSize:"0.8125rem", fontFamily:"var(--mono)", fontWeight:600 }}>
                                    All day
                                  </div>
                                  <div className="freetime-label" style={{ fontSize:"0.75rem", fontWeight:600 }}>24 hr free</div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </div>
                );
              }

              return null;
            })}

            {/* Logo — mobile only, subtle mark at bottom of home */}
            {!isDesktop && !isSplit && (
              <div style={{ display:"flex", justifyContent:"center", padding:"24px 0 8px", opacity:0.5 }}>
                <DaytuLogo size={48} />
              </div>
            )}
          </div>
        )}

        {/* CALENDAR TAB (also renders persistently in split mode, in its own panel) */}
        {(tab === "calendar" || isSplit) && (
          <div className={isSplit ? "split-calendar-panel" : "screen"}
            ref={tab === "calendar" && !isSplit ? setScreenRef : undefined}>

            {/* ── Top bar: month title + nav ── */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              {calView === "month" ? (
                <>
                  <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month-1); return { year:d.getFullYear(), month:d.getMonth() }; })}
                    style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--text)", flexShrink:0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={18} height={18}><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span onClick={() => { setCalMonth({year:TODAY.getFullYear(),month:TODAY.getMonth()}); setSelectedDate(new Date(TODAY)); setWeekAnchor(() => { const d = new Date(TODAY); d.setDate(d.getDate()-d.getDay()); return d; }); }}
                    style={{ fontSize:"1.0625rem", fontWeight:700, cursor:"pointer", letterSpacing:"-0.3px", color:"var(--text)" }}>
                    {MONTHS[calMonth.month]} {calMonth.year}
                  </span>
                  <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month+1); return { year:d.getFullYear(), month:d.getMonth() }; })}
                    style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--text)", flexShrink:0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={18} height={18}><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={calView==="day" ? () => { const d=new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); } : prevWeek}
                    style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--text)", flexShrink:0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={18} height={18}><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span style={{ fontSize:"0.9375rem", fontWeight:700, letterSpacing:"-0.2px", color:"var(--text)" }}>
                    {calView==="day" ? fmtDate(selectedDate) : fmtDateShort(weekDays[0])+" – "+fmtDateShort(weekDays[6])}
                  </span>
                  <button onClick={calView==="day" ? () => { const d=new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); } : nextWeek}
                    style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--text)", flexShrink:0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={18} height={18}><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </>
              )}
            </div>

            {/* ── View switcher + Today jump ── */}
            <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center" }}>
              <div ref={isSplit ? (el => { if (el) tourRefs.current["nav-calendar"] = el; }) : undefined}
                style={{ display:"flex", gap:4, background:"var(--surface2)", borderRadius:10, padding:3, flex:1 }}>
                {[["month","Month"],["week","Week"],["day","Day"]].map(([v,l]) => (
                  <button key={v} onClick={() => setCalView(v)}
                    style={{ flex:1, padding:"6px 0", borderRadius:7, border:"none", fontFamily:"var(--font)",
                      fontSize:"0.75rem", fontWeight:600, cursor:"pointer", transition:"all .15s",
                      background: calView===v ? "var(--surface)" : "none",
                      color: calView===v ? "var(--text)" : "var(--muted)" }}>{l}</button>
                ))}
              </div>
              {(() => {
                // Show "Today" only when user is NOT currently viewing today
                const onToday =
                  calView === "month"
                    ? (calMonth.year === TODAY.getFullYear() && calMonth.month === TODAY.getMonth())
                    : calView === "day"
                    ? sameDay(selectedDate, TODAY)
                    : (TODAY >= weekDays[0] && TODAY <= weekDays[6]);
                if (onToday) return null;
                return (
                  <button onClick={() => {
                    setCalMonth({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
                    setSelectedDate(new Date(TODAY));
                    setWeekAnchor(() => { const d = new Date(TODAY); d.setDate(d.getDate()-d.getDay()); return d; });
                  }}
                    style={{ background:"var(--accent)", color:"#fff", border:"none", borderRadius:10,
                      padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer",
                      fontFamily:"var(--font)", flexShrink:0 }}>
                    Today
                  </button>
                );
              })()}
            </div>

            {calView === "month" && (
              <>
                {/* Shift filter — scrollable single row */}
                {shifts.length > 0 && (
                  <div style={{ display:"flex", gap:5, overflowX:"auto", marginBottom:12, paddingBottom:2, WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
                    <button onClick={() => setCalShiftFilter(null)}
                      style={{ flexShrink:0, padding:"5px 12px", borderRadius:14, fontSize:"0.6875rem", fontWeight:700,
                        border:"1.5px solid "+(calShiftFilter===null ? "var(--accent)" : "var(--border)"),
                        background: calShiftFilter===null ? "var(--accent)" : "var(--surface2)",
                        color: calShiftFilter===null ? "white" : "var(--muted)",
                        cursor:"pointer", fontFamily:"var(--font)" }}>All</button>
                    {shifts.map(p => (
                      <button key={p.id} onClick={() => setCalShiftFilter(calShiftFilter===p.id ? null : p.id)}
                        style={{ flexShrink:0, display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:14,
                          border:"1.5px solid " + (calShiftFilter===p.id ? p.color : "var(--border)"),
                          background: calShiftFilter===p.id ? p.color+"22" : "var(--surface2)",
                          color: calShiftFilter===p.id ? p.color : "var(--muted)",
                          cursor:"pointer", fontSize:"0.6875rem", fontWeight:700, fontFamily:"var(--font)" }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:p.color, flexShrink:0 }} />
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Calendar grid */}
                <MonthGrid year={calMonth.year} month={calMonth.month} events={visibleEvents} calendars={calendars}
                  shifts={calShiftFilter ? shifts.filter(p => p.id === calShiftFilter) : shifts}
                  majorEvents={calShiftFilter ? [] : visibleMajorEvents}
                  shiftOverrides={shiftOverrides}
                  onLongPress={(date) => setDayPopup({ date })}
                  onQuickAdd={openAddChooser}
                  dayNotes={dayNotes}
                  holidays={holidays} holidayCountries={holidayCountries}
                  selectedDate={selectedDate} onSelect={d => setSelectedDate(d)}
                  previewShift={previewShift} previewEvent={previewEvent} previewMajor={previewMajor} />

                {/* Legend — only show major events visible in current month */}
                {(() => {
                  const monthStart = new Date(calMonth.year, calMonth.month, 1);
                  const monthEnd = new Date(calMonth.year, calMonth.month + 1, 0, 23, 59, 59);
                  const visibleMajor = (calShiftFilter ? [] : visibleMajorEvents).filter(me => {
                    const [lsy,lsm,lsd]=me.startDate.slice(0,10).split("-").map(Number);
                    const [ley,lem,led]=me.endDate.slice(0,10).split("-").map(Number);
                    const start = new Date(lsy,lsm-1,lsd);
                    const end   = new Date(ley,lem-1,led); end.setHours(23,59,59,999);
                    return start <= monthEnd && end >= monthStart;
                  });
                  if (shifts.length === 0 && visibleMajor.length === 0) return null;
                  return (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:10, paddingTop:10, borderTop:"1px solid var(--border)" }}>
                      {shifts.map(p => (
                        <div key={p.id} style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.6875rem", color:"var(--muted)" }}>
                          <svg width="14" height="14" viewBox="0 0 100 100" style={{flexShrink:0}}><path d="M 65 4 L 78 4 A 18 18 0 0 1 96 22 L 96 78 A 18 18 0 0 1 78 96 L 22 96 A 18 18 0 0 1 4 78 L 4 22 A 18 18 0 0 1 22 4 L 35 4" fill="none" stroke={p.color||"#6366f1"} strokeWidth="8" strokeLinecap="round" /></svg>
                          {p.name}
                        </div>
                      ))}
                      {visibleMajor.map(me => (
                        <div key={me.id} style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.6875rem", color:"var(--muted)" }}>
                          <div style={{ width:14, height:14, borderRadius:3, flexShrink:0, position:"relative", overflow:"hidden",
                            border:"1.5px solid "+me.color+"77",
                            background:"repeating-linear-gradient(45deg,"+me.color+"40 0px,"+me.color+"40 3px,transparent 3px,transparent 9px)" }}>
                            <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:6, height:2, borderRadius:1, background:me.color }} />
                          </div>
                          {me.title}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}

            {calView === "week" && (
              <>
                {/* Layout sub-toggle: Columns (whole week) vs Grid (24-hour) */}
                <div style={{ display:"flex", gap:4, background:"var(--surface2)", borderRadius:10,
                  padding:3, marginBottom:14, width:"fit-content" }}>
                  {[["columns","Columns"],["grid","Grid"]].map(([v,l]) => (
                    <button key={v} onClick={() => setWeekLayout(v)}
                      style={{ padding:"5px 12px", borderRadius:7, border:"none",
                        fontFamily:"var(--font)", fontSize:"0.6875rem", fontWeight:600, cursor:"pointer",
                        transition:"all .15s",
                        background: weekLayout===v ? "var(--surface)" : "none",
                        color: weekLayout===v ? "var(--text)" : "var(--muted)" }}>{l}</button>
                  ))}
                </div>
                {weekLayout === "columns" ? (
                  <WeekViewColumns weekDays={weekDays} events={visibleEvents} calendars={calendars}
                    shifts={shifts} shiftOverrides={shiftOverrides}
                    majorEvents={visibleMajorEvents} holidays={holidays} holidayCountries={holidayCountries}
                    selectedDate={selectedDate}
                    onSelect={d => setSelectedDate(d)}
                    onOpenDay={d => { setSelectedDate(d); setCalView("day"); }}
                    onEventClick={openEvent}
                    onMajorEventClick={openMajorEventDetail} />
                ) : (
                  <WeekView weekDays={weekDays} events={visibleEvents} calendars={calendars}
                    majorEvents={visibleMajorEvents} holidays={holidays} holidayCountries={holidayCountries}
                    selectedDate={selectedDate} onSelect={d => setSelectedDate(d)}
                    onQuickAdd={openAddChooser}
                    onEventClick={openEvent} />
                )}
              </>
            )}

            {calView === "day" && (
              <DayView date={selectedDate} events={visibleEvents} calendars={calendars}
              majorEvents={visibleMajorEvents} holidays={holidays} holidayCountries={holidayCountries}
              onEventClick={openEvent} />
            )}

            {dayPopup && (() => {
              const activeForDay = shifts.filter(p => {
                if (p.type === "rotation") return getRotationStatus(p, dayPopup.date) === "work";
                if (p.type === "weekly") return (p.config.days ?? []).includes(dayPopup.date.getDay());
                if (p.type === "monthly") return isMonthlyWorkDay(p, dayPopup.date);
                return false;
              });
              const inactiveForDay = shifts.filter(p => !activeForDay.includes(p));
              return (
                <div className="sheet-overlay" onClick={() => { setDayPopup(null); setEditingShiftTime(null); }}>
                  <div className="sheet" onClick={e => e.stopPropagation()}>
                    <div className="sheet-handle" />
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                      <div style={{ fontSize:"1.0625rem", fontWeight:700 }}>{fmtDate(dayPopup.date)}</div>
                      <button className="btn-icon" style={{ background:"var(--surface3)" }} onClick={() => { setDayPopup(null); setEditingShiftTime(null); }}>{Icon.close}</button>
                    </div>
                    {activeForDay.length > 0 && <div className="section-label" style={{ marginBottom:8 }}>Active shifts</div>}
                    {activeForDay.map(p => {
                      const hidden = isOverridden(p.id, dayPopup.date);
                      const effTime = getEffectiveShiftTime(p, dayPopup.date);
                      const hasOverride = hasShiftTimeOverride(p.id, dayPopup.date);
                      const isEditing = editingShiftTime?.shiftId === p.id;
                      return (
                        <div key={p.id} style={{ marginBottom:6 }}>
                          <div onClick={() => toggleShiftOverride(p.id, dayPopup.date)}
                            style={{ display:"flex", alignItems:"center", gap:10, padding:"12px", borderRadius:10, cursor:"pointer",
                              background: hidden ? "var(--surface2)" : p.color+"22",
                              border:"1px solid "+(hidden ? "var(--border)" : p.color+"55"),
                              opacity: hidden ? 0.6 : 1, transition:"all .15s" }}>
                            <div style={{ width:10, height:10, borderRadius:3, flexShrink:0, background: hidden ? "transparent" : p.color, border:"2px solid "+p.color }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:"0.875rem", fontWeight:500, color: hidden ? "var(--muted)" : "var(--text)", textDecoration: hidden ? "line-through" : "none" }}>{p.name}</div>
                              {effTime?.enabled && (
                                <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontFamily:"var(--mono)", marginTop:2 }}>
                                  {fmtClock(effTime.start)} – {fmtClock(effTime.end)}{hasOverride ? " · custom" : ""}
                                </div>
                              )}
                            </div>
                            {!hidden && (
                              <button onClick={e => {
                                  e.stopPropagation();
                                  if (isEditing) { setEditingShiftTime(null); return; }
                                  setEditingShiftTime({
                                    shiftId: p.id,
                                    start: effTime?.start || "09:00",
                                    end: effTime?.end || "17:00",
                                  });
                                }}
                                title="Edit time for this day"
                                style={{ display:"flex", alignItems:"center", justifyContent:"center",
                                  width:28, height:28, borderRadius:8, padding:0, flexShrink:0,
                                  background: isEditing ? p.color+"33" : "transparent",
                                  border:"1px solid "+(isEditing ? p.color+"66" : "var(--border)"),
                                  color: isEditing ? p.color : "var(--muted)", cursor:"pointer" }}>
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                              </button>
                            )}
                            <div style={{ fontSize:"0.75rem", fontWeight:600, color: hidden ? "#f87171" : "#34d399" }}>{hidden ? "Hidden" : "Visible"}</div>
                          </div>
                          {isEditing && (
                            <div style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, padding:"10px 12px", marginTop:4 }}>
                              <div style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", color:"var(--muted)", marginBottom:8 }}>
                                Time for {fmtDate(dayPopup.date)}
                              </div>
                              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
                                <input type="time" value={editingShiftTime.start}
                                  onChange={e => setEditingShiftTime(v => ({ ...v, start: e.target.value }))}
                                  style={{ flex:1, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8,
                                    padding:"8px 10px", fontFamily:"var(--font)", fontSize:"0.875rem", color:"var(--text)" }} />
                                <span style={{ color:"var(--muted)" }}>–</span>
                                <input type="time" value={editingShiftTime.end}
                                  onChange={e => setEditingShiftTime(v => ({ ...v, end: e.target.value }))}
                                  style={{ flex:1, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8,
                                    padding:"8px 10px", fontFamily:"var(--font)", fontSize:"0.875rem", color:"var(--text)" }} />
                              </div>
                              <div style={{ display:"flex", gap:8 }}>
                                {hasOverride && (
                                  <button onClick={() => { clearShiftTimeForDate(p.id, dayPopup.date); setEditingShiftTime(null); }}
                                    style={{ flex:1, padding:"8px", borderRadius:8, background:"var(--surface)",
                                      border:"1px solid var(--border)", fontSize:"0.8125rem", fontWeight:600,
                                      color:"var(--muted)", cursor:"pointer", fontFamily:"var(--font)" }}>
                                    Reset to default
                                  </button>
                                )}
                                <button onClick={() => {
                                    setShiftTimeForDate(p.id, dayPopup.date, editingShiftTime.start, editingShiftTime.end);
                                    setEditingShiftTime(null);
                                  }}
                                  style={{ flex:1, padding:"8px", borderRadius:8, background: p.color,
                                    border:"none", fontSize:"0.8125rem", fontWeight:700, color:"#fff",
                                    cursor:"pointer", fontFamily:"var(--font)" }}>
                                  Save
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {inactiveForDay.length > 0 && (
                      <>
                        <div className="section-label" style={{ marginTop:12, marginBottom:8 }}>Add extra shift</div>
                        {inactiveForDay.map(p => {
                          const added = isOverridden("extra:"+p.id, dayPopup.date);
                          return (
                            <div key={p.id} onClick={() => toggleShiftOverride("extra:"+p.id, dayPopup.date)}
                              style={{ display:"flex", alignItems:"center", gap:10, padding:"12px", borderRadius:10, marginBottom:6, cursor:"pointer",
                                background: added ? p.color+"22" : "var(--surface2)",
                                border:"1px solid "+(added ? p.color+"55" : "var(--border)"), transition:"all .15s" }}>
                              <div style={{ width:10, height:10, borderRadius:3, flexShrink:0, background: added ? p.color : "transparent", border:"2px solid "+p.color }} />
                              <div style={{ fontSize:"0.875rem", fontWeight:500, flex:1, color:"var(--text)" }}>{p.name}</div>
                              <div style={{ fontSize:"0.75rem", fontWeight:600, color: added ? "#34d399" : "var(--muted)" }}>{added ? "Added" : "+ Add"}</div>
                            </div>
                          );
                        })}
                      </>
                    )}
                    {activeForDay.length === 0 && inactiveForDay.length === 0 && <div className="empty">No shifts configured</div>}
                  </div>
                </div>
              );
            })()}

            {/* ── Selected day events ── */}
            <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ fontSize:"0.9375rem", fontWeight:700 }}>{sameDay(selectedDate, TODAY) ? "Today" : fmtDate(selectedDate)}
                {selectedDayEvents.length > 0 && <span style={{ fontSize:"0.75rem", color:"var(--muted)", fontWeight:400, marginLeft:6 }}>{selectedDayEvents.length} event{selectedDayEvents.length!==1?"s":""}</span>}
              </div>
              <button onClick={() => setEditingNoteKey(selectedDate.getFullYear()+"-"+selectedDate.getMonth()+"-"+selectedDate.getDate())}
                style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, cursor:"pointer", color:"var(--muted)", fontFamily:"var(--font)", display:"flex", alignItems:"center", gap:5, padding:"5px 10px", fontSize:"0.75rem" }}>
                <span style={{ display:"flex", width:12, height:12 }}>{Icon.edit}</span>Note
              </button>
            </div>
            {(() => {
              const key = selectedDate.getFullYear()+"-"+selectedDate.getMonth()+"-"+selectedDate.getDate();
              const isEditing = editingNoteKey === key;
              const note = dayNotes[key] || "";
              if (isEditing) return (
                <div style={{ marginBottom:12 }}>
                  <textarea className="form-input" value={note}
                    onChange={e => setDayNotes(prev => ({...prev, [key]: e.target.value}))}
                    placeholder="Add a note for this day..."
                    style={{ minHeight:72, marginBottom:6 }} />
                  <button onClick={() => setEditingNoteKey(null)}
                    className="btn btn-secondary" style={{ width:"100%", fontSize:"0.8125rem" }}>Done</button>
                </div>
              );
              if (note) return (
                <div onClick={() => setEditingNoteKey(key)}
                  style={{ background:"rgba(124,106,247,0.08)", border:"1px solid rgba(124,106,247,0.2)", borderRadius:10, padding:"10px 12px", marginBottom:12, cursor:"pointer" }}>
                  <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--accent2)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.5px" }}>Note</div>
                  <div style={{ fontSize:"0.8125rem", color:"var(--text)", lineHeight:1.5 }}>{note}</div>
                </div>
              );
              return null;
            })()}
            {/* Major event cards — read-only, shown above regular events */}
            {(() => {
              const selD = selectedDate;
              const dayMajors = visibleMajorEvents.filter(me => {
                const [sy,sm,sd] = me.startDate.slice(0,10).split("-").map(Number);
                const [ey,em,ed] = me.endDate.slice(0,10).split("-").map(Number);
                const start = new Date(sy,sm-1,sd); start.setHours(0,0,0,0);
                const end   = new Date(ey,em-1,ed); end.setHours(23,59,59,999);
                return selD >= start && selD <= end;
              });
              return dayMajors.map(me => {
                const [sy,sm,sd] = me.startDate.slice(0,10).split("-").map(Number);
                const [ey,em,ed] = me.endDate.slice(0,10).split("-").map(Number);
                const start = new Date(sy,sm-1,sd);
                const end   = new Date(ey,em-1,ed);
                const totalDays = Math.round((end-start)/86400000)+1;
                return (
                  <div key={me.id} onClick={() => openMajorEventDetail(me)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                      borderRadius:10, marginBottom:8, cursor:"pointer",
                      background:"repeating-linear-gradient(45deg,"+me.color+"22 0px,"+me.color+"22 3px,transparent 3px,transparent 9px)",
                      border:"1.5px solid "+me.color+"66" }}>
                    <div style={{ width:3, alignSelf:"stretch", borderRadius:2, background:me.color, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"0.875rem", fontWeight:600, color:"var(--text)" }}>{me.title}</div>
                      <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:1 }}>
                        {fmtDate(start)}{totalDays>1?" – "+fmtDate(end):""}
                        {totalDays>1?" · "+totalDays+" days":""}
                      </div>
                    </div>
                    <div style={{ fontSize:"0.6875rem", fontWeight:700, color:me.color,
                      background:me.color+"22", borderRadius:20, padding:"2px 8px", flexShrink:0 }}>Major</div>
                  </div>
                );
              });
            })()}
            {/* Holiday cards — read-only, shown above personal events */}
            {holidaysForDate(selectedDate).map(h => (
              <div key={h.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                borderRadius:10, marginBottom:8,
                background:h.color+"18", border:`1px solid ${h.color}44` }}>
                <div style={{ width:3, alignSelf:"stretch", borderRadius:2, background:h.color, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:600, color:"var(--text)" }}>{h.name}</div>
                  <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:1 }}>Public holiday</div>
                </div>
                <div style={{ fontSize:"0.6875rem", fontWeight:700, color:h.color,
                  background:h.color+"22", borderRadius:20, padding:"2px 8px" }}>Holiday</div>
              </div>
            ))}
            {(() => {
              const hasMajor = visibleMajorEvents.some(me => {
                const [msy,msm,msd]=me.startDate.slice(0,10).split("-").map(Number);
                const [mey,mem,med]=me.endDate.slice(0,10).split("-").map(Number);
                const start=new Date(msy,msm-1,msd);
                const end=new Date(mey,mem-1,med); end.setHours(23,59,59,999);
                return selectedDate>=start && selectedDate<=end;
              });
              const nothingAtAll = selectedDayEvents.length===0 &&
                holidaysForDate(selectedDate).length===0 && !hasMajor;
              return nothingAtAll ? <div className="empty">Nothing on this day</div> : null;
            })()}
            {(() => {
              const dayConflicts = getConflicts(selectedDayEvents);
              return selectedDayEvents.map(ev => (
                <div key={ev.id} style={{ position:"relative" }}>
                  {dayConflicts.has(ev.id) && (
                    <div style={{ position:"absolute", top:6, right:8, width:8, height:8, borderRadius:"50%", background:"#f87171", zIndex:2 }} />
                  )}
                  <EventPill ev={ev} cal={calForCalendar(ev.calendarId)} onClick={() => openEvent(ev)}
                    onDelete={() => deleteEvent(ev.id)} />
                </div>
              ));
            })()}

            {/* Hidden events for this day */}
            {(() => {
              const hiddenDayEvs = events.filter(e => {
                if (!sameDay(e.start, selectedDate)) return false;
                const calHidden = hiddenCalendars.has(e.calendarId);
                const groupHidden = e.groupIds && e.groupIds.length > 0 && e.groupIds.every(id => hiddenGroups.has(id));
                return calHidden || groupHidden;
              }).sort((a,b) => a.start - b.start);
              if (hiddenDayEvs.length === 0) return null;
              return (
                <div style={{ marginTop:8 }}>
                  <button onClick={() => setHiddenDayExpanded(v => !v)}
                    style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none",
                      cursor:"pointer", fontFamily:"var(--font)", padding:"6px 0", width:"100%" }}>
                    <div style={{ flex:1, height:1, background:"var(--border)" }} />
                    <span style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:600, whiteSpace:"nowrap" }}>
                      <span style={{ display:"inline-flex", width:12, height:12, verticalAlign:"middle" }}>{hiddenDayExpanded ? Icon.chevL : Icon.chevR}</span> {hiddenDayEvs.length} hidden event{hiddenDayEvs.length!==1?"s":""}
                    </span>
                    <div style={{ flex:1, height:1, background:"var(--border)" }} />
                  </button>
                  {hiddenDayExpanded && (
                    <div style={{ opacity:0.6 }}>
                      {hiddenDayEvs.map(ev => {
                        const cal = calForCalendar(ev.calendarId);
                        const hiddenBy = hiddenCalendars.has(ev.calendarId)
                          ? cal.name
                          : groups.filter(g => ev.groupIds.includes(g.id) && hiddenGroups.has(g.id)).map(g=>g.name).join(", ");
                        return (
                          <div key={ev.id} style={{ position:"relative" }}>
                            <div style={{ position:"absolute", top:8, right:8, fontSize:"0.6875rem", color:"var(--muted)", fontWeight:600, zIndex:2, background:"var(--surface2)", borderRadius:4, padding:"1px 5px" }}>
                              hidden · {hiddenBy}
                            </div>
                            <EventPill ev={ev} cal={cal} onClick={() => openEvent(ev)} onDelete={() => deleteEvent(ev.id)} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            </div>
          </div>
        )}

        {/* GROUPS TAB */}
        {tab === "groups" && (() => {
          const friendRequests = friends.filter(f => f.status === "pending_received").length;
          return (
          <div className="screen" ref={setScreenRef}>
            <div className="header">
              <h1>{groupsSubTab === "groups" ? "Groups" : groupsSubTab === "feed" ? "Activity" : groupsSubTab === "friends" ? "Friends" : "Add Friends"}</h1>
              {groupsSubTab === "groups" && <button className="btn btn-secondary" style={{ padding:"8px 14px", fontSize:"0.8125rem" }} onClick={() => setSheet("newGroup")}>+ New</button>}
            </div>
            <div className="sub-tab-row">
              {[
                { v:"groups",  l:"Groups" },
                { v:"feed",    l:"Feed",    badge: userProfile.badges?.feed !== false ? activityFeed.filter(a => a.userId !== "u1" && a.ts > feedSeenAt).length : 0 },
                { v:"friends", l:"Friends", badge: userProfile.badges?.friendRequests !== false ? friendRequests : 0 },
                { v:"add",     l:"Add" },
              ].map(t => (
                <button key={t.v} className={"sub-tab"+(groupsSubTab===t.v?" active":"")}
                  onClick={() => { setGroupsSubTab(t.v); if (t.v === "feed") setFeedSeenAt(new Date()); }}
                  style={{ position:"relative" }}>
                  {t.l}
                  {t.badge > 0 && (
                    <div style={{ position:"absolute", top:2, right:4, minWidth:14, height:14,
                      borderRadius:7, background:"#ef4444", fontSize:"0.6875rem", fontWeight:800,
                      color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                      padding:"0 3px", lineHeight:1 }}>
                      {t.badge > 9 ? "9+" : t.badge}
                    </div>
                  )}
                </button>
              ))}
            </div>
            {groupsSubTab === "groups" && (
              <>
                {groups.length === 0 && (
                  <EmptyState icon={Icon.groups} title="No groups yet"
                    subtitle="Groups are shared calendars — like 'Family' or 'Work Team'. Events you add to a group are visible to its members."
                    actionLabel="Create a group" onAction={() => setSheet("newGroup")} />
                )}
                {groups.map(g => {
                  const members = groupMembers.filter(m => m.groupId === g.id);
                  return (
                    <div key={g.id} className="card">
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                        <div style={{ width:24, height:24, borderRadius:8, background:hiddenGroups.has(g.id) ? "var(--surface3)" : g.color, flexShrink:0, transition:"background .15s" }} />
                        <div style={{ fontWeight:600, fontSize:"1rem", flex:1, opacity: hiddenGroups.has(g.id) ? 0.5 : 1, color:"var(--text)" }}>{g.name}</div>
                        <button onClick={() => setHiddenGroups(prev => { const next = new Set(prev); next.has(g.id) ? next.delete(g.id) : next.add(g.id); return next; })}
                          style={{ background: hiddenGroups.has(g.id) ? "var(--surface2)" : g.color+"22",
                            border:"1.5px solid "+(hiddenGroups.has(g.id) ? "var(--border)" : g.color+"55"),
                            borderRadius:20, padding:"4px 12px", cursor:"pointer", fontSize:"0.75rem", fontWeight:600,
                            color: hiddenGroups.has(g.id) ? "var(--muted)" : g.color, fontFamily:"var(--font)", transition:"all .15s", marginRight:4 }}>
                          {hiddenGroups.has(g.id) ? "Hidden" : "Visible"}
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize:"0.75rem", padding:"6px 12px" }} onClick={() => openEditGroup(g)}>Edit</button>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <div className="section-label" style={{ marginBottom:0 }}>{members.length} member{members.length!==1?"s":""}</div>
                        {(() => { const cnt = events.filter(e => e.groupIds && e.groupIds.includes(g.id)).length; return cnt > 0 ? <div style={{ fontSize:"0.6875rem", color:"var(--accent2)", background:"rgba(110,231,183,0.1)", border:"1px solid rgba(110,231,183,0.2)", borderRadius:20, padding:"1px 8px" }}>{cnt} shared</div> : null; })()}
                      </div>
                      {members.map(m => (
                        <div key={m.userId} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                          <div style={{ fontSize:"0.875rem", color:"var(--text)" }}>{m.name}</div>
                          <button onClick={() => toggleMemberRole(g.id, m.userId)}
                            style={{ background:m.role==="editor"?"rgba(124,106,247,0.2)":"var(--surface2)", color:m.role==="editor"?"var(--accent2)":"var(--muted)", border:m.role==="editor"?"1px solid rgba(124,106,247,0.3)":"1px solid transparent", borderRadius:20, padding:"3px 10px", fontSize:"0.75rem", fontWeight:500, cursor:"pointer", fontFamily:"var(--font)" }}>
                            {m.role}
                          </button>
                        </div>
                      ))}
                      {/* Find a time */}
                      <button onClick={() => setFindTimeGroup(findTimeGroup===g.id ? null : g.id)}
                        style={{ width:"100%", marginTop:10, background:"none", border:"1px dashed var(--border)",
                          borderRadius:8, padding:"8px 0", cursor:"pointer", fontSize:"0.75rem", fontWeight:600,
                          color:"var(--accent2)", fontFamily:"var(--font)", display:"flex", alignItems:"center",
                          justifyContent:"center", gap:6 }}>
                        <span style={{ display:"flex", width:13, height:13 }}>{Icon.search}</span>
                        {findTimeGroup===g.id ? "Hide" : "Find a time"}
                      </button>
                      {findTimeGroup===g.id && (() => {
                        // Look for days in next 14 days with no shared events for this group
                        const results = [];
                        for (let i=1; i<=14 && results.length<5; i++) {
                          const d = new Date(TODAY); d.setDate(d.getDate()+i);
                          const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
                          const dayEnd   = new Date(d); dayEnd.setHours(23,59,59,999);
                          const groupEvs = events.filter(ev =>
                            ev.groupIds && ev.groupIds.includes(g.id) &&
                            ev.start < dayEnd && ev.end > dayStart
                          );
                          if (groupEvs.length === 0) results.push(d);
                        }
                        return (
                          <div style={{ marginTop:8, background:"var(--surface2)", borderRadius:8, overflow:"hidden", border:"1px solid var(--border)" }}>
                            {results.length === 0 ? (
                              <div style={{ padding:"12px", fontSize:"0.75rem", color:"var(--muted)", textAlign:"center" }}>No free days found in the next 2 weeks</div>
                            ) : results.map((d,i) => (
                              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                                padding:"10px 12px", borderBottom: i<results.length-1?"1px solid var(--border)":"none" }}>
                                <div>
                                  <div style={{ fontSize:"0.8125rem", fontWeight:600, color:"var(--text)" }}>
                                    {d.toLocaleDateString([],{weekday:"long", month:"short", day:"numeric"})}
                                  </div>
                                  <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:1 }}>No shared events</div>
                                </div>
                                <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"#10b981", background:"rgba(16,185,129,0.1)",
                                  borderRadius:20, padding:"2px 8px" }}>Free</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </>
            )}
            {groupsSubTab === "friends" && (
              <>
                {friends.some(f => f.status === "pending_received") && (
                  <div style={{ marginBottom:14 }}>
                    <div className="section-label">Requests</div>
                    {friends.filter(f => f.status === "pending_received").map(f => (
                      <div key={f.id} className="friend-card friend-card-pending">
                        <div className="friend-avatar" style={{ background:"var(--surface3)", color:"var(--muted)" }}>{f.avatar}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:"0.9375rem" }}>{f.name}</div>
                          <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:2 }}>{f.handle}</div>
                          <div style={{ fontSize:"0.6875rem", color:"var(--accent2)", marginTop:3 }}>Wants to connect</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                          <button onClick={() => acceptFriendRequest(f.id)} style={{ background:"var(--accent)", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", color:"white", fontSize:"0.75rem", fontWeight:600 }}>Accept</button>
                          <button onClick={() => declineFriendRequest(f.id)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, padding:"5px 12px", cursor:"pointer", color:"var(--muted)", fontSize:"0.75rem" }}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {friends.some(f => f.status === "pending_sent") && (
                  <div style={{ marginBottom:14 }}>
                    <div className="section-label">Sent</div>
                    {friends.filter(f => f.status === "pending_sent").map(f => (
                      <div key={f.id} className="friend-card">
                        <div className="friend-avatar" style={{ background:"var(--surface3)", color:"var(--muted)" }}>{f.avatar}</div>
                        <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:600, fontSize:"0.9375rem" }}>{f.name}</div><div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{f.handle}</div></div>
                        <button onClick={() => cancelFriendRequest(f.id)} style={{ background:"rgba(124,106,247,0.12)", border:"1px solid rgba(124,106,247,0.25)", borderRadius:8, padding:"6px 10px", cursor:"pointer", color:"var(--accent2)", fontSize:"0.75rem", fontWeight:500 }}>Pending</button>
                      </div>
                    ))}
                  </div>
                )}
                {friends.some(f => f.status === "accepted") && (
                  <div>
                    <div className="section-label">Friends</div>
                    {friends.filter(f => f.status === "accepted").map(f => (
                      <div key={f.id} className="friend-card">
                        <div className="friend-avatar">{f.avatar}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:"0.9375rem" }}>{f.name}</div>
                          <div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{f.handle}</div>
                          {f.mutualGroups > 0 && <div style={{ fontSize:"0.6875rem", color:"var(--accent2)", marginTop:3 }}>{f.mutualGroups} shared group{f.mutualGroups!==1?"s":""}</div>}
                        </div>
                        <button onClick={() => removeFriend(f.id)} style={{ background:"none", border:"1px solid rgba(248,113,113,0.25)", borderRadius:8, padding:"6px 10px", cursor:"pointer", color:"#f87171", fontSize:"0.75rem", fontWeight:500 }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                {friends.length === 0 && (
                  <EmptyState icon={Icon.groups} title="No friends yet"
                    subtitle="Friends are people you share groups with. Add friends to invite them to your groups."
                    actionLabel="Find friends" onAction={() => setGroupsSubTab("add")} />
                )}
              </>
            )}
            {groupsSubTab === "feed" && (
              <div>
                {activityFeed.length === 0 && (
                  <EmptyState icon={Icon.bell} title="No activity yet"
                    subtitle="When group members add, update, or remove events, you'll see it here." />
                )}
                {activityFeed.map(item => {
                  const group = groups.find(g => g.id === item.groupId);
                  const tsStr = (() => {
                    const diff = Date.now() - item.ts.getTime();
                    const mins = Math.floor(diff/60000);
                    if (mins < 1) return "just now";
                    if (mins < 60) return mins+"m ago";
                    const hrs = Math.floor(mins/60);
                    if (hrs < 24) return hrs+"h ago";
                    return Math.floor(hrs/24)+"d ago";
                  })();
                  const actionColor = item.action==="added" ? "#10b981" : item.action==="updated" ? "var(--accent2)" : "#f87171";
                  const actionLabel = item.action==="added" ? "added" : item.action==="updated" ? "updated" : "removed";
                  return (
                    <div key={item.id} style={{ display:"flex", gap:10, padding:"12px 0", borderBottom:"1px solid var(--border)" }}>
                      <div style={{ width:36, height:36, borderRadius:12, background: group ? group.color+"22" : "var(--surface2)",
                        border:"1.5px solid "+(group ? group.color+"55" : "var(--border)"),
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"0.75rem", fontWeight:700,
                        color: group ? group.color : "var(--muted)" }}>
                        {item.userName.slice(0,1)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"0.8125rem", color:"var(--text)", lineHeight:1.4 }}>
                          <span style={{ fontWeight:700 }}>{item.userName}</span>
                          <span style={{ color:"var(--muted)" }}> {actionLabel} </span>
                          <span style={{ fontWeight:600, color:actionColor }}>{item.eventTitle}</span>
                        </div>
                        {item.eventDate && (
                          <div style={{ fontSize:"0.6875rem", color:"var(--text)", fontWeight:500, marginTop:2 }}>
                            {item.eventDate.toLocaleDateString([],{weekday:"short", month:"short", day:"numeric"})}
                          </div>
                        )}
                        {group && <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:1 }}>{group.name} · {tsStr}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {groupsSubTab === "add" && (
              <>
                <div className="form-group">
                  <input className="form-input" placeholder="Search by name or @handle..." value={friendSearch} onChange={e => setFriendSearch(e.target.value)} />
                </div>
                {[
                    { id:"d1", name:"Taylor Kim",   handle:"@taylorkim",   avatar:"TK" },
                    { id:"d2", name:"Morgan Chen",  handle:"@morganchen",  avatar:"MC" },
                    { id:"d4", name:"Drew Santos",  handle:"@drewsantos",  avatar:"DS" },
                    { id:"d5", name:"Sam Nakamura", handle:"@samnakamura", avatar:"SN" },
                    { id:"d6", name:"Alex Okonkwo", handle:"@alexokonkwo", avatar:"AO" },
                  ]
                  .filter(u => !friends.some(f => f.userId === u.id && (f.status === "accepted" || f.status === "pending_sent")))
                  .filter(u => !friendSearch.trim() || u.name.toLowerCase().includes(friendSearch.toLowerCase()) || u.handle.includes(friendSearch.toLowerCase()))
                  .map(u => (
                    <div key={u.id} className="friend-card">
                      <div className="friend-avatar" style={{ background:"var(--surface3)", color:"var(--muted)" }}>{u.avatar}</div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:600, fontSize:"0.9375rem" }}>{u.name}</div><div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{u.handle}</div></div>
                      <button onClick={() => sendFriendRequest(u)} style={{ background:"var(--accent)", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", color:"white", fontSize:"0.75rem", fontWeight:600 }}>+ Add</button>
                    </div>
                  ))}
              </>
            )}
          </div>
          );
        })()}

        {/* PATTERNS TAB */}
        {tab === "shifts" && (
          <div className="screen" ref={setScreenRef}>
            <div className="header">
              <h1>Shifts</h1>
              <button className="btn btn-secondary" style={{ padding:"8px 14px", fontSize:"0.8125rem" }} onClick={() => setSheet("newShift")}>+ New</button>
            </div>
            {shifts.length > 1 && (
              <div className="card card-sm" style={{ marginBottom:14 }}>
                <div className="section-label" style={{ marginBottom:4 }}>Ring priority</div>
                <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginBottom:12 }}>Higher priority = outer ring when shifts overlap.</div>
                <TapSwapList
                  items={[...shifts].sort((a,b) => (a.priority??99)-(b.priority??99)).map(p => p.id)}
                  labels={Object.fromEntries(shifts.map(p => [p.id, p.name]))}
                  colors={Object.fromEntries(shifts.map(p => [p.id, p.color || "#888"]))}
                  onReorder={(newOrder) => {
                    setShifts(prev => newOrder.map((id, idx) => {
                      const p = prev.find(x => x.id === id);
                      return { ...p, priority: idx };
                    }));
                  }}
                />
              </div>
            )}
            {shifts.length === 0 && (
              <EmptyState icon={Icon.shifts} title="No shifts yet"
                subtitle="Shifts are recurring shifts or days — like 3 on / 2 off rotations, weekly schedules, or specific days each month."
                actionLabel="Create a shift" onAction={() => setSheet("newShift")} />
            )}
            {[...shifts].sort((a,b) => (a.priority??99)-(b.priority??99)).map(p => (
              <ShiftCard key={p.id} shift={p} onEdit={() => openEditShift(p)}
                shiftOverrides={shiftOverrides}
                effectiveTimeToday={getEffectiveShiftTime(p, TODAY)}
                hasTimeOverrideToday={hasShiftTimeOverride(p.id, TODAY)}
                onAddManualDay={(shiftId, date) => {
                  const key = "extra:" + shiftId + ":" + date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
                  setShiftOverrides(prev => { const next = new Set(prev); next.add(key); return next; });
                }}
                onToggleMonthDay={(shiftId, year, month, day) => {
                  setShifts(prev => prev.map(pat => {
                    if (pat.id !== shiftId) return pat;
                    const key = `${year}-${month}`;
                    const existing = pat.config?.months?.[key] || [];
                    const next = existing.includes(day) ? existing.filter(d=>d!==day) : [...existing, day].sort((a,b)=>a-b);
                    return { ...pat, config: { ...pat.config, months: { ...pat.config.months, [key]: next } } };
                  }));
                }}
                onToggleDay={(dow) => {
                  if (p.type !== "weekly") return;
                  const days = p.config.days || [];
                  const next = days.includes(dow) ? days.filter(d => d !== dow) : [...days, dow].sort((a,b)=>a-b);
                  updateShift({ ...p, config: { ...p.config, days: next } });
                }} />
            ))}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div className="screen" ref={setScreenRef}>

            {/* Profile */}
            <div className="card" style={{ marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.25rem", fontWeight:800, color:"white", flexShrink:0, overflow:"hidden", flexShrink:0 }}>
                {userProfile.avatar
                  ? <img src={userProfile.avatar} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="avatar" />
                  : userProfile.name.charAt(0)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:"1.0625rem", fontWeight:700, color:"var(--text)" }}>{userProfile.name}</div>
                {userProfile.handle && (
                  <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:2 }}>@{userProfile.handle}</div>
                )}
              </div>
              <button onClick={() => setSheet("editProfile")} className="btn btn-secondary" style={{ fontSize:"0.75rem", padding:"6px 14px", flexShrink:0 }}>Edit</button>
            </div>

            {/* Appearance */}
            <div className="section-label">Appearance</div>
            <div className="card" style={{ marginBottom:16 }}>
              {/* Theme mode — 3-way: Light / Auto / Dark */}
              <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)", marginBottom:10 }}>Theme</div>
              <div style={{ display:"flex", gap:3, background:"var(--surface2)", borderRadius:10, padding:3, marginBottom:10 }}>
                {[["light","Light"],["auto","Auto"],["dark","Dark"]].map(([v,l]) => (
                  <button key={v} onClick={() => {
                    setThemeMode(v);
                    if (v === "auto") {
                      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
                    } else {
                      setDarkMode(v === "dark");
                    }
                  }} style={{
                    flex:1, padding:"6px 0", borderRadius:7, border:"none", cursor:"pointer",
                    fontFamily:"var(--font)", fontSize:"0.75rem", fontWeight:600, transition:"all .15s",
                    background: themeMode===v ? "var(--surface)" : "none",
                    color: themeMode===v ? "var(--text)" : "var(--muted)",
                    boxShadow: themeMode===v ? "0 1px 3px rgba(0,0,0,0.15)" : "none"
                  }}>{l}</button>
                ))}
              </div>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", lineHeight:1.4 }}>
                {themeMode === "auto" ? "Matches your device's appearance setting." : themeMode === "dark" ? "Always use dark theme." : "Always use light theme."}
              </div>
            </div>

            {/* Layout — mobile / compact / auto / desktop */}
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)", marginBottom:10 }}>Layout</div>
              <div style={{ display:"flex", gap:3, background:"var(--surface2)", borderRadius:10, padding:3, marginBottom:10 }}>
                {[["mobile","Mobile"],["compact","Compact"],["auto","Auto"],["desktop","Desktop"]].map(([v,l]) => (
                  <button key={v} onClick={() => setViewMode(v)} style={{
                    flex:1, padding:"6px 0", borderRadius:7, border:"none", cursor:"pointer",
                    fontFamily:"var(--font)", fontSize:"0.75rem", fontWeight:600, transition:"all .15s",
                    background: viewMode===v ? "var(--surface)" : "none",
                    color: viewMode===v ? "var(--text)" : "var(--muted)",
                    boxShadow: viewMode===v ? "0 1px 3px rgba(0,0,0,0.15)" : "none"
                  }}>{l}</button>
                ))}
              </div>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", lineHeight:1.4 }}>
                {viewMode === "auto" ? "Mobile layout on phones, desktop on wider screens — picks automatically." :
                 viewMode === "desktop" ? "Desktop layout with the calendar always visible on the right. Falls back to a compact sidebar on narrower windows." :
                 viewMode === "compact" ? "Desktop sidebar layout without the persistent calendar panel — good for medium screens." :
                 "Always shows the compact phone layout."}
              </div>
            </div>

            {/* Accessibility */}
            <div className="section-label">Accessibility</div>
            <div className="card" style={{ marginBottom:16 }}>
              {/* Text size slider */}
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>Text size</div>
                  <div style={{ fontSize:"0.75rem", color:"var(--muted)", fontFamily:"var(--mono)" }}>
                    {textSize === 1 ? "Default" : Math.round(textSize * 100) + "%"}
                  </div>
                </div>
                <div style={{ display:"flex", gap:3, background:"var(--surface2)", borderRadius:10, padding:3 }}>
                  {[
                    { v: 1.0,  l: "A",  size: "0.8125rem" },
                    { v: 1.15, l: "A",  size: "0.9375rem" },
                    { v: 1.3,  l: "A",  size: "1.0625rem" },
                    { v: 1.5,  l: "A",  size: "1.1875rem" },
                  ].map(({ v, l, size }) => (
                    <button key={v} onClick={() => setTextSize(v)}
                      style={{
                        flex:1, padding:"8px 0", borderRadius:7, border:"none", cursor:"pointer",
                        fontFamily:"var(--font)", fontSize:size, fontWeight:700, transition:"all .15s",
                        background: textSize === v ? "var(--surface)" : "none",
                        color: textSize === v ? "var(--text)" : "var(--muted)",
                        boxShadow: textSize === v ? "0 1px 3px rgba(0,0,0,0.15)" : "none"
                      }}>{l}</button>
                  ))}
                </div>
                <div style={{ fontSize:"0.6875rem", color:"var(--muted)", lineHeight:1.4, marginTop:8 }}>
                  Scales all text across the app to make it easier to read.
                </div>
              </div>

              {/* High contrast mode */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                paddingTop:14, borderTop:"1px solid var(--border)" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>High contrast</div>
                  <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2, lineHeight:1.4 }}>
                    Brightens gray text and strengthens borders for easier reading.
                  </div>
                </div>
                <button className={"toggle "+(highContrast?"on":"")}
                  onClick={() => setHighContrast(v => !v)} />
              </div>
            </div>

            {/* Clock format — 12h / 24h / auto */}
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)", marginBottom:10 }}>Clock format</div>
              <div style={{ display:"flex", gap:3, background:"var(--surface2)", borderRadius:10, padding:3, marginBottom:10 }}>
                {[["auto","Auto"],["12","12-hour"],["24","24-hour"]].map(([v,l]) => (
                  <button key={v} onClick={() => setTimeFormat(v)} style={{
                    flex:1, padding:"6px 0", borderRadius:7, border:"none", cursor:"pointer",
                    fontFamily:"var(--font)", fontSize:"0.75rem", fontWeight:600, transition:"all .15s",
                    background: timeFormat===v ? "var(--surface)" : "none",
                    color: timeFormat===v ? "var(--text)" : "var(--muted)",
                    boxShadow: timeFormat===v ? "0 1px 3px rgba(0,0,0,0.15)" : "none"
                  }}>{l}</button>
                ))}
              </div>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", lineHeight:1.4 }}>
                {timeFormat === "auto" ? "Matches your device's locale (e.g. 1:00 PM in the US, 13:00 in many other regions)." :
                 timeFormat === "12" ? "Always display times in 12-hour format with AM/PM." :
                 "Always display times in 24-hour format."}
              </div>
            </div>

            {/* Maps — default app for opening location links */}
            <div className="section-label">Maps</div>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)", marginBottom:10 }}>Default map app</div>
              <div style={{ display:"flex", gap:3, background:"var(--surface2)", borderRadius:10, padding:3, marginBottom:10 }}>
                {[["auto","Auto"],["apple","Apple"],["google","Google"]].map(([v,l]) => (
                  <button key={v} onClick={() => setMapProvider(v)} style={{
                    flex:1, padding:"6px 0", borderRadius:7, border:"none", cursor:"pointer",
                    fontFamily:"var(--font)", fontSize:"0.75rem", fontWeight:600, transition:"all .15s",
                    background: mapProvider===v ? "var(--surface)" : "none",
                    color: mapProvider===v ? "var(--text)" : "var(--muted)",
                    boxShadow: mapProvider===v ? "0 1px 3px rgba(0,0,0,0.15)" : "none"
                  }}>{l}</button>
                ))}
              </div>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", lineHeight:1.4 }}>
                {mapProvider === "auto" ? "Apple Maps on iOS, Google Maps elsewhere." :
                 mapProvider === "apple" ? "Opens Apple Maps. On non-Apple devices this falls back to the web version." :
                 "Opens Google Maps — in-app on iOS/Android when installed, otherwise in the browser."}
              </div>
            </div>

            {/* Notifications */}
            <div className="section-label">Notifications</div>
            <div className="card" style={{ marginBottom:16 }}>
              {notifPermission === "unsupported" ? (
                <div style={{ fontSize:"0.8125rem", color:"var(--muted)" }}>Notifications not supported in this browser.</div>
              ) : notifPermission === "granted" ? (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#10b981", flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>Notifications enabled</div>
                    <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:1 }}>You'll be alerted based on each event's reminder setting.</div>
                  </div>
                </div>
              ) : notifPermission === "denied" ? (
                <div>
                  <div style={{ fontSize:"0.875rem", fontWeight:500, color:"#f87171", marginBottom:4 }}>Notifications blocked</div>
                  <div style={{ fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.5 }}>Enable notifications in your browser or device settings to receive reminders.</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:"0.875rem", color:"var(--text)", marginBottom:8, lineHeight:1.5 }}>Get reminded before events based on each event's reminder setting.</div>
                  <button className="btn btn-primary" onClick={requestNotifPermission} style={{ fontSize:"0.8125rem" }}>Enable Notifications</button>
                </div>
              )}
            </div>

            {/* Calendars */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div className="section-label" style={{ marginBottom:0 }}>Calendars</div>
              <button onClick={openNewCalendar} className="btn btn-secondary" style={{ fontSize:"0.75rem", padding:"4px 12px" }}>+ New</button>
            </div>
            <div className="card" style={{ marginBottom:16 }}>
              {calendars.map((cal, idx) => (
                <div key={cal.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: idx < calendars.length-1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ width:12, height:12, borderRadius:3, background:cal.color, flexShrink:0 }} />
                  <div style={{ flex:1, cursor:"pointer" }} onClick={() => openEditCalendar(cal)}>
                    <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>{cal.name}</div>
                    <div style={{ fontSize:"0.6875rem", color:"var(--muted)" }}>{events.filter(e => e.calendarId === cal.id).length} events</div>
                  </div>
                  <button onClick={() => toggleCalendarVisibility(cal.id)}
                    style={{ background: hiddenCalendars.has(cal.id) ? "var(--surface2)" : cal.color+"22",
                      border: "1.5px solid " + (hiddenCalendars.has(cal.id) ? "var(--border)" : cal.color+"55"),
                      borderRadius:20, padding:"4px 12px", cursor:"pointer", fontSize:"0.75rem", fontWeight:600,
                      color: hiddenCalendars.has(cal.id) ? "var(--muted)" : cal.color, fontFamily:"var(--font)", transition:"all .15s" }}>
                    {hiddenCalendars.has(cal.id) ? "Hidden" : "Visible"}
                  </button>
                </div>
              ))}
            </div>

            {/* Tour */}
            <div className="section-label">Help</div>
            <div className="card" style={{ marginBottom:16, padding:0 }}>
              <div onClick={() => { setTab("home"); setTourOpen(true); }}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer" }}>
                <div style={{ display:"flex", width:20, height:20, color:"var(--accent2)", flexShrink:0 }}>{Icon.help}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>Take a tour</div>
                  <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2 }}>A quick look at what makes this app different</div>
                </div>
                <div style={{ display:"flex", width:16, height:16, color:"var(--muted)", flexShrink:0 }}>{Icon.chevR}</div>
              </div>
            </div>

            {/* In-app badges */}
            <div className="section-label">In-app badges</div>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontSize:"0.8125rem", color:"var(--muted)", marginBottom:10, lineHeight:1.5 }}>
                Choose which badges appear on the app.
              </div>
              {[
                FEATURES.friends     && { k:"friendRequests", l:"Friend requests", d:"Red badge when someone wants to connect" },
                FEATURES.activityFeed && { k:"feed",           l:"Group activity",  d:"Red badge for new events in your groups" },
                { k:"todayEvents",    l:"Today's events",  d:"Small dot on Calendar if you have events today" },
              ].filter(Boolean).map(b => (
                <div key={b.k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>{b.l}</div>
                    <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2 }}>{b.d}</div>
                  </div>
                  <button className={"toggle "+((userProfile.badges?.[b.k] !== false)?"on":"")}
                    onClick={() => setUserProfile(p => ({
                      ...p,
                      badges: { ...(p.badges||{}), [b.k]: !(p.badges?.[b.k] !== false) }
                    }))} />
                </div>
              ))}
            </div>

            {/* Holidays */}
            <div className="section-label">Holidays</div>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontSize:"0.8125rem", color:"var(--muted)", marginBottom:10, lineHeight:1.5 }}>
                Holidays appear in the day panel when you tap a date. Select which regions to show.
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {[{v:"US",l:"🇺🇸 US"},{v:"GLOBAL",l:"🌍 Global"},{v:"CA",l:"🇨🇦 CA"},{v:"UK",l:"🇬🇧 UK"},{v:"AU",l:"🇦🇺 AU"}].map(opt => (
                  <div key={opt.v} onClick={() => setHolidayCountries(prev => {
                      const next = new Set(prev);
                      next.has(opt.v) ? next.delete(opt.v) : next.add(opt.v);
                      return next;
                    })}
                    className={"chip"+(holidayCountries.has(opt.v)?" active":"")}
                    style={{ cursor:"pointer" }}>
                    {opt.l}
                  </div>
                ))}
              </div>
            </div>

            {/* Defaults */}
            <div className="section-label">New event defaults</div>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ marginBottom:12 }}>
                <label className="form-label">Calendar</label>
                <div className="chip-row">
                  {calendars.map(c => (
                    <div key={c.id} className={"chip"+(userProfile.defaultCalendar===c.id?" active":"")}
                      onClick={() => setUserProfile(p => ({...p, defaultCalendar: c.id}))}
                      style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:c.color }} />{c.name}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Reminder</label>
                <div className="chip-row">
                  {[["none","None"],["15","15 min"],["30","30 min"],["60","1 hr"],["1440","1 day"]].map(([v,l]) => (
                    <div key={v} className={"chip"+(userProfile.defaultReminder===v?" active":"")}
                      onClick={() => setUserProfile(p => ({...p, defaultReminder: v}))}>{l}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Home screen order — tucked inside a disclosure because most users won't use it */}
            <div className="section-label">Advanced</div>
            <div className="card" style={{ marginBottom:16, padding:0 }}>
              <div onClick={() => setHomeOrderExpanded(v => !v)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>Home screen order</div>
                  <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2 }}>Reorder the cards on your home screen</div>
                </div>
                <div style={{ display:"flex", width:16, height:16, color:"var(--muted)", flexShrink:0,
                  transform: homeOrderExpanded ? "rotate(90deg)" : "none", transition:"transform .15s" }}>{Icon.chevR}</div>
              </div>
              {homeOrderExpanded && (
                <div style={{ padding:"0 16px 14px", borderTop:"1px solid var(--border)" }}>
                  <div style={{ fontSize:"0.75rem", color:"var(--muted)", margin:"12px 0" }}>Tap an item to select it, then tap another to swap positions.</div>
                  <TapSwapList
                    items={homeOrder}
                    labels={{ shiftstatus:"Shifts on/off", major:"Major Events", pinned:"Pinned", nextup:"Later Today", status:"Now", freetime:"Free Slots" }}
                    onReorder={setHomeOrder}
                  />
                </div>
              )}
            </div>

            {/* About + data export */}
            <div className="section-label">About</div>
            <div className="card" style={{ marginBottom:12, padding:0 }}>
              {/* Preview export */}
              <div onClick={() => setSheet("icsPreview")}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer",
                  borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex", width:20, height:20, color:"var(--accent2)", flexShrink:0 }}>{Icon.search}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>Preview export</div>
                  <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2 }}>
                    See what your data looks like before exporting. Helpful if you're curious how .ics files work.
                  </div>
                </div>
              </div>
              {/* Export */}
              <div onClick={async () => {
                  try {
                    const primary = calendars[0]?.name || "My Calendar";
                    const ics = buildICS({ events, majorEvents, calendarName: primary });
                    const stamp = new Date().toISOString().slice(0,10);
                    const result = await shareOrDownloadICS(`daytu-${stamp}.ics`, ics);
                    if (result === "shared") {
                      showToast("Opened in share sheet");
                    } else if (result === "downloaded") {
                      showToast("Downloaded " + (events.length + majorEvents.length) + " items");
                    }
                    // "canceled" → no toast; user intentionally dismissed
                  } catch (err) {
                    showToast("Export failed", "err");
                  }
                }}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer",
                  borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex", width:20, height:20, color:"var(--accent2)", flexShrink:0 }}>{Icon.download}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>Export to calendar app</div>
                  <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2 }}>
                    Send your events to Apple Calendar, Google, Outlook, or anywhere else.
                  </div>
                </div>
              </div>
              {/* Version */}
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>Daytu</div>
                  <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2 }}>
                    v1.0 · Local-only · Built with care
                  </div>
                </div>
              </div>
            </div>

            {/* Start over — soft reset */}
            <div className="section-label" style={{ color:"#f59e0b" }}>Start over</div>
            <div className="card" style={{ marginBottom:12, padding:0 }}>
              {!confirmSoftReset ? (
                <div onClick={() => setConfirmSoftReset(true)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.875rem", fontWeight:600, color:"#fbbf24" }}>Clear my data</div>
                    <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2 }}>
                      Remove all events and shifts, keep your profile
                    </div>
                  </div>
                  <div style={{ display:"flex", width:16, height:16, color:"#fbbf24", flexShrink:0 }}>{Icon.chevR}</div>
                </div>
              ) : (
                <div style={{ padding:14, background:"rgba(245,158,11,0.08)" }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:700, color:"#fbbf24", marginBottom:6 }}>
                    Clear all your data?
                  </div>
                  <div style={{ fontSize:"0.75rem", color:"var(--text)", lineHeight:1.6, marginBottom:6 }}>
                    <strong style={{ color:"#6ee7b7" }}>Keeps:</strong> Your name, calendar color, theme, and onboarding
                  </div>
                  <div style={{ fontSize:"0.75rem", color:"var(--text)", lineHeight:1.6, marginBottom:12 }}>
                    <strong style={{ color:"#fca5a5" }}>Removes:</strong> {events.length} events, {majorEvents.length} major events, {shifts.length} shifts, {groups.length} groups, {friends.length} friends, and pinned/hidden state
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => setConfirmSoftReset(false)} className="btn btn-secondary"
                      style={{ flex:1 }}>Cancel</button>
                    <button onClick={doSoftReset}
                      style={{ flex:1, padding:"10px", borderRadius:8, background:"#f59e0b",
                        border:"none", fontSize:"0.8125rem", fontWeight:700, color:"#000",
                        cursor:"pointer", fontFamily:"var(--font)" }}>
                      Clear my data
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Danger zone — full reset with type-to-confirm */}
            <div className="section-label" style={{ color:"#f87171" }}>Danger zone</div>
            <div className="card" style={{ marginBottom:20, padding:0 }}>
              {!confirmFullReset ? (
                <div onClick={() => setConfirmFullReset(true)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.875rem", fontWeight:600, color:"#f87171" }}>Reset app</div>
                    <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2 }}>
                      Delete everything and return to onboarding
                    </div>
                  </div>
                  <div style={{ display:"flex", width:16, height:16, color:"#f87171", flexShrink:0 }}>{Icon.chevR}</div>
                </div>
              ) : (
                <div style={{ padding:14, background:"rgba(248,113,113,0.08)" }}>
                  <div style={{ fontSize:"0.875rem", fontWeight:700, color:"#fca5a5", marginBottom:6 }}>
                    Reset app?
                  </div>
                  <div style={{ fontSize:"0.75rem", color:"var(--text)", lineHeight:1.7, marginBottom:12,
                    paddingLeft:8, borderLeft:"2px solid rgba(248,113,113,0.3)" }}>
                    This will permanently delete:<br/>
                    • <strong>{events.length}</strong> events<br/>
                    • <strong>{majorEvents.length}</strong> major events<br/>
                    • <strong>{shifts.length}</strong> shifts<br/>
                    • <strong>{groups.length}</strong> groups, <strong>{friends.length}</strong> friends<br/>
                    • All settings and your profile
                  </div>
                  <div style={{ fontSize:"0.6875rem", fontWeight:600, color:"#fca5a5", marginBottom:6 }}>
                    Type <strong style={{ color:"var(--text)", fontFamily:"var(--mono)" }}>RESET</strong> to confirm
                  </div>
                  <input value={fullResetInput} onChange={e => setFullResetInput(e.target.value)}
                    placeholder="Type RESET here"
                    style={{ width:"100%", boxSizing:"border-box",
                      background:"rgba(0,0,0,0.3)", border:"1px solid rgba(248,113,113,0.3)",
                      borderRadius:8, padding:"10px 12px", color:"var(--text)",
                      fontSize:"0.875rem", fontFamily:"var(--mono)", outline:"none", marginBottom:12 }} />
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => { setConfirmFullReset(false); setFullResetInput(""); }}
                      className="btn btn-secondary" style={{ flex:1 }}>Cancel</button>
                    <button onClick={doFullReset}
                      disabled={fullResetInput.trim().toUpperCase() !== "RESET"}
                      style={{ flex:1, padding:"10px", borderRadius:8,
                        background: fullResetInput.trim().toUpperCase() === "RESET" ? "#b91c1c" : "rgba(185,28,28,0.25)",
                        border:"none", fontSize:"0.8125rem", fontWeight:700,
                        color: fullResetInput.trim().toUpperCase() === "RESET" ? "#fff" : "var(--muted)",
                        cursor: fullResetInput.trim().toUpperCase() === "RESET" ? "pointer" : "not-allowed",
                        fontFamily:"var(--font)" }}>
                      Reset everything
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* FAB menu */}
        {fabOpen && (
          <>
            <div style={{ position:"fixed", inset:0, zIndex:97 }} onClick={() => setFabOpen(false)} />
            <div style={{ position:"fixed",
              bottom: isSplit ? 72 : isDesktop ? 104 : 168,
              left: isSplit ? 84 : "auto",
              right: isSplit ? "auto" : isDesktop ? (typeof window !== "undefined" && window.innerWidth >= 1200 ? "calc(50% - 600px + 40px)" : 40) : "calc(50% - 210px + 16px)",
              display:"flex", flexDirection:"column", gap:10, alignItems: isSplit ? "flex-start" : "flex-end", zIndex:98 }}>
              <div onClick={() => { setFabOpen(false); openNewMajorEvent(); }}
                style={{ display:"flex", alignItems:"center", gap:10, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"10px 16px", cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.3)", animation:"fadeSlideUp .15s ease" }}>
                <span style={{ fontSize:"0.8125rem", fontWeight:700, color:"var(--text)", whiteSpace:"nowrap" }}>Major Event</span>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"#f59e0b", flexShrink:0 }} />
              </div>
              <div onClick={() => { setFabOpen(false); openNewEvent(); }}
                style={{ display:"flex", alignItems:"center", gap:10, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"10px 16px", cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.3)", animation:"fadeSlideUp .2s ease" }}>
                <span style={{ fontSize:"0.8125rem", fontWeight:700, color:"var(--text)", whiteSpace:"nowrap" }}>Event</span>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"var(--accent)", flexShrink:0 }} />
              </div>
            </div>
          </>
        )}
        <button
          ref={isSplit ? undefined : setTourRef("fab")}
          className={"fab"+(fabVisible?"":" hidden")}
          onClick={() => setFabOpen(v => !v)}
          style={{ transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)", transition:"transform .2s ease, opacity .2s ease" }}>
          {Icon.plus}
        </button>

        {/* Tour modal — shown on demand */}
        {tourOpen && (
          <CoachmarkTour
            tourRefs={tourRefs}
            onClose={() => setTourOpen(false)}
          />
        )}

        <nav className="bottom-nav">
          {(() => {
            const todayHasEvents = todayEvents.length > 0;
            const hasConflicts = getConflicts(todayEvents).size > 0;
            const shiftOverrideCount = shiftOverrides.size;
            const friendRequestsRaw = friends.filter(f => f.status === "pending_received").length;
            const feedUnseenRaw = activityFeed.filter(a => a.userId !== "u1" && a.ts > feedSeenAt).length;
            // Respect user's badge preferences
            const friendRequests = userProfile.badges?.friendRequests !== false ? friendRequestsRaw : 0;
            const feedUnseen = userProfile.badges?.feed !== false ? feedUnseenRaw : 0;
            const groupsBadge = friendRequests + feedUnseen;
            return [
              { id:"home", label:"Home", icon:Icon.home, dot: hasConflicts ? "#ef4444" : null },
              { id:"calendar", label:"Calendar", icon:Icon.calendar, dot: (todayHasEvents && userProfile.badges?.todayEvents !== false) ? "var(--accent2)" : null },
              ...(FEATURES.groups ? [{ id:"groups", label:"Groups", icon:Icon.groups, badge: groupsBadge }] : []),
              { id:"shifts", label:"Shifts", icon:Icon.shifts, dot: shiftOverrideCount > 0 ? "#f59e0b" : null },
              { id:"settings", label:"Settings", icon:Icon.settings },
            ].map(n => (
              <button key={n.id} ref={!(isDesktop || isSplit) ? setTourRef("nav-"+n.id) : undefined} className={"nav-btn "+(tab===n.id?"active":"")} onClick={() => { setTab(n.id); setFabOpen(false); }}>
                <div style={{ position:"relative", display:"inline-flex" }}>
                  {n.icon}
                  {n.badge > 0 && <div style={{ position:"absolute", top:-5, right:-5, minWidth:14, height:14, borderRadius:7, background:"#ef4444", fontSize:"0.6875rem", fontWeight:700, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 2px" }}>{n.badge}</div>}
                  {!n.badge && n.dot && <div style={{ position:"absolute", top:-2, right:-2, width:7, height:7, borderRadius:"50%", background:n.dot, border:"1.5px solid var(--bg)" }} />}
                </div>
                <span>{n.label}</span>
              </button>
            ));
          })()}
        </nav>

        {sheet === "addChooser" && (
          <div className="sheet-overlay" onClick={e => e.target===e.currentTarget && closeSheet()}>
            <div className="sheet">
              <div className="sheet-handle" />
              <div style={{ fontSize:"1rem", fontWeight:700, marginBottom:4 }}>Add to {selectedDate.toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric" })}</div>
              <div style={{ fontSize:"0.8125rem", color:"var(--muted)", marginBottom:14 }}>What are you adding?</div>
              <button className="btn btn-primary" onClick={() => setSheet("newEvent")}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <span style={{ display:"flex", width:16, height:16 }}>{Icon.calendar}</span>
                Add event
              </button>
              <button className="btn btn-secondary" onClick={() => setSheet("newMajorEvent")}
                style={{ width:"100%", marginTop:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <span style={{ display:"flex", width:16, height:16 }}>{Icon.star}</span>
                Add major event
              </button>
              <button onClick={closeSheet}
                style={{ width:"100%", marginTop:12, background:"none", border:"none", padding:"8px",
                  color:"var(--muted)", fontFamily:"var(--font)", fontSize:"0.8125rem", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {sheet === "newMajorEvent" && <MajorEventSheet defaultDate={selectedDate} onPreview={setPreviewMajor} groups={groups} customColors={{ recents: customColorRecents, favorites: customColorFavorites, setRecents: setCustomColorRecents, setFavorites: setCustomColorFavorites }} onSave={addMajorEvent} onClose={() => { setPreviewMajor(null); closeSheet(); }} />}
        {sheet === "editCalendar" && <CalendarSheet existing={activeCalendar} allCalendars={calendars} allEvents={events} customColors={{ recents: customColorRecents, favorites: customColorFavorites, setRecents: setCustomColorRecents, setFavorites: setCustomColorFavorites }} onSave={activeCalendar ? updateCalendar : addCalendar} onDelete={activeCalendar && calendars.length > 1 ? deleteCalendar : null} onClose={closeSheet} />}
        {sheet === "editProfile" && (
          <EditProfileSheet
            profile={userProfile}
            onSave={p => { setUserProfile(prev => ({...prev, ...p})); closeSheet(); }}
            onClose={closeSheet}
          />
        )}
        {sheet === "majorEventDetail" && activeMajorEvent && <MajorEventDetailSheet me={activeMajorEvent} groups={groups} onEdit={() => openEditMajorEvent(activeMajorEvent)} onDelete={deleteMajorEvent} onDuplicate={duplicateMajorEvent} onPin={toggleMajorPin} onClose={closeSheet} mapProvider={mapProvider} />}
        {sheet === "editMajorEvent" && activeMajorEvent && <MajorEventSheet existing={activeMajorEvent} onPreview={setPreviewMajor} groups={groups} customColors={{ recents: customColorRecents, favorites: customColorFavorites, setRecents: setCustomColorRecents, setFavorites: setCustomColorFavorites }} onSave={updateMajorEvent} onDelete={deleteMajorEvent} onClose={() => { setPreviewMajor(null); closeSheet(); }} />}
        {sheet === "newEvent" && <NewEventSheet onPreview={setPreviewEvent} calendars={calendars} groups={groups} allEvents={events} customColors={{ recents: customColorRecents, favorites: customColorFavorites, setRecents: setCustomColorRecents, setFavorites: setCustomColorFavorites }} onSave={addEvent} onClose={() => { setPreviewEvent(null); closeSheet(); }} defaultDate={selectedDate} defaultCalendar={userProfile.defaultCalendar} defaultReminder={userProfile.defaultReminder} />}
        {sheet === "editEvent" && activeEvent && <NewEventSheet existing={activeEvent} onPreview={setPreviewEvent} calendars={calendars} groups={groups} allEvents={events} customColors={{ recents: customColorRecents, favorites: customColorFavorites, setRecents: setCustomColorRecents, setFavorites: setCustomColorFavorites }} onSave={updateEvent} onDelete={deleteEvent} onClose={() => { setPreviewEvent(null); closeSheet(); }} defaultDate={selectedDate} />}
        {sheet === "eventDetail" && activeEvent && <EventDetailSheet ev={activeEvent} cal={calForCalendar(activeEvent.calendarId)} groups={groups} onDelete={deleteEvent} onEdit={() => openEditEvent(activeEvent)} onClose={closeSheet} onDuplicate={duplicateEvent} onPin={togglePin} isPinned={pinnedEvents.has(baseEventId(activeEvent.id))} mapProvider={mapProvider} />}
        {sheet === "newGroup" && <NewGroupSheet onSave={addGroup} onClose={closeSheet} />}
        {sheet === "editGroup" && activeGroup && <NewGroupSheet existing={activeGroup} currentMembers={groupMembers.filter(m => m.groupId === activeGroup.id)} onSave={(g, members) => updateGroup(g, members)} onDelete={deleteGroup} onClose={closeSheet} />}
        {sheet === "icsPreview" && (
          <ICSPreviewSheet
            events={events}
            majorEvents={majorEvents}
            calendarName={calendars[0]?.name || "My Calendar"}
            onClose={closeSheet}
            onDownload={async () => {
              try {
                const primary = calendars[0]?.name || "My Calendar";
                const ics = buildICS({ events, majorEvents, calendarName: primary });
                const stamp = new Date().toISOString().slice(0,10);
                const result = await shareOrDownloadICS(`daytu-${stamp}.ics`, ics);
                if (result === "shared") {
                  showToast("Opened in share sheet");
                } else if (result === "downloaded") {
                  showToast("Downloaded " + (events.length + majorEvents.length) + " items");
                }
              } catch (err) {
                showToast("Export failed", "err");
              }
            }}
          />
        )}
        {sheet === "newShift" && <ShiftSheet onPreview={setPreviewShift} customColors={{ recents: customColorRecents, favorites: customColorFavorites, setRecents: setCustomColorRecents, setFavorites: setCustomColorFavorites }} onSave={addShift} onClose={() => { setPreviewShift(null); closeSheet(); }} />}
        {sheet === "editShift" && activeShift && <ShiftSheet existing={activeShift} onPreview={setPreviewShift} customColors={{ recents: customColorRecents, favorites: customColorFavorites, setRecents: setCustomColorRecents, setFavorites: setCustomColorFavorites }} onSave={updateShift} onDelete={deleteShift} onClose={() => { setPreviewShift(null); closeSheet(); }} />}
      </div>
    </>
  );
}

// ── DAY VIEW ──────────────────────────────────────────────
function DayView({ date, events, calendars, onEventClick, majorEvents=[], holidays=[], holidayCountries=new Set() }) {
  const HOUR_H = 60;
  const START_H = 0;
  const hours = Array.from({ length: 24 }, (_, i) => i + START_H);
  const LABEL_W = 44;

  const timed = useMemo(() => {
    const from = new Date(date); from.setHours(0,0,0,0);
    const to = new Date(date); to.setHours(23,59,59,999);
    return expandEvents(events, from, to).filter(e => !e.allDay && sameDay(e.start, date)).sort((a,b) => a.start - b.start);
  }, [date, events]);

  const allDay = useMemo(() => events.filter(e => e.allDay && sameDay(e.start, date)), [date, events]);

  // Simple column layout for overlaps
  const laid = useMemo(() => {
    const cols = [];
    return timed.map(ev => {
      let col = 0;
      while (cols[col] && cols[col] > ev.start.getTime()) col++;
      cols[col] = ev.end.getTime();
      return { ev, col };
    });
  }, [timed]);
  const maxCol = laid.reduce((m, r) => Math.max(m, r.col), 0) + 1;

  const isToday = sameDay(date, new Date());
  const nowPx = isToday
    ? Math.max(0, (new Date().getHours() + new Date().getMinutes()/60 - START_H)) * HOUR_H
    : null;

  // Auto-scroll the enclosing .screen container to a sensible starting hour on mount.
  // If today, scroll to a bit before "now"; otherwise scroll to 6 AM.
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (!scrollRef.current) return;
    const scroller = scrollRef.current.closest(".screen");
    if (!scroller) return;
    const h = nowPx != null ? Math.max(0, nowPx - HOUR_H * 1) : 6 * HOUR_H;
    scroller.scrollTo({ top: h, behavior: "instant" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Majors and holidays for this day
  const dayMajors = majorEvents.filter(me => {
    const [sy,sm,sd]=me.startDate.slice(0,10).split("-").map(Number);
    const [ey,em,ed]=me.endDate.slice(0,10).split("-").map(Number);
    const s=new Date(sy,sm-1,sd); const e=new Date(ey,em-1,ed); e.setHours(23,59,59,999);
    const dn=new Date(date); dn.setHours(12,0,0,0);
    return dn>=s && dn<=e;
  });
  const dayHolidays = holidays.filter(h =>
    holidayCountries.has(h.country) && h.year===date.getFullYear() &&
    h.month===date.getMonth()+1 && h.day===date.getDate()
  );

  return (
    <div ref={scrollRef}>
      {/* Major events + holidays banner */}
      {(dayMajors.length > 0 || dayHolidays.length > 0) && (
        <div style={{ marginBottom:8, paddingBottom:8, borderBottom:"1px solid var(--border)" }}>
          {dayMajors.map(me => (
            <div key={me.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 8px",
              borderRadius:7, marginBottom:4,
              background:`repeating-linear-gradient(45deg,${me.color}22 0px,${me.color}22 3px,transparent 3px,transparent 9px)`,
              border:`1px solid ${me.color}55` }}>
              <div style={{ width:3, height:14, borderRadius:2, background:me.color, flexShrink:0 }} />
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:"var(--text)", flex:1, minWidth:0,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{me.title}</div>
              <div style={{ fontSize:"0.6875rem", fontWeight:700, color:me.color, background:me.color+"22",
                borderRadius:20, padding:"1px 7px", flexShrink:0 }}>Major</div>
            </div>
          ))}
          {dayHolidays.map(h => (
            <div key={h.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 8px",
              borderRadius:7, marginBottom:4,
              background:h.color+"18", border:`1px solid ${h.color}44` }}>
              <div style={{ width:3, height:14, borderRadius:2, background:h.color, flexShrink:0 }} />
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:"var(--text)", flex:1 }}>{h.name}</div>
              <div style={{ fontSize:"0.6875rem", fontWeight:700, color:h.color, background:h.color+"22",
                borderRadius:20, padding:"1px 7px", flexShrink:0 }}>Holiday</div>
            </div>
          ))}
        </div>
      )}
      {/* All-day events */}
      {allDay.length > 0 && (
        <div style={{ marginBottom:10, paddingBottom:10, borderBottom:"1px solid var(--border)" }}>
          <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:5 }}>All day</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {allDay.map(ev => {
              const cal = calendars.find(c => c.id === ev.calendarId) || {};
              const col = ev.color || cal.color || "#888";
              return (
                <div key={ev.id} onClick={() => onEventClick(ev)}
                  style={{ background:col+"22", borderLeft:"3px solid "+col, borderRadius:6,
                    padding:"6px 10px", cursor:"pointer", minWidth:80 }}>
                  <div style={{ fontSize:"0.75rem", fontWeight:700, color:col }}>{ev.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div style={{ overflowY:"auto", maxHeight:520 }}>
        <div style={{ position:"relative" }}>
          {/* Hour grid */}
          <div style={{ display:"grid", gridTemplateColumns:`${LABEL_W}px 1fr` }}>
            {hours.map(h => (
              <React.Fragment key={h}>
                <div style={{ height:HOUR_H, display:"flex", alignItems:"flex-start",
                  justifyContent:"flex-end", paddingRight:10, paddingTop:4 }}>
                  <span style={{ fontSize:"0.6875rem", color:"var(--muted)", fontFamily:"var(--mono)", fontWeight:600 }}>
                    {h === 0 ? "12 AM" : h === 12 ? "12 PM" : h < 12 ? h+" AM" : (h-12)+" PM"}
                  </span>
                </div>
                <div style={{ height:HOUR_H, borderTop:"1px solid var(--border)" }} />
              </React.Fragment>
            ))}
          </div>

          {/* Events */}
          <div style={{ position:"absolute", top:0, left:LABEL_W, right:0 }}>
            {laid.map(({ ev, col }) => {
              const cal = calendars.find(c => c.id === ev.calendarId) || {};
              const color = ev.color || cal.color || "#888";
              // Clip event to grid: events may start before START_H (e.g. overnight Sleep) or
              // end after the last hour. We render only the visible portion.
              const startH = ev.start.getHours() + ev.start.getMinutes()/60;
              const endH = ev.end.getHours() + ev.end.getMinutes()/60;
              const clippedStart = Math.max(startH, START_H);
              const clippedEnd = Math.min(endH, START_H + hours.length);
              const topPx = (clippedStart - START_H) * HOUR_H;
              const heightPx = Math.max(24, (clippedEnd - clippedStart) * HOUR_H - 3);
              const colW = 100 / maxCol;
              return (
                <div key={ev.id} onClick={() => onEventClick(ev)}
                  style={{ position:"absolute",
                    top:topPx, left:`${col * colW}%`, width:`${colW - 0.5}%`,
                    height:heightPx, borderRadius:8,
                    background:color+"20", borderLeft:"4px solid "+color,
                    padding:"5px 8px", cursor:"pointer", overflow:"hidden",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}>
                  <div style={{ fontSize:"0.75rem", fontWeight:700, color, lineHeight:1.3,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {ev.title}
                  </div>
                  {heightPx > 36 && (
                    <div style={{ fontSize:"0.6875rem", color:color+"bb", marginTop:2, fontFamily:"var(--mono)" }}>
                      {fmtTime(ev.start)} – {fmtTime(ev.end)}
                    </div>
                  )}
                  {heightPx > 56 && ev.location && (
                    <div style={{ fontSize:"0.6875rem", color:color+"99", marginTop:2 }}><span style={{ display:"inline-flex", width:10, height:10, marginRight:2, verticalAlign:"middle" }}>{Icon.mapPin}</span>{ev.location}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Now line */}
          {nowPx !== null && (
            <div style={{ position:"absolute", left:LABEL_W, right:0, top:nowPx,
              height:2, background:"#ef4444", zIndex:5, pointerEvents:"none",
              display:"flex", alignItems:"center" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444", marginLeft:-4 }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── WEEK VIEW ─────────────────────────────────────────────
// ── WEEK VIEW (Columns) — whole week at a glance ──
// Compact overview; tap a day to drill into Day view. Good for planning.
function WeekViewColumns({ weekDays, events, calendars, shifts=[], shiftOverrides, majorEvents=[], holidays=[], holidayCountries=new Set(), selectedDate, onSelect, onOpenDay, onEventClick, onMajorEventClick }) {
  // Single tap selects a day (updates selectedDate so the preview below can
  // react); double tap opens the full day view. Same pattern as MonthGrid.
  const lastTapRef = React.useRef({ time: 0, key: null });
  const DOUBLE_TAP_MS = 400;
  const handleCellTap = (d) => {
    const key = d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate();
    const now = Date.now();
    if (onOpenDay && now - lastTapRef.current.time < DOUBLE_TAP_MS && lastTapRef.current.key === key) {
      lastTapRef.current = { time: 0, key: null };
      onOpenDay(d);
      return;
    }
    lastTapRef.current = { time: now, key };
    onSelect && onSelect(d);
  };
  // Bucket events & major events per day
  const byDay = weekDays.map(d => {
    const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999);
    return expandEvents(events, dayStart, dayEnd)
      .filter(e => sameDay(e.start, d))
      .sort((a,b) => (a.allDay === b.allDay ? a.start - b.start : (a.allDay ? -1 : 1)));
  });
  const majorsByDay = weekDays.map(d => majorEvents.filter(me => {
    const [sy,sm,sd] = me.startDate.slice(0,10).split("-").map(Number);
    const [ey,em,ed] = me.endDate.slice(0,10).split("-").map(Number);
    const s = new Date(sy, sm-1, sd);
    const e = new Date(ey, em-1, ed); e.setHours(23,59,59,999);
    const dn = new Date(d); dn.setHours(12,0,0,0);
    return dn >= s && dn <= e;
  }));
  const holsByDay = weekDays.map(d => holidays.filter(h =>
    holidayCountries.has(h.country) &&
    h.year === d.getFullYear() && h.month === d.getMonth()+1 && h.day === d.getDate()
  ));
  // Shift colors per day — same rules as the month grid (honors overrides & extras).
  const ringShifts = [...(shifts||[])].sort((a,b) => (a.priority??99)-(b.priority??99));
  const colorsByDay = weekDays.map(d => {
    const colors = [];
    for (const p of ringShifts) {
      const k = p.id+":"+d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate();
      if (shiftOverrides && shiftOverrides.has(k)) continue;
      const extra = shiftOverrides && shiftOverrides.has("extra:"+k);
      const natural = p.type==="rotation" ? getRotationStatus(p,d)==="work"
        : p.type==="monthly" ? isMonthlyWorkDay(p,d)
        : (p.config.days||[]).includes(d.getDay());
      if (natural || extra) colors.push(p.color || "#6366f1");
    }
    return colors;
  });

  const fmtEvTime = (d) => {
    const h = d.getHours(), m = d.getMinutes();
    // In explicit 24-hour mode use a compact HH:MM; otherwise the compact
    // 12-hour form (e.g. "7a" / "1:30p") stays readable in narrow columns.
    if (_timeHour12 === false) return String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0");
    const ampm = h >= 12 ? "p" : "a";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? h12 + ampm : h12 + ":" + String(m).padStart(2,"0") + ampm;
  };

  const MAX_VISIBLE = 4;

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4 }}>
        {weekDays.map((d, di) => {
          const dayEvents = byDay[di];
          const dayMajors = majorsByDay[di];
          const dayHols = holsByDay[di];
          const dayColors = colorsByDay[di];
          const isToday = sameDay(d, TODAY);
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
          const hiddenCount = Math.max(0, dayEvents.length - MAX_VISIBLE);
          const totalItems = dayEvents.length + dayMajors.length + dayHols.length;
          // Concentric shift rings via stacked inset box-shadows. Outer
          // (priority) ring is 3px so it reads at a glance; inner rings
          // stay 2px so the stack fits inside the cell's 6px padding.
          const ringShadow = dayColors.length === 0 ? undefined
            : dayColors.slice(0,3).map((c, i) => `inset 0 0 0 ${3+i*2}px ${c}`).join(", ");

          const isSelected = selectedDate && sameDay(d, selectedDate);
          return (
            <div key={di} onClick={() => handleCellTap(d)}
              style={{
                background: isSelected ? "rgba(124,106,247,0.18)"
                  : isToday ? "rgba(124,106,247,0.1)" : "var(--surface)",
                border: `1px solid ${isSelected ? "var(--accent2)"
                  : isToday ? "rgba(124,106,247,0.35)" : "var(--border)"}`,
                borderRadius: 10, padding: 6, minHeight: 150, cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 3,
                boxShadow: ringShadow,
                transition: "background .12s"
              }}>
              {/* Day header */}
              <div style={{ textAlign:"center", marginBottom:4, paddingBottom:4,
                borderBottom:"1px solid var(--border)" }}>
                <div style={{ fontSize:"0.6875rem", color: isToday ? "var(--accent)" : "var(--muted)",
                  fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px" }}>
                  {DAYS[d.getDay()].slice(0,1)}
                </div>
                <div style={{ fontSize:"0.875rem", fontWeight:800,
                  color: isToday ? "var(--accent)" : "var(--text)" }}>
                  {d.getDate()}
                </div>
              </div>

              {/* Holidays (pill above events) */}
              {dayHols.map(h => (
                <div key={h.id} style={{
                  background: h.color + "22", borderLeft: `2px solid ${h.color}`,
                  padding:"2px 4px", borderRadius:3, fontSize:"0.6875rem", color:h.color,
                  fontWeight:600, lineHeight:1.3, overflow:"hidden", whiteSpace:"nowrap",
                  textOverflow:"ellipsis" }} title={h.name}>
                  {h.name}
                </div>
              ))}

              {/* Major events (striped bg) */}
              {dayMajors.map(me => (
                <div key={me.id}
                  onClick={(ev) => { ev.stopPropagation(); onMajorEventClick && onMajorEventClick(me); }}
                  style={{
                    background:`repeating-linear-gradient(45deg,${me.color}33 0,${me.color}33 3px,transparent 3px,transparent 7px)`,
                    borderLeft:`2px solid ${me.color}`,
                    padding:"2px 4px", borderRadius:3, fontSize:"0.6875rem", color:"var(--text)",
                    fontWeight:600, lineHeight:1.3, overflow:"hidden", whiteSpace:"nowrap",
                    textOverflow:"ellipsis" }} title={me.title}>
                  {me.title}
                </div>
              ))}

              {/* Regular events */}
              {visibleEvents.map(ev => {
                const cal = calendars.find(c => c.id === ev.calendarId) || {};
                const color = ev.color || cal.color || "#888";
                const timeLabel = ev.allDay ? "all day" : fmtEvTime(ev.start) + "–" + fmtEvTime(ev.end);
                return (
                  <div key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(ev); }}
                    style={{
                      background: color + "22", borderLeft: `2px solid ${color}`,
                      padding:"2px 4px", borderRadius:3, fontSize:"0.6875rem", color:"var(--text)",
                      fontWeight:500, lineHeight:1.3, overflow:"hidden", whiteSpace:"nowrap",
                      textOverflow:"ellipsis" }} title={ev.title + " · " + timeLabel}>
                    <div style={{ fontSize:"0.6875rem", color, fontFamily:"var(--mono)", fontWeight:700,
                      overflow:"hidden", textOverflow:"ellipsis" }}>
                      {timeLabel}
                    </div>
                    {ev.title}
                  </div>
                );
              })}

              {/* Overflow indicator */}
              {hiddenCount > 0 && (
                <div style={{ fontSize:"0.6875rem", color:"var(--muted)", textAlign:"center",
                  marginTop:2, fontWeight:600 }}>
                  +{hiddenCount} more
                </div>
              )}

              {/* Empty-day hint — only show if truly empty */}
              {totalItems === 0 && (
                <div style={{ fontSize:"0.6875rem", color:"var(--muted)", textAlign:"center",
                  margin:"auto 0", opacity:0.5, fontStyle:"italic" }}>Free</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:10, textAlign:"center" }}>
        Tap a day to preview · double-tap to open
      </div>
    </div>
  );
}

function WeekView({ weekDays, events, calendars, selectedDate, onSelect, onQuickAdd, onEventClick, majorEvents=[], holidays=[], holidayCountries=new Set() }) {
  const HOUR_H = 52;
  const START_H = 0;
  const hours = Array.from({ length: 24 }, (_, i) => i + START_H);

  const dayEvents = useMemo(() => weekDays.map(day => {
    const from = new Date(day); from.setHours(0,0,0,0);
    const to = new Date(day); to.setHours(23,59,59,999);
    return expandEvents(events, from, to).filter(e => !e.allDay && sameDay(e.start, day)).sort((a,b) => a.start - b.start);
  }), [weekDays, events]);

  const allDayEvs = useMemo(() => weekDays.map(day =>
    events.filter(e => e.allDay && sameDay(e.start, day))
  ), [weekDays, events]);

  const nowPct = () => {
    const n = new Date();
    return Math.max(0, (n.getHours() + n.getMinutes()/60 - START_H)) * HOUR_H;
  };

  // Auto-scroll enclosing .screen container to ~6am on mount
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (!scrollRef.current) return;
    const scroller = scrollRef.current.closest(".screen");
    if (scroller) scroller.scrollTo({ top: 6 * HOUR_H, behavior: "instant" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const LABEL_W = 36;

  return (
    <div ref={scrollRef}>
      {/* Day header row */}
      <div style={{ display:"grid", gridTemplateColumns:`${LABEL_W}px repeat(7,1fr)`, marginBottom:0,
        borderBottom:"1px solid var(--border)", paddingBottom:8 }}>
        <div />
        {weekDays.map((d, i) => {
          const isToday = sameDay(d, new Date());
          const isSel = sameDay(d, selectedDate);
          return (
            <div key={i} onClick={() => onSelect(d)} onDoubleClick={() => onQuickAdd && onQuickAdd(d)} style={{ textAlign:"center", cursor:"pointer", padding:"2px 0" }}>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>
                {DAYS[d.getDay()].slice(0,2)}
              </div>
              <div style={{ width:28, height:28, borderRadius:"50%", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center",
                background: isToday ? "var(--accent)" : isSel ? "var(--surface3)" : "transparent",
                fontSize:"0.8125rem", fontWeight:700, color: isToday ? "white" : isSel ? "var(--accent2)" : "var(--text)" }}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day strip — includes major events and holidays */}
      {(weekDays.some((_, i) => allDayEvs[i].length > 0) ||
        weekDays.some(d => majorEvents.some(me => {
          const [sy,sm,sd]=me.startDate.slice(0,10).split("-").map(Number);
          const [ey,em,ed]=me.endDate.slice(0,10).split("-").map(Number);
          const s=new Date(sy,sm-1,sd); const e=new Date(ey,em-1,ed); e.setHours(23,59,59,999);
          const dn=new Date(d); dn.setHours(12,0,0,0); // noon to safely land within any day
          return dn>=s && dn<=e;
        })) ||
        weekDays.some(d => holidays.some(h =>
          holidayCountries.has(h.country) && h.year===d.getFullYear() &&
          h.month===d.getMonth()+1 && h.day===d.getDate()
        ))
      ) && (
        <div style={{ display:"grid", gridTemplateColumns:`${LABEL_W}px repeat(7,1fr)`,
          borderBottom:"1px solid var(--border)", paddingTop:4, paddingBottom:4 }}>
          <div style={{ fontSize:"0.6875rem", color:"var(--muted)", textAlign:"right", paddingRight:5, paddingTop:2, fontWeight:600 }}>ALL<br/>DAY</div>
          {weekDays.map((d, i) => {
            const dayMajor = majorEvents.find(me => {
              const [sy,sm,sd]=me.startDate.slice(0,10).split("-").map(Number);
              const [ey,em,ed]=me.endDate.slice(0,10).split("-").map(Number);
              const s=new Date(sy,sm-1,sd); const e=new Date(ey,em-1,ed); e.setHours(23,59,59,999);
              const dn=new Date(d); dn.setHours(12,0,0,0);
              return dn>=s && dn<=e;
            });
            const dayHol = holidays.find(h =>
              holidayCountries.has(h.country) && h.year===d.getFullYear() &&
              h.month===d.getMonth()+1 && h.day===d.getDate()
            );
            return (
            <div key={i} style={{ padding:"0 1px" }}>
              {dayMajor && (
                <div style={{ background:`repeating-linear-gradient(45deg,${dayMajor.color}33 0px,${dayMajor.color}33 2px,transparent 2px,transparent 6px)`,
                  borderLeft:"2px solid "+dayMajor.color, borderRadius:3,
                  fontSize:"0.6875rem", fontWeight:700, color:dayMajor.color, padding:"2px 3px", marginBottom:2,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {dayMajor.title}
                </div>
              )}
              {dayHol && (
                <div style={{ background:dayHol.color+"25", borderLeft:"2px solid "+dayHol.color,
                  borderRadius:3, fontSize:"0.6875rem", fontWeight:700, color:dayHol.color,
                  padding:"2px 3px", marginBottom:2,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {dayHol.name}
                </div>
              )}
              {allDayEvs[i].map(ev => {
                const cal = calendars.find(c => c.id === ev.calendarId) || {};
                const col = ev.color || cal.color || "#888";
                return (
                  <div key={ev.id} onClick={() => onEventClick(ev)}
                    style={{ background:col+"25", borderLeft:"2px solid "+col, borderRadius:3,
                      fontSize:"0.6875rem", fontWeight:700, color:col, padding:"2px 3px", marginBottom:2,
                      cursor:"pointer", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {ev.title}
                  </div>
                );
              })}
            </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div style={{ overflowY:"auto", maxHeight:440 }}>
        <div style={{ position:"relative" }}>
          {/* Grid lines + labels */}
          <div style={{ display:"grid", gridTemplateColumns:`${LABEL_W}px repeat(7,1fr)` }}>
            {hours.map(h => (
              <React.Fragment key={h}>
                <div style={{ height:HOUR_H, display:"flex", alignItems:"flex-start", justifyContent:"flex-end",
                  paddingRight:6, paddingTop:3, flexShrink:0 }}>
                  <span style={{ fontSize:"0.6875rem", color:"var(--muted)", fontFamily:"var(--mono)", fontWeight:600 }}>
                    {h === 0 ? "12a" : h === 12 ? "12p" : h < 12 ? h+"a" : (h-12)+"p"}
                  </span>
                </div>
                {weekDays.map((_, di) => (
                  <div key={di} style={{ height:HOUR_H,
                    borderTop: h === START_H ? "none" : "1px solid var(--border)",
                    borderLeft:"1px solid var(--border)" }} />
                ))}
              </React.Fragment>
            ))}
          </div>

          {/* Event blocks overlay */}
          {weekDays.map((d, di) => (
            <div key={di} style={{
              position:"absolute", top:0, pointerEvents:"none",
              left: `calc(${LABEL_W}px + ${di} * (100% - ${LABEL_W}px) / 7)`,
              width: `calc((100% - ${LABEL_W}px) / 7)`
            }}>
              {dayEvents[di].map(ev => {
                const cal = calendars.find(c => c.id === ev.calendarId) || {};
                const col = ev.color || cal.color || "#888";
                const startH = ev.start.getHours() + ev.start.getMinutes()/60;
                const endH = ev.end.getHours() + ev.end.getMinutes()/60;
                const clippedStart = Math.max(startH, START_H);
                const clippedEnd = Math.min(endH, START_H + hours.length);
                const topPx = (clippedStart - START_H) * HOUR_H;
                const heightPx = Math.max(20, (clippedEnd - clippedStart) * HOUR_H - 2);
                return (
                  <div key={ev.id} onClick={() => onEventClick(ev)}
                    style={{ position:"absolute", top:topPx, left:2, right:2, height:heightPx,
                      borderRadius:6, background:col+"22", borderLeft:"3px solid "+col,
                      padding:"3px 5px", cursor:"pointer", pointerEvents:"all", overflow:"hidden" }}>
                    <div style={{ fontSize:"0.6875rem", fontWeight:700, color:col, lineHeight:1.3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{ev.title}</div>
                    {heightPx > 30 && <div style={{ fontSize:"0.6875rem", color:col+"bb", marginTop:1, fontFamily:"var(--mono)" }}>{fmtTime(ev.start)}</div>}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Now line */}
          <div style={{ position:"absolute", left:LABEL_W, right:0, top:nowPct(), height:2,
            background:"#ef4444", zIndex:5, pointerEvents:"none", display:"flex", alignItems:"center" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#ef4444", marginLeft:-4, flexShrink:0 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EVENT PILL ────────────────────────────────────────────
// ── Empty state — reusable card for "no items yet" moments ──
function EmptyState({ icon, title, subtitle, actionLabel, onAction, style }) {
  return (
    <div style={{ background:"var(--surface)", border:"1px dashed var(--border)",
      borderRadius:14, padding:"28px 20px", textAlign:"center", marginBottom:12, ...style }}>
      {icon && (
        <div style={{ display:"inline-flex", width:40, height:40, color:"var(--muted)",
          marginBottom:10, opacity:0.6 }}>{icon}</div>
      )}
      <div style={{ fontSize:"0.9375rem", fontWeight:700, color:"var(--text)", marginBottom:4 }}>{title}</div>
      {subtitle && <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginBottom:actionLabel?14:0, lineHeight:1.5 }}>{subtitle}</div>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary"
          style={{ padding:"8px 18px", fontSize:"0.8125rem", marginTop:4 }}>{actionLabel}</button>
      )}
    </div>
  );
}

function EventPill({ ev, cal, onClick, showDate, onDelete }) {
  const isMultiDay = ev.allDay && !sameDay(ev.start, ev.end);
  // Pretty display for the URL field: prefer hostname (e.g. "meet.google.com"),
  // falling back to the raw value for malformed input so we never swallow it silently.
  const urlHost = (() => {
    const raw = ev.url && ev.url.trim();
    if (!raw) return null;
    try { return new URL(raw).hostname.replace(/^www\./, ""); } catch { /* fall through */ }
    try { return new URL("https://" + raw).hostname.replace(/^www\./, ""); } catch { /* fall through */ }
    return raw;
  })();
  const [swipeX, setSwipeX] = React.useState(0);
  const [swiping, setSwiping] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const startX = React.useRef(null);

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX; setSwiping(true); };
  const handleTouchMove = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    setSwipeX(Math.max(-80, Math.min(0, dx)));
  };
  const handleTouchEnd = () => {
    if (swipeX < -50) setSwipeX(-72);
    else setSwipeX(0);
    setSwiping(false);
    startX.current = null;
  };

  return (
    <div style={{ position:"relative", overflow:"hidden", borderRadius:10, marginBottom:8 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Swipe action — delete only (touch) */}
      <div style={{ position:"absolute", right:0, top:0, bottom:0, display:"flex", alignItems:"stretch" }}>
        <button onClick={onDelete} style={{ width:72, background:"#ef4444", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"white", gap:6, fontSize:"0.8125rem", fontWeight:600 }}>
          <span style={{ display:"flex", width:15, height:15 }}>{Icon.trash}</span>
          Delete
        </button>
      </div>
      <div className="event-pill" onClick={swipeX===0?onClick:()=>setSwipeX(0)}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        style={{ transform:`translateX(${swipeX}px)`, transition:swiping?"none":"transform .2s ease", marginBottom:0, borderRadius:10 }}>
        {/* Desktop-only hover delete button — only visible on hover-capable devices.
            Wrapped in a gradient backdrop so text underneath fades out cleanly. */}
        {onDelete && (
          <div
            style={{
              position:"absolute", right:0, top:0, bottom:0,
              display:"flex", alignItems:"center", paddingRight:8, paddingLeft:28,
              background: "linear-gradient(to right, transparent 0%, var(--surface2) 50%)",
              opacity: hovered ? 1 : 0,
              pointerEvents: hovered ? "auto" : "none",
              transition: "opacity .15s ease",
              borderRadius: "0 10px 10px 0",
              zIndex: 2,
            }}>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="event-pill-delete"
              title="Delete event"
              style={{
                width:26, height:26, borderRadius:6,
                background:"rgba(239,68,68,0.2)", border:"1px solid rgba(239,68,68,0.4)",
                color:"#ef4444", display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", padding:0,
              }}>
              <span style={{ display:"flex", width:13, height:13 }}>{Icon.trash}</span>
            </button>
          </div>
        )}
      <div className="event-dot" style={{ background: ev.color || cal.color || "#888" }} />
      <div className="event-pill-info">
        <div className="event-pill-title">{ev.title}</div>
        <div className="event-pill-time">
          {ev.frequency && ev.frequency !== "none" && <span style={{ display:"inline-flex", width:11, height:11, color:"var(--accent2)", marginRight:4, verticalAlign:"middle" }}>{Icon.repeat}</span>}
          {showDate && <>{fmtDate(ev.start)} · </>}
          {ev.allDay ? (isMultiDay ? fmtDateShort(ev.start)+" – "+fmtDateShort(ev.end) : "All day") : fmtTime(ev.start)+" – "+fmtTime(ev.end)}
          {ev.location && ev.location.trim() ? <span style={{ opacity:0.6, marginLeft:4 }}><span style={{ display:"inline-flex", width:10, height:10, marginRight:2, verticalAlign:"middle" }}>{Icon.mapPin}</span>{ev.location.slice(0,22)+(ev.location.length>22?"…":"")}</span> : null}
          {ev.notes && ev.notes.trim() ? <span style={{ opacity:0.5, marginLeft:4 }}>{" · "+ev.notes.slice(0,28)+(ev.notes.length>28?"…":"")}</span> : null}
          {urlHost ? <span style={{ opacity:0.7, marginLeft:4, color:"#3b82f6" }}><span style={{ display:"inline-flex", width:10, height:10, marginRight:2, verticalAlign:"middle" }}>{Icon.link}</span>{urlHost.slice(0,24)+(urlHost.length>24?"…":"")}</span> : null}
          {Array.isArray(ev.attendees) && ev.attendees.length > 0 ? <span style={{ opacity:0.6, marginLeft:4 }}><span style={{ display:"inline-flex", width:10, height:10, marginRight:2, verticalAlign:"middle" }}>{Icon.user}</span>{ev.attendees.length}</span> : null}
        </div>
      </div>
      {ev.reminder && ev.reminder !== "none" && (
        <span style={{ display:"flex", width:12, height:12, color:"var(--muted)", flexShrink:0 }}>{Icon.bell}</span>
      )}

      <div style={{ fontSize:"0.75rem" }}>{visibilityIcon(ev.visibility)}</div>
      </div>
    </div>
  );
}

// ── PATTERN RINGS ─────────────────────────────────────────
// Concentric rounded-rect rings that hug the container. Used by month cells
// (square) and week columns (portrait). For non-square containers, the viewBox
// stretches and vectorEffect keeps stroke thickness uniform.
function ShiftRings({ colors, uniformStroke = false, zIndex = 2 }) {
  if (!colors || colors.length === 0) return null;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex }}>
      {colors.slice(0,3).map((color, ri) => {
        const inset = 4 + ri*8;
        const r = Math.max(0, 18 - ri*8);
        const g = 15, cx = 50, far = 100 - inset;
        return (
          <path key={ri}
            d={`M ${cx+g} ${inset} L ${far-r} ${inset} A ${r} ${r} 0 0 1 ${far} ${inset+r} L ${far} ${far-r} A ${r} ${r} 0 0 1 ${far-r} ${far} L ${inset+r} ${far} A ${r} ${r} 0 0 1 ${inset} ${far-r} L ${inset} ${inset+r} A ${r} ${r} 0 0 1 ${inset+r} ${inset} L ${cx-g} ${inset}`}
            fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            vectorEffect={uniformStroke ? "non-scaling-stroke" : undefined} />
        );
      })}
    </svg>
  );
}

// ── MONTH GRID ────────────────────────────────────────────
function MonthGrid({ year, month, events, calendars, shifts, shiftOverrides, onLongPress, onQuickAdd, majorEvents, selectedDate, onSelect, dayNotes, holidays=[], holidayCountries=new Set(), previewShift=null, previewEvent=null, previewMajor=null }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, curr: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, curr: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDay + 1, curr: false });

  const allRingShifts = [...(shifts||[])].sort((a,b) => (a.priority??99)-(b.priority??99));

  const rotationMap = useMemo(() => {
    const map = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const colors = [];
      for (var rpi = 0; rpi < allRingShifts.length; rpi++) {
        let p = allRingShifts[rpi];
        let oKey = p.id+":"+date.getFullYear()+"-"+date.getMonth()+"-"+date.getDate();
        if (shiftOverrides && shiftOverrides.has(oKey)) continue;
        const extraKey = "extra:"+p.id+":"+date.getFullYear()+"-"+date.getMonth()+"-"+date.getDate();
        const isExtra = shiftOverrides && shiftOverrides.has(extraKey);
        const isNatural = p.type==="rotation" ? getRotationStatus(p,date)==="work" : p.type==="monthly" ? isMonthlyWorkDay(p,date) : (p.config.days||[]).includes(date.getDay());
        if (isNatural||isExtra) colors.push(p.color||"#6366f1");
      }
      if (colors.length) map[d] = colors;
    }
    return map;
  }, [year, month, JSON.stringify(allRingShifts), JSON.stringify([...(shiftOverrides||[])])]);

  const majorEventMap = useMemo(() => {
    const map = {};
    if (!majorEvents) return map;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      for (var mi = 0; mi < majorEvents.length; mi++) {
        const me = majorEvents[mi];
        // Parse as local date to avoid UTC timezone shift
        const [msy,msm,msd] = me.startDate.slice(0,10).split("-").map(Number);
        const [mey,mem,med] = me.endDate.slice(0,10).split("-").map(Number);
        const meStart = new Date(msy,msm-1,msd); meStart.setHours(0,0,0,0);
        const meEnd   = new Date(mey,mem-1,med); meEnd.setHours(23,59,59,999);
        if (date >= meStart && date <= meEnd) { map[d] = me.color; break; }
      }
    }
    return map;
  }, [year, month, majorEvents]);

  const lpTimerRef = React.useRef(null);
  // Track last tap per-cell to detect double-tap. Lives on click (not touchend)
  // so the same path serves desktop double-click and mobile double-tap.
  const lastTapRef = React.useRef({ time: 0, key: null });
  const DOUBLE_TAP_MS = 400;

  return (
    <div className="cal-grid">
      {DAYS.map(d => <div key={d} className="cal-header-cell">{d}</div>)}
      {cells.map((c, i) => {
        const date = new Date(year, c.curr ? month : (i < firstDay ? month-1 : month+1), c.day);
        const isToday = c.curr && sameDay(date, new Date());
        const isSel = c.curr && sameDay(date, selectedDate);
        const rotColors = c.curr ? (rotationMap[c.day]||[]) : [];
        const majorColor = c.curr ? majorEventMap[c.day] : undefined;
        const cellHoliday = c.curr ? holidays.find(h =>
          holidayCountries.has(h.country) && h.year === year && h.month === month+1 && h.day === c.day
        ) : null;
        const dayFrom = new Date(date); dayFrom.setHours(0,0,0,0);
        const dayTo = new Date(date); dayTo.setHours(23,59,59,999);
        const dayEvs = expandEvents(events, dayFrom, dayTo).filter(e => sameDay(e.start, date) || (e.allDay && e.start <= dayTo && e.end >= dayFrom));
        const dots = dayEvs.slice(0,3).map(e => { const cal = calendars.find(cc => cc.id===e.calendarId); return e.color || cal?.color||"#888"; });
        const extraEventCount = Math.max(0, dayEvs.length - 3);
        const hasHideOverride = c.curr && shifts && shifts.some(p => { const oKey = p.id+":"+date.getFullYear()+"-"+date.getMonth()+"-"+date.getDate(); return shiftOverrides && shiftOverrides.has(oKey); });
        const bgTint = !majorColor && rotColors.length>0 ? rotColors[0]+"12" : undefined;
        const busyScore = c.curr && !majorColor && rotColors.length===0 ? getBusyScore(date, events) : 0;
        const busyBg = busyScore > 0.1 ? `rgba(124,106,247,${(busyScore*0.18).toFixed(2)})` : undefined;
        // Preview shift highlight — only for weekly shifts (most common/simple)
        let previewTint = undefined;
        let previewBorder = undefined;
        if (c.curr && previewShift && previewShift.type === "weekly" && previewShift.weekDays && previewShift.weekDays.includes(date.getDay())) {
          previewTint = (previewShift.color || "#6366f1") + "33";
          previewBorder = "2px dashed " + (previewShift.color || "#6366f1");
        }
        // Ghost event preview: show on the date currently selected in the New/Edit Event sheet
        const isGhostDay = c.curr && previewEvent && previewEvent.date && sameDay(date, previewEvent.date);
        // Major event range preview
        const isInMajorPreview = c.curr && previewMajor && previewMajor.startDate && previewMajor.endDate &&
          date >= previewMajor.startDate && date <= previewMajor.endDate;
        const majorPreviewColor = isInMajorPreview ? previewMajor.color : null;
        return (
          <div key={i}
            className={"cal-cell"+(isToday?" today":"")+(isSel?" selected":"")+(!c.curr?" other-month":"")}
            style={{ background: previewTint || bgTint || busyBg || undefined, outline: previewBorder, outlineOffset: previewBorder ? -2 : 0 }}
            onPointerDown={e => {
              if (!c.curr) return;
              if (e.pointerType === "mouse" && e.button !== 0) return;
              lpTimerRef.current = setTimeout(() => { lpTimerRef.current="fired"; onLongPress&&onLongPress(date); }, 500);
            }}
            onPointerUp={() => { if (lpTimerRef.current&&lpTimerRef.current!=="fired") { clearTimeout(lpTimerRef.current); lpTimerRef.current=null; } }}
            onPointerCancel={() => { if (lpTimerRef.current&&lpTimerRef.current!=="fired") { clearTimeout(lpTimerRef.current); lpTimerRef.current=null; } }}
            onPointerLeave={() => { if (lpTimerRef.current&&lpTimerRef.current!=="fired") { clearTimeout(lpTimerRef.current); lpTimerRef.current=null; } }}
            onPointerMove={() => { if (lpTimerRef.current&&lpTimerRef.current!=="fired") { clearTimeout(lpTimerRef.current); lpTimerRef.current=null; } }}
            onContextMenu={e => { if (!c.curr) return; e.preventDefault(); onLongPress&&onLongPress(date); }}
            onClick={() => {
              if (lpTimerRef.current === "fired") { lpTimerRef.current = null; return; }
              if (!c.curr) return;
              const now = Date.now();
              const key = date.getFullYear()+"-"+date.getMonth()+"-"+date.getDate();
              if (onQuickAdd && now - lastTapRef.current.time < DOUBLE_TAP_MS && lastTapRef.current.key === key) {
                lastTapRef.current = { time: 0, key: null };
                onQuickAdd(date);
                return;
              }
              lastTapRef.current = { time: now, key };
              onSelect && onSelect(date);
            }}>
            {hasHideOverride && <div style={{ position:"absolute", top:2, right:3, width:5, height:5, borderRadius:"50%", background:"#f87171", zIndex:3, pointerEvents:"none" }} />}
            {/* Holiday H badge — top-left, zIndex 7 so it's above all rings and stripes */}
            {cellHoliday && (
              <div style={{ position:"absolute", top:2, left:2, width:15, height:15, borderRadius:3,
                background:cellHoliday.color, zIndex:7, pointerEvents:"none",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:"0.8125rem", fontWeight:900, color:"#000", lineHeight:1 }}>H</span>
              </div>
            )}
            {/* Diagonal stripe for major events */}
            {majorColor && (
              <div style={{ position:"absolute", inset:0, borderRadius:8, pointerEvents:"none", zIndex:1,
                background:`repeating-linear-gradient(45deg, ${majorColor}40 0px, ${majorColor}40 3px, transparent 3px, transparent 9px)`,
                border:`1.5px solid ${majorColor}77` }} />
            )}
            {/* Shift rings — concentric, parallel to cell edge, legend-style */}
            <ShiftRings colors={rotColors} />
            {/* Color tag centered above the day number */}
            {majorColor && (
              <div style={{ position:"absolute", top:3, left:"50%", transform:"translateX(-50%)", width:8, height:3, borderRadius:2, background:majorColor, pointerEvents:"none", zIndex:4 }} />
            )}
            <div className="cal-day-num">{c.day}</div>
            {dots.length > 0 && (
              <div className="cal-dots">
                {dots.map((color,di) => <div key={di} className="cal-dot" style={{ background:color }} />)}
                {extraEventCount > 0 && <span className="cal-dot-more">+{extraEventCount}</span>}
              </div>
            )}
            {c.curr && (() => { const nk=date.getFullYear()+"-"+date.getMonth()+"-"+date.getDate(); return dayNotes[nk] ? <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--accent2)", marginTop:1 }} /> : null; })()}
            {isGhostDay && (
              <div style={{
                position:"absolute", inset:2, borderRadius:6,
                border: "2px dashed " + (previewEvent.color || "var(--accent)"),
                background: (previewEvent.color || "var(--accent)") + "22",
                pointerEvents:"none", zIndex:5,
                animation: "ghostPulse 1.5s ease-in-out infinite"
              }} />
            )}
            {majorPreviewColor && (
              <div style={{
                position:"absolute", inset:0, borderRadius:8, pointerEvents:"none", zIndex:0,
                background:`repeating-linear-gradient(45deg, ${majorPreviewColor}55 0px, ${majorPreviewColor}55 3px, transparent 3px, transparent 9px)`,
                border:`1.5px solid ${majorPreviewColor}77`,
                animation: "ghostPulse 1.5s ease-in-out infinite"
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SPECIFIC-DAYS PICKER (generic) ──────────────────────────
// Shared by shift "monthly" type and event "specific" frequency — both pick
// individual calendar dates month-by-month rather than following a repeating rule.
function SpecificDaysPicker({ daysByMonth = {}, color = "#6366f1", onToggle, showWarningsAndActions = true }) {
  const [viewMonth, setViewMonth] = React.useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  const { year, month } = viewMonth;
  const monthKey = `${year}-${month}`;
  const selectedDays = daysByMonth[monthKey] || [];
  const col = color;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, curr: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, curr: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDay + 1, curr: false });

  const isCurrentMonth = year === TODAY.getFullYear() && month === TODAY.getMonth();
  const workCount = selectedDays.length;

  const daysLeft = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate() - TODAY.getDate();
  const nextD = new Date(year, month + 1, 1);
  const nextKey = `${nextD.getFullYear()}-${nextD.getMonth()}`;
  const nextMonthDays = daysByMonth[nextKey] || [];
  const showWarning = showWarningsAndActions && isCurrentMonth && daysLeft <= 5 && nextMonthDays.length === 0;

  return (
    <div style={{ marginBottom:12 }}>
      {showWarning && (
        <div style={{ background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.4)", borderRadius:10, padding:"10px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ display:"flex", width:16, height:16, color:"var(--accent2)" }}>{Icon.bell}</span>
          <div>
            <div style={{ fontSize:"0.8125rem", fontWeight:700, color:"#f59e0b" }}>Schedule reminder</div>
            <div style={{ fontSize:"0.75rem", color:"#fcd34d", marginTop:2 }}>Only {daysLeft} day{daysLeft!==1?"s":""} left — tap next month to plug in your upcoming schedule.</div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <button onClick={() => setViewMonth(m => { const d=new Date(m.year,m.month-1); return {year:d.getFullYear(),month:d.getMonth()}; })}
          style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, width:28, height:28, cursor:"pointer", color:"var(--muted)", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ display:"flex", width:14, height:14 }}>{Icon.chevL}</span></button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:"0.8125rem", fontWeight:700 }}>{MONTHS[month]} {year}</div>
          {workCount > 0
            ? <div style={{ fontSize:"0.6875rem", background:col+"22", color:col, borderRadius:20, padding:"1px 8px", fontWeight:600 }}>{workCount} days</div>
            : <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontStyle:"italic" }}>No days set</div>
          }
        </div>
        <button onClick={() => setViewMonth(m => { const d=new Date(m.year,m.month+1); return {year:d.getFullYear(),month:d.getMonth()}; })}
          style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, width:28, height:28, cursor:"pointer", color:"var(--muted)", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ display:"flex", width:14, height:14 }}>{Icon.chevR}</span></button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:2 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", paddingBottom:2 }}>{d.slice(0,1)}</div>)}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((c, i) => {
          if (!c.curr) return <div key={i} />;
          const isActive = selectedDays.includes(c.day);
          const isToday = isCurrentMonth && c.day === TODAY.getDate();
          return (
            <div key={i} onClick={() => onToggle && onToggle(year, month, c.day)}
              style={{ height:34, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
                background: isActive ? col : isToday ? "var(--surface3)" : "var(--surface2)",
                border: isToday ? "2px solid "+col : isActive ? "2px solid "+col+"88" : "2px solid transparent",
                color: isActive ? "#fff" : isToday ? col : "var(--muted)",
                fontWeight: isActive||isToday ? 700 : 400, fontSize:"0.8125rem", transition:"all .12s",
                WebkitTouchCallout:"none", WebkitUserSelect:"none", userSelect:"none" }}>
              {c.day}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize:"0.6875rem", color:"var(--muted)", textAlign:"center", marginTop:6 }}>Tap days to toggle</div>

      {showWarningsAndActions && workCount > 0 && (
        <div style={{ display:"flex", gap:6, marginTop:8 }}>
          <button onClick={() => {
            const nKey = `${nextD.getFullYear()}-${nextD.getMonth()}`;
            const nDays = new Date(nextD.getFullYear(), nextD.getMonth()+1, 0).getDate();
            const validDays = selectedDays.filter(d => d <= nDays);
            const existingNext = daysByMonth[nKey] || [];
            validDays.forEach(d => { if (!existingNext.includes(d)) onToggle && onToggle(nextD.getFullYear(), nextD.getMonth(), d); });
            setViewMonth({ year: nextD.getFullYear(), month: nextD.getMonth() });
          }} style={{ flex:1, background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, padding:"6px 0", cursor:"pointer", fontSize:"0.6875rem", color:"var(--muted)", fontFamily:"var(--font)", fontWeight:600 }}>
            Copy to next month →
          </button>
          <button onClick={() => {
            [...selectedDays].forEach(d => onToggle && onToggle(year, month, d));
          }} style={{ background:"none", border:"1px solid rgba(248,113,113,0.3)", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:"0.6875rem", color:"#f87171", fontFamily:"var(--font)", fontWeight:600 }}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// ── MONTHLY SPECIFIC-DAYS COMPONENT (shifts) ──────────────────────────
// Thin adapter so ShiftCard can keep its existing call shape while reusing the generic picker.
function MonthlySpecificDays({ shift, col, onToggleDay }) {
  return (
    <SpecificDaysPicker
      daysByMonth={shift.config?.months || {}}
      color={col}
      onToggle={(y, m, d) => onToggleDay && onToggleDay(shift.id, y, m, d)} />
  );
}

// ── PATTERN CARD ──────────────────────────────────────────
function ShiftCard({ shift, onEdit, shiftOverrides, onToggleDay, onAddManualDay, onToggleMonthDay, effectiveTimeToday, hasTimeOverrideToday }) {
  const [expanded, setExpanded] = React.useState(false);
  const [showMonth, setShowMonth] = React.useState(false);
  const [previewMonth, setPreviewMonth] = React.useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  const [showManualPicker, setShowManualPicker] = React.useState(false);
  const padD = n => String(n).padStart(2,"0");
  const todayStrD = () => { const d=new Date(); return d.getFullYear()+"-"+padD(d.getMonth()+1)+"-"+padD(d.getDate()); };
  const [manualDate, setManualDate] = React.useState(todayStrD());
  const cycleLen = shift.type==="rotation" ? (shift.config?.sequence??[]).reduce((s,b) => s+b.days, 0) : null;

  const cycleDay = useMemo(() => {
    if (shift.type!=="rotation"||!shift.config?.startDate||!cycleLen) return null;
    const start = new Date(shift.config.startDate); start.setHours(0,0,0,0);
    const diff = Math.floor((TODAY-start)/86400000);
    if (diff < 0) return null;
    return (diff%cycleLen)+1;
  }, [shift, cycleLen]);

  const upcoming = useMemo(() => {
    return Array.from({length:7},(_,i) => {
      const d = new Date(TODAY); d.setDate(d.getDate()+i);
      let isWork = shift.type==="rotation" ? getRotationStatus(shift,d)==="work" : shift.type==="monthly" ? isMonthlyWorkDay(shift,d) : (shift.config?.days??[]).includes(d.getDay());
      return { date:d, isWork, isToday:i===0 };
    });
  }, [shift]);

  // Next 3 work days within next 30 days — compact quick-view
  const nextWorkDays = useMemo(() => {
    const out = [];
    for (let i = 0; i < 60 && out.length < 3; i++) {
      const d = new Date(TODAY); d.setDate(d.getDate()+i);
      const isWork = shift.type==="rotation" ? getRotationStatus(shift,d)==="work"
        : shift.type==="monthly" ? isMonthlyWorkDay(shift,d)
        : (shift.config?.days??[]).includes(d.getDay());
      if (isWork) out.push(d);
    }
    return out;
  }, [shift]);

  const overrides = useMemo(() => {
    if (!shiftOverrides) return [];
    const list = [];
    const pfx = shift.id+":"; const ePfx = "extra:"+shift.id+":";
    shiftOverrides.forEach(key => {
      if (key.startsWith(pfx)) { const parts=key.slice(pfx.length).split("-"); if (parts.length===3) { const d=new Date(Number(parts[0]),Number(parts[1]),Number(parts[2])); list.push({date:d,type:"hidden",key}); } }
      else if (key.startsWith(ePfx)) { const parts=key.slice(ePfx.length).split("-"); if (parts.length===3) { const d=new Date(Number(parts[0]),Number(parts[1]),Number(parts[2])); list.push({date:d,type:"extra",key}); } }
    });
    list.sort((a,b) => a.date-b.date); return list;
  }, [shiftOverrides, shift.id]);

  const monthCells = useMemo(() => {
    if (!showMonth) return [];
    const {year,month} = previewMonth;
    const firstDay=new Date(year,month,1).getDay(), daysInMonth=new Date(year,month+1,0).getDate(), prevDays=new Date(year,month,0).getDate();
    const cells=[];
    for (var i=firstDay-1;i>=0;i--) cells.push({day:prevDays-i,curr:false});
    for (var d=1;d<=daysInMonth;d++) cells.push({day:d,curr:true});
    while (cells.length%7!==0) cells.push({day:cells.length-daysInMonth-firstDay+1,curr:false});
    return cells.map(c => {
      if (!c.curr) return {...c,isWork:false,isOverride:false,isExtra:false,isToday:false};
      const date=new Date(year,month,c.day);
      const oKey=shift.id+":"+year+"-"+month+"-"+c.day, eKey="extra:"+shift.id+":"+year+"-"+month+"-"+c.day;
      const isOverride=shiftOverrides?shiftOverrides.has(oKey):false, isExtra=shiftOverrides?shiftOverrides.has(eKey):false;
      let isWork=shift.type==="rotation"?getRotationStatus(shift,date)==="work":shift.type==="monthly"?isMonthlyWorkDay(shift,date):(shift.config?.days??[]).includes(date.getDay());
      if (isOverride) isWork=false; if (isExtra) isWork=true;
      return {...c,date,isWork,isOverride,isExtra,isToday:sameDay(date,TODAY)};
    });
  }, [showMonth, previewMonth, shift, shiftOverrides]);

  const todayIsWork = upcoming[0].isWork;
  const col = shift.color||"#6366f1";
  const weekDays = shift.config?.days??[];

  return (
    <div className="card" style={{ marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ width:12, height:12, borderRadius:3, background:col, flexShrink:0 }} />
        <div style={{ fontWeight:700, fontSize:"1rem", flex:1, color:"var(--text)" }}>{shift.name}</div>
        {overrides.length > 0 && (
          <button onClick={() => setExpanded(v=>!v)} style={{ fontSize:"0.6875rem", background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)", color:"#f59e0b", borderRadius:20, padding:"2px 8px", cursor:"pointer", fontFamily:"var(--font)", fontWeight:600 }}>
            {overrides.length} override{overrides.length!==1?"s":""}
          </button>
        )}
        <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontFamily:"var(--mono)" }}>{shift.type==="rotation"?cycleLen+"-day":shift.type==="monthly"?"monthly":"weekly"}</div>
        <button className="btn btn-secondary" style={{ fontSize:"0.75rem", padding:"5px 10px" }} onClick={onEdit}>Edit</button>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:10, marginBottom:12,
        background: todayIsWork?col+"20":"var(--surface2)", border:"1px solid "+(todayIsWork?col+"44":"var(--border)") }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:todayIsWork?col:"var(--muted)", flexShrink:0 }} />
        <div style={{ fontSize:"0.8125rem", fontWeight:600, flex:1, color:todayIsWork?"var(--text)":"var(--muted)" }}>
          Today: {todayIsWork?"Work Day":"Day Off"}{effectiveTimeToday?.enabled&&todayIsWork?" · "+shiftTimeLabel({ shiftTime: effectiveTimeToday })+(hasTimeOverrideToday?" (today only)":""):""}
        </div>
        {shift.type==="rotation"&&cycleDay&&cycleLen&&<div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontFamily:"var(--mono)" }}>Day {cycleDay}/{cycleLen}</div>}
      </div>

      {/* Next work days — compact one-liner */}
      {nextWorkDays.length > 0 && (
        <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginBottom:10, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", fontSize:"0.6875rem" }}>Next work:</span>
          {nextWorkDays.map((d,i) => {
            const isToday = sameDay(d, TODAY);
            const isTomorrow = (() => { const t=new Date(TODAY); t.setDate(t.getDate()+1); return sameDay(d,t); })();
            const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : DAYS[d.getDay()].slice(0,3)+" "+(d.getMonth()+1)+"/"+d.getDate();
            return (
              <span key={i} style={{ fontWeight:600, color: isToday ? col : "var(--text)",
                background: isToday ? col+"22" : "var(--surface2)",
                padding:"2px 8px", borderRadius:10, fontSize:"0.6875rem" }}>{label}</span>
            );
          })}
        </div>
      )}

      {shift.type==="weekly" && (
        <div style={{ display:"flex", gap:4, marginBottom:12 }}>
          {DAYS.map((d,i) => { const active=weekDays.includes(i); return (
            <button key={i} onClick={() => onToggleDay&&onToggleDay(i)}
              style={{ flex:1, height:32, borderRadius:8, border:"2px solid "+(active?col:"var(--border)"),
                background:active?col+"22":"var(--surface2)", color:active?col:"var(--muted)",
                fontWeight:active?700:400, fontSize:"0.75rem", cursor:"pointer", fontFamily:"var(--font)", transition:"all .12s" }}>
              {d.slice(0,1)}
            </button>
          ); })}
        </div>
      )}
      {shift.type==="monthly" && (
        <MonthlySpecificDays shift={shift} col={col} onToggleDay={onToggleMonthDay} />
      )}

      {shift.type !== "monthly" && <>
      <div style={{ display:"flex", gap:3, marginBottom:4 }}>
        {upcoming.map((u,i) => (
          <div key={i} style={{ flex:1, textAlign:"center" }}>
            <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginBottom:3 }}>{DAYS[u.date.getDay()].slice(0,1)}</div>
            <div style={{ height:30, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.6875rem", fontWeight:u.isToday?700:400,
              background:u.isWork?col+(u.isToday?"cc":"33"):"var(--surface2)",
              color:u.isWork?(u.isToday?"#fff":col):"var(--muted)", border:"2px solid "+(u.isToday?col:"transparent") }}>
              {u.date.getDate()}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:"0.6875rem", color:"var(--muted)", textAlign:"center", marginBottom:8 }}>Next 7 days</div>
      </>}

      {expanded && overrides.length > 0 && (
        <div style={{ borderTop:"1px solid var(--border)", paddingTop:10, marginTop:2, marginBottom:8 }}>
          <div style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.7px", color:"var(--muted)", marginBottom:8 }}>Manual overrides</div>
          {overrides.map((o,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:i<overrides.length-1?"1px solid var(--border)":"none" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:o.type==="hidden"?"#f87171":"#34d399", flexShrink:0 }} />
              <div style={{ fontSize:"0.8125rem", flex:1 }}>{fmtDate(o.date)}</div>
              <div style={{ fontSize:"0.6875rem", color:o.type==="hidden"?"#f87171":"#34d399", fontWeight:500 }}>{o.type==="hidden"?"Hidden":"Extra shift"}</div>
            </div>
          ))}
        </div>
      )}

      {shift.type !== "monthly" && <div style={{ marginBottom:8 }}>
        {!showManualPicker ? (
          <button onClick={() => setShowManualPicker(true)}
            style={{ width:"100%", background:"none", border:"1px dashed "+col+"66", borderRadius:8, padding:"7px 0", cursor:"pointer", fontSize:"0.75rem", color:col, fontFamily:"var(--font)", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <span style={{ fontSize:"0.9375rem", lineHeight:1 }}>+</span> Add one-off day
          </button>
        ) : (
          <div style={{ background:col+"11", border:"1px solid "+col+"33", borderRadius:10, padding:12 }}>
            <div style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.7px", color:col, marginBottom:8 }}>Add one-off day</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="date" className="form-input" value={manualDate} onChange={e => setManualDate(e.target.value)} style={{ flex:1, fontSize:"0.8125rem", padding:"8px 10px" }} />
              <button onClick={() => { if (manualDate) { const [y,m,d]=manualDate.split("-").map(Number); onAddManualDay&&onAddManualDay(shift.id,new Date(y,m-1,d)); setShowManualPicker(false); setManualDate(todayStrD()); } }}
                style={{ background:col, border:"none", borderRadius:8, padding:"8px 14px", cursor:"pointer", color:"white", fontSize:"0.8125rem", fontWeight:600, whiteSpace:"nowrap" }}>Add</button>
              <button onClick={() => { setShowManualPicker(false); setManualDate(todayStrD()); }}
                style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, padding:"8px", cursor:"pointer", color:"var(--muted)", display:"flex", alignItems:"center", justifyContent:"center", width:36, height:36 }}><span style={{ display:"flex", width:14, height:14 }}>{Icon.x}</span></button>
            </div>
            <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:6 }}>Shows as active regardless of rotation.</div>
          </div>
        )}
      </div>}

      {shift.type !== "monthly" && <button onClick={() => setShowMonth(v=>!v)} style={{ width:"100%", background:"none", border:"1px solid var(--border)", borderRadius:8, padding:"6px 0", cursor:"pointer", fontSize:"0.75rem", color:"var(--muted)", fontFamily:"var(--font)", fontWeight:500 }}>
        {showMonth?"Hide month view":"View month"}
      </button>}

      {showMonth && (
        <div style={{ marginTop:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <button onClick={() => setPreviewMonth(m => { const d=new Date(m.year,m.month-1); return {year:d.getFullYear(),month:d.getMonth()}; })} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:"1.125rem", padding:"0 4px" }}><span style={{ display:"flex", width:16, height:16 }}>{Icon.chevL}</span></button>
            <div style={{ fontSize:"0.8125rem", fontWeight:600 }}>{MONTHS[previewMonth.month]} {previewMonth.year}</div>
            <button onClick={() => setPreviewMonth(m => { const d=new Date(m.year,m.month+1); return {year:d.getFullYear(),month:d.getMonth()}; })} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:"1.125rem", padding:"0 4px" }}><span style={{ display:"flex", width:16, height:16 }}>{Icon.chevR}</span></button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:"0.6875rem", color:"var(--muted)", fontWeight:600, paddingBottom:3, textTransform:"uppercase" }}>{d.slice(0,1)}</div>)}
            {monthCells.map((c,i) => (
              <div key={i} style={{ height:28, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.6875rem", position:"relative",
                background:!c.curr?"transparent":c.isWork?col+"33":"var(--surface2)", color:!c.curr?"transparent":c.isWork?col:"var(--muted)",
                fontWeight:c.isToday?700:400, outline:c.isToday?"2px solid "+col:"none", outlineOffset:-2 }}>
                {c.curr?c.day:""}
                {(c.isOverride||c.isExtra)&&c.curr&&<div style={{ position:"absolute", top:2, right:2, width:4, height:4, borderRadius:"50%", background:c.isOverride?"#f87171":"#34d399" }} />}
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:12, marginTop:8, justifyContent:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.6875rem", color:"var(--muted)" }}><div style={{ width:10, height:10, borderRadius:3, background:col+"33", border:"1px solid "+col+"44" }} /> Work day</div>
            {overrides.some(o=>o.type==="hidden")&&<div style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.6875rem", color:"var(--muted)" }}><div style={{ width:6, height:6, borderRadius:"50%", background:"#f87171" }} /> Hidden</div>}
            {overrides.some(o=>o.type==="extra")&&<div style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.6875rem", color:"var(--muted)" }}><div style={{ width:6, height:6, borderRadius:"50%", background:"#34d399" }} /> Extra</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── NEW EVENT SHEET ───────────────────────────────────────
// ── COLOR PICKER (shared across all sheets) ─────────────
// Props:
//   value       — currently selected color (hex string) or null
//   onChange    — callback receives picked hex string (or null for "Calendar" on events)
//   includeNull — if true, shows the "Use calendar color" swatch first (events only)
//   recents     — array of recent custom hex strings
//   favorites   — array of favorite custom hex strings
//   onRecentsChange — called with updated recents array when custom color picked
//   onFavoritesChange — called with updated favorites array when star toggled
function ColorPicker({ value, onChange, includeNull=false, recents=[], favorites=[], onRecentsChange, onFavoritesChange }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const customActive = isCustomColor(value);

  const handlePickCustom = (hex) => {
    onChange(hex);
    if (onRecentsChange) {
      const next = [hex, ...recents.filter(x => x !== hex)].slice(0, 6);
      onRecentsChange(next);
    }
    setPopupOpen(false);
  };

  const toggleFavorite = (hex) => {
    if (!onFavoritesChange) return;
    const next = favorites.includes(hex)
      ? favorites.filter(x => x !== hex)
      : [...favorites, hex].slice(0, 8);
    onFavoritesChange(next);
  };

  return (
    <>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {includeNull && (
          <div onClick={() => onChange(null)}
            title="Use calendar color"
            style={{ width:32, height:32, borderRadius:"50%", cursor:"pointer",
              position:"relative", flexShrink:0, background:"transparent",
              border: value === null ? "3px solid var(--text)" : "2px solid transparent",
              boxShadow: value === null ? "0 0 0 2px var(--accent)" : "none",
              transition:"all .12s" }}>
            <div style={{ position:"absolute", inset:3, borderRadius:"50%",
              background:"linear-gradient(135deg,#6366f1,#f59e0b,#10b981)" }} />
          </div>
        )}
        {PALETTE.map(c => (
          <div key={c.value} onClick={() => onChange(c.value)} title={c.label}
            style={{ width:32, height:32, borderRadius:"50%", background:c.value, cursor:"pointer",
              border: value === c.value ? "3px solid var(--text)" : "2px solid transparent",
              boxShadow: value === c.value ? "0 0 0 2px var(--accent)" : "none",
              boxSizing:"border-box", flexShrink:0, transition:"all .12s" }} />
        ))}
        {/* 15th swatch: custom */}
        <div onClick={() => setPopupOpen(true)} title="Custom color"
          style={{ width:32, height:32, borderRadius:"50%", cursor:"pointer",
            position:"relative", flexShrink:0,
            background: customActive ? value : "transparent",
            border: customActive ? "3px solid var(--text)" : "2px solid rgba(255,255,255,0.15)",
            boxShadow: customActive ? "0 0 0 2px var(--accent)" : "none",
            boxSizing:"border-box", transition:"all .12s" }}>
          {!customActive && (
            <div style={{ position:"absolute", inset:0, borderRadius:"50%",
              background:"conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:"62%", height:"62%", borderRadius:"50%",
                background:"var(--surface)", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:"1rem", fontWeight:800, color:"var(--text)",
                lineHeight:1 }}>+</div>
            </div>
          )}
        </div>
      </div>
      {popupOpen && (
        <CustomColorPopup
          current={customActive ? value : null}
          recents={recents}
          favorites={favorites}
          onPick={handlePickCustom}
          onToggleFavorite={toggleFavorite}
          onClose={() => setPopupOpen(false)} />
      )}
    </>
  );
}

// ── CUSTOM COLOR POPUP ───────────────────────────────────
function CustomColorPopup({ current, recents, favorites, onPick, onToggleFavorite, onClose }) {
  const [hex, setHex] = useState(current || "#7c6af7");
  const cleanHex = hex.trim().startsWith("#") ? hex.trim() : "#" + hex.trim();
  const isValid = HEX_RE.test(cleanHex);

  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.7)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"var(--surface)", borderRadius:16, padding:16,
          border:"1px solid var(--border)", maxWidth:340, width:"100%",
          maxHeight:"90vh", overflow:"auto",
          boxShadow:"0 10px 40px rgba(0,0,0,0.6)" }}>

        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:"0.9375rem", fontWeight:700, color:"var(--text)" }}>Custom color</div>
          <button className="btn-icon" style={{ background:"var(--surface3)" }} onClick={onClose}>{Icon.close}</button>
        </div>

        {/* FAVORITES */}
        {favorites.length > 0 && (
          <>
            <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"#fbbf24",
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
              ★ Favorites
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
              {favorites.map(c => (
                <div key={c} style={{ position:"relative", width:34, height:34 }}>
                  <div onClick={() => onPick(c)}
                    style={{ width:34, height:34, borderRadius:"50%", background:c, cursor:"pointer",
                      border:"2px solid rgba(251,191,36,0.7)", boxSizing:"border-box" }} />
                  <div onClick={(e) => { e.stopPropagation(); onToggleFavorite(c); }}
                    title="Remove from favorites"
                    style={{ position:"absolute", top:-7, right:-7, width:22, height:22,
                      background:"var(--surface)", borderRadius:"50%", cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"0.875rem", color:"#fbbf24", fontWeight:700, lineHeight:1,
                      border:"1.5px solid #fbbf24",
                      boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }}>★</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* RECENTS */}
        {recents.length > 0 && (
          <>
            <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--muted)",
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
              Recently used <span style={{ fontWeight:500, textTransform:"none", letterSpacing:0, opacity:0.8 }}>· tap ☆ to favorite</span>
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
              {recents.map(c => (
                <div key={c} style={{ position:"relative", width:34, height:34 }}>
                  <div onClick={() => onPick(c)}
                    style={{ width:34, height:34, borderRadius:"50%", background:c, cursor:"pointer",
                      border:"2px solid var(--border)", boxSizing:"border-box" }} />
                  {!favorites.includes(c) && (
                    <div onClick={(e) => { e.stopPropagation(); onToggleFavorite(c); }}
                      title="Add to favorites"
                      style={{ position:"absolute", top:-7, right:-7, width:22, height:22,
                        background:"var(--surface)", borderRadius:"50%", cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"0.875rem", color:"#fbbf24", fontWeight:700, lineHeight:1,
                        border:"1.5px solid var(--border)",
                        boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }}>☆</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* SHADE GRID */}
        <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--muted)",
          textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>
          All shades
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:14 }}>
          {SHADES.map((row, ri) => (
            <div key={ri} style={{ display:"flex", gap:4, justifyContent:"center" }}>
              {row.map(c => (
                <div key={c} onClick={() => onPick(c)}
                  style={{ width:20, height:20, borderRadius:4, background:c,
                    cursor:"pointer", border:"1px solid rgba(255,255,255,0.08)",
                    boxSizing:"border-box", flexShrink:0 }} />
              ))}
            </div>
          ))}
        </div>

        {/* HEX INPUT */}
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:6 }}>
          <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--muted)",
            textTransform:"uppercase", letterSpacing:"0.5px" }}>
            Or enter a hex code
          </div>
          <div style={{ fontSize:"0.6875rem", color:"var(--muted)", opacity:0.7 }}>
            e.g. #7c6af7
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ width:34, height:34, borderRadius:8,
            background: isValid ? cleanHex : "var(--surface2)",
            border:"1px solid var(--border)", flexShrink:0 }} />
          <input value={hex} onChange={e => setHex(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && isValid) onPick(cleanHex); }}
            placeholder="7c6af7"
            style={{ flex:1, background:"var(--surface2)",
              border:`1px solid ${isValid ? "rgba(52,211,153,0.4)" : hex.trim().length > 1 ? "rgba(248,113,113,0.4)" : "var(--border)"}`,
              borderRadius:8, padding:"8px 12px", color:"var(--text)",
              fontSize:"0.8125rem", fontFamily:"var(--mono)", outline:"none",
              boxSizing:"border-box" }} />
          <button onClick={() => isValid && onPick(cleanHex)} disabled={!isValid}
            style={{ padding:"8px 14px", borderRadius:8,
              background: isValid ? "var(--accent)" : "var(--surface3)",
              border:"none", fontSize:"0.75rem", fontWeight:700,
              color: isValid ? "#fff" : "var(--muted)",
              cursor: isValid ? "pointer" : "not-allowed", fontFamily:"var(--font)" }}>
            Use
          </button>
        </div>
        {/* Help text: guidance when empty, error when invalid */}
        <div style={{ fontSize:"0.6875rem", color: (!isValid && hex.trim().length > 1) ? "#f87171" : "var(--muted)",
          marginTop:6, opacity:0.85, minHeight:14 }}>
          {(!isValid && hex.trim().length > 1)
            ? "Needs 6 hex digits (0-9, A-F). The # is added automatically."
            : "Tip: paste any 6-digit color code — the # is added for you."}
        </div>
      </div>
    </div>
  );
}

function NewEventSheet({ existing, calendars, groups, allEvents=[], customColors, onSave, onDelete, onClose, defaultDate, defaultCalendar, defaultReminder, onPreview }) {
  const isEdit = !!existing;
  const pad = n => String(n).padStart(2,"0");
  const defaultStart = new Date(defaultDate); defaultStart.setHours(9,0);
  const [title, setTitle] = useState(existing?.title??"");
  const [calId, setCalId] = useState(existing?.calendarId??defaultCalendar??calendars[0]?.id??"");
  const [allDay, setAllDay] = useState(existing?.allDay??false);
  const [startDate, setStartDate] = useState(existing ? `${existing.start.getFullYear()}-${pad(existing.start.getMonth()+1)}-${pad(existing.start.getDate())}` : `${defaultStart.getFullYear()}-${pad(defaultStart.getMonth()+1)}-${pad(defaultStart.getDate())}`);
  const [endDate, setEndDate] = useState(existing ? `${existing.end.getFullYear()}-${pad(existing.end.getMonth()+1)}-${pad(existing.end.getDate())}` : `${defaultStart.getFullYear()}-${pad(defaultStart.getMonth()+1)}-${pad(defaultStart.getDate())}`);
  const [startTime, setStartTime] = useState(existing ? `${pad(existing.start.getHours())}:${pad(existing.start.getMinutes())}` : "09:00");
  const [endTime, setEndTime] = useState(existing ? `${pad(existing.end.getHours())}:${pad(existing.end.getMinutes())}` : "10:00");
  const [notes, setNotes] = useState(existing?.notes??"");
  const [visibility, setVisibility] = useState(existing?.visibility==="inherit" ? "private" : (existing?.visibility??"private"));
  const [selGroups, setSelGroups] = useState(existing?.groupIds??[]);
  const [frequency, setFrequency] = useState(existing?.frequency??"none");
  const [monthDays, setMonthDays] = useState(existing?.monthDays ?? {});
  const [reminder, setReminder] = useState(existing?.reminder??defaultReminder??"none");
  const [location, setLocation] = useState(existing?.location??"");
  const [url, setUrl] = useState(existing?.url??"");
  const [attendeeInput, setAttendeeInput] = useState("");
  const [attendees, setAttendees] = useState(existing?.attendees??[]);
  const [eventColor, setEventColor] = useState(existing?.color??null);
  const [showMore, setShowMore] = useState(isEdit); // show advanced fields when editing

  // Scope toggle for recurring-event occurrences: default to instance so an edit lands on
  // just the tapped date, which matches the user's mental model of "edit this one."
  const isRecurringOccurrence = isEdit && existing?.frequency && existing.frequency !== "none" && !!existing?._occurrenceKey;
  const [scope, setScope] = useState(isRecurringOccurrence ? "instance" : "series");

  const toggleGroup = id => setSelGroups(prev => prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  const handleSave = () => {
    if (!title.trim()) return;
    const [sy,sm,sd] = startDate.split("-").map(Number);
    const [ey,em,ed] = endDate.split("-").map(Number);
    const [sh,smin] = startTime.split(":").map(Number);
    const [eh,emin] = endTime.split(":").map(Number);
    const start = new Date(sy,sm-1,sd, allDay?0:sh, allDay?0:smin);
    const end = new Date(ey,em-1,ed, allDay?23:eh, allDay?59:emin);
    const saved = { title, calendarId:calId, start, end, allDay, notes, visibility, groupIds:selGroups, frequency, reminder, location, color:eventColor, url, attendees };
    if (frequency === "specific") saved.monthDays = monthDays;
    if (isEdit) {
      saved.id = existing.id;
      saved._seriesId = existing._seriesId;
      saved._occurrenceKey = existing._occurrenceKey;
    }
    const opts = isRecurringOccurrence
      ? { scope, dateKey: existing._occurrenceKey }
      : {};
    onSave(saved, opts);
  };

  const handleDelete = () => {
    if (!onDelete) return;
    const opts = isRecurringOccurrence
      ? { scope, dateKey: existing._occurrenceKey }
      : {};
    onDelete(existing.id, opts);
  };

  const calColor = calendars.find(c=>c.id===calId)?.color || "var(--accent)";

  // Live preview: report ghost event shape up to parent so calendar can render it
  React.useEffect(() => {
    if (!onPreview) return;
    const [sy,sm,sd] = startDate.split("-").map(Number);
    if (!sy || !sm || !sd) return;
    const ghostDate = new Date(sy, sm-1, sd);
    if (isNaN(ghostDate.getTime())) return;
    onPreview({
      date: ghostDate,
      color: eventColor || calColor,
      title: title || "New event",
      id: existing?.id,
    });
  }, [startDate, eventColor, calColor, title, existing?.id, onPreview]);

  // Detect if any "more" fields are already filled (edit mode)
  const hasMoreData = !!(location || url || attendees.length > 0 || (frequency && frequency !== "none") || eventColor || (visibility && visibility !== "inherit"));

  // Conflict detection — compute live as user changes times
  const conflicts = useMemo(() => {
    if (!startDate || !startTime || !endDate || !endTime || allDay) return [];
    const [sy,sm,sd] = startDate.split("-").map(Number);
    const [ey,em,ed] = endDate.split("-").map(Number);
    const [sh,smin] = startTime.split(":").map(Number);
    const [eh,emin] = endTime.split(":").map(Number);
    const newStart = new Date(sy,sm-1,sd,sh,smin);
    const newEnd   = new Date(ey,em-1,ed,eh,emin);
    if (newEnd <= newStart) return [];
    return allEvents.filter(ev => {
      if (ev.allDay) return false;
      if (isEdit && ev.id === existing?.id) return false;
      return ev.start < newEnd && ev.end > newStart;
    });
  }, [startDate, startTime, endDate, endTime, allDay, allEvents, isEdit, existing]);

  // Title autocomplete — group past events by normalized title so repeats
  // remember the last-used calendar + color. Freq count breaks ties so
  // "Morning Run" (used 20×) ranks above "Morning planning" (used once).
  const titleHistory = useMemo(() => {
    if (isEdit) return [];
    const byTitle = new Map();
    for (const ev of allEvents) {
      const key = (ev.title || "").trim().toLowerCase();
      if (!key) continue;
      const t = ev.start instanceof Date ? ev.start.getTime() : 0;
      const prior = byTitle.get(key);
      if (!prior) {
        byTitle.set(key, { title: ev.title.trim(), calendarId: ev.calendarId, color: ev.color || null, time: t, count: 1 });
      } else {
        prior.count += 1;
        if (t > prior.time) { prior.time = t; prior.calendarId = ev.calendarId; prior.color = ev.color || null; prior.title = ev.title.trim(); }
      }
    }
    return Array.from(byTitle.values()).sort((a, b) => b.count - a.count || b.time - a.time);
  }, [allEvents, isEdit]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const matchingSuggestions = useMemo(() => {
    const q = title.trim().toLowerCase();
    if (q.length < 2) return [];
    const out = [];
    for (const h of titleHistory) {
      const t = h.title.toLowerCase();
      if (t === q) continue; // exact match already picked
      if (t.startsWith(q) || t.includes(q)) out.push(h);
      if (out.length >= 5) break;
    }
    return out;
  }, [title, titleHistory]);
  const applySuggestion = (s) => {
    setTitle(s.title);
    if (s.calendarId && calendars.find(c => c.id === s.calendarId)) setCalId(s.calendarId);
    setEventColor(s.color);
    setSuggestionsOpen(false);
  };

  // React's autoFocus can lose the race with the sheet's slideUp animation
  // on iPad Safari + hardware-keyboard setups, so re-focus after the anim
  // settles. Cursor at end so edit-mode edits append instead of overwriting.
  const titleInputRef = React.useRef(null);
  React.useEffect(() => {
    const id = setTimeout(() => {
      const el = titleInputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      try { el.setSelectionRange(len, len); } catch {}
    }, 80);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="sheet-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0, flex:1 }}>
            <div style={{ fontSize:"1rem", fontWeight:700, flexShrink:0 }}>{isEdit?"Edit Event":"New Event"}</div>
            <div style={{ fontSize:"0.8125rem", color:"var(--muted)", flexShrink:0 }}>→</div>
            {(() => {
              const activeCal = calendars.find(c => c.id === calId) || calendars[0];
              return activeCal ? (
                <div style={{ display:"flex", alignItems:"center", gap:5,
                  background:activeCal.color+"22", border:`1px solid ${activeCal.color}55`,
                  borderRadius:20, padding:"3px 8px", minWidth:0 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:activeCal.color, flexShrink:0 }} />
                  <div style={{ fontSize:"0.75rem", fontWeight:600, color:activeCal.color,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activeCal.name}</div>
                </div>
              ) : null;
            })()}
          </div>
          <button className="btn-icon" style={{ background:"var(--surface3)" }} onClick={onClose}>{Icon.close}</button>
        </div>

        {/* Scope toggle — only when editing a single occurrence of a recurring event */}
        {isRecurringOccurrence && (
          <div style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, padding:"8px 10px", marginBottom:10 }}>
            <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:6 }}>
              Apply changes to
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {[["instance","This date only"],["series","All dates"]].map(([v,l]) => (
                <button key={v} onClick={()=>setScope(v)}
                  style={{
                    flex:1, padding:"8px 10px", borderRadius:8, cursor:"pointer",
                    fontFamily:"var(--font)", fontSize:"0.8125rem", fontWeight:600,
                    background: scope===v ? "rgba(124,106,247,0.2)" : "var(--surface)",
                    border:"1.5px solid "+(scope===v ? "var(--accent)" : "var(--border)"),
                    color: scope===v ? "var(--accent2)" : "var(--muted)",
                  }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--surface2)", borderRadius:10, padding:"10px 12px" }}>
            <div style={{ width:3, alignSelf:"stretch", borderRadius:2, background:eventColor||calColor, flexShrink:0 }} />
            <input ref={titleInputRef} placeholder="What's happening?" value={title}
              onChange={e => { setTitle(e.target.value); setSuggestionsOpen(true); }}
              style={{ background:"none", border:"none", padding:0, fontSize:"0.9375rem", fontWeight:600, flex:1, color:"var(--text)", fontFamily:"var(--font)", outline:"none" }} />
          </div>
          {suggestionsOpen && matchingSuggestions.length > 0 && (
            <div style={{ marginTop:6, background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
              {matchingSuggestions.map((s, i) => {
                const cal = calendars.find(c => c.id === s.calendarId);
                const dot = s.color || cal?.color || "var(--accent)";
                return (
                  <div key={i} onMouseDown={e => e.preventDefault()} onClick={() => applySuggestion(s)}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", cursor:"pointer",
                      borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:dot, flexShrink:0 }} />
                    <div style={{ fontSize:"0.8125rem", fontWeight:600, color:"var(--text)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.title}</div>
                    {cal && <div style={{ fontSize:"0.6875rem", color:"var(--muted)", flexShrink:0 }}>{cal.name}</div>}
                    {s.count > 1 && <div style={{ fontSize:"0.6875rem", color:"var(--muted)", flexShrink:0 }}>×{s.count}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendar chips — right below title for fast switching */}
        <div style={{ display:"flex", gap:5, marginBottom:10, flexWrap:"wrap" }}>
          {calendars.map(c => (
            <div key={c.id} onClick={()=>setCalId(c.id)}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:14,
                background: calId===c.id ? c.color+"22" : "var(--surface2)",
                border:"1.5px solid "+(calId===c.id ? c.color+"88" : "var(--border)"),
                cursor:"pointer", fontSize:"0.6875rem", fontWeight:600,
                color: calId===c.id ? c.color : "var(--muted)" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:c.color }} />{c.name}
            </div>
          ))}
        </div>

        {/* Date / Time */}
        <div style={{ background:"var(--surface2)", borderRadius:10, marginBottom:10, overflow:"hidden", border:"1px solid var(--border)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderBottom:"1px solid var(--border)" }}>
            <span style={{ fontSize:"0.875rem", color:"var(--text)", fontWeight:500 }}>All day</span>
            <button className={"toggle "+(allDay?"on":"")} onClick={()=>setAllDay(!allDay)} />
          </div>
          {[
            { label:"Start", type:"date", value:startDate, onChange:e=>{
                const newStart = e.target.value;
                setStartDate(newStart);
                if (endDate <= newStart) {
                  // advance end to next day
                  const next = new Date(newStart+"T00:00:00"); next.setDate(next.getDate()+1);
                  const pad = n=>String(n).padStart(2,"0");
                  setEndDate(next.getFullYear()+"-"+pad(next.getMonth()+1)+"-"+pad(next.getDate()));
                }
              }},
            { label:"End",   type:"date", value:endDate,   onChange:e=>{ if(e.target.value>=startDate) setEndDate(e.target.value); } },
            ...(!allDay ? [
              { label:"From", type:"time", value:startTime, onChange:e=>{
                  const newStart = e.target.value;
                  // Preserve current duration by shifting end time by the same delta
                  const [oh,om] = startTime.split(":").map(Number);
                  const [nh,nm] = newStart.split(":").map(Number);
                  const [eh,em] = endTime.split(":").map(Number);
                  const deltaMin = (nh*60+nm) - (oh*60+om);
                  const newEndMin = Math.min(23*60+59, Math.max(0, eh*60+em+deltaMin));
                  setStartTime(newStart);
                  setEndTime(pad(Math.floor(newEndMin/60))+":"+pad(newEndMin%60));
                } },
              { label:"To",   type:"time", value:endTime,   onChange:e=>setEndTime(e.target.value) },
            ] : [])
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display:"flex", alignItems:"center", padding:"0 14px", borderBottom: i<arr.length-1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize:"0.8125rem", color:"var(--muted)", fontWeight:500, width:48, flexShrink:0 }}>{row.label}</span>
              <input type={row.type} value={row.value} onChange={row.onChange}
                style={{ flex:1, background:"none", border:"none", padding:"13px 0", color:"var(--text)",
                  fontFamily:"var(--font)", fontSize:"1rem", outline:"none", textAlign:"right", minWidth:0 }} />
            </div>
          ))}
        </div>

        {/* Reminder */}
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.4px" }}>Remind</span>
          {[["none","Off"],["15","15m"],["30","30m"],["60","1h"],["1440","1d"]].map(([v,l]) => (
            <div key={v} onClick={()=>setReminder(v)}
              style={{ padding:"4px 9px", borderRadius:12, fontSize:"0.6875rem", fontWeight:600, cursor:"pointer",
                background: reminder===v ? "var(--accent)" : "var(--surface2)",
                color: reminder===v ? "white" : "var(--muted)",
                border:"1.5px solid "+(reminder===v ? "var(--accent)" : "var(--border)") }}>
              {l}
            </div>
          ))}
        </div>

        {/* Notes */}
        <textarea className="form-input" placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)}
          style={{ minHeight:40, resize:"none", marginBottom:8 }} />

        {/* More options */}
        {!(showMore||hasMoreData) && (
          <button onClick={()=>setShowMore(true)}
            style={{ width:"100%", background:"none", border:"1px dashed var(--border)", borderRadius:8,
              padding:"7px", cursor:"pointer", fontSize:"0.75rem", color:"var(--muted)", fontFamily:"var(--font)",
              fontWeight:600, marginBottom:8 }}>
            + More options
          </button>
        )}

        {(showMore||hasMoreData) && (
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:8, marginBottom:8 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
              <div>
                <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>Location</div>
                <input placeholder="Where?" value={location} onChange={e=>setLocation(e.target.value)} className="form-input" />
              </div>
              <div>
                <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", marginBottom:3 }}>Link</div>
                <input placeholder="Zoom / Meet..." value={url} onChange={e=>setUrl(e.target.value)} className="form-input" />
              </div>
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", marginBottom:4 }}>Repeat</div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {[["none","None"],["daily","Daily"],["weekly","Weekly"],["biweekly","2 wks"],["monthly","Monthly"],["specific","Specific days"]].map(([v,l]) => (
                  <div key={v} className={"chip"+(frequency===v?" active":"")}
                    onClick={() => {
                      setFrequency(v);
                      // When switching to specific, seed the picker with the start date so the user isn't staring at empty state.
                      if (v === "specific" && Object.keys(monthDays).length === 0) {
                        const [sy,sm,sd] = startDate.split("-").map(Number);
                        if (sy && sm && sd) setMonthDays({ [(sy)+"-"+(sm-1)]: [sd] });
                      }
                    }}
                    style={{ fontSize:"0.6875rem", padding:"3px 8px" }}>{l}</div>
                ))}
              </div>
              {frequency === "specific" && (
                <div style={{ marginTop:8, padding:10, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10 }}>
                  <SpecificDaysPicker
                    daysByMonth={monthDays}
                    color={eventColor || calColor}
                    showWarningsAndActions={false}
                    onToggle={(y, m, d) => setMonthDays(prev => {
                      const key = y + "-" + m;
                      const cur = prev[key] || [];
                      const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort((a,b) => a-b);
                      const updated = { ...prev };
                      if (next.length === 0) delete updated[key]; else updated[key] = next;
                      return updated;
                    })} />
                  <div style={{ fontSize:"0.6875rem", color:"var(--muted)", lineHeight:1.5, marginTop:4 }}>
                    Each tapped day becomes an occurrence at the time above. No automatic pattern — you fill it in as you learn it.
                  </div>
                </div>
              )}
            </div>
            {FEATURES.sharing && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", marginBottom:4 }}>Visibility</div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {[{v:"private",l:"Only me"},{v:"groups",l:"Groups"},{v:"full_access",l:"Everyone"}].map(opt=>(
                  <div key={opt.v} className={"chip"+(visibility===opt.v?" active":"")} onClick={()=>setVisibility(opt.v)} style={{ fontSize:"0.6875rem", padding:"3px 8px" }}>{opt.l}</div>
                ))}
              </div>
              {visibility==="groups" && (
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:5 }}>
                  {groups.map(g=><div key={g.id} className={"chip"+(selGroups.includes(g.id)?" active":"")} onClick={()=>toggleGroup(g.id)} style={{ fontSize:"0.6875rem", padding:"3px 8px" }}>{g.name}</div>)}
                </div>
              )}
            </div>
            )}
            {FEATURES.attendees && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", marginBottom:4 }}>Attendees</div>
              {attendees.length > 0 && (
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:5 }}>
                  {attendees.map((a,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:3, background:"var(--surface2)", borderRadius:10, padding:"3px 8px", fontSize:"0.6875rem" }}>
                      {a}<button onClick={()=>setAttendees(p=>p.filter((_,j)=>j!==i))} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", display:"flex", width:14, height:14, padding:0 }}><span style={{ display:"flex", width:14, height:14 }}>{Icon.x}</span></button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display:"flex", gap:5 }}>
                <input className="form-input" placeholder="Add name..." value={attendeeInput}
                  onChange={e=>setAttendeeInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"&&attendeeInput.trim()){ setAttendees(p=>[...p,attendeeInput.trim()]); setAttendeeInput(""); }}}
                  style={{ flex:1 }} />
                <button className="btn btn-secondary" style={{ padding:"0 10px", fontSize:"0.75rem", whiteSpace:"nowrap" }}
                  onClick={()=>{ if(attendeeInput.trim()){ setAttendees(p=>[...p,attendeeInput.trim()]); setAttendeeInput(""); }}}>Add</button>
              </div>
            </div>
            )}
            <div>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", marginBottom:5 }}>Color</div>
              <ColorPicker value={eventColor} onChange={setEventColor} includeNull={true}
                recents={customColors.recents} favorites={customColors.favorites}
                onRecentsChange={customColors.setRecents} onFavoritesChange={customColors.setFavorites} />
            </div>
          </div>
        )}

        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)",
            borderRadius:10, padding:"10px 12px", marginBottom:10,
            display:"flex", alignItems:"flex-start", gap:8 }}>
            <div style={{ width:4, flexShrink:0, alignSelf:"stretch", background:"#f87171", borderRadius:2 }} />
            <div>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#f87171", marginBottom:3 }}>
                Conflicts with {conflicts.length} event{conflicts.length!==1?"s":""}
              </div>
              {conflicts.slice(0,2).map(ev => (
                <div key={ev.id} style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2 }}>
                  {ev.title} · {ev.start.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} – {ev.end.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                </div>
              ))}
              {conflicts.length > 2 && <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:2 }}>+{conflicts.length-2} more</div>}
            </div>
          </div>
        )}
        <div style={{
          position:"sticky", bottom:-40,
          marginLeft:-20, marginRight:-20, marginTop:12, marginBottom:-40,
          padding:"12px 20px 24px",
          background:"var(--surface)",
          borderTop:"1px solid var(--border)",
          zIndex:2,
        }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={!title.trim()} style={{ opacity:title.trim()?1:0.5 }}>
            {isEdit?"Save Changes":"Save Event"}
          </button>
          {isEdit&&onDelete&&(
            <button className="btn btn-secondary" onClick={handleDelete} style={{ width:"100%", marginTop:8, color:"#f87171", borderColor:"rgba(248,113,113,0.3)" }}>
              {isRecurringOccurrence && scope === "instance" ? "Delete This Date" : "Delete Event"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function EventDetailSheet({ ev, cal, groups, onDelete, onEdit, onClose, onDuplicate, onPin, isPinned, mapProvider }) {
  const evGroups = groups.filter(g => ev.groupIds?.includes(g.id));
  const isMultiDay = ev.allDay && !sameDay(ev.start, ev.end);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isRecurring = ev.frequency && ev.frequency !== "none";
  const isRecurringOccurrence = isRecurring && !!ev._occurrenceKey;
  return (
    <div className="sheet-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:ev.color||cal.color }} />
              <span style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{cal.name}</span>
            </div>
            <div style={{ fontSize:"1.375rem", fontWeight:700 }}>{ev.title}</div>
          </div>
          <button className="btn-icon" style={{ background:"var(--surface3)" }} onClick={onClose}>{Icon.close}</button>
        </div>
        <div className="card card-sm" style={{ marginBottom:12 }}>
          <div style={{ fontSize:"0.875rem", fontWeight:500 }}>{isMultiDay ? fmtDate(ev.start)+" – "+fmtDate(ev.end) : fmtDate(ev.start)}</div>
          <div style={{ fontSize:"0.8125rem", color:"var(--muted)", marginTop:2 }}>{ev.allDay?(isMultiDay?Math.round((ev.end-ev.start)/86400000)+1+" days":"All day"):fmtTime(ev.start)+" – "+fmtTime(ev.end)}</div>
          {ev.frequency&&ev.frequency!=="none"&&<div style={{ fontSize:"0.75rem", color:"var(--accent2)", marginTop:6 }}>{{daily:"Repeats daily",weekly:"Repeats weekly",biweekly:"Every 2 weeks",monthly:"Repeats monthly",specific:"Specific days"}[ev.frequency]}</div>}
        </div>
        {ev.reminder&&ev.reminder!=="none"&&(
          <div className="card card-sm" style={{ marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ display:"flex", width:16, height:16, color:"var(--accent2)" }}>{Icon.bell}</span>
            <div style={{ fontSize:"0.875rem" }}>{reminderLabel(ev.reminder)}</div>
          </div>
        )}
        {FEATURES.sharing && (
        <div className="card card-sm" style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:"1.125rem" }}>{visibilityIcon(ev.visibility)}</span>
            <div>
              <div style={{ fontSize:"0.875rem", fontWeight:500 }}>{visibilityLabel(ev.visibility)}</div>
              {evGroups.length>0&&<div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>{evGroups.map(g=><span key={g.id} className="group-badge"><div style={{ width:7, height:7, borderRadius:"50%", background:g.color }} />{g.name}</span>)}</div>}
            </div>
          </div>
        </div>
        )}
        {ev.location&&(
          <div className="card card-sm" style={{ marginBottom:12, display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
            onClick={() => window.open(mapUrl(ev.location, mapProvider),"_blank")}>
            <span style={{ display:"flex", width:16, height:16, color:"#ef4444", flexShrink:0 }}>{Icon.pin}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"0.875rem", fontWeight:500 }}>{ev.location}</div>
              <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.6875rem", color:"var(--muted)", marginTop:1 }}>Open in Maps <span style={{ display:"inline-flex", width:11, height:11 }}>{Icon.externalLink}</span></div>
            </div>
          </div>
        )}
        {ev.url&&(
          <div className="card card-sm" style={{ marginBottom:12, display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
            onClick={() => window.open(ev.url,"_blank")}>
            <span style={{ display:"flex", width:16, height:16, color:"#3b82f6", flexShrink:0 }}>{Icon.link}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"0.875rem", fontWeight:500 }}>Join meeting</div>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginTop:1, wordBreak:"break-all" }}>{ev.url.replace(/^https?:\/\//,"").slice(0,40)}{ev.url.length>46?"…":""}</div>
            </div>
            <span style={{ display:"flex", width:13, height:13, color:"var(--muted)" }}>{Icon.externalLink}</span>
          </div>
        )}
        {ev.attendees&&ev.attendees.length>0&&(
          <div className="card card-sm" style={{ marginBottom:12 }}>
            <div className="section-label" style={{ marginBottom:8 }}>Attendees · {ev.attendees.length}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {ev.attendees.map((a,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:5, background:"var(--surface2)", borderRadius:20, padding:"5px 12px", fontSize:"0.8125rem" }}>
                  <span style={{ display:"flex", width:12, height:12, color:"var(--muted)" }}>{Icon.user}</span>{a}
                </div>
              ))}
            </div>
          </div>
        )}
        {ev.notes&&<div className="card card-sm" style={{ marginBottom:12 }}><div className="section-label" style={{ marginBottom:4 }}>Notes</div><div style={{ fontSize:"0.875rem" }}>{ev.notes}</div></div>}
        {!confirmDelete && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={onEdit}>Edit</button>
              <button className="btn btn-secondary" style={{ flex:1, color:"#f87171", borderColor:"rgba(248,113,113,0.3)" }} onClick={()=>setConfirmDelete(true)}>Delete</button>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:0 }}>
              <button className="btn btn-secondary" onClick={()=>onDuplicate(ev)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <span style={{ display:"flex", width:13, height:13 }}>{Icon.copy}</span> Duplicate
              </button>
              <button className="btn btn-secondary" onClick={()=>onPin(ev.id)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, color: isPinned?"#f59e0b":"var(--muted)", borderColor: isPinned?"rgba(245,158,11,0.4)":"var(--border)" }}>
                <span style={{ display:"flex", width:13, height:13 }}>{Icon.pin2}</span> {isPinned?"Pinned":"Pin"}
              </button>
            </div>
          </>
        )}
        {confirmDelete && (
          <div style={{ padding:14, borderRadius:10,
            background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.3)" }}>
            <div style={{ fontSize:"0.875rem", fontWeight:700, color:"#fca5a5", marginBottom:6 }}>
              Delete "{ev.title}"?
            </div>
            <div style={{ fontSize:"0.75rem", color:"var(--text)", lineHeight:1.5, marginBottom:12 }}>
              {isRecurringOccurrence
                ? <>This is one occurrence of a <strong>{ev.frequency}</strong> event. Pick what to delete.</>
                : isRecurring
                  ? <>This is a <strong>{ev.frequency}</strong> recurring event. All future occurrences will also be removed.</>
                  : <>This event will be permanently removed.</>}
            </div>
            {isRecurringOccurrence ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button onClick={() => onDelete(ev.id, { scope:"instance", dateKey: ev._occurrenceKey })}
                  style={{ padding:"10px", borderRadius:8, background:"#ef4444", border:"none",
                    fontSize:"0.8125rem", fontWeight:700, color:"#fff", cursor:"pointer", fontFamily:"var(--font)" }}>
                  Delete this date only
                </button>
                <button onClick={() => onDelete(ev.id, { scope:"series" })}
                  style={{ padding:"10px", borderRadius:8, background:"var(--surface2)",
                    border:"1px solid rgba(248,113,113,0.4)", fontSize:"0.8125rem", fontWeight:700,
                    color:"#fca5a5", cursor:"pointer", fontFamily:"var(--font)" }}>
                  Delete entire series
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ padding:"10px", borderRadius:8, background:"none",
                    border:"1px solid var(--border)", fontSize:"0.8125rem", fontWeight:600,
                    color:"var(--muted)", cursor:"pointer", fontFamily:"var(--font)" }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ flex:1, padding:"10px", borderRadius:8, background:"var(--surface2)",
                    border:"1px solid var(--border)", fontSize:"0.8125rem", fontWeight:600,
                    color:"var(--text)", cursor:"pointer", fontFamily:"var(--font)" }}>
                  Cancel
                </button>
                <button onClick={() => onDelete(ev.id)}
                  style={{ flex:1, padding:"10px", borderRadius:8, background:"#ef4444",
                    border:"none", fontSize:"0.8125rem", fontWeight:700, color:"#fff",
                    cursor:"pointer", fontFamily:"var(--font)" }}>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── NEW GROUP SHEET ───────────────────────────────────────
function NewGroupSheet({ existing, currentMembers, onSave, onDelete, onClose }) {
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name??"");
  const [color, setColor] = useState(existing?.color??"#6366f1");
  const [members, setMembers] = useState(currentMembers??[]);
  const [newMemberName, setNewMemberName] = useState("");
  const colors = ["#6366f1","#f97316","#10b981","#f59e0b","#ec4899","#3b82f6"];
  const uid2 = () => Math.random().toString(36).slice(2,7);
  return (
    <div className="sheet-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div className="sheet-title" style={{ marginBottom:0 }}>{isEdit?"Edit Group":"New Group"}</div>
          <button className="btn-icon" style={{ background:"var(--surface3)" }} onClick={onClose}>{Icon.close}</button>
        </div>
        <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="Group name" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="form-group">
          <label className="form-label">Color</label>
          <div className="chip-row">{colors.map(c=><div key={c} onClick={()=>setColor(c)} style={{ width:32,height:32,borderRadius:"50%",background:c,cursor:"pointer",border:color===c?"3px solid white":"3px solid transparent",transition:"border .12s" }} />)}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Members</label>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input className="form-input" placeholder="Member name" value={newMemberName} onChange={e=>setNewMemberName(e.target.value)}
              onKeyDown={e=>{ if (e.key==="Enter"&&newMemberName.trim()) { setMembers(prev=>[...prev,{userId:"u"+uid2(),name:newMemberName.trim(),role:"viewer"}]); setNewMemberName(""); }}}
              style={{ flex:1 }} />
            <button className="btn btn-secondary" style={{ padding:"0 14px", whiteSpace:"nowrap" }}
              onClick={()=>{ if (newMemberName.trim()) { setMembers(prev=>[...prev,{userId:"u"+uid2(),name:newMemberName.trim(),role:"viewer"}]); setNewMemberName(""); }}}>Add</button>
          </div>
          {members.map((m,idx)=>(
            <div key={m.userId} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
              <div style={{ flex:1, fontSize:"0.875rem" }}>{m.name}</div>
              <select value={m.role} onChange={e=>setMembers(prev=>prev.map((x,i)=>i===idx?{...x,role:e.target.value}:x))} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, color:"var(--text)", padding:"4px 8px", fontSize:"0.75rem" }}>
                <option value="viewer">Viewer</option><option value="editor">Editor</option>
              </select>
              <button onClick={()=>setMembers(prev=>prev.filter((_,i)=>i!==idx))} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", display:"flex", width:16, height:16 }}><span style={{ display:"flex", width:16, height:16 }}>{Icon.x}</span></button>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={()=>{ if (name.trim()) onSave({...(existing||{}),name,color},members); }} style={{ opacity:name.trim()?1:0.5 }}>{isEdit?"Save Changes":"Create Group"}</button>
        {isEdit&&onDelete&&<button className="btn btn-secondary" onClick={()=>onDelete(existing.id)} style={{ width:"100%", marginTop:10, color:"#f87171", borderColor:"rgba(248,113,113,0.3)" }}>Delete Group</button>}
      </div>
    </div>
  );
}

// ── MAJOR EVENT DETAIL SHEET ─────────────────────────────
function MajorEventDetailSheet({ me, groups=[], onEdit, onDelete, onDuplicate, onPin, onClose, mapProvider }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const parseLocal = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
  const start = parseLocal(me.startDate);
  const end = parseLocal(me.endDate); end.setHours(23,59,59,999);
  const now = new Date();
  const isActive = now >= start && now <= end;
  const isPast = now > end;
  // Calendar-day span (midnight-to-midnight) so single-day events report as 1 day.
  const totalDays = Math.round((parseLocal(me.endDate) - parseLocal(me.startDate)) / 86400000) + 1;
  const dayOf = isActive ? Math.floor((now - start) / 86400000) + 1 : null;
  const daysUntil = !isActive && !isPast ? Math.ceil((start - now) / 86400000) : 0;
  const evGroups = groups.filter(g => me.groupIds?.includes(g.id));
  const statusLabel = isPast ? "Past" : isActive ? "Ongoing" : "Upcoming";

  return (
    <div className="sheet-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="sheet" style={{ padding:0, overflow:"hidden" }}>
        <div className="sheet-handle" style={{ margin:"10px auto 0" }} />

        {/* Hero banner */}
        <div style={{ padding:"18px 16px 20px",
          background:"linear-gradient(135deg,"+me.color+"dd,"+me.color+"99)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <div style={{ fontSize:"0.6875rem", fontWeight:800, letterSpacing:"1px", textTransform:"uppercase",
                background:"rgba(0,0,0,0.22)", borderRadius:20, padding:"3px 10px", color:"rgba(255,255,255,0.95)" }}>
                {statusLabel}
              </div>
              <div style={{ fontSize:"0.6875rem", fontWeight:800, letterSpacing:"1px", textTransform:"uppercase",
                background:"rgba(0,0,0,0.22)", borderRadius:20, padding:"3px 10px", color:"rgba(255,255,255,0.95)" }}>
                {isActive ? "Day "+dayOf+" of "+totalDays : totalDays > 1 ? totalDays+" days" : "1 day"}
              </div>
            </div>
            <button className="btn-icon" style={{ background:"rgba(0,0,0,0.22)", color:"rgba(255,255,255,0.9)" }} onClick={onClose}>{Icon.close}</button>
          </div>

          <div style={{ fontSize:"1.625rem", fontWeight:900, color:"#fff", lineHeight:1.15, marginBottom:4 }}>{me.title}</div>
          <div style={{ fontSize:"0.8125rem", color:"rgba(255,255,255,0.85)" }}>
            {totalDays > 1 ? fmtDate(start)+" – "+fmtDate(end) : fmtDate(start)}
            {!me.allDay && me.startTime ? "  ·  "+me.startTime+(me.endTime?" – "+me.endTime:"") : ""}
          </div>

          {/* Countdown — only if not past */}
          {me.showCountdown && !isPast && (
            <div style={{ marginTop:14, display:"flex", alignItems:"baseline", gap:6 }}>
              <div style={{ fontSize:"2rem", fontWeight:900, color:"#fff", fontFamily:"var(--mono)", lineHeight:1 }}>
                {isActive ? dayOf : daysUntil}
              </div>
              <div style={{ fontSize:"0.8125rem", color:"rgba(255,255,255,0.85)", fontWeight:600 }}>
                {isActive ? (dayOf === 1 ? "day in" : "days in") : (daysUntil === 1 ? "day to go" : "days to go")}
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding:16 }}>
          {me.location && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:8,
              background:"var(--surface2)", borderRadius:10, border:"1px solid var(--border)" }}>
              <span style={{ display:"flex", width:14, height:14, color:"var(--muted)", flexShrink:0 }}>{Icon.mapPin}</span>
              <div style={{ fontSize:"0.8125rem", color:"var(--text)", flex:1 }}>{me.location}</div>
              <a href={mapUrl(me.location, mapProvider)} target="_blank" rel="noreferrer"
                style={{ fontSize:"0.6875rem", color:"var(--accent2)", textDecoration:"none", fontWeight:600 }}>Maps →</a>
            </div>
          )}
          {me.url && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:8,
              background:"var(--surface2)", borderRadius:10, border:"1px solid var(--border)" }}>
              <span style={{ display:"flex", width:14, height:14, color:"var(--muted)", flexShrink:0 }}>{Icon.link}</span>
              <a href={me.url} target="_blank" rel="noreferrer"
                style={{ fontSize:"0.8125rem", color:"#93c5fd", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textDecoration:"none" }}>
                {me.url.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {FEATURES.sharing && evGroups.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:8,
              background:"var(--surface2)", borderRadius:10, border:"1px solid var(--border)" }}>
              <span style={{ display:"flex", width:14, height:14, color:"var(--muted)", flexShrink:0 }}>{Icon.groups}</span>
              <div style={{ fontSize:"0.8125rem", color:"var(--text)", flex:1 }}>
                Shared with {evGroups.map(g => g.name).join(", ")}
              </div>
            </div>
          )}
          {me.notes && (
            <div style={{ background:"var(--surface2)", borderRadius:10, padding:12, marginBottom:12,
              border:"1px solid var(--border)" }}>
              <div className="section-label" style={{ marginBottom:4 }}>Notes</div>
              <div style={{ fontSize:"0.8125rem", color:"var(--text)", lineHeight:1.5 }}>{me.notes}</div>
            </div>
          )}

          {/* Actions */}
          {!confirmDelete && (
            <>
              {onPin && (
                <button className="btn btn-secondary"
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:8,
                    color: me.pinned ? "#f59e0b" : "var(--muted)",
                    borderColor: me.pinned ? "rgba(245,158,11,0.4)" : "var(--border)" }}
                  onClick={() => onPin(me.id)}>
                  <span style={{ display:"flex", width:13, height:13 }}>{Icon.pin2}</span>
                  {me.pinned ? "Pinned to top" : "Pin to top"}
                </button>
              )}
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn btn-secondary" style={{ flex:1 }} onClick={onEdit}>Edit</button>
                {onDuplicate && (
                  <button className="btn btn-secondary" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }} onClick={() => onDuplicate(me)}>
                    <span style={{ display:"flex", width:13, height:13 }}>{Icon.copy}</span> Copy
                  </button>
                )}
                <button className="btn btn-secondary" style={{ flex:1, color:"#f87171", borderColor:"rgba(248,113,113,0.3)" }} onClick={() => setConfirmDelete(true)}>Delete</button>
              </div>
            </>
          )}
          {confirmDelete && (
            <div style={{ padding:14, borderRadius:10,
              background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.3)" }}>
              <div style={{ fontSize:"0.875rem", fontWeight:700, color:"#fca5a5", marginBottom:6 }}>Delete "{me.title}"?</div>
              <div style={{ fontSize:"0.75rem", color:"var(--text)", lineHeight:1.5, marginBottom:12 }}>
                This major event will be permanently removed.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ flex:1, padding:"10px", borderRadius:8, background:"var(--surface2)",
                    border:"1px solid var(--border)", fontSize:"0.8125rem", fontWeight:600,
                    color:"var(--text)", cursor:"pointer", fontFamily:"var(--font)" }}>Cancel</button>
                <button onClick={() => onDelete(me.id)}
                  style={{ flex:1, padding:"10px", borderRadius:8, background:"#ef4444",
                    border:"none", fontSize:"0.8125rem", fontWeight:700, color:"#fff",
                    cursor:"pointer", fontFamily:"var(--font)" }}>Delete</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAJOR EVENT SHEET ─────────────────────────────────────
function MajorEventSheet({ existing, defaultDate, groups=[], customColors, onSave, onDelete, onClose, onPreview }) {
  const isEdit = !!existing;
  const pad = n => String(n).padStart(2,"0");
  const fmtForInput = d => { const dt=new Date(d); return dt.getFullYear()+"-"+pad(dt.getMonth()+1)+"-"+pad(dt.getDate()); };
  const todayStr = () => { const d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); };
  const initialDate = defaultDate ? fmtForInput(defaultDate) : todayStr();

  const [title, setTitle] = useState(existing?.title??"");
  const [color, setColor] = useState(existing?.color??"#f59e0b");
  const [startDate, setStartDate] = useState(existing?fmtForInput(existing.startDate):initialDate);
  const [endDate, setEndDate] = useState(existing?fmtForInput(existing.endDate):initialDate);
  const [allDay, setAllDay] = useState(existing?.allDay??true);
  const [startTime, setStartTime] = useState(existing?.startTime??"09:00");
  const [endTime, setEndTime] = useState(existing?.endTime??"17:00");
  const [showCountdown, setShowCountdown] = useState(existing?.showCountdown??true);
  const [pinned, setPinned] = useState(existing?.pinned??false);
  const [notes, setNotes] = useState(existing?.notes??"");
  const [location, setLocation] = useState(existing?.location??"");
  const [url, setUrl] = useState(existing?.url??"");
  const [visibility, setVisibility] = useState(existing?.visibility==="inherit" ? "private" : (existing?.visibility??"private"));
  const [selGroups, setSelGroups] = useState(existing?.groupIds??[]);
  const toggleGroup = id => setSelGroups(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);

  // Live preview: report the current date range + color so calendar can visualize it
  React.useEffect(() => {
    if (!onPreview) return;
    const [sy,sm,sd] = startDate.split("-").map(Number);
    const [ey,em,ed] = endDate.split("-").map(Number);
    if (!sy || !sm || !sd || !ey || !em || !ed) return;
    const s = new Date(sy, sm-1, sd); s.setHours(0,0,0,0);
    const e = new Date(ey, em-1, ed); e.setHours(23,59,59,999);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return;
    onPreview({ startDate: s, endDate: e, color, title: title || "Major event", id: existing?.id });
  }, [startDate, endDate, color, title, existing?.id, onPreview]);

  const handleSave = () => {
    if (!title.trim()) return;
    const saved = { title, color, showCountdown, pinned, notes, location, url, allDay, startTime, endTime,
      startDate, endDate, visibility, groupIds: selGroups };
    if (isEdit) { saved.id=existing.id; }
    onSave(saved);
  };

  const parseLocal = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
  const start = startDate ? parseLocal(startDate) : new Date();
  const end = endDate ? parseLocal(endDate) : new Date();
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);

  // Re-focus title after the sheet's slideUp animation — autoFocus alone
  // isn't reliable on iPad Safari with a hardware keyboard attached.
  const titleInputRef = React.useRef(null);
  React.useEffect(() => {
    const id = setTimeout(() => {
      const el = titleInputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      try { el.setSelectionRange(len, len); } catch {}
    }, 80);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="sheet-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:"1rem", fontWeight:700 }}>{isEdit?"Edit Major Event":"New Major Event"}</div>
          <button className="btn-icon" style={{ background:"var(--surface3)" }} onClick={onClose}>{Icon.close}</button>
        </div>

        {/* Live preview */}
        <div style={{ borderRadius:12, padding:"12px 14px", marginBottom:12,
          background:"linear-gradient(135deg,"+color+"cc,"+color+"77)", border:"1px solid "+color+"44" }}>
          <div style={{ fontSize:"1.0625rem", fontWeight:800, color:"#fff", marginBottom:2 }}>{title||"Event name"}</div>
          <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.75)" }}>
            {startDate&&endDate ? (startDate===endDate ? startDate : startDate+" → "+endDate+(totalDays>1?" · "+totalDays+" days":"")) : "Set dates below"}
            {!allDay && startTime ? "  ·  "+startTime+(endTime?" – "+endTime:"") : ""}
          </div>
          {location && <div style={{ fontSize:"0.6875rem", color:"rgba(255,255,255,0.65)", marginTop:2 }}><span style={{ display:"inline-flex", width:10, height:10, marginRight:2, verticalAlign:"middle" }}>{Icon.mapPin}</span>{location}</div>}
        </div>

        {/* Title */}
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--surface2)", borderRadius:10,
          padding:"12px 14px", marginBottom:10, border:"1px solid var(--border)" }}>
          <div style={{ width:3, alignSelf:"stretch", borderRadius:2, background:color, flexShrink:0 }} />
          <input ref={titleInputRef} placeholder="Trip, event, or milestone name..." value={title} onChange={e=>setTitle(e.target.value)}
            style={{ background:"none", border:"none", padding:0, fontSize:"0.9375rem", fontWeight:600,
              flex:1, color:"var(--text)", fontFamily:"var(--font)", outline:"none" }} />
        </div>

        {/* Color swatches */}
        <div style={{ marginBottom:10 }}>
          <ColorPicker value={color} onChange={setColor}
            recents={customColors?.recents||[]} favorites={customColors?.favorites||[]}
            onRecentsChange={customColors?.setRecents} onFavoritesChange={customColors?.setFavorites} />
        </div>

        {/* Dates + time — list rows */}
        <div style={{ background:"var(--surface2)", borderRadius:10, marginBottom:10, overflow:"hidden", border:"1px solid var(--border)" }}>
          {/* Single day toggle — when on, End mirrors Start and the End row hides */}
          {(() => {
            const singleDay = startDate === endDate;
            return (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:"0.875rem", color:"var(--text)", fontWeight:500 }}>Single day</span>
                <button className={"toggle "+(singleDay?"on":"")} onClick={() => {
                  if (singleDay) {
                    // Turning off — make it a 2-day span starting from the current Start
                    const next = new Date(startDate+"T00:00:00"); next.setDate(next.getDate()+1);
                    const pad = n=>String(n).padStart(2,"0");
                    setEndDate(next.getFullYear()+"-"+pad(next.getMonth()+1)+"-"+pad(next.getDate()));
                  } else {
                    setEndDate(startDate);
                  }
                }} />
              </div>
            );
          })()}
          {/* All day toggle */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderBottom:"1px solid var(--border)" }}>
            <span style={{ fontSize:"0.875rem", color:"var(--text)", fontWeight:500 }}>All day</span>
            <button className={"toggle "+(allDay?"on":"")} onClick={()=>setAllDay(v=>!v)} />
          </div>
          {[
            { label:"Start", type:"date", value:startDate, onChange:e=>{
                const newStart = e.target.value;
                const wasSingleDay = startDate === endDate;
                setStartDate(newStart);
                // If single-day is active, keep End locked to Start.
                // Otherwise push End forward only when it would become invalid.
                if (wasSingleDay) setEndDate(newStart);
                else if (endDate < newStart) setEndDate(newStart);
              }},
            ...(startDate !== endDate ? [
              { label:"End", type:"date", value:endDate, onChange:e=>{ if(e.target.value>=startDate) setEndDate(e.target.value); } },
            ] : []),
            ...(!allDay ? [
              { label:"From", type:"time", value:startTime, onChange:e=>setStartTime(e.target.value) },
              { label:"To",   type:"time", value:endTime,   onChange:e=>setEndTime(e.target.value) },
            ] : [])
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display:"flex", alignItems:"center", padding:"0 14px",
              borderBottom: i<arr.length-1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize:"0.8125rem", color:"var(--muted)", fontWeight:500, width:48, flexShrink:0 }}>{row.label}</span>
              <input type={row.type} value={row.value} onChange={row.onChange}
                style={{ flex:1, background:"none", border:"none", padding:"13px 0", color:"var(--text)",
                  fontFamily:"var(--font)", fontSize:"1rem", outline:"none", textAlign:"right" }} />
            </div>
          ))}
        </div>

        {/* Location + Link — list rows */}
        <div style={{ background:"var(--surface2)", borderRadius:10, marginBottom:10, overflow:"hidden", border:"1px solid var(--border)" }}>
          {[
            { label:"Location", placeholder:"Where?",              value:location, onChange:e=>setLocation(e.target.value) },
            { label:"Link",     placeholder:"Booking / itinerary...", value:url,   onChange:e=>setUrl(e.target.value) },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display:"flex", alignItems:"center", padding:"0 14px",
              borderBottom: i<arr.length-1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize:"0.8125rem", color:"var(--muted)", fontWeight:500, width:72, flexShrink:0 }}>{row.label}</span>
              <input value={row.value} onChange={row.onChange} placeholder={row.placeholder}
                style={{ flex:1, background:"none", border:"none", padding:"13px 0", color:"var(--text)",
                  fontFamily:"var(--font)", fontSize:"1rem", outline:"none", textAlign:"right" }} />
            </div>
          ))}
        </div>

        {/* Notes */}
        <textarea className="form-input" placeholder="Notes..." value={notes}
          onChange={e=>setNotes(e.target.value)} style={{ marginBottom:10, minHeight:56, resize:"none" }} />

        {/* Visibility */}
        {FEATURES.sharing && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", marginBottom:4 }}>Who can see this?</div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {[{v:"private",l:"Only me"},{v:"groups",l:"Groups"},{v:"full_access",l:"Everyone"}].map(opt=>(
              <div key={opt.v} className={"chip"+(visibility===opt.v?" active":"")}
                onClick={()=>setVisibility(opt.v)} style={{ fontSize:"0.6875rem", padding:"3px 8px" }}>{opt.l}</div>
            ))}
          </div>
          {visibility==="groups" && groups.length > 0 && (
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:5 }}>
              {groups.map(g => (
                <div key={g.id} className={"chip"+(selGroups.includes(g.id)?" active":"")}
                  onClick={()=>toggleGroup(g.id)} style={{ fontSize:"0.6875rem", padding:"3px 8px" }}>{g.name}</div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Countdown + Pin toggles */}
        <div style={{ background:"var(--surface2)", borderRadius:10, marginBottom:12,
          border:"1px solid var(--border)", overflow:"hidden" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"12px 14px", borderBottom:"1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize:"0.875rem", fontWeight:500 }}>Show countdown</div>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:1 }}>Live timer on home screen</div>
            </div>
            <button className={"toggle"+(showCountdown?" on":"")} onClick={()=>setShowCountdown(v=>!v)} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px" }}>
            <div>
              <div style={{ fontSize:"0.875rem", fontWeight:500 }}>Pin to top</div>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:1 }}>Always show first on the home screen</div>
            </div>
            <button className={"toggle"+(pinned?" on":"")} onClick={()=>setPinned(v=>!v)} />
          </div>
        </div>

        <div style={{
          position:"sticky", bottom:-40,
          marginLeft:-20, marginRight:-20, marginTop:12, marginBottom:-40,
          padding:"12px 20px 24px",
          background:"var(--surface)",
          borderTop:"1px solid var(--border)",
          zIndex:2,
        }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={!title.trim()} style={{ opacity:title.trim()?1:0.5 }}>
            {isEdit?"Save Changes":"Create Major Event"}
          </button>
          {isEdit&&onDelete&&(
            <button className="btn btn-secondary" onClick={()=>onDelete(existing.id)}
              style={{ width:"100%", marginTop:8, color:"#f87171", borderColor:"rgba(248,113,113,0.3)" }}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PATTERN SHEET ─────────────────────────────────────────
// Shift template presets — shown when creating a new shift
const PATTERN_TEMPLATES = [
  {
    id: "blank", name: "Blank", description: "Start from scratch",
    iconKey: "plus", type: null,
  },
  {
    id: "kelly", name: "Kelly Schedule",
    description: "1 on, 1 off, 1 on, 1 off, 1 on, 4 off · 9-day cycle",
    iconKey: "shifts", type: "rotation",
    config: { sequence: [
      { type: "work", days: 1 }, { type: "off", days: 1 },
      { type: "work", days: 1 }, { type: "off", days: 1 },
      { type: "work", days: 1 }, { type: "off", days: 4 },
    ]},
  },
  {
    id: "48-96", name: "48/96",
    description: "2 days on, 4 days off · 6-day cycle",
    iconKey: "repeat", type: "rotation",
    config: { sequence: [{ type: "work", days: 2 }, { type: "off", days: 4 }] },
  },
  {
    id: "alternating-week", name: "Alternating Week",
    description: "1 week on, 1 week off · 14-day cycle",
    iconKey: "calendar", type: "rotation",
    config: { sequence: [{ type: "work", days: 7 }, { type: "off", days: 7 }] },
  },
  {
    id: "mwf", name: "Mon / Wed / Fri",
    description: "Three days a week",
    iconKey: "threeDays", type: "weekly",
    config: { days: [1, 3, 5] },
  },
  {
    id: "one-on-two-off", name: "1 Week On / 2 Weeks Off",
    description: "7 days on, 14 days off · 21-day cycle",
    iconKey: "flag", type: "rotation",
    config: { sequence: [{ type: "work", days: 7 }, { type: "off", days: 14 }] },
  },
];

function ShiftSheet({ existing, customColors, onSave, onDelete, onClose, onPreview }) {
  const isEdit = !!existing;
  // Template picker: shown ONLY for NEW shifts (not edit mode), and only until a template is chosen
  const [showTemplates, setShowTemplates] = useState(!isEdit);
  const [name, setName] = useState(existing?.name??"");
  const [type, setType] = useState(existing?.type??"rotation");
  const [color, setColor] = useState(existing?.color??"#6366f1");
  const [sequence, setSequence] = useState(existing?.config?.sequence??[{type:"work",days:1},{type:"off",days:1}]);
  const [weekDays, setWeekDays] = useState(existing?.config?.days??[1,2,3,4,5]);
  const [shiftEnabled, setShiftEnabled] = useState(existing?.config?.shiftTime?.enabled??false);
  const [shiftStart, setShiftStart] = useState(existing?.config?.shiftTime?.start??"09:00");
  const [shiftEnd, setShiftEnd] = useState(existing?.config?.shiftTime?.end??"17:00");
  // Apply a template preset — fills in name, type, sequence/days
  const applyTemplate = (tpl) => {
    if (tpl.id === "blank") {
      // Keep defaults, just dismiss the template picker
      setShowTemplates(false);
      return;
    }
    setName(tpl.name);
    if (tpl.type) setType(tpl.type);
    if (tpl.config?.sequence) setSequence(tpl.config.sequence);
    if (tpl.config?.days) setWeekDays(tpl.config.days);
    setShowTemplates(false);
  };
  // Overnight shift math — if end is at or before start, treat as crossing midnight
  const shiftMetrics = React.useMemo(() => {
    if (!shiftEnabled) return { isOvernight: false, durationHours: null };
    const [sh, sm] = shiftStart.split(":").map(Number);
    const [eh, em] = shiftEnd.split(":").map(Number);
    if (isNaN(sh) || isNaN(eh)) return { isOvernight: false, durationHours: null };
    const startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    const isOvernight = endMin <= startMin;
    if (isOvernight) endMin += 24 * 60;
    return { isOvernight, durationHours: ((endMin - startMin) / 60).toFixed(1) };
  }, [shiftEnabled, shiftStart, shiftEnd]);
  const formatTime12h = (t) => fmtClock(t);
  // Live preview: whenever any relevant state changes, report up to the parent
  // so the persistent calendar (in split mode) can visualize the in-progress shift.
  React.useEffect(() => {
    if (onPreview) onPreview({ type, color, weekDays, sequence, cycleStart: null, id: existing?.id });
  }, [type, color, weekDays, sequence, existing?.id, onPreview]);
  const pad = n => String(n).padStart(2,"0");
  const todayStr = () => { const d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); };
  const isoToInput = iso => { const d=new Date(iso); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); };
  const [cycleStart, setCycleStart] = useState(existing?.config?.startDate?isoToInput(existing.config.startDate):todayStr());
  const toggleWeekDay = d => setWeekDays(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d]);
  const addBlock = () => { const lastType=sequence.length>0?sequence[sequence.length-1].type:"work"; setSequence(prev=>[...prev,{type:lastType==="work"?"off":"work",days:1}]); };
  const removeBlock = idx => setSequence(prev=>prev.filter((_,i)=>i!==idx));
  const updateBlock = (idx,field,val) => setSequence(prev=>prev.map((b,i)=>i===idx?{...b,[field]:field==="days"?Math.max(1,Number(val)):val}:b));
  const cycleLen = sequence.reduce((s,b)=>s+b.days,0);
  const handleSave = () => {
    if (!name.trim()) return;
    const parseLocal = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
    const shiftTime={enabled:shiftEnabled,start:shiftStart,end:shiftEnd};
    const config=type==="rotation"?{sequence,startDate:parseLocal(cycleStart).toISOString(),shiftTime}:type==="monthly"?{months:{},shiftTime}:{days:weekDays,shiftTime};
    const saved={name,type,color,config};
    if (isEdit) saved.id=existing.id;
    onSave(saved);
  };
  // Focus the Name input once the form is visible (past the template picker).
  // autoFocus misses on iPad with a hardware keyboard because the sheet's
  // slideUp animation steals the focus; re-do it after the anim settles.
  const nameInputRef = React.useRef(null);
  React.useEffect(() => {
    if (showTemplates) return;
    const id = setTimeout(() => {
      const el = nameInputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      try { el.setSelectionRange(len, len); } catch {}
    }, 80);
    return () => clearTimeout(id);
  }, [showTemplates]);
  return (
    <div className="sheet-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div className="sheet-title" style={{ marginBottom:0 }}>
            {isEdit ? "Edit Shift" : showTemplates ? "New Shift" : "Configure Shift"}
          </div>
          <button className="btn-icon" style={{ background:"var(--surface3)" }} onClick={onClose}>{Icon.close}</button>
        </div>

        {/* TEMPLATE PICKER — only when creating a new shift */}
        {showTemplates && (
          <>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:"0.8125rem", color:"var(--text)", marginBottom:4, fontWeight:500 }}>Start with a template</div>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.5 }}>Tap one to start — you can customize anything after.</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              {PATTERN_TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                  style={{
                    background:"var(--surface2)",
                    border:"1px solid var(--border)",
                    borderRadius:12, padding:"14px 12px",
                    textAlign:"left", cursor:"pointer",
                    fontFamily:"var(--font)", color:"var(--text)",
                    display:"flex", flexDirection:"column", gap:6,
                  }}>
                  <span style={{ display:"flex", width:20, height:20, color:"var(--accent2)" }}>{Icon[tpl.iconKey]}</span>
                  <div style={{ fontSize:"0.8125rem", fontWeight:600, color:"var(--text)" }}>{tpl.name}</div>
                  <div style={{ fontSize:"0.6875rem", color:"var(--muted)", lineHeight:1.4 }}>{tpl.description}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* REGULAR PATTERN FORM — shown after template selection (or immediately when editing) */}
        {!showTemplates && (
          <>
            {!isEdit && (
              <button onClick={() => setShowTemplates(true)}
                style={{ background:"none", border:"none", color:"var(--muted)",
                  fontSize:"0.8125rem", cursor:"pointer", padding:0,
                  marginBottom:14, fontFamily:"var(--font)" }}>
                ← Back to templates
              </button>
            )}
        <div className="form-group"><label className="form-label">Name</label><input ref={nameInputRef} className="form-input" placeholder="e.g. Firefighter Shift" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <div className="chip-row">{[{v:"rotation",l:"Custom rotation"},{v:"weekly",l:"Weekly days"},{v:"monthly",l:"Specific Days"}].map(t=><div key={t.v} className={"chip"+(type===t.v?" active":"")} onClick={()=>setType(t.v)}>{t.l}</div>)}</div>
          {type==="monthly"&&<div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:8, lineHeight:1.5 }}>Tap days on the calendar each month to mark your work days. No repeating shift — you fill it in when you get your schedule.</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Colour</label>
          <ColorPicker value={color} onChange={setColor}
            recents={customColors?.recents||[]} favorites={customColors?.favorites||[]}
            onRecentsChange={customColors?.setRecents} onFavoritesChange={customColors?.setFavorites} />
        </div>
        {type==="rotation"&&(
          <div className="form-group">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <label className="form-label" style={{ marginBottom:0 }}>Sequence blocks</label>
              <span style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{cycleLen}-day cycle</span>
            </div>
            {sequence.map((block,idx)=>(
              <div key={idx} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:"1px solid var(--border)", flexShrink:0 }}>
                  {["work","off"].map(t=><button key={t} onClick={()=>updateBlock(idx,"type",t)} style={{ padding:"7px 12px", border:"none", cursor:"pointer", fontFamily:"var(--font)", fontSize:"0.8125rem", fontWeight:500, background:block.type===t?(t==="work"?"rgba(124,106,247,0.3)":"rgba(16,185,129,0.2)"):"var(--surface2)", color:block.type===t?(t==="work"?"var(--accent2)":"#10b981"):"var(--muted)" }}>{t==="work"?"On":"Off"}</button>)}
                </div>
                <div style={{ display:"flex", alignItems:"center", background:"var(--surface2)", borderRadius:8, border:"1px solid var(--border)", overflow:"hidden" }}>
                  <button onClick={()=>updateBlock(idx,"days",block.days-1)} style={{ width:32,height:36,border:"none",background:"none",color:"var(--muted)",fontSize:"1.25rem",cursor:"pointer",fontWeight:300,lineHeight:1 }}>-</button>
                  <span style={{ width:28,textAlign:"center",fontSize:"0.9375rem",fontWeight:600,fontFamily:"var(--mono)" }}>{block.days}</span>
                  <button onClick={()=>updateBlock(idx,"days",block.days+1)} style={{ width:32,height:36,border:"none",background:"none",color:"var(--muted)",fontSize:"1.125rem",cursor:"pointer" }}>+</button>
                </div>
                <span style={{ fontSize:"0.8125rem",color:"var(--muted)",flex:1 }}>day{block.days!==1?"s":""}</span>
                {sequence.length>1&&<button onClick={()=>removeBlock(idx)} style={{ background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"6px",cursor:"pointer",color:"#f87171",display:"flex",alignItems:"center",justifyContent:"center",width:32,height:32 }}><span style={{ display:"flex",width:14,height:14 }}>{Icon.x}</span></button>}
              </div>
            ))}
            <button onClick={addBlock} className="btn btn-secondary" style={{ width:"100%", marginTop:4, fontSize:"0.8125rem" }}>+ Add block</button>
          </div>
        )}
        {type==="weekly"&&(
          <div className="form-group">
            <label className="form-label">Days</label>
            <div className="chip-row">{DAYS.map((d,i)=><div key={i} className={"chip"+(weekDays.includes(i)?" active":"")} onClick={()=>toggleWeekDay(i)}>{d}</div>)}</div>
          </div>
        )}
        {/* Shift times + Cycle starts — grouped list-row card */}
        <div style={{ background:"var(--surface2)", borderRadius:10, overflow:"hidden", border:"1px solid var(--border)", marginBottom:14 }}>
          {/* Shift times toggle */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px",
            borderBottom: shiftEnabled || type==="rotation" ? "1px solid var(--border)" : "none" }}>
            <div>
              <div style={{ fontSize:"0.875rem", fontWeight:500, color:"var(--text)" }}>Shift times</div>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:1 }}>Block off hours as busy when on</div>
            </div>
            <button className={"toggle"+(shiftEnabled?" on":"")} onClick={()=>setShiftEnabled(v=>!v)} />
          </div>
          {/* Shift start + end — list rows */}
          {shiftEnabled && (
            <>
              <div style={{ display:"flex", alignItems:"center", padding:"0 14px", borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:"0.8125rem", color:"var(--muted)", fontWeight:500, width:90, flexShrink:0 }}>Start</span>
                <input type="time" value={shiftStart} onChange={e=>setShiftStart(e.target.value)}
                  style={{ flex:1, background:"none", border:"none", padding:"12px 0", color:"var(--text)",
                    fontFamily:"var(--font)", fontSize:"0.875rem", outline:"none", textAlign:"right" }} />
              </div>
              <div style={{ display:"flex", alignItems:"center", padding:"0 14px",
                borderBottom: type==="rotation" ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontSize:"0.8125rem", color:"var(--muted)", fontWeight:500, width:90, flexShrink:0 }}>End</span>
                <input type="time" value={shiftEnd} onChange={e=>setShiftEnd(e.target.value)}
                  style={{ flex:1, background:"none", border:"none", padding:"12px 0", color:"var(--text)",
                    fontFamily:"var(--font)", fontSize:"0.875rem", outline:"none", textAlign:"right" }} />
              </div>
            </>
          )}
          {/* Cycle starts — list row */}
          {type==="rotation" && (
            <div>
              <div style={{ display:"flex", alignItems:"center", padding:"0 14px" }}>
                <span style={{ fontSize:"0.8125rem", color:"var(--muted)", fontWeight:500, width:90, flexShrink:0 }}>Cycle starts</span>
                <input type="date" value={cycleStart} onChange={e=>setCycleStart(e.target.value)}
                  style={{ flex:1, background:"none", border:"none", padding:"12px 0", color:"var(--text)",
                    fontFamily:"var(--font)", fontSize:"0.875rem", outline:"none", textAlign:"right" }} />
              </div>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", padding:"0 14px 10px" }}>Sets day 1 of your rotation cycle.</div>
            </div>
          )}
        </div>
        {/* Overnight shift alert OR non-overnight duration line */}
        {shiftEnabled && shiftMetrics.isOvernight && (
          <div style={{
            background: "rgba(124,106,247,0.08)",
            border: "1px solid rgba(124,106,247,0.3)",
            borderRadius: 10, padding: "10px 12px",
            display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12,
          }}>
            <span style={{ color:"var(--accent2)", display:"flex", marginTop:2, width:14, height:14 }}>{Icon.moon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"0.8125rem", fontWeight:600, color:"var(--accent2)", marginBottom:2 }}>Overnight shift detected</div>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.5 }}>
                {formatTime12h(shiftStart)} &rarr; {formatTime12h(shiftEnd)} the next day &middot; {shiftMetrics.durationHours} hours total. Busy time will be blocked across midnight correctly.
              </div>
            </div>
          </div>
        )}
        {shiftEnabled && !shiftMetrics.isOvernight && shiftMetrics.durationHours && (
          <div style={{ fontSize:"0.6875rem", color:"var(--muted)", padding:"0 4px", marginBottom:12 }}>
            Shift duration: {shiftMetrics.durationHours} hours ({formatTime12h(shiftStart)} &ndash; {formatTime12h(shiftEnd)})
          </div>
        )}
        <div style={{
          position:"sticky", bottom:-40,
          marginLeft:-20, marginRight:-20, marginTop:12, marginBottom:-40,
          padding:"12px 20px 24px",
          background:"var(--surface)",
          borderTop:"1px solid var(--border)",
          zIndex:2,
        }}>
          <button className="btn btn-primary" onClick={handleSave} style={{ opacity:name.trim()?1:0.5 }}>{isEdit?"Save Changes":"Save Shift"}</button>
          {isEdit&&onDelete&&<button className="btn btn-secondary" onClick={()=>onDelete(existing.id)} style={{ width:"100%", marginTop:8, color:"#f87171", borderColor:"rgba(248,113,113,0.3)" }}>Delete Shift</button>}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── DAY TIMELINE ─────────────────────────────────────────
function DayTimeline({ events, now, calendars, conflicts, onEventClick }) {
  const HOUR_H = 52;
  const START_H = 0;
  const END_H = 24;
  const totalH = END_H - START_H;

  // All-day events first
  const allDay = events.filter(e => e.allDay);
  const timed = events.filter(e => !e.allDay).sort((a,b) => a.start - b.start);

  // Simple column overlap layout
  const laid = [];
  const cols = [];
  timed.forEach(ev => {
    let col = 0;
    while (cols[col] && cols[col] > ev.start.getTime()) col++;
    cols[col] = ev.end.getTime();
    laid.push({ ev, col });
  });
  const maxCol = laid.reduce((m,r) => Math.max(m, r.col), 0) + 1;

  const nowPct = Math.min(100, Math.max(0, ((now.getHours() + now.getMinutes()/60) - START_H) / totalH * 100));
  const isToday = sameDay(now, new Date());

  const hourLabels = [];
  for (let h = START_H; h <= END_H; h += 2) hourLabels.push(h);

  return (
    <div style={{ marginBottom:16 }}>
      {/* All-day strip */}
      {allDay.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
          {allDay.map(ev => {
            const cal = calendars.find(c => c.id === ev.calendarId) || {};
            const col = ev.color || cal.color || "#888";
            return (
              <div key={ev.id} onClick={() => onEventClick(ev)}
                style={{ background:col+"22", border:"1px solid "+col+"55", borderRadius:8,
                  padding:"5px 10px", cursor:"pointer", fontSize:"0.75rem", fontWeight:600, color:col }}>
                {ev.title}
              </div>
            );
          })}
        </div>
      )}
      {/* Timeline */}
      <div style={{ position:"relative", height: totalH * HOUR_H / 2, background:"var(--surface)", borderRadius:14, overflow:"hidden", border:"1px solid var(--border)" }}>
        {/* Hour lines */}
        {hourLabels.map(h => {
          const pct = (h - START_H) / totalH * 100;
          return (
            <div key={h} style={{ position:"absolute", top:pct+"%", left:0, right:0, display:"flex", alignItems:"center", zIndex:1 }}>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontFamily:"var(--mono)", width:28, textAlign:"right", paddingRight:5, flexShrink:0, lineHeight:1 }}>
                {h===0?"12a":h<12?h+"a":h===12?"12p":(h-12)+"p"}
              </div>
              <div style={{ flex:1, borderTop:"1px solid var(--border)", opacity:0.5 }} />
            </div>
          );
        })}
        {/* Events */}
        {laid.map(({ ev, col }) => {
          const cal = calendars.find(c => c.id === ev.calendarId) || {};
          const color = ev.color || cal.color || "#888";
          const startH = ev.start.getHours() + ev.start.getMinutes()/60;
          const endH = ev.end.getHours() + ev.end.getMinutes()/60;
          const top = Math.max(0, (startH - START_H) / totalH * 100);
          const height = Math.max(1.5, (Math.min(endH, END_H) - Math.max(startH, START_H)) / totalH * 100);
          const colW = (100 - 8) / maxCol;
          const left = 28 + col * colW * 0.95;
          const hasConflict = conflicts.has(ev.id.split("_")[0]);
          return (
            <div key={ev.id} onClick={() => onEventClick(ev)}
              style={{ position:"absolute", top:top+"%", left:left+"%", width:colW*0.93+"%", height:height+"%",
                minHeight:22, background:color+"28", borderLeft:"3px solid "+color,
                borderRadius:"0 6px 6px 0", padding:"2px 6px", cursor:"pointer", overflow:"hidden",
                zIndex:2, boxShadow: hasConflict ? "inset 0 0 0 1px #f87171" : "none" }}>
              <div style={{ fontSize:"0.6875rem", fontWeight:700, color, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", lineHeight:1.4 }}>
                {ev.title}
              </div>
              {height > 5 && <div style={{ fontSize:"0.6875rem", color:color+"aa", fontFamily:"var(--mono)" }}>{fmtTime(ev.start)}</div>}
            </div>
          );
        })}
        {/* Now line */}
        {isToday && (
          <div style={{ position:"absolute", top:nowPct+"%", left:28, right:0, height:2, background:"#ef4444", zIndex:5, display:"flex", alignItems:"center" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#ef4444", marginLeft:-4, flexShrink:0 }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── TAP SWAP LIST ────────────────────────────────────────
function TapSwapList({ items, labels, colors, onReorder }) {
  const [selected, setSelected] = React.useState(null);

  const handleTap = (id) => {
    if (selected === null) {
      setSelected(id);
    } else if (selected === id) {
      setSelected(null);
    } else {
      // Swap the two
      const next = [...items];
      const a = next.indexOf(selected);
      const b = next.indexOf(id);
      [next[a], next[b]] = [next[b], next[a]];
      onReorder(next);
      setSelected(null);
    }
  };

  return (
    <div>
      {selected && (
        <div style={{ fontSize:"0.75rem", color:"var(--accent2)", marginBottom:8, textAlign:"center", fontWeight:600 }}>
          Tap another item to swap with "{labels[selected]}"
        </div>
      )}
      {items.map((id, idx) => {
        const isSelected = selected === id;
        const isSwappable = selected !== null && selected !== id;
        return (
          <div key={id} onClick={() => handleTap(id)}
            style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"12px 14px", marginBottom:5,
              borderRadius:10, cursor:"pointer",
              background: isSelected ? "rgba(124,106,247,0.18)" : isSwappable ? "var(--surface3)" : "var(--surface2)",
              border: "1.5px solid " + (isSelected ? "var(--accent)" : isSwappable ? "rgba(124,106,247,0.3)" : "var(--border)"),
              transition:"all .15s",
              WebkitTouchCallout:"none", WebkitUserSelect:"none", userSelect:"none",
            }}>
            {colors && colors[id] && (
              <div style={{ width:9, height:9, borderRadius:2, background:colors[id], flexShrink:0 }} />
            )}
            <div style={{ fontSize:"0.8125rem", fontWeight:500, flex:1, color: isSelected ? "var(--accent2)" : "var(--text)" }}>
              {labels[id]}
            </div>
            <div style={{ fontSize:"0.6875rem", fontFamily:"var(--mono)", fontWeight:600,
              color: isSelected ? "var(--accent)" : "var(--muted)" }}>
              #{idx+1}
            </div>
            {isSelected && (
              <div style={{ display:"flex", width:13, height:13, color:"var(--accent2)", marginLeft:2 }}>{Icon.checkSmall}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── ICS PREVIEW SHEET — shows what gets exported, educational ──
function ICSPreviewSheet({ events, majorEvents, calendarName, onClose, onDownload }) {
  const ics = buildICS({ events, majorEvents, calendarName });
  const totalItems = events.length + majorEvents.length;
  const byteSize = new Blob([ics]).size;
  const formatBytes = (n) => n < 1024 ? n + " B" : (n/1024).toFixed(1) + " KB";

  // Count what's inside for the user
  const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
  const recurringCount = (ics.match(/RRULE:/g) || []).length;
  const allDayCount = (ics.match(/DTSTART;VALUE=DATE/g) || []).length;

  return (
    <div className="sheet-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxHeight:"85vh", display:"flex", flexDirection:"column", padding:0 }}>
        <div className="sheet-handle" style={{ margin:"10px auto 0" }} />
        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:"1.125rem", fontWeight:800, color:"var(--text)", marginBottom:2 }}>
                Export preview
              </div>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.5 }}>
                This is exactly what a calendar app sees when you import the .ics file.
              </div>
            </div>
            <button onClick={onClose} className="btn-icon">{Icon.close}</button>
          </div>
        </div>

        {/* Stats summary */}
        <div style={{ padding:"12px 20px", display:"grid",
          gridTemplateColumns:"repeat(4, 1fr)", gap:8,
          borderBottom:"1px solid var(--border)" }}>
          {[
            { label: "Items", val: totalItems },
            { label: "Recurring", val: recurringCount },
            { label: "All-day", val: allDayCount },
            { label: "Size", val: formatBytes(byteSize) },
          ].map(s => (
            <div key={s.label} style={{ background:"var(--surface2)",
              borderRadius:8, padding:"8px 4px", textAlign:"center" }}>
              <div style={{ fontSize:"1rem", fontWeight:800, color:"var(--text)" }}>{s.val}</div>
              <div style={{ fontSize:"0.6875rem", color:"var(--muted)",
                textTransform:"uppercase", letterSpacing:"0.5px", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Raw text */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 20px", minHeight:0 }}>
          <div style={{ fontSize:"0.6875rem", color:"var(--muted)",
            textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8,
            display:"flex", alignItems:"center", gap:8 }}>
            <span>Raw .ics file contents</span>
            <span style={{ flex:1, height:1, background:"var(--border)" }} />
          </div>
          <pre style={{ background:"var(--surface2)", border:"1px solid var(--border)",
            borderRadius:10, padding:12, fontFamily:"var(--mono)", fontSize:"0.6875rem",
            color:"var(--text)", whiteSpace:"pre-wrap", wordBreak:"break-word",
            margin:0, lineHeight:1.5 }}>
            {ics}
          </pre>
          {/* Quick legend */}
          <div style={{ marginTop:14, padding:"10px 12px",
            background:"rgba(124,106,247,0.08)",
            border:"1px solid rgba(124,106,247,0.2)",
            borderRadius:10, fontSize:"0.6875rem",
            color:"var(--muted)", lineHeight:1.6 }}>
            <strong style={{ color:"var(--text)" }}>What you're looking at:</strong>
            <div style={{ marginTop:4 }}>
              Each <code style={{ color:"var(--accent2)" }}>BEGIN:VEVENT</code> … <code style={{ color:"var(--accent2)" }}>END:VEVENT</code> block is one event.
              <code style={{ color:"var(--accent2)" }}> DTSTART</code>/<code style={{ color:"var(--accent2)" }}>DTEND</code> are times,
              <code style={{ color:"var(--accent2)" }}> SUMMARY</code> is the title,
              <code style={{ color:"var(--accent2)" }}> RRULE</code> handles recurrence.
              This is the RFC 5545 standard — every calendar app on Earth reads it.
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding:"14px 20px",
          borderTop:"1px solid var(--border)",
          display:"flex", gap:10 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex:1 }}>
            Close
          </button>
          <button onClick={() => { onDownload(); onClose(); }}
            className="btn btn-primary" style={{ flex:1 }}>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ONBOARDING FLOW ──────────────────────────────────────
// ── EMPTY STATE CARD — for new users, invites them to fill empty zones on home ──
function EmptyStateCard({ icon, title, body, cta, onCta, accent="rgba(124,106,247,0.35)", onDismiss }) {
  return (
    <div style={{
      position:"relative",
      background:"var(--surface)",
      border:`1px dashed ${accent}`,
      borderRadius:16, padding:16, marginBottom:16,
      display:"flex", gap:12, alignItems:"flex-start",
    }}>
      {onDismiss && (
        <button onClick={onDismiss}
          title="Dismiss this hint"
          style={{ position:"absolute", top:6, right:6,
            width:26, height:26, borderRadius:"50%", padding:0,
            background:"none", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"var(--muted)" }}>
          <span style={{ display:"flex", width:14, height:14 }}>{Icon.close}</span>
        </button>
      )}
      <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
        background:"rgba(124,106,247,0.12)", border:"1px solid rgba(124,106,247,0.25)",
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"var(--accent2)" }}>
        <span style={{ display:"flex", width:20, height:20 }}>{icon}</span>
      </div>
      <div style={{ flex:1, minWidth:0, paddingRight: onDismiss ? 24 : 0 }}>
        <div style={{ fontSize:"0.875rem", fontWeight:700, color:"var(--text)", marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.5, marginBottom: cta ? 10 : 0 }}>{body}</div>
        {cta && onCta && (
          <button onClick={onCta}
            style={{ background:"rgba(124,106,247,0.15)",
              border:"1px solid rgba(124,106,247,0.3)",
              color:"var(--accent2)", fontWeight:600,
              borderRadius:8, padding:"6px 12px", cursor:"pointer",
              fontSize:"0.75rem", fontFamily:"var(--font)" }}>
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}

function OnboardingFlow({ defaultName, defaultColor, customColors, textSize, setTextSize, onFinish }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName || "");
  const [color, setColor] = useState(defaultColor || "#6366f1");

  const STEPS = 6; // Welcome → Install → Text size → Name → Color → Done
  const handleFinish = (startTour) => onFinish({ name: name.trim(), color, startTour: !!startTour });

  // Shared progress dots component
  const ProgressDots = () => (
    <div style={{ display:"flex", justifyContent:"center", gap:6, paddingTop:"max(20px, env(safe-area-inset-top))" }}>
      {Array.from({ length: STEPS }).map((_, i) => (
        <div key={i} style={{ width: step===i ? 24 : 6, height:6, borderRadius:3,
          background: step===i ? "var(--accent)" : "var(--border)",
          transition:"all .2s" }} />
      ))}
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"var(--bg)",
      zIndex:500, display:"flex", flexDirection:"column" }}>
      <ProgressDots />
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"24px 20px 32px", gap:14, overflowY:"auto", minHeight:0 }}>

        {/* STEP 0 — WELCOME: What is Daytu? */}
        {step === 0 && (
          <>
            <div style={{ display:"flex", width:56, height:56, borderRadius:14,
              background:"linear-gradient(135deg, rgba(124,106,247,0.25), rgba(167,139,250,0.15))",
              border:"1px solid rgba(124,106,247,0.4)",
              alignItems:"center", justifyContent:"center", color:"var(--accent2)" }}>
              <span style={{ display:"flex", width:28, height:28 }}>{Icon.calendar}</span>
            </div>
            <div>
              <div style={{ fontSize:"1.75rem", fontWeight:800, color:"var(--text)", marginBottom:6,
                letterSpacing:"-0.02em" }}>Welcome to Daytu</div>
              <div style={{ fontSize:"0.9375rem", color:"var(--muted)", lineHeight:1.6 }}>
                A calendar for real life — irregular shifts, custody weeks, travel rotations,
                and all the complexity of modern schedules.
              </div>
            </div>
            <div style={{ background:"var(--surface2)", border:"1px solid var(--border)",
              borderRadius:12, padding:14, marginTop:8 }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:"var(--accent2)",
                textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
                What makes Daytu different
              </div>
              <div style={{ fontSize:"0.8125rem", color:"var(--text)", lineHeight:1.6,
                display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { icon: Icon.repeat,  title: "Shifts",          body: "Handle rotations, weekly schedules, and recurring days that other calendars can't." },
                  { icon: Icon.search,  title: "Free-time finder",  body: "Ask \"when am I free?\" in plain English." },
                  { icon: Icon.star,    title: "Major events",      body: "Countdowns to big days that actually matter." },
                ].map((f, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
                      background:"rgba(124,106,247,0.15)", border:"1px solid rgba(124,106,247,0.25)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      color:"var(--accent2)", marginTop:1 }}>
                      <span style={{ display:"flex", width:13, height:13 }}>{f.icon}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <strong>{f.title}</strong> — {f.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize:"0.75rem", color:"var(--muted)", textAlign:"center",
              lineHeight:1.5, marginTop:4 }}>
              This takes about a minute. We'll teach you the details later.
            </div>
            <button onClick={() => setStep(1)} className="btn btn-primary" style={{ marginTop:12 }}>
              Get started
            </button>
          </>
        )}

        {/* STEP 2 — TEXT SIZE (early, so rest is readable) */}
        {step === 2 && (
          <>
            <div style={{ display:"flex", width:56, height:56, borderRadius:14,
              background:"rgba(124,106,247,0.15)", border:"1px solid rgba(124,106,247,0.3)",
              alignItems:"center", justifyContent:"center", color:"var(--accent2)" }}>
              <div style={{ fontSize:"1.75rem", fontWeight:800, lineHeight:1 }}>Aa</div>
            </div>
            <div>
              <div style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--text)", marginBottom:6 }}>
                Make it comfortable to read
              </div>
              <div style={{ fontSize:"0.9375rem", color:"var(--muted)", lineHeight:1.6 }}>
                Pick the text size that feels right for your eyes. You can change this anytime in Settings.
              </div>
            </div>
            {/* Big visual size picker — each button shows the actual scale */}
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              {[
                { v: 1.0,  label: "Default" },
                { v: 1.15, label: "Large" },
                { v: 1.3,  label: "XL" },
                { v: 1.5,  label: "Max" },
              ].map(({ v, label }) => (
                <button key={v} onClick={() => setTextSize(v)}
                  style={{
                    flex:1, padding:"14px 4px", borderRadius:12, cursor:"pointer",
                    fontFamily:"var(--font)", fontWeight:700,
                    background: textSize === v ? "rgba(124,106,247,0.2)" : "var(--surface2)",
                    border: `2px solid ${textSize === v ? "var(--accent)" : "var(--border)"}`,
                    color: textSize === v ? "var(--accent2)" : "var(--text)",
                    transition:"all .15s",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ fontSize: `${v * 1.25}rem`, lineHeight:1, fontWeight:800 }}>Aa</div>
                  <div style={{ fontSize:"0.6875rem", fontWeight:600, opacity:0.8 }}>{label}</div>
                </button>
              ))}
            </div>
            <div style={{ background:"var(--surface2)", border:"1px solid var(--border)",
              borderRadius:10, padding:"12px 14px", marginTop:6 }}>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginBottom:4 }}>Preview</div>
              <div style={{ fontSize:"1rem", fontWeight:600, color:"var(--text)", lineHeight:1.4 }}>
                Morning Run
              </div>
              <div style={{ fontSize:"0.8125rem", color:"var(--muted)", marginTop:2 }}>
                Tomorrow · 7:00 AM
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:"auto", paddingTop:12 }}>
              <button onClick={() => setStep(1)} className="btn btn-secondary"
                style={{ flex:"0 0 auto", padding:"14px 22px" }}>
                Back
              </button>
              <button onClick={() => setStep(3)} className="btn btn-primary" style={{ flex:1 }}>
                Continue
              </button>
            </div>
          </>
        )}

        {/* STEP 3 — NAME */}
        {step === 3 && (
          <>
            <div style={{ display:"flex", width:56, height:56, borderRadius:14,
              background:"rgba(124,106,247,0.15)", border:"1px solid rgba(124,106,247,0.3)",
              alignItems:"center", justifyContent:"center", color:"var(--accent2)" }}>
              <span style={{ display:"flex", width:28, height:28 }}>{Icon.user}</span>
            </div>
            <div>
              <div style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--text)", marginBottom:6 }}>
                What should I call you?
              </div>
              <div style={{ fontSize:"0.9375rem", color:"var(--muted)", lineHeight:1.6 }}>
                Just your first name — this is how Daytu will greet you.
              </div>
            </div>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="First name"
              onKeyDown={e => { if (e.key === "Enter" && name.trim()) setStep(4); }}
              style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                borderRadius:10, padding:"14px 16px", color:"var(--text)", fontSize:"1.0625rem", width:"100%",
                outline:"none", fontFamily:"var(--font)", boxSizing:"border-box", marginTop:4 }} />
            <div style={{ display:"flex", gap:10, marginTop:"auto", paddingTop:12 }}>
              <button onClick={() => setStep(2)} className="btn btn-secondary"
                style={{ flex:"0 0 auto", padding:"14px 22px" }}>
                Back
              </button>
              <button onClick={() => setStep(4)} disabled={!name.trim()}
                className="btn btn-primary"
                style={{ flex:1, opacity: name.trim() ? 1 : 0.4, cursor: name.trim() ? "pointer" : "not-allowed" }}>
                Continue
              </button>
            </div>
          </>
        )}

        {/* STEP 4 — COLOR */}
        {step === 4 && (
          <>
            <div style={{ display:"flex", width:56, height:56, borderRadius:14,
              background:color+"33", border:"1px solid "+color+"66",
              alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:24, height:24, borderRadius:8, background:color }} />
            </div>
            <div>
              <div style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--text)", marginBottom:6 }}>
                Pick your color
              </div>
              <div style={{ fontSize:"0.9375rem", color:"var(--muted)", lineHeight:1.6 }}>
                Your personal calendar color. You'll see this on your events and schedule.
              </div>
            </div>
            <div style={{ marginTop:4, display:"flex", justifyContent:"center" }}>
              <ColorPicker value={color} onChange={setColor}
                recents={customColors?.recents||[]} favorites={customColors?.favorites||[]}
                onRecentsChange={customColors?.setRecents} onFavoritesChange={customColors?.setFavorites} />
            </div>
            <div style={{ display:"flex", gap:10, marginTop:"auto", paddingTop:12 }}>
              <button onClick={() => setStep(3)} className="btn btn-secondary"
                style={{ flex:"0 0 auto", padding:"14px 22px" }}>
                Back
              </button>
              <button onClick={() => setStep(5)} className="btn btn-primary" style={{ flex:1 }}>
                Continue
              </button>
            </div>
          </>
        )}

        {/* STEP 1 — INSTALL DAYTU (Add to Home Screen, platform-aware) */}
        {step === 1 && (() => {
          // Detect platform AND browser for accurate install instructions
          const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
          // iPadOS 13+ reports UA as Macintosh by default — disambiguate via multi-touch support
          const hasMultiTouch = typeof navigator !== "undefined" && (navigator.maxTouchPoints || 0) > 1;
          const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && hasMultiTouch);
          const isIPhone = /iPhone|iPod/.test(ua) && !(/Android/.test(ua));
          const isIOS = (isIPhone || isIPad) && !(/Android/.test(ua));
          const isAndroid = /Android/.test(ua);
          const isMac = /Macintosh/.test(ua) && !isIPad;
          const isWindows = /Windows/.test(ua);
          const iosDevice = isIPad ? "iPad" : "iPhone";
          // Browser detection on iOS — Apple only allows real PWA install from Safari
          const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|DuckDuckGo|OPT|FBAN|FBAV/.test(ua);
          const isIOSChrome = isIOS && /CriOS/.test(ua);
          const isIOSFirefox = isIOS && /FxiOS/.test(ua);
          const isIOSEdge = isIOS && /EdgiOS/.test(ua);
          const isIOSDuckDuckGo = isIOS && /DuckDuckGo/.test(ua);
          const isIOSOtherBrowser = isIOS && !isIOSSafari;
          const iosBrowserName = isIOSChrome ? "Chrome" : isIOSFirefox ? "Firefox" : isIOSEdge ? "Edge" :
                                 isIOSDuckDuckGo ? "DuckDuckGo" : isIOSOtherBrowser ? "this browser" : null;
          // Detect if app is already running as installed PWA
          const isStandalone = typeof window !== "undefined" &&
            (window.matchMedia?.("(display-mode: standalone)").matches ||
             window.navigator?.standalone === true);
          // Determine which instruction set to show
          const platform = isIOSSafari ? "ios-safari"
                         : isIOSOtherBrowser ? "ios-other"
                         : isAndroid ? "android"
                         : isMac ? "mac"
                         : isWindows ? "windows"
                         : "other";
          const instructionsByPlatform = {
            "ios-safari": {
              heading: "How to install on " + iosDevice,
              steps: isIPad
                ? [
                    "Tap the Share button in Safari's toolbar (top-right)",
                    "Scroll and tap \"Add to Home Screen\"",
                    "Tap \"Add\" in the top-right corner"
                  ]
                : [
                    "Tap the Share button at the bottom of Safari",
                    "Scroll and tap \"Add to Home Screen\"",
                    "Tap \"Add\" in the top-right corner"
                  ],
              note: null,
            },
            "ios-other": {
              heading: "A note about " + (iosBrowserName || "this browser") + " on " + iosDevice,
              steps: [
                "Apple only allows installing web apps from Safari on iPhone and iPad",
                "Open daytu.app in Safari",
                "Then tap Share → Add to Home Screen"
              ],
              note: "This is an Apple restriction, not a Daytu limitation — it applies to every web app.",
            },
            "android": {
              heading: "How to install on Android",
              steps: [
                "Tap the three-dot menu in your browser",
                "Tap \"Add to Home screen\" or \"Install app\"",
                "Confirm to add Daytu to your home screen"
              ],
              note: null,
            },
            "mac": {
              heading: "How to install on Mac",
              steps: [
                "In Safari: File menu → Add to Dock",
                "Or in Chrome/Edge: look for the install icon in the address bar",
                "Daytu will open like a standalone app"
              ],
              note: null,
            },
            "windows": {
              heading: "How to install on Windows",
              steps: [
                "In your browser's address bar, look for the install icon",
                "Click it to install Daytu as a desktop app",
                "It'll open in its own window"
              ],
              note: null,
            },
            "other": {
              heading: "How to install",
              steps: [
                "Most browsers have an \"Add to Home Screen\" or \"Install\" option",
                "Look in your browser's menu",
                "Daytu will open like a native app"
              ],
              note: null,
            },
          };
          const instructions = instructionsByPlatform[platform];
          return (
            <>
              <div style={{ display:"flex", width:56, height:56, borderRadius:14,
                background:"rgba(124,106,247,0.15)", border:"1px solid rgba(124,106,247,0.3)",
                alignItems:"center", justifyContent:"center", color:"var(--accent2)" }}>
                <span style={{ display:"flex", width:28, height:28 }}>{Icon.home}</span>
              </div>
              <div>
                <div style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--text)", marginBottom:6 }}>
                  {isStandalone ? "You're all set!" : "Install Daytu"}
                </div>
                <div style={{ fontSize:"0.9375rem", color:"var(--muted)", lineHeight:1.6 }}>
                  {isStandalone
                    ? "Daytu is already running as an installed app. Nothing more to do here."
                    : isIOSOtherBrowser
                      ? "You're using " + iosBrowserName + " on " + iosDevice + ". To install Daytu as an app, you'll need to switch to Safari first."
                      : "Add Daytu to your home screen for the best experience — opens full-screen, no browser bars, feels like a real app."}
                </div>
              </div>
              {!isStandalone && (
                <div style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                  borderRadius:12, padding:14 }}>
                  <div style={{ fontSize:"0.6875rem", fontWeight:700,
                    color: isIOSOtherBrowser ? "#fbbf24" : "var(--accent2)",
                    textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>
                    {instructions.heading}
                  </div>
                  <ol style={{ margin:0, paddingLeft:20, fontSize:"0.8125rem",
                    color:"var(--text)", lineHeight:1.6 }}>
                    {instructions.steps.map((s, i) => <li key={i} style={{ marginBottom:4 }}>{s}</li>)}
                  </ol>
                  {instructions.note && (
                    <div style={{ fontSize:"0.6875rem", color:"var(--muted)",
                      lineHeight:1.5, marginTop:10, fontStyle:"italic" }}>
                      {instructions.note}
                    </div>
                  )}
                </div>
              )}
              <div style={{ fontSize:"0.75rem", color:"var(--muted)", textAlign:"center", lineHeight:1.5 }}>
                You can also keep using Daytu in your browser — installing is optional.
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:"auto", paddingTop:12 }}>
                <button onClick={() => setStep(2)} className="btn btn-primary">
                  {isStandalone ? "Continue" : "I'll do this later"}
                </button>
                <button onClick={() => setStep(0)}
                  style={{ background:"none", border:"none", color:"var(--muted)",
                    fontSize:"0.8125rem", cursor:"pointer", padding:"6px", fontFamily:"var(--font)" }}>
                  ← Back
                </button>
              </div>
            </>
          );
        })()}

        {/* STEP 5 — DONE + OFFER TOUR */}
        {step === 5 && (
          <>
            <div style={{ display:"flex", width:56, height:56, borderRadius:14,
              background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.3)",
              alignItems:"center", justifyContent:"center", color:"#34d399" }}>
              <span style={{ display:"flex", width:28, height:28 }}>{Icon.checkSmall}</span>
            </div>
            <div>
              <div style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--text)", marginBottom:6 }}>
                All set, {name}
              </div>
              <div style={{ fontSize:"0.9375rem", color:"var(--muted)", lineHeight:1.6 }}>
                Want a quick tour of what Daytu can do? It takes about a minute and covers
                the features that matter most.
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:"auto", paddingTop:12 }}>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)", textAlign:"center", lineHeight:1.5, marginBottom:4 }}>
                You can replay the tour anytime from the <span style={{ display:"inline-flex", width:12, height:12, color:"var(--accent2)", verticalAlign:"middle" }}>{Icon.help}</span> icon on your home screen or in Settings.
              </div>
              <button onClick={() => handleFinish(true)} className="btn btn-primary">
                Take the tour
              </button>
              <button onClick={() => handleFinish(false)} className="btn btn-secondary">
                Skip for now
              </button>
              <button onClick={() => setStep(4)}
                style={{ background:"none", border:"none", color:"var(--muted)",
                  fontSize:"0.8125rem", cursor:"pointer", padding:"6px", fontFamily:"var(--font)" }}>
                ← Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── TOUR (coach-mark style) ───────────────────────────────
const TOUR_CARDS = [
  {
    target: "search",
    placement: "below",
    icon: "search",
    title: "Ask when you're free",
    tag: "Most calendars only show what you're doing. This one tells you when you're NOT.",
    body: "Type questions in plain English — \"free this weekend,\" \"next 2 hours,\" \"free Friday afternoon.\" It finds the real gaps in your schedule, including around your routines.",
  },
  {
    target: "nav-shifts",
    placement: "above",
    icon: "repeat",
    title: "Shifts for any schedule",
    tag: "The heart of this app — and what other calendars can't do.",
    body: "Offshore rotations, nursing shifts, alternating custody weekends, split weeks, the 1st and 3rd Monday of every month — if it repeats, it belongs here. Open the Shifts tab here.",
  },
  {
    target: "major",
    placement: "below",
    icon: "pin",
    title: "Big days, not just meetings",
    tag: "Wedding in 153 days. Vacation in 2 weeks. Birthday tomorrow.",
    body: "Major events live above your daily calendar with a live countdown on your home screen. Add them from the Calendar tab.",
  },
  {
    target: "fab",
    placement: "above",
    icon: "plus",
    title: "Add anything, any time",
    tag: "Your entry point for everything — events and major events.",
    body: "Tap the + button to create a new event or major event. You can schedule it for now, later, or months ahead — Daytu handles the details.",
  },
  {
    target: "nav-calendar",
    placement: "above",
    icon: "calendar",
    title: "See it your way",
    tag: "Day, week, and month views — switch however it helps.",
    body: "The Calendar tab has day, week, and month views. Week view even has two layouts: a columns view for the whole week at a glance, or a grid view for precise time planning.",
  },
  {
    target: "nav-settings",
    placement: "above",
    icon: "settings",
    title: "Make it yours",
    tag: "Text size, theme, contrast, notifications, data export — all here.",
    body: "Everything you can customize lives in Settings. Change the text size anytime, flip to light mode, turn on high-contrast, or export your calendar to Apple, Google, or Outlook.",
  },
  {
    target: "nav-groups",
    placement: "above",
    icon: "groups",
    title: "Share just what you want",
    tag: "A private calendar by default — share only what you choose.",
    body: "Create groups for family, friends, or coworkers. Share specific events or trips with just them. Keep everything else to yourself.",
    requires: "groups", // hidden unless FEATURES.groups is true
  },
];
// Filter tour cards by feature flag — keeps card definitions intact for when flags flip back on.
const activeTourCards = () => TOUR_CARDS.filter(c => !c.requires || FEATURES[c.requires]);

// ── COACHMARK CARD — measures itself & positions smartly to avoid covering target ──
function CoachmarkCard({ targetRect, placement, DUR, EASE, children }) {
  const cardRef = React.useRef(null);
  const [cardH, setCardH] = useState(0);

  // Measure card height after render
  React.useLayoutEffect(() => {
    if (cardRef.current) {
      setCardH(cardRef.current.offsetHeight);
    }
  });

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const GAP = 16;           // spacing between target and card
  const SAFE_TOP = 16;      // minimum distance from top of screen
  const SAFE_BOTTOM = 24;   // minimum distance from bottom of screen
  // Map from rect properties (top/height) to short names (y/h)
  const y = targetRect ? targetRect.top : vh / 2;
  const h = targetRect ? targetRect.height : 40;

  // Hard bounds: the card MUST NOT cross into the target's rect (plus GAP).
  // targetTop = y (top of target + padding), targetBottom = y + h (bottom of target + padding)
  const targetTop = y;
  const targetBottom = y + h;
  const spaceAbove = targetTop - SAFE_TOP - GAP;
  const spaceBelow = vh - targetBottom - SAFE_BOTTOM - GAP;

  // Pick placement: requested, unless the OTHER side has measurably more room
  let actualPlacement = placement;
  if (placement === "below" && spaceBelow < 180 && spaceAbove > spaceBelow + 40) {
    actualPlacement = "above";
  } else if (placement === "above" && spaceAbove < 180 && spaceBelow > spaceAbove + 40) {
    actualPlacement = "below";
  }

  let cardTop;
  let maxH;
  if (actualPlacement === "below") {
    // Card starts BELOW the target. Never above.
    cardTop = targetBottom + GAP;
    maxH = vh - cardTop - SAFE_BOTTOM;
  } else {
    // Card ends ABOVE the target. Never overlaps.
    // maxH is strictly the space above the target minus gap.
    maxH = targetTop - SAFE_TOP - GAP;
    // Position the card so its bottom sits just above the target.
    // If we know cardH, use it; otherwise pin to SAFE_TOP with maxH enforced.
    if (cardH > 0 && cardH < maxH) {
      cardTop = targetTop - GAP - cardH;
    } else {
      cardTop = SAFE_TOP;
    }
  }

  // Never let card top be above safe area (defensive)
  cardTop = Math.max(SAFE_TOP, cardTop);
  // If maxH is ever negative (pathological), set a tiny safe floor
  if (maxH < 60) maxH = 60;

  return (
    <div ref={cardRef} style={{ position:"absolute", left:16, right:16,
      top: cardTop,
      maxHeight: maxH > 120 ? maxH : undefined,
      overflowY: maxH > 120 ? "auto" : "visible",
      background:"var(--surface)", border:"1px solid rgba(124,106,247,0.4)",
      borderRadius:14, padding:16,
      boxShadow:"0 10px 40px rgba(0,0,0,0.6)",
      animation:"coachmark-fade 280ms ease-out",
      transition: `top ${DUR} ${EASE}` }}>
      {children}
    </div>
  );
}

function CoachmarkTour({ tourRefs, onClose }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const [visible, setVisible] = useState(false);      // fade-in on mount
  const [closing, setClosing] = useState(false);      // fade-out before unmount
  const cards = activeTourCards();
  const t = cards[idx];
  const isLast = idx === cards.length - 1;

  // Fade in on mount (after tab-switch settles)
  React.useEffect(() => {
    const id = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(id);
  }, []);

  // Smooth close: fade out, then tell parent we're done
  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 220);
  };

  // Measure target element whenever idx changes, on resize, on scroll.
  // If a target doesn't exist in the current layout (e.g. nav-calendar in split
  // mode), auto-advance rather than killing the tour.
  React.useEffect(() => {
    const measure = () => {
      const el = tourRefs.current[t.target];
      if (!el || el.getClientRects().length === 0) {
        if (idx < cards.length - 1) setIdx(idx + 1);
        else handleClose();
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    // Longer delay on first card: tab-switch animation needs time to settle
    const id = setTimeout(measure, idx === 0 ? 180 : 60);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [idx, t.target, tourRefs, cards.length]);

  if (!rect) return null;

  const PAD = 8;
  const x = Math.max(0, rect.left - PAD);
  const y = Math.max(0, rect.top - PAD);
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;
  const isBelow = t.placement === "below";
  // Shared easing for every animated element so they move as one
  const EASE = "cubic-bezier(.4,0,.2,1)";
  const DUR = "360ms";

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400,
      opacity: (visible && !closing) ? 1 : 0,
      transition: "opacity 260ms ease-out",
      pointerEvents: closing ? "none" : "auto" }}>
      {/* Dim backdrop with spotlight cut-out — rect transitions smoothly */}
      <svg width="100%" height="100%" style={{ position:"absolute", inset:0 }}
        onClick={handleClose}>
        <defs>
          <mask id="coachmark-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} rx="12" fill="black"
              style={{ transition: `x ${DUR} ${EASE}, y ${DUR} ${EASE}, width ${DUR} ${EASE}, height ${DUR} ${EASE}` }} />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.78)" mask="url(#coachmark-mask)" />
      </svg>

      {/* Glow ring — animates via transform for smooth GPU-accelerated motion */}
      <div style={{ position:"absolute", left:0, top:0,
        transform: `translate(${x}px, ${y}px)`,
        width:w, height:h, borderRadius:12,
        boxShadow:"0 0 0 2px var(--accent), 0 0 30px rgba(124,106,247,0.5)",
        pointerEvents:"none",
        transition: `transform ${DUR} ${EASE}, width ${DUR} ${EASE}, height ${DUR} ${EASE}` }} />

      {/* Arrow pointing at target — also transitions */}
      <div style={{ position:"absolute", left:0, top:0,
        transform: `translate(${x + w / 2 - 10}px, ${isBelow ? y + h + 2 : y - 12}px)`,
        width:0, height:0,
        borderLeft:"10px solid transparent",
        borderRight:"10px solid transparent",
        ...(isBelow
          ? { borderBottom:"10px solid var(--accent)" }
          : { borderTop:"10px solid var(--accent)" }),
        pointerEvents:"none",
        transition: `transform ${DUR} ${EASE}` }} />

      {/* Callout card — measured after render, positioned to avoid covering its target. */}
      <CoachmarkCard
        key={idx}
        targetRect={rect}
        placement={t.placement}
        DUR={DUR}
        EASE={EASE}
      >

        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--muted)",
            textTransform:"uppercase", letterSpacing:"0.5px" }}>
            {idx+1} of {cards.length}
          </div>
          <button onClick={handleClose}
            style={{ background:"none", border:"none", color:"var(--muted)",
              fontSize:"0.6875rem", fontWeight:600, cursor:"pointer", padding:0,
              fontFamily:"var(--font)" }}>
            Skip tour
          </button>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <div style={{ width:28, height:28, borderRadius:8,
            background:"rgba(124,106,247,0.15)", border:"1px solid rgba(124,106,247,0.3)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"var(--accent2)", flexShrink:0 }}>
            <span style={{ display:"flex", width:16, height:16 }}>{Icon[t.icon]}</span>
          </div>
          <div style={{ fontSize:"1rem", fontWeight:800, color:"var(--text)" }}>{t.title}</div>
        </div>

        <div style={{ fontSize:"0.75rem", color:"var(--accent2)", fontStyle:"italic",
          lineHeight:1.4, marginBottom:8 }}>{t.tag}</div>
        <div style={{ fontSize:"0.8125rem", color:"var(--muted)", lineHeight:1.5, marginBottom:14 }}>{t.body}</div>

        <div style={{ display:"flex", gap:4, marginBottom:12 }}>
          {cards.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)}
              style={{ flex:1, height:3, borderRadius:2, cursor:"pointer",
                background: i === idx ? "var(--accent)" : "var(--border)" }} />
          ))}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          {idx > 0 && (
            <button onClick={() => setIdx(idx-1)} className="btn btn-secondary"
              style={{ flex:"0 0 auto", padding:"10px 16px" }}>
              Back
            </button>
          )}
          <button onClick={() => isLast ? handleClose() : setIdx(idx+1)}
            className="btn btn-primary" style={{ flex:1 }}>
            {isLast ? "Done" : "Next"}
          </button>
        </div>
      </CoachmarkCard>
    </div>
  );
}

// ── CALENDAR SHEET ───────────────────────────────────────
function CalendarSheet({ existing, allCalendars=[], allEvents=[], customColors, onSave, onDelete, onClose }) {
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name ?? "");
  const [color, setColor] = useState(existing?.color ?? "#6366f1");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    const saved = { name: name.trim(), color };
    if (isEdit) saved.id = existing.id;
    onSave(saved);
  };

  // Impact summary for delete
  const eventCount = isEdit ? allEvents.filter(e => e.calendarId === existing.id).length : 0;
  const fallback = isEdit ? allCalendars.find(c => c.id !== existing.id) : null;

  return (
    <div className="sheet-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:"1rem", fontWeight:700 }}>{isEdit ? "Edit Calendar" : "New Calendar"}</div>
          <button className="btn-icon" style={{ background:"var(--surface3)" }} onClick={onClose}>{Icon.close}</button>
        </div>

        {/* Name with color accent */}
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--surface2)", borderRadius:10, padding:"10px 14px", marginBottom:10, border:"1px solid var(--border)" }}>
          <div style={{ width:3, alignSelf:"stretch", borderRadius:2, background:color, flexShrink:0 }} />
          <input placeholder="Calendar name" value={name} onChange={e => setName(e.target.value)}
            style={{ background:"none", border:"none", padding:0, fontSize:"0.9375rem", fontWeight:600, flex:1,
              color:"var(--text)", fontFamily:"var(--font)", outline:"none" }} />
        </div>

        {/* Color */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Color</div>
          <ColorPicker value={color} onChange={setColor}
            recents={customColors?.recents||[]} favorites={customColors?.favorites||[]}
            onRecentsChange={customColors?.setRecents} onFavoritesChange={customColors?.setFavorites} />
        </div>

        <button className="btn btn-primary" onClick={handleSave} style={{ opacity:name.trim()?1:0.5 }}>
          {isEdit ? "Save Changes" : "Create Calendar"}
        </button>

        {/* Delete — idle state */}
        {isEdit && onDelete && !confirmDelete && (
          <button className="btn btn-secondary" onClick={() => setConfirmDelete(true)}
            style={{ width:"100%", marginTop:8, color:"#f87171", borderColor:"rgba(248,113,113,0.3)" }}>
            Delete Calendar
          </button>
        )}

        {/* Delete — confirm state */}
        {isEdit && onDelete && confirmDelete && (
          <div style={{ marginTop:8, padding:14, borderRadius:10,
            background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.3)" }}>
            <div style={{ fontSize:"0.875rem", fontWeight:700, color:"#fca5a5", marginBottom:6 }}>
              Delete "{existing.name}"?
            </div>
            <div style={{ fontSize:"0.75rem", color:"var(--text)", lineHeight:1.5, marginBottom:4 }}>
              {eventCount > 0 ? (
                <>
                  <strong>{eventCount} event{eventCount !== 1 ? "s" : ""}</strong> will move to{" "}
                  <span style={{ display:"inline-flex", alignItems:"center", gap:4, verticalAlign:"middle" }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:fallback?.color, display:"inline-block" }} />
                    <strong>{fallback?.name}</strong>
                  </span>.
                </>
              ) : (
                <>This calendar has no events. Safe to delete.</>
              )}
            </div>
            <div style={{ fontSize:"0.6875rem", color:"var(--muted)", marginBottom:12, lineHeight:1.4 }}>
              Just want it out of sight? Hide it in Settings → Calendars instead.
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setConfirmDelete(false)}
                style={{ flex:1, padding:"10px", borderRadius:8, background:"var(--surface2)",
                  border:"1px solid var(--border)", fontSize:"0.8125rem", fontWeight:600,
                  color:"var(--text)", cursor:"pointer", fontFamily:"var(--font)" }}>
                Cancel
              </button>
              <button onClick={() => onDelete(existing.id)}
                style={{ flex:1, padding:"10px", borderRadius:8, background:"#ef4444",
                  border:"none", fontSize:"0.8125rem", fontWeight:700, color:"#fff",
                  cursor:"pointer", fontFamily:"var(--font)" }}>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── EDIT PROFILE SHEET ───────────────────────────────────
function EditProfileSheet({ profile, onSave, onClose }) {
  const [name, setName] = useState(profile.name || "");
  const [handle, setHandle] = useState(profile.handle || "");
  const [avatar, setAvatar] = useState(profile.avatar || null);
  // Username validation: lowercase only, letters/numbers/underscores, 3-20 chars
  // Sanitize on input so user can't type invalid characters at all
  const sanitizeHandle = (raw) => {
    // Strip @ if user types it (we add it back in display)
    let cleaned = raw.replace(/^@+/, "").toLowerCase();
    // Remove any chars that aren't a-z, 0-9, or _
    cleaned = cleaned.replace(/[^a-z0-9_]/g, "");
    // Max 20 chars
    return cleaned.slice(0, 20);
  };
  const handleError = handle.length > 0 && handle.length < 3
    ? "Username must be at least 3 characters"
    : null;
  const [cropMode, setCropMode] = useState(false);
  const [rawImg, setRawImg] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = React.useRef(null);
  const canvasRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const SIZE = 260; // canvas size

  // Compute minimum zoom so image always fills the circle
  const minZoom = React.useMemo(() => {
    if (!imgSize.w || !imgSize.h) return 1;
    return SIZE / Math.min(imgSize.w, imgSize.h);
  }, [imgSize]);

  // Clamp offset so image never exposes the background inside the circle
  const clampOffset = React.useCallback((ox, oy, z, iw, ih) => {
    // z is the direct scale factor
    const w = iw * z;
    const h = ih * z;
    const maxX = Math.max(0, w / 2 - SIZE / 2);
    const maxY = Math.max(0, h / 2 - SIZE / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  // Redraw canvas on any change
  // zoom = direct pixel scale (minZoom fills the circle exactly)
  React.useEffect(() => {
    if (!cropMode || !rawImg || !canvasRef.current || !imgSize.w) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE/2, SIZE/2, SIZE/2, 0, Math.PI*2);
    ctx.clip();
    // Fill black so no transparency ever shows through
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, SIZE, SIZE);
    const img = new Image();
    img.onload = () => {
      // zoom is the direct scale factor — no second multiply
      const w = imgSize.w * zoom;
      const h = imgSize.h * zoom;
      ctx.drawImage(img, (SIZE - w) / 2 + offset.x, (SIZE - h) / 2 + offset.y, w, h);
      ctx.restore();
    };
    img.src = rawImg;
  }, [cropMode, rawImg, zoom, offset, imgSize]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        setImgSize({ w: img.width, h: img.height });
        const mz = SIZE / Math.min(img.width, img.height);
        setRawImg(ev.target.result);
        setZoom(mz);
        setOffset({ x:0, y:0 });
        setCropMode(true);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Drag handlers — mouse
  const handleMouseDown = (e) => {
    e.preventDefault();
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const handleMouseMove = (e) => {
    if (!dragStart.current) return;
    const raw = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
    setOffset(clampOffset(raw.x, raw.y, zoom, imgSize.w, imgSize.h));
  };
  const handleMouseUp = () => { dragStart.current = null; };

  // Drag handlers — touch (single finger only, no pinch)
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    dragStart.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y };
  };
  const handleTouchMove = (e) => {
    if (e.touches.length !== 1 || !dragStart.current) return;
    e.preventDefault();
    const raw = { x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y };
    setOffset(clampOffset(raw.x, raw.y, zoom, imgSize.w, imgSize.h));
  };
  const handleTouchEnd = () => { dragStart.current = null; };

  const handleZoom = (val) => {
    const z = Math.max(minZoom, Number(val));
    setZoom(z);
    setOffset(prev => clampOffset(prev.x, prev.y, z, imgSize.w, imgSize.h));
  };

  const applyCrop = () => {
    if (!canvasRef.current) return;
    setAvatar(canvasRef.current.toDataURL("image/jpeg", 0.9));
    setCropMode(false);
    setRawImg(null);
  };

  const removePhoto = () => { setAvatar(null); setCropMode(false); setRawImg(null); };

  return (
    <div className="sheet-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:"1rem", fontWeight:700, color:"var(--text)" }}>
            {cropMode ? "Crop Photo" : "Edit Profile"}
          </div>
          <button className="btn-icon" style={{ background:"var(--surface3)" }} onClick={onClose}>{Icon.close}</button>
        </div>

        {!cropMode ? (
          <>
            {/* Avatar */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:20 }}>
              <div style={{ position:"relative", marginBottom:12 }}>
                <div style={{ width:84, height:84, borderRadius:"50%", background:"var(--accent)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"2rem", fontWeight:800, color:"white", overflow:"hidden",
                  border:"3px solid var(--surface3)" }}>
                  {avatar
                    ? <img src={avatar} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="avatar" />
                    : name.charAt(0) || "?"}
                </div>
                <button onClick={() => fileRef.current?.click()}
                  style={{ position:"absolute", bottom:0, right:0, width:28, height:28,
                    background:"var(--accent)", border:"2px solid var(--surface)", borderRadius:"50%",
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"white" }}>
                  <span style={{ display:"flex", width:13, height:13 }}>{Icon.edit}</span>
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => fileRef.current?.click()} className="btn btn-secondary" style={{ fontSize:"0.75rem", padding:"6px 14px" }}>
                  {avatar ? "Change photo" : "Add photo"}
                </button>
                {avatar && (
                  <button onClick={removePhoto} className="btn btn-secondary"
                    style={{ fontSize:"0.75rem", padding:"6px 14px", color:"#f87171", borderColor:"rgba(248,113,113,0.3)" }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Name + Username */}
            <div style={{ background:"var(--surface2)", borderRadius:10, overflow:"hidden", border:"1px solid var(--border)", marginBottom:8 }}>
              {/* Name row */}
              <div style={{ display:"flex", alignItems:"center", padding:"0 14px", borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:"0.8125rem", color:"var(--muted)", fontWeight:500, width:90, flexShrink:0 }}>Name</span>
                <input value={name} placeholder="Your name" onChange={e => setName(e.target.value)}
                  style={{ flex:1, background:"none", border:"none", padding:"13px 0", color:"var(--text)",
                    fontFamily:"var(--font)", fontSize:"0.875rem", outline:"none", textAlign:"right" }} />
              </div>
              {/* Username row */}
              <div style={{ display:"flex", alignItems:"center", padding:"0 14px" }}>
                <span style={{ fontSize:"0.8125rem", color:"var(--muted)", fontWeight:500, width:90, flexShrink:0 }}>Username</span>
                <span style={{ color:"var(--muted)", fontSize:"0.875rem", marginRight:2, opacity: handle ? 0.8 : 0.4 }}>@</span>
                <input value={handle} placeholder="yourhandle" onChange={e => setHandle(sanitizeHandle(e.target.value))}
                  autoCapitalize="none" autoCorrect="off" spellCheck="false"
                  style={{ flex:1, background:"none", border:"none", padding:"13px 0", color:"var(--text)",
                    fontFamily:"var(--font)", fontSize:"0.875rem", outline:"none", textAlign:"right" }} />
              </div>
            </div>
            {/* Username help text */}
            <div style={{ fontSize:"0.6875rem", color: handleError ? "#f87171" : "var(--muted)",
              lineHeight:1.5, padding:"0 4px", marginBottom:16 }}>
              {handleError || "Pick one you like — if it's taken when sharing launches, we'll ask you to choose another. 3-20 chars, letters/numbers/underscores."}
            </div>
            <button className="btn btn-primary"
              disabled={!!handleError}
              onClick={() => onSave({ name, email: profile.email || "", handle, avatar })}
              style={{ opacity: handleError ? 0.5 : 1, cursor: handleError ? "not-allowed" : "pointer" }}>
              Save
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize:"0.8125rem", color:"var(--muted)", marginBottom:14, textAlign:"center" }}>
              Drag to reposition · Slider to zoom
            </div>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
              <canvas ref={canvasRef} width={SIZE} height={SIZE}
                style={{ borderRadius:"50%", border:"3px solid var(--accent)", cursor:"grab", touchAction:"none", display:"block" }}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, padding:"0 4px" }}>
              <span style={{ display:"flex", width:14, height:14, color:"var(--muted)" }}>{Icon.search}</span>
              <input type="range" min={minZoom} max={minZoom*4} step={0.01} value={zoom}
                onChange={e => handleZoom(e.target.value)}
                style={{ flex:1, accentColor:"var(--accent)" }} />
              <span style={{ fontSize:"0.6875rem", color:"var(--muted)", fontWeight:600, minWidth:32, textAlign:"right" }}>
                {Math.round((zoom/minZoom)*100)}%
              </span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => { setCropMode(false); setRawImg(null); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={applyCrop}>Use photo</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── CSS ───────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #111118; --surface: #1e1e2a; --surface2: #2a2a3a; --surface3: #363648;
  --border: rgba(255,255,255,0.13); --text: #ffffff; --muted: #b4b4c8;
  --accent: #7c6af7; --accent2: #a78bfa; --radius: 14px;
  --font: 'DM Sans', sans-serif; --mono: 'DM Mono', monospace;
  --green: #10b981; --red: #ef4444;
}

.hc-mode { --muted: #c8c8dc; --border: rgba(255,255,255,0.25); }
.hc-mode.light-mode, .light-mode.hc-mode { --muted: #3a3a4c; --border: rgba(0,0,0,0.35); }
/* iOS Safari auto-zooms to inputs with font-size < 16px. Force minimum 16px to prevent this. */
input, textarea, select { font-size: max(16px, 1rem) !important; }
/* Hide the hover-based delete button on touch-only devices — touch users get swipe instead */
@media (hover: none) {
  .event-pill-delete { display: none !important; }
}
/* Respect user motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
/* ── DESKTOP MODE ─ activated when .app has .desktop-mode class ─────────── */
.desktop-mode.app { max-width: 1200px; padding-left: 240px; }
.desktop-mode .bottom-nav { display: none; }
.desktop-mode .screen { padding: 48px 40px 40px; max-width: 820px; }
.desktop-mode .fab { bottom: 40px; right: calc(50% - 600px + 40px); left: auto; }
.desktop-mode .sheet { max-width: 600px; margin: 0 auto; border-radius: 20px; max-height: 85vh; }
.desktop-mode .sheet-overlay { align-items: center; padding: 20px; }
/* Sidebar nav — visible only in desktop mode */
.desktop-sidebar { position: fixed; top: 0; left: calc(50% - 600px); width: 240px; height: 100vh; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 32px 16px 16px; z-index: 50; }
.desktop-sidebar-brand { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.3px; color: var(--text); padding: 0 12px 24px; }
.desktop-sidebar-brand-accent { color: var(--accent2); }
.desktop-nav-btn { display: flex; align-items: center; gap: 12px; background: none; border: none; color: var(--muted); font-family: var(--font); font-size: 0.9375rem; font-weight: 500; cursor: pointer; padding: 10px 12px; border-radius: 10px; transition: background .15s, color .15s; text-align: left; width: 100%; margin-bottom: 2px; }
.desktop-nav-btn:hover { background: var(--surface2); color: var(--text); }
.desktop-nav-btn.active { background: rgba(124,106,247,0.12); color: var(--accent2); }
.desktop-nav-btn svg { width: 20px; height: 20px; flex-shrink: 0; }
/* Light-mode + desktop-mode compound */
.light-mode.desktop-mode .desktop-sidebar { background: var(--surface); border-right-color: rgba(60,40,140,0.15); }
/* When viewport is narrower than 1200 but still desktop, sidebar docks to left edge */
@media (max-width: 1199px) {
  .desktop-mode.app { padding-left: 240px; max-width: none; margin: 0; }
  .desktop-sidebar { left: 0; }
  .desktop-mode .fab { right: 40px; }
}
/* ── SPLIT MODE ─ calendar always visible on the right ─────────────────── */
.split-mode.app { max-width: none; margin: 0; padding: 0 0 0 72px; display: grid; grid-template-columns: minmax(320px, 35fr) 65fr; grid-auto-flow: dense; column-gap: 0; min-height: 100vh; }
.split-mode .bottom-nav { display: none; }
.split-mode .screen { padding: 40px 32px 40px; max-width: none; overflow-y: auto; max-height: 100vh; }
.split-mode .fab { display: none; } /* replaced by a cleaner + button in the sidebar */
.split-mode .sheet { max-width: 520px; margin: 0 auto; border-radius: 20px; max-height: 85vh; }
.split-mode .sheet-overlay { align-items: center; padding: 20px; }
/* Icon-only sidebar on far left */
.split-sidebar { position: fixed; top: 0; left: 0; width: 72px; height: 100vh; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; padding: 20px 0 16px; z-index: 50; gap: 6px; }
.split-sidebar-brand { font-size: 1rem; font-weight: 800; letter-spacing: -0.3px; color: var(--accent2); padding: 0 0 16px; }
.split-nav-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: none; border: none; color: var(--muted); cursor: pointer; border-radius: 10px; transition: background .15s, color .15s; position: relative; }
.split-nav-btn:hover { background: var(--surface2); color: var(--text); }
.split-nav-btn.active { background: rgba(124,106,247,0.12); color: var(--accent2); }
.split-nav-btn svg { width: 20px; height: 20px; }
/* Tooltip on hover */
.split-nav-btn::after { content: attr(data-label); position: absolute; left: 54px; top: 50%; transform: translateY(-50%); background: var(--surface); border: 1px solid var(--border); color: var(--text); font-family: var(--font); font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 6px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .15s; z-index: 51; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.split-nav-btn:hover::after { opacity: 1; }
/* Right calendar panel */
.split-calendar-panel { grid-column: 2; border-left: 1px solid var(--border); background: var(--bg); overflow-y: auto; max-height: 100vh; padding: 32px 32px 40px; }
.split-calendar-panel .screen { padding: 0; max-height: none; overflow-y: visible; }
.split-mode .cal-grid { max-width: 820px; margin-left: auto; margin-right: auto; }
/* Logo eyes flip color with theme — black on light bg, white on dark bg */
.daytu-logo-eye { fill: #ffffff; }
.light-mode .daytu-logo-eye { fill: #000000; }
/* The + button inside the split sidebar */
.split-add-btn { width: 44px; height: 44px; border-radius: 12px; background: var(--accent); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(124,106,247,0.4); transition: transform .15s; margin-top: 8px; }
.split-add-btn:hover { transform: scale(1.05); }
.split-add-btn svg { width: 22px; height: 22px; }
/* Light mode adjustments */
.light-mode.split-mode .split-sidebar { background: var(--surface); border-right-color: rgba(60,40,140,0.15); }
.light-mode.split-mode .split-calendar-panel { background: var(--bg); border-left-color: rgba(60,40,140,0.15); }
body { background: var(--bg); color: var(--text); font-family: var(--font); -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--surface3); border-radius: 4px; }
.app { max-width: 430px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; position: relative; background: var(--bg); }
.bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: rgba(15,15,19,0.92); backdrop-filter: blur(20px); border-top: 1px solid var(--border); display: flex; padding: 10px 8px 20px; z-index: 100; }
.nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: none; color: var(--muted); font-family: var(--font); font-size: 0.6875rem; font-weight: 500; cursor: pointer; padding: 6px 0; border-radius: 10px; transition: color .15s; }
.nav-btn.active { color: var(--accent2); }
.nav-btn svg { width: 22px; height: 22px; }
.screen { flex: 1; overflow-y: visible; padding: max(52px, calc(env(safe-area-inset-top, 0px) + 24px)) 16px 90px; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.header h1 { font-size: 1.375rem; font-weight: 600; letter-spacing: -0.4px; }
.header-sub { font-size: 0.8125rem; color: var(--muted); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 12px; }
.card-sm { padding: 12px 14px; }
.event-pill { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--surface2); border-radius: 10px; margin-bottom: 8px; cursor: pointer; transition: background .15s; }
.event-pill:hover { background: var(--surface3); }
.event-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.event-pill-info { flex: 1; min-width: 0; }
.event-pill-title { font-size: 0.875rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.event-pill-time { font-size: 0.75rem; color: var(--muted); font-family: var(--mono); }
.section-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 10px; }
.cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
.cal-header-cell { text-align: center; font-size: 0.6875rem; font-weight: 700; color: var(--muted); padding: 6px 0; }
.cal-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 6px; border-radius: 8px; cursor: pointer; position: relative; font-size: 0.8125rem; transition: background .12s; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; touch-action: manipulation; }
.cal-cell:hover { background: var(--surface2); }
.cal-cell.today .cal-day-num { background: var(--accent); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.cal-cell.selected { background: var(--surface2); }
.cal-cell.other-month .cal-day-num { color: var(--muted); opacity: 0.4; }
.cal-day-num { font-size: 0.875rem; font-weight: 600; line-height: 1; color: var(--text); }
.cal-dots { display: flex; gap: 3px; margin-top: 10px; flex-wrap: wrap; justify-content: center; align-items: center; max-width: 40px; align-self: center; }
.cal-dot { width: 7px; height: 7px; border-radius: 50%; }
.cal-dot-more { font-size: 0.625rem; font-weight: 700; color: var(--muted); line-height: 1; letter-spacing: -0.5px; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; border-radius: 10px; font-family: var(--font); font-weight: 500; cursor: pointer; transition: all .15s; }
.btn-primary { background: var(--accent); color: white; padding: 12px 20px; font-size: 0.9375rem; width: 100%; border-radius: 12px; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: var(--surface2); color: var(--text); padding: 10px 16px; font-size: 0.875rem; border: 1px solid var(--border); }
.btn-secondary:hover { background: var(--surface3); }
.btn-icon { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 8px; cursor: pointer; color: var(--text); display: flex; align-items: center; justify-content: center; transition: background .15s, opacity .15s; min-width: 36px; min-height: 36px; }
.btn-icon:active { opacity: 0.7; }
.btn-icon svg { width: 18px; height: 18px; display: block; }
.fab { position: fixed; bottom: 104px; right: calc(50% - 210px + 16px); width: 52px; height: 52px; border-radius: 16px; background: var(--accent); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 24px rgba(124,106,247,0.5); z-index: 99; transition: transform .2s ease, opacity .2s ease; }
.fab:hover { transform: scale(1.07); }
.fab.hidden { opacity: 0; pointer-events: none; transform: scale(0.85) translateY(8px); }
.fab svg { width: 24px; height: 24px; }
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
.sheet { background: var(--surface); border-radius: 20px 20px 0 0; width: 100%; max-width: 430px; max-height: 92vh; overflow-y: auto; padding: 20px 20px 40px; animation: slideUp .25s cubic-bezier(0.32,0.72,0,1); }
@keyframes slideUp { from { transform: translateY(60%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.sheet-handle { width: 36px; height: 4px; background: var(--surface3); border-radius: 2px; margin: 0 auto 20px; }
.sheet-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 20px; }
.form-group { margin-bottom: 14px; }
.form-label { font-size: 0.75rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; display: block; }
.form-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 13px; color: var(--text); font-family: var(--font); font-size: 0.9375rem; outline: none; transition: border-color .15s; }
.form-input:focus { border-color: var(--accent); }
.form-input::placeholder { color: var(--muted); }
textarea.form-input { resize: none; min-height: 72px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 6px 12px; border-radius: 20px; font-size: 0.8125rem; font-weight: 500; border: 1.5px solid var(--border); cursor: pointer; transition: all .12s; background: var(--surface2); color: var(--muted); }
.chip.active { background: rgba(124,106,247,0.15); color: var(--accent2); border-color: var(--accent); }
.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); }
.toggle { width: 46px; height: 28px; background: var(--surface3); border-radius: 14px; border: none; cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0; }
.toggle.on { background: var(--accent); }
.toggle::after { content: ''; position: absolute; top: 4px; left: 4px; width: 20px; height: 20px; border-radius: 50%; background: white; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.25); }
.toggle.on::after { left: 22px; }
.vis-option { display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: 10px; border: 1.5px solid var(--border); cursor: pointer; margin-bottom: 6px; transition: all .12s; }
.vis-option.active { border-color: var(--accent); background: rgba(124,106,247,0.1); }
.vis-option-title { font-size: 0.875rem; font-weight: 500; }
.vis-option-sub { font-size: 0.75rem; color: var(--muted); }
.major-event-card { border-radius: 18px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: transform .15s, box-shadow .15s; }
.major-event-card:active { transform: scale(0.985); }
.major-event-title { font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 4px; letter-spacing: -0.4px; line-height: 1.2; }
.major-event-dates { font-size: 0.75rem; color: rgba(255,255,255,0.75); font-weight: 500; }
.countdown-block { display: inline-flex; gap: 6px; align-items: flex-end; }
.countdown-unit { text-align: center; min-width: 36px; }
.countdown-num { font-size: 1.375rem; font-weight: 800; color: #fff; font-family: var(--mono); letter-spacing: -1px; line-height: 1; }
.countdown-label { font-size: 0.6875rem; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }
.countdown-sep { font-size: 1.125rem; font-weight: 700; color: rgba(255,255,255,0.35); padding-bottom: 6px; }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
.badge-work { background: rgba(124,106,247,0.2); color: var(--accent2); }
.badge-off { background: rgba(16,185,129,0.15); color: #10b981; }
.group-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; background: var(--surface2); }
.empty { text-align: center; padding: 32px 0; color: var(--muted); font-size: 0.875rem; }
hr.divider { border: none; border-top: 1px solid var(--border); margin: 14px 0; }
.sub-tab-row { display: flex; gap: 4px; background: var(--surface2); border-radius: 12px; padding: 4px; margin-bottom: 20px; }
.sub-tab { flex: 1; padding: 8px 4px; border: none; border-radius: 8px; font-family: var(--font); font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all .15s; background: none; color: var(--muted); }
.sub-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
.friend-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 8px; }
.friend-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 0.8125rem; font-weight: 700; color: white; flex-shrink: 0; }
.month-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 8px; }
.now-card { background: linear-gradient(135deg, rgba(124,106,247,0.2), rgba(167,139,250,0.1)); border: 1px solid rgba(124,106,247,0.3); border-radius: 14px; padding: 14px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
.now-card-bar { width: 4px; align-self: stretch; min-height: 40px; border-radius: 3px; flex-shrink: 0; }
.now-card-pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--accent2); animation: nowPulse 2s ease-in-out infinite; flex-shrink: 0; }
@keyframes nowPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }
.toast { position: fixed; bottom: 88px; left: 50%; transform: translateX(-50%); z-index: 400; padding: 10px 18px; border-radius: 22px; font-size: 0.8125rem; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.4); animation: toastIn .2s ease-out, toastOut .25s ease-in 2.15s both; white-space: nowrap; max-width: 90%; display: flex; align-items: center; gap: 8px; pointer-events: none; }
.toast-ok { background: rgba(20,20,30,0.95); border: 1px solid rgba(52,211,153,0.4); color: #fff; }
.toast-ok span { color: #34d399; }
.toast-err { background: rgba(20,20,30,0.95); border: 1px solid rgba(248,113,113,0.4); color: #fff; }
.toast-err span { color: #f87171; }
.light-mode .toast-ok { background: rgba(255,255,255,0.97); color: #0d0b1e; border-color: rgba(16,185,129,0.5); }
.light-mode .toast-err { background: rgba(255,255,255,0.97); color: #0d0b1e; border-color: rgba(239,68,68,0.5); }
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes toastOut { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, 10px); } }
/* ── LIGHT MODE ─────────────────────────────────────────── */
.light-mode {
  --bg: #e8e2f8;
  --surface: #f4f0ff;
  --surface2: #ebe5f8;
  --surface3: #ddd6f0;
  --border: rgba(60,40,140,0.15);
  --text: #0d0b1e;
  --muted: #3d3860;
  --accent: #4530d8;
  --accent2: #3820b8;
  --green: #0a6644;
  --red: #b01020;
}
.light-mode body { background: var(--bg); color: var(--text); }
.light-mode .app { color: #0d0b1e; }
.light-mode .screen { color: #0d0b1e; }
.light-mode .bottom-nav { background: rgba(232,226,248,0.97); backdrop-filter: blur(20px); border-color: rgba(60,40,140,0.15); }

/* Cards and surfaces */
.light-mode .card { background: #f4f0ff; border-color: rgba(60,40,140,0.12); box-shadow: 0 1px 6px rgba(60,40,140,0.08); color: #0d0b1e; }
.light-mode .event-pill { background: #f4f0ff; border: 1px solid rgba(60,40,140,0.12); box-shadow: 0 1px 3px rgba(60,40,140,0.06); }
.light-mode .event-pill:hover { background: var(--surface3); }
.light-mode .sheet { background: #f4f0ff; color: #0d0b1e; }
.light-mode .sheet-handle { background: var(--surface3); }
.light-mode .friend-card { background: #f4f0ff; border-color: rgba(60,40,140,0.12); }
.light-mode .friend-card-pending { background: rgba(69,48,216,0.07); border-color: rgba(69,48,216,0.2); }

/* All text — force dark on every key element */
.light-mode h1, .light-mode h2, .light-mode h3 { color: #0d0b1e; }
.light-mode .header h1 { color: #0d0b1e; }
.light-mode .header-sub { color: #3d3860; }
.light-mode .section-label { color: #3d3860; }
.light-mode .event-pill-title { color: #0d0b1e; }
.light-mode .event-pill-time { color: #3d3860; }
.light-mode .sheet-title { color: #0d0b1e; }
.light-mode .nav-btn { color: #3d3860; }
.light-mode .nav-btn.active { color: var(--accent); }
.light-mode .empty { color: #3d3860; }

/* Calendar */
.light-mode .cal-header-cell { color: #3d3860; }
.light-mode .cal-day-num { color: #0d0b1e; }
.light-mode .cal-cell.other-month .cal-day-num { color: #a098cc; opacity: 1; }
.light-mode .cal-cell:hover { background: rgba(60,40,140,0.06); }
.light-mode .cal-cell.selected { background: rgba(69,48,216,0.1); }

/* Forms */
.light-mode .form-input { background: #f4f0ff; border-color: rgba(60,40,140,0.18); color: #0d0b1e; }
.light-mode .form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(69,48,216,0.12); }
.light-mode .form-input::placeholder { color: #a098cc; }
.light-mode .form-label { color: #3d3860; }
.light-mode textarea.form-input { color: #0d0b1e; }

/* Buttons and controls */
.light-mode .btn-icon { background: #f4f0ff; border-color: rgba(60,40,140,0.15); color: #0d0b1e; }
.light-mode .btn-secondary { background: #f4f0ff; border-color: rgba(60,40,140,0.16); color: #0d0b1e; }
.light-mode .btn-secondary:hover { background: var(--surface3); }
.light-mode .chip { background: #f4f0ff; border-color: rgba(60,40,140,0.15); color: #3d3860; }
.light-mode .chip.active { background: rgba(69,48,216,0.12); color: var(--accent); border-color: var(--accent); }
.light-mode .toggle { background: rgba(60,40,140,0.22); }
.light-mode .toggle.on { background: var(--accent); }
.light-mode .sub-tab-row { background: rgba(60,40,140,0.1); }
.light-mode .sub-tab { color: #3d3860; }
.light-mode .sub-tab.active { background: #f4f0ff; color: #0d0b1e; box-shadow: 0 1px 4px rgba(60,40,140,0.12); }

/* Badges and status */
.light-mode .now-card { background: linear-gradient(135deg, rgba(69,48,216,0.12), rgba(56,32,184,0.06)); border-color: rgba(69,48,216,0.22); }
.light-mode .badge-work { background: rgba(69,48,216,0.1); color: var(--accent); }
.light-mode .badge-off { background: rgba(10,102,68,0.1); color: var(--green); }
.light-mode .major-event-card { box-shadow: 0 2px 14px rgba(60,40,140,0.14); }

/* Misc */
.light-mode hr.divider { border-color: rgba(60,40,140,0.12); }
.light-mode .freetime-label { color: #0a4a2e; }
.light-mode .freetime-slot-time { color: #072a1a; font-weight: 800; }
.light-mode .freetime-slot-sub { color: #0f5c38; }
.light-mode .freetime-next-badge { background: rgba(10,80,50,0.12); color: #0a4a2e; }
.light-mode ::-webkit-scrollbar-thumb { background: rgba(60,40,140,0.18); }
.light-mode .group-badge { color: #0d0b1e; }
.light-mode .month-nav span { color: #0d0b1e; }
.light-mode .now-card * { color: #0d0b1e; }
.light-mode .toggle-row { color: #0d0b1e; }
.light-mode .vis-option-title { color: #0d0b1e; }
.light-mode .vis-option-sub { color: #3d3860; }
 to { opacity:1; transform:translateY(0); } }
@keyframes coachmark-fade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ghostPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
@keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
`;

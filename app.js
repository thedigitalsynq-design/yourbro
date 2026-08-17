/**
 * YOUR-BRO • Live Stream Subscriber Dashboard (Real Data Connected)
 * Fetches real subscriber count from local Python server (server.py)
 * Pure Vanilla JavaScript ES6 Implementation
 */

// 1. Channel Data — seeded with real known values, updated via API
const channelData = {
  name: "YOUR-BRO",
  handle: "@YOURBR0-f1h",
  subscribers: 50,          // Real: 50 subscribers as of latest fetch
  nextGoal: 100,            // Next YouTube milestone
  prevMilestone: 0,
  views: "0",
  videos: 0,
  liveViewers: 14,
  avatarUrl: "",
  joined: "Joined Dec 24, 2020",
};

// 2. Live Data Fetcher
// — On GitHub Pages: reads /data.json (updated hourly by GitHub Actions)
// — On localhost:    falls back to /api/channel (served by server.py)
const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const DATA_URL = IS_LOCAL ? 'http://localhost:3000/api/channel' : './data.json';
let lastFetchedSubs = 50;

async function fetchRealChannelData() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (typeof data.subscribers === 'number' && data.subscribers > 0) {
      const realSubs = data.subscribers;

      if (realSubs >= channelData.nextGoal) {
        channelData.prevMilestone = channelData.nextGoal;
        channelData.nextGoal = channelData.nextGoal < 1000 ? channelData.nextGoal * 2 : channelData.nextGoal + 1000;
      }

      channelData.subscribers = realSubs;
      channelData.name = data.name || channelData.name;
      channelData.avatarUrl = data.avatarUrl || '';
      channelData.joined = data.joined || channelData.joined;

      // Update channel name
      const nameEl = document.getElementById('channelName');
      if (nameEl && data.name) nameEl.textContent = data.name;

      // Update avatar
      const avatarEl = document.getElementById('channelAvatar');
      if (avatarEl && data.avatarUrl) {
        avatarEl.src = data.avatarUrl;
        avatarEl.style.display = 'block';
      }

      // Update joined date
      const joinedEl = document.getElementById('channelJoined');
      if (joinedEl && data.joined) joinedEl.textContent = data.joined;

      // Show last updated time if on GitHub Pages
      if (!IS_LOCAL && data.updatedAt) {
        const updated = new Date(data.updatedAt);
        const ago = Math.round((Date.now() - updated) / 60000);
        const lbl = document.getElementById('dataUpdatedLabel');
        if (lbl) lbl.textContent = `Data updated ${ago < 2 ? 'just now' : ago + 'm ago'}`;
      }

      updateDisplay(false);
      lastFetchedSubs = realSubs;
      console.log(`[Live Data] ${realSubs} subs — source: ${IS_LOCAL ? 'local API' : 'data.json'} — ${data.updatedAt || ''}`);
    }
  } catch (e) {
    console.warn('[Live Data] Could not fetch channel data:', e.message);
  }
}

// Refresh: every 90s locally, every 5min on GitHub Pages (data.json updates hourly anyway)
fetchRealChannelData();
setInterval(fetchRealChannelData, IS_LOCAL ? 90_000 : 300_000);

let audioEnabled = true;
let isUserSubscribed = false;
let sessionSubsGained = 0;
let autoSimInterval = 4000; // ms
let simTimer = null;
let alertQueue = [];
let isAlertPlaying = false;
let streamStartTime = Date.now() - (12 * 60 + 30) * 1000;

// Dummy Bro Army Subscriber Pool
const DUMMY_SUBS = [
  { name: "CyberGamer_99", avatar: "🔥", tier: "Bro Army", msg: "YOUR-BRO to the moon! 🚀" },
  { name: "ShadowStriker", avatar: "⚡", tier: "VIP Bro", msg: "Just joined the Bro Army! Let's hit 100 subs! 🔥" },
  { name: "PixelValkyrie", avatar: "🎮", tier: "New Sub", msg: "Subscribed! Excited for the first video! ❤️" },
  { name: "ApexHunter_X", avatar: "🏹", tier: "Super Fan", msg: "Road to 100 subscribers! 🔥" },
  { name: "NeonSamurai", avatar: "⚔️", tier: "Bro-VIP", msg: "Bro Army for life! 👑 Great stream!" },
  { name: "TechTitan_Max", avatar: "💻", tier: "VIP Bro", msg: "YOUR-BRO is underrated! Subbed! 💥" },
  { name: "NovaCaptain", avatar: "🌟", tier: "Bro Army", msg: "Let's push to the 100 subs milestone! 🏆" },
  { name: "GlitchMaster", avatar: "👾", tier: "New Sub", msg: "Subscribed from recommendation!" },
  { name: "BlazeRider", avatar: "🏎️", tier: "Bro-VIP", msg: "Here early! First 100 club! 💯" },
  { name: "VortexKing", avatar: "🌀", tier: "Super Fan", msg: "Here before 1k! 📈" }
];

// 2. Synthesized Audio System
class AudioSynth {
  constructor() { this.ctx = null; }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  playSubChime() {
    if (!audioEnabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    } catch (e) { console.warn(e); }
  }
}
const audio = new AudioSynth();

// 3. Canvas Confetti System
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');
let particles = [];
let isConfettiRunning = false;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

const COLORS = ['#FF0033', '#FFB800', '#00E676', '#00F0FF', '#FFFFFF', '#FF6B00'];

function triggerConfetti(count = 50, isBurst = false) {
  const w = confettiCanvas.width;
  const h = confettiCanvas.height;
  for (let i = 0; i < count; i++) {
    const ox = isBurst ? w / 2 : (Math.random() > 0.5 ? 0 : w);
    const oy = isBurst ? h * 0.45 : Math.random() * (h * 0.5);
    particles.push({
      x: ox, y: oy,
      size: Math.random() * 7 + 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: isBurst ? (Math.random() - 0.5) * 16 : (ox === 0 ? Math.random() * 10 + 3 : -(Math.random() * 10 + 3)),
      vy: isBurst ? Math.random() * -14 - 3 : Math.random() * -7 - 2,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      gravity: 0.25,
      opacity: 1,
      decay: Math.random() * 0.015 + 0.01
    });
  }
  if (!isConfettiRunning) {
    isConfettiRunning = true;
    requestAnimationFrame(renderConfetti);
  }
}

function renderConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.rotation += p.vRot;
    p.opacity -= p.decay;

    if (p.opacity <= 0 || p.y > confettiCanvas.height + 20) {
      particles.splice(i, 1);
      continue;
    }
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.globalAlpha = Math.max(0, p.opacity);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    confettiCtx.restore();
  }
  if (particles.length > 0) requestAnimationFrame(renderConfetti);
  else isConfettiRunning = false;
}

// 4. Alert Box Popup
const alertBox = document.getElementById('alertBox');
const alertAvatar = document.getElementById('alertAvatar');
const alertName = document.getElementById('alertName');
const alertTier = document.getElementById('alertTier');
const alertMsg = document.getElementById('alertMsg');
const alertProgressFill = document.getElementById('alertProgressFill');

function queueAlert(sub) {
  alertQueue.push(sub);
  if (!isAlertPlaying) processNextAlert();
}

function processNextAlert() {
  if (alertQueue.length === 0) {
    isAlertPlaying = false;
    return;
  }
  isAlertPlaying = true;
  const sub = alertQueue.shift();

  alertAvatar.textContent = sub.avatar || '🔥';
  alertName.textContent = sub.name || 'Anonymous Bro';
  alertTier.textContent = `${sub.tier || 'Bro Army'} • Just Subscribed`;
  alertMsg.textContent = sub.msg ? `"${sub.msg}"` : '"YOUR-BRO to the moon! 🚀"';

  audio.playSubChime();
  triggerConfetti(30, false);

  alertBox.classList.add('active');
  alertProgressFill.style.transition = 'none';
  alertProgressFill.style.width = '100%';

  setTimeout(() => {
    alertProgressFill.style.transition = 'width 2.6s linear';
    alertProgressFill.style.width = '0%';
  }, 20);

  setTimeout(() => {
    alertBox.classList.remove('active');
    setTimeout(processNextAlert, 300);
  }, 2800);
}

// 5. DOM Updating
const subscriberNumber = document.getElementById('subscriberNumber');
const counterChangeFlash = document.getElementById('counterChangeFlash');
const nextGoalLabel = document.getElementById('nextGoalLabel');
const remainingSubsLabel = document.getElementById('remainingSubsLabel');
const goalProgressFill = document.getElementById('goalProgressFill');
const progressPercentLabel = document.getElementById('progressPercentLabel');

const sessionGainVal = document.getElementById('sessionGainVal');
const liveViewersVal = document.getElementById('liveViewersVal');
const totalViewsVal = document.getElementById('totalViewsVal');
const streamTimer = document.getElementById('streamTimer');
const recentSubList = document.getElementById('recentSubList');

const userSubscribeBtn = document.getElementById('userSubscribeBtn');
const subBtnText = document.getElementById('subBtnText');
const joinMemberBtn = document.getElementById('joinMemberBtn');

const toggleAudioBtn = document.getElementById('toggleAudioBtn');
const audioIcon = document.getElementById('audioIcon');
const obsModeBtn = document.getElementById('obsModeBtn');
const exitObsBtn = document.getElementById('exitObsBtn');

// Modal Elements
const editStatsBtn = document.getElementById('editStatsBtn');
const editChannelModal = document.getElementById('editChannelModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveChannelBtn = document.getElementById('saveChannelBtn');
const customSubInput = document.getElementById('customSubInput');
const customGoalInput = document.getElementById('customGoalInput');
const customViewsInput = document.getElementById('customViewsInput');

function formatNum(n) {
  return Number(n).toLocaleString('en-US');
}

function updateDisplay(isBump = true, diff = 1) {
  subscriberNumber.textContent = formatNum(channelData.subscribers);

  if (isBump) {
    subscriberNumber.classList.remove('bump');
    void subscriberNumber.offsetWidth;
    subscriberNumber.classList.add('bump');

    counterChangeFlash.textContent = `+${diff}`;
    counterChangeFlash.classList.add('show');
    setTimeout(() => counterChangeFlash.classList.remove('show'), 400);
  }

  const target = channelData.nextGoal;
  const prev = channelData.prevMilestone || 0;
  const current = channelData.subscribers;

  const rem = Math.max(0, target - current);
  remainingSubsLabel.textContent = formatNum(rem);
  nextGoalLabel.textContent = `${formatNum(target)} Subs`;

  const span = target - prev;
  const prog = current - prev;
  let pct = ((prog / span) * 100).toFixed(1);
  pct = Math.min(100, Math.max(0, pct));

  goalProgressFill.style.width = `${pct}%`;
  progressPercentLabel.textContent = `${pct}%`;

  if (current >= target) {
    triggerConfetti(100, true);
    channelData.prevMilestone = target;
    channelData.nextGoal = target < 1000 ? target * 2 : target + 1000;
  }
}

function addToFeed(sub) {
  const row = document.createElement('div');
  row.className = 'feed-row';
  row.innerHTML = `
    <div class="feed-user">
      <span>${sub.avatar || '🔥'}</span>
      <strong>${sub.name}</strong>
      <span class="feed-tag">${sub.tier || 'Bro Army'}</span>
    </div>
    <span class="feed-time">Just now</span>
  `;
  recentSubList.insertBefore(row, recentSubList.firstChild);
  if (recentSubList.children.length > 10) {
    recentSubList.removeChild(recentSubList.lastChild);
  }
}

function initFeed() {
  recentSubList.innerHTML = '';
  const initial = DUMMY_SUBS.slice(0, 5);
  const times = ['1m ago', '3m ago', '8m ago', '14m ago', '25m ago'];
  initial.forEach((sub, idx) => {
    const row = document.createElement('div');
    row.className = 'feed-row';
    row.innerHTML = `
      <div class="feed-user">
        <span>${sub.avatar}</span>
        <strong>${sub.name}</strong>
        <span class="feed-tag">${sub.tier}</span>
      </div>
      <span class="feed-time">${times[idx]}</span>
    `;
    recentSubList.appendChild(row);
  });
}

// 6. Action Triggers
function addSubscriber(amt = 1, custom = null) {
  channelData.subscribers += amt;
  sessionSubsGained += amt;
  sessionGainVal.textContent = `+${formatNum(sessionSubsGained)} subs`;

  updateDisplay(true, amt);

  let sub = custom;
  if (!sub) {
    sub = { ...DUMMY_SUBS[Math.floor(Math.random() * DUMMY_SUBS.length)] };
  }
  addToFeed(sub);
  queueAlert(sub);
}

userSubscribeBtn.addEventListener('click', () => {
  if (!isUserSubscribed) {
    isUserSubscribed = true;
    userSubscribeBtn.classList.add('subscribed');
    subBtnText.textContent = "SUBSCRIBED TO YOUR-BRO ✓";

    addSubscriber(1, {
      name: "You (Bro Army Champion!)",
      avatar: "🌟",
      tier: "Official Bro",
      msg: "You just subscribed to @YOURBR0-f1h! Welcome to the crew! 🔥"
    });
    triggerConfetti(80, true);
  } else {
    queueAlert({
      name: "Already in the Bro Army! ❤️",
      avatar: "🔥",
      tier: "Top Supporter",
      msg: "Thanks for supporting the YOUR-BRO live stream!"
    });
  }
});

joinMemberBtn.addEventListener('click', () => {
  addSubscriber(1, {
    name: "New Bro-VIP Member!",
    avatar: "👑",
    tier: "Bro-VIP",
    msg: "Unlocked VIP perks & badges for YOUR-BRO! ⭐"
  });
  triggerConfetti(70, true);
});

// Stream Deck buttons
document.getElementById('triggerOneSubBtn').addEventListener('click', () => addSubscriber(1));
document.getElementById('triggerBombSubBtn').addEventListener('click', () => {
  addSubscriber(5, {
    name: "🔥 Viral Surge",
    avatar: "⚡",
    tier: "Surge +5",
    msg: "5 new fans just subscribed from recommendation!"
  });
  triggerConfetti(50, true);
});
document.getElementById('triggerRaidSubBtn').addEventListener('click', () => {
  addSubscriber(20, {
    name: "🚀 Live Stream Raid",
    avatar: "🚀",
    tier: "Raid +20",
    msg: "20-viewer raid just landed on YOUR-BRO! 🔥"
  });
  triggerConfetti(90, true);
});
document.getElementById('triggerVipSubBtn').addEventListener('click', () => {
  addSubscriber(1, {
    name: "ApexBro_VIP",
    avatar: "👑",
    tier: "VIP Bro",
    msg: "Just joined the VIP Bro Army! 💎"
  });
  triggerConfetti(60, true);
});

// Auto-simulation
function startSimulation() {
  if (simTimer) clearInterval(simTimer);
  if (autoSimInterval > 0) {
    simTimer = setInterval(() => {
      const sub = DUMMY_SUBS[Math.floor(Math.random() * DUMMY_SUBS.length)];
      channelData.subscribers += 1;
      sessionSubsGained += 1;
      sessionGainVal.textContent = `+${formatNum(sessionSubsGained)} subs`;
      updateDisplay(true, 1);
      addToFeed(sub);
      queueAlert(sub);
    }, autoSimInterval);
  }
}

document.querySelectorAll('.chip-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    autoSimInterval = parseInt(btn.dataset.speed, 10);
    startSimulation();
  });
});

document.getElementById('clearFeedBtn').addEventListener('click', () => {
  recentSubList.innerHTML = '<div style="text-align:center; padding:12px; color:var(--text-subtle); font-size:0.75rem;">Feed cleared.</div>';
});

toggleAudioBtn.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  audioIcon.textContent = audioEnabled ? '🔊' : '🔇';
});

function toggleObs() {
  document.body.classList.toggle('obs-mode');
}
obsModeBtn.addEventListener('click', toggleObs);
exitObsBtn.addEventListener('click', toggleObs);

// Settings Modal
editStatsBtn.addEventListener('click', () => {
  customSubInput.value = channelData.subscribers;
  customGoalInput.value = channelData.nextGoal;
  customViewsInput.value = channelData.views;
  editChannelModal.classList.add('open');
});

function closeModal() {
  editChannelModal.classList.remove('open');
}
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
editChannelModal.addEventListener('click', e => { if (e.target === editChannelModal) closeModal(); });

saveChannelBtn.addEventListener('click', () => {
  const subs = parseInt(customSubInput.value, 10) || 50;
  const goal = parseInt(customGoalInput.value, 10) || 100;
  const views = customViewsInput.value.trim() || "120";

  channelData.subscribers = subs;
  channelData.nextGoal = goal;
  channelData.views = views;
  channelData.prevMilestone = 0;

  totalViewsVal.textContent = views;
  updateDisplay(false);
  closeModal();
  triggerConfetti(40, true);
});

// Stream Timer
function updateTimer() {
  const elapsed = Math.floor((Date.now() - streamStartTime) / 1000);
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  streamTimer.textContent = `${h}:${m}:${s}`;
}
setInterval(updateTimer, 1000);

// 7. Mini Real-time Graph
const chartCanvas = document.getElementById('growthChart');
const chartCtx = chartCanvas.getContext('2d');
const chartPoints = [];

function resizeChart() {
  const rect = chartCanvas.parentElement.getBoundingClientRect();
  chartCanvas.width = rect.width * (window.devicePixelRatio || 1);
  chartCanvas.height = rect.height * (window.devicePixelRatio || 1);
  renderMiniChart();
}
window.addEventListener('resize', resizeChart);

function initChart() {
  chartPoints.length = 0;
  let base = channelData.subscribers - 5;
  for (let i = 0; i < 15; i++) {
    base += Math.random() > 0.5 ? 1 : 0;
    chartPoints.push(base);
  }
  renderMiniChart();
}

function updateMiniChart() {
  chartPoints.push(channelData.subscribers);
  if (chartPoints.length > 15) chartPoints.shift();
  renderMiniChart();
}
setInterval(updateMiniChart, 3000);

function renderMiniChart() {
  const w = chartCanvas.width;
  const h = chartCanvas.height;
  chartCtx.clearRect(0, 0, w, h);
  if (chartPoints.length < 2) return;

  const min = Math.min(...chartPoints);
  const max = Math.max(...chartPoints);
  const range = (max - min) || 5;

  const pts = chartPoints.map((v, i) => ({
    x: 10 + (i / (chartPoints.length - 1)) * (w - 20),
    y: (h - 10) - ((v - min) / range) * (h - 20)
  }));

  // Area
  const grad = chartCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255, 0, 51, 0.25)');
  grad.addColorStop(1, 'rgba(255, 0, 51, 0.0)');

  chartCtx.beginPath();
  chartCtx.moveTo(pts[0].x, h);
  pts.forEach(p => chartCtx.lineTo(p.x, p.y));
  chartCtx.lineTo(pts[pts.length - 1].x, h);
  chartCtx.closePath();
  chartCtx.fillStyle = grad;
  chartCtx.fill();

  // Line
  chartCtx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) chartCtx.moveTo(p.x, p.y);
    else chartCtx.lineTo(p.x, p.y);
  });
  chartCtx.strokeStyle = '#FF0033';
  chartCtx.lineWidth = 2 * (window.devicePixelRatio || 1);
  chartCtx.stroke();
}

// 8. Init
function init() {
  updateDisplay(false);
  initFeed();
  initChart();
  resizeChart();
  startSimulation();
}

window.addEventListener('DOMContentLoaded', init);

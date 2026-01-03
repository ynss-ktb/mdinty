/***********************
 * Prayer Times (MDINTY)
 * - City selector
 * - Next prayer + countdown
 * - Local clock
 * - Notification 10 min before
 * - Adhan sound at prayer time
 ***********************/

// ====== SETTINGS ======
const country = "Morocco";
const method = 3;

// المدن اللي عندنا (API names)
const CITY_MAP = {
  "Rabat": "الرباط",
  "Salé": "سلا",
  "Temara": "تمارة"
};

// كم دقيقة قبل الصلاة للتنبيه
const REMIND_MINUTES = 10;

// ====== DOM ======
const cityPill     = document.getElementById("cityPill");
const datesLine    = document.getElementById("datesLine");
const nextTitle    = document.getElementById("nextTitle");
const countdownEl  = document.getElementById("countdown");
const localClockEl = document.getElementById("localClock");
const timesList    = document.getElementById("timesList");
const statusEl     = document.getElementById("status");
const refreshBtn   = document.getElementById("refreshBtn");

// City buttons (must exist in HTML)
const cityButtons = document.querySelectorAll(".city-btn");

// ====== STATE ======
let city = localStorage.getItem("prayerCity") || "Rabat";

let todayTimings = null;
let todayDateObj = null;
let nextPrayer = null; // { key, name, time, dateObj, tomorrow? }

let countdownTimer = null;
let clockTimer = null;
let autoRefreshTimer = null;

// 🔔 notification timers (one for reminder, one for exact prayer)
let reminderTimeout = null;
let prayerTimeout = null;

// 🔊 Audio
let audioEnabled = (localStorage.getItem("adhanAudioEnabled") || "0") === "1";
let audioUnlocked = false;
const adhanAudio = new Audio("audio/adhan.mp3");
adhanAudio.preload = "auto";

// ====== Helpers ======
function pad(n){ return String(n).padStart(2, "0"); }

function cleanTime(t){
  // "05:12 (+01)" -> "05:12"
  return (t || "").split(" ")[0].trim();
}

function toMinutes(hhmm){
  const [h,m] = hhmm.split(":").map(Number);
  return h*60 + m;
}

function formatHijri(h){
  return `${h.day} ${h.month.ar} ${h.year}هـ`;
}

function formatGregorian(g){
  return `${g.day} ${g.month.ar} ${g.year}م`;
}

function getNowHHMM(){
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildDateForTime(hhmm, addDays=0){
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  const [h,m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function computeNextPrayer(timings){
  const order = [
    { key:"Fajr",    name:"الفجر" },
    { key:"Dhuhr",   name:"الظهر" },
    { key:"Asr",     name:"العصر" },
    { key:"Maghrib", name:"المغرب" },
    { key:"Isha",    name:"العشاء" }
  ];

  const now = new Date();
  const nowMins = now.getHours()*60 + now.getMinutes();

  for (const p of order){
    const t = cleanTime(timings[p.key]);
    if(t && toMinutes(t) > nowMins){
      return { ...p, time: t, dateObj: buildDateForTime(t, 0), tomorrow:false };
    }
  }

  // إذا سالاو صلوات اليوم: فجر الغد
  const fajr = cleanTime(timings.Fajr);
  return { key:"Fajr", name:"الفجر", time: fajr || "--:--", dateObj: buildDateForTime(fajr || "00:00", 1), tomorrow:true };
}

function renderTimes(timings, activeKey){
  const rows = [
    { key:"Fajr",    name:"الفجر" },
    { key:"Dhuhr",   name:"الظهر" },
    { key:"Asr",     name:"العصر" },
    { key:"Maghrib", name:"المغرب" },
    { key:"Isha",    name:"العشاء" }
  ];

  if (!timesList) return;
  timesList.innerHTML = "";

  rows.forEach(r => {
    const t = cleanTime(timings[r.key]);
    const div = document.createElement("div");
    div.className = "time-row" + (r.key === activeKey ? " active" : "");
    div.innerHTML = `
      <div class="time-name">${r.name}</div>
      <div class="time-value">${t}</div>
    `;
    timesList.appendChild(div);
  });
}

function setStatus(msg){
  if (statusEl) statusEl.textContent = msg;
}

// ====== Settings UI (creates buttons if not present) ======
function ensureSettingsUI(){
  // نحاول نخلق UI صغير فوق للي ما عندوش HTML ديالو
  const topCard = document.querySelector(".top-card");
  if (!topCard) return;

  let settings = document.getElementById("prayerSettings");
  if (settings) return;

  settings = document.createElement("div");
  settings.id = "prayerSettings";
  settings.style.marginTop = "10px";
  settings.style.display = "flex";
  settings.style.gap = "8px";
  settings.style.flexWrap = "wrap";

  const notifBtn = document.createElement("button");
  notifBtn.id = "enableNotifBtn";
  notifBtn.type = "button";
  notifBtn.textContent = "🔔 تفعيل التنبيهات";
  notifBtn.style.border = "none";
  notifBtn.style.borderRadius = "14px";
  notifBtn.style.padding = "10px 12px";
  notifBtn.style.fontWeight = "900";
  notifBtn.style.cursor = "pointer";
  notifBtn.style.background = "rgba(0,0,0,0.05)";
  notifBtn.style.color = "var(--text)";

  const audioBtn = document.createElement("button");
  audioBtn.id = "toggleAdhanBtn";
  audioBtn.type = "button";
  audioBtn.textContent = audioEnabled ? "🔊 الأذان: مفعّل" : "🔇 الأذان: غير مفعّل";
  audioBtn.style.border = "none";
  audioBtn.style.borderRadius = "14px";
  audioBtn.style.padding = "10px 12px";
  audioBtn.style.fontWeight = "900";
  audioBtn.style.cursor = "pointer";
  audioBtn.style.background = "rgba(0,0,0,0.05)";
  audioBtn.style.color = "var(--text)";

  settings.appendChild(notifBtn);
  settings.appendChild(audioBtn);
  topCard.appendChild(settings);

  // Handlers
  notifBtn.addEventListener("click", async () => {
    await requestNotifications();
    // بعدما يعطينا الإذن نعاود نرسم الجدولة
    scheduleReminderAndAdhan();
  });

  audioBtn.addEventListener("click", async () => {
    audioEnabled = !audioEnabled;
    localStorage.setItem("adhanAudioEnabled", audioEnabled ? "1" : "0");

    // Unlock audio on first user action
    await unlockAudio();

    audioBtn.textContent = audioEnabled ? "🔊 الأذان: مفعّل" : "🔇 الأذان: غير مفعّل";
    scheduleReminderAndAdhan();
  });
}

// 🔊 unlock audio (required by browsers)
async function unlockAudio(){
  if (audioUnlocked) return true;
  try{
    // play silently then pause (some browsers allow)
    adhanAudio.volume = 0;
    await adhanAudio.play();
    adhanAudio.pause();
    adhanAudio.currentTime = 0;
    adhanAudio.volume = 1;
    audioUnlocked = true;
    return true;
  }catch(e){
    // إذا ما بغاش، غادي يتحل غير ملي المستخدم يدير كليك/تفاعل آخر
    audioUnlocked = false;
    return false;
  }
}

// 🔔 Notifications
async function requestNotifications(){
  if (!("Notification" in window)){
    alert("التنبيهات غير مدعومة فهاد المتصفح.");
    return;
  }
  if (Notification.permission === "granted") return;

  const perm = await Notification.requestPermission();
  if (perm !== "granted"){
    alert("خاصك تسمح بالتنبيهات باش نخدمو تذكير قبل الصلاة.");
  }
}

function showNotification(title, body){
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try{
    new Notification(title, { body });
  }catch(e){
    // بعض المتصفحات كتحتاج service worker
  }
}

function clearSchedules(){
  if (reminderTimeout) clearTimeout(reminderTimeout);
  if (prayerTimeout) clearTimeout(prayerTimeout);
  reminderTimeout = null;
  prayerTimeout = null;
}

function scheduleReminderAndAdhan(){
  clearSchedules();
  if (!nextPrayer?.dateObj) return;

  const now = new Date();
  const target = nextPrayer.dateObj;

  // 🔔 reminder time
  const reminderTime = new Date(target.getTime() - REMIND_MINUTES * 60 * 1000);

  // schedule reminder
  const msToReminder = reminderTime - now;
  if (msToReminder > 1000){
    reminderTimeout = setTimeout(() => {
      showNotification(
        "🔔 تذكير الصلاة",
        `باقي ${REMIND_MINUTES} دقائق على صلاة ${nextPrayer.name} (${nextPrayer.time})`
      );
    }, msToReminder);
  }

  // schedule adhan at prayer time
  const msToPrayer = target - now;
  if (msToPrayer > 1000){
    prayerTimeout = setTimeout(async () => {
      // notification at exact time
      showNotification("🕌 دخل وقت الصلاة", `حان وقت صلاة ${nextPrayer.name}`);

      // play adhan (if enabled)
      if (audioEnabled){
        // لازم يكون unlocked
        await unlockAudio();
        try{
          adhanAudio.currentTime = 0;
          await adhanAudio.play();
        }catch(e){
          // إذا منع المتصفح التشغيل، ما يمكنش إلا بتفاعل المستخدم
        }
      }

      // بعد ما تدوز الصلاة، نعاود نحسب ونجدول من جديد
      if (todayTimings){
        nextPrayer = computeNextPrayer(todayTimings);
        updateNextUI();
        scheduleReminderAndAdhan();
      }
    }, msToPrayer);
  }
}

// ====== UI Updates ======
function updateNextUI(){
  if (!nextPrayer) return;

  if (nextTitle){
    nextTitle.textContent = nextPrayer.tomorrow
      ? `الصلاة القادمة: ${nextPrayer.name} • غداً • ${nextPrayer.time}`
      : `الصلاة القادمة: ${nextPrayer.name} • ${nextPrayer.time}`;
  }

  renderTimes(todayTimings, nextPrayer.key);
  updateCountdown(); // immediate refresh
}

function updateCountdown(){
  if (!nextPrayer?.dateObj || !countdownEl) return;

  const now = new Date();
  let diff = nextPrayer.dateObj - now;

  if (diff <= 0){
    // إعادة حساب
    if (todayTimings){
      nextPrayer = computeNextPrayer(todayTimings);
      updateNextUI();
      scheduleReminderAndAdhan();
      diff = nextPrayer.dateObj - now;
    } else {
      diff = 0;
    }
  }

  const totalSec = Math.max(0, Math.floor(diff / 1000));
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;

  countdownEl.textContent = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function startLocalClock(){
  if (!localClockEl) return;

  const tick = () => {
    localClockEl.textContent = `الساعة الآن: ${getNowHHMM()}`;
  };

  tick();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(tick, 1000);
}

// ====== API ======
async function loadPrayerTimes(){
  try{
    setStatus("جاري تحميل المواقيت...");
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
    const res = await fetch(url);
    const json = await res.json();

    if(!json?.data){
      setStatus("تعذر تحميل المواقيت.");
      return;
    }

    todayTimings = json.data.timings;
    todayDateObj = json.data.date;

    // Header
    if (cityPill) cityPill.textContent = CITY_MAP[city] || city;

    if (datesLine){
      datesLine.textContent = `${formatGregorian(todayDateObj.gregorian)} • ${formatHijri(todayDateObj.hijri)}`;
    }

    // Next prayer
    nextPrayer = computeNextPrayer(todayTimings);
    updateNextUI();

    // Schedules (notification + adhan)
    scheduleReminderAndAdhan();

    setStatus("تم تحديث المواقيت.");

  }catch(e){
    setStatus("وقع خطأ أثناء تحميل المواقيت.");
  }
}

// ====== City Selector Wiring ======
function initCitySelector(){
  if (!cityButtons || cityButtons.length === 0) return;

  // set initial active based on saved city
  cityButtons.forEach(btn => {
    const isActive = btn.dataset.city === city;
    btn.classList.toggle("active", isActive);
    if (isActive && cityPill) cityPill.textContent = btn.textContent;
  });

  cityButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // active styles
      cityButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // update city + save
      city = btn.dataset.city;
      localStorage.setItem("prayerCity", city);

      // update pill immediately
      if (cityPill) cityPill.textContent = btn.textContent;

      // reload times
      loadPrayerTimes();
    });
  });
}

// ====== Refresh Button ======
if (refreshBtn){
  refreshBtn.addEventListener("click", loadPrayerTimes);
}

// ====== BOOT ======
ensureSettingsUI();
initCitySelector();
startLocalClock();
loadPrayerTimes();

if (countdownTimer) clearInterval(countdownTimer);
countdownTimer = setInterval(updateCountdown, 1000);

if (autoRefreshTimer) clearInterval(autoRefreshTimer);
autoRefreshTimer = setInterval(loadPrayerTimes, 30 * 60 * 1000);

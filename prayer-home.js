/*
// مواقيت الصلاة للرباط من AlAdhan timingsByCity
// Docs: aladhan.com prayer times API :contentReference[oaicite:1]{index=1}

const city = "Rabat";
const country = "Morocco";
const method = 3; // اختَر طريقة حساب (تقدر تبدّلها لاحقاً)

const elDate = document.getElementById("prayerDate");
const elNext = document.getElementById("prayerNext");
const elRow  = document.getElementById("prayerMiniRow");

function toMinutes(hhmm){
  const [h,m] = hhmm.split(":").map(Number);
  return h*60 + m;
}

function cleanTime(t){
  // بعض الـ APIs كيرجع "05:12 (+01)" كنحيدو اللي بين القوسين
  return (t || "").split(" ")[0].trim();
}

function formatHijri(arHijri){
  // مثال بسيط: 10 جمادى الآخرة 1447
  return `${arHijri.day} ${arHijri.month.ar} ${arHijri.year}هـ`;
}

function formatGregorian(arGreg){
  // مثال: 30 ديسمبر 2025
  return `${arGreg.day} ${arGreg.month.ar} ${arGreg.year}م`;
}

function getNextPrayer(timings){
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
    if(!t) continue;
    if (toMinutes(t) > nowMins){
      return { name:p.name, time:t };
    }
  }

  // إلا سالاو الصلوات ديال اليوم -> رجّع فجر الغد (كنعرضو فقط الاسم/الوقت ديال اليوم)
  const fajr = cleanTime(timings.Fajr);
  return { name:"الفجر", time:fajr || "--:--", tomorrow:true };
}

async function loadPrayerTimes(){
  try{
    elNext.textContent = "جاري تحميل المواقيت...";
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
    const res = await fetch(url);
    const json = await res.json();

    if(!json || !json.data){
      elNext.textContent = "تعذر تحميل المواقيت.";
      return;
    }

    const timings = json.data.timings;
    const hijri = json.data.date.hijri;
    const greg = json.data.date.gregorian;

    // تاريخ أنيق: ميلادي | هجري
    elDate.textContent = `${formatGregorian(greg)} • ${formatHijri(hijri)}`;

    // الصلاة القادمة
    const next = getNextPrayer(timings);
    elNext.textContent = next.tomorrow
      ? `الصلاة القادمة: ${next.name} غداً على ${next.time}`
      : `الصلاة القادمة: ${next.name} على ${next.time}`;

    // صف صغير للأوقات
    const fajr = cleanTime(timings.Fajr);
    const dhuhr = cleanTime(timings.Dhuhr);
    const asr = cleanTime(timings.Asr);
    const maghrib = cleanTime(timings.Maghrib);
    const isha = cleanTime(timings.Isha);

    elRow.innerHTML = `
      <span>الفجر: ${fajr}</span>
      <span>الظهر: ${dhuhr}</span>
      <span>العصر: ${asr}</span>
      <span>المغرب: ${maghrib}</span>
      <span>العشاء: ${isha}</span>
    `;
  } catch (e){
    elNext.textContent = "وقع خطأ أثناء تحميل المواقيت.";
  }
}

loadPrayerTimes();

// تحديث خفيف كل 30 دقيقة
setInterval(loadPrayerTimes, 30 * 60 * 1000);  */

const city = "Rabat";
const country = "Morocco";
const method = 3;

const elDate = document.getElementById("prayerDate");
const elNext = document.getElementById("prayerNext");

function cleanTime(t){
  return (t || "").split(" ")[0].trim();
}

function toMinutes(hhmm){
  const [h,m] = hhmm.split(":").map(Number);
  return h*60 + m;
}

function formatHijri(h){
  return `${h.day} ${h.month.ar} ${h.year}هـ`;
}

function getNextPrayer(timings){
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
      return { name:p.name, time:t, tomorrow:false };
    }
  }

  // إذا سالات صلوات اليوم: رجّع فجر الغد
  const fajr = cleanTime(timings.Fajr);
  return { name:"الفجر", time:fajr || "--:--", tomorrow:true };
}

async function loadPrayer(){
  try{
    elNext.textContent = "جاري تحميل المواقيت...";
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
    const res = await fetch(url);
    const json = await res.json();

    if(!json?.data){
      elNext.textContent = "تعذر تحميل المواقيت.";
      return;
    }

    const timings = json.data.timings;
    const hijri = json.data.date.hijri;

    // التاريخ الهجري فقط
    elDate.textContent = formatHijri(hijri);

    // الصلاة القادمة فقط
    const next = getNextPrayer(timings);
    elNext.textContent = next.tomorrow
      ? `الصلاة القادمة: ${next.name} • غداً • ${next.time}`
      : `الصلاة القادمة: ${next.name} • ${next.time}`;

  }catch(e){
    elNext.textContent = "وقع خطأ أثناء تحميل المواقيت.";
  }
}

loadPrayer();
setInterval(loadPrayer, 30 * 60 * 1000);

const elClock = document.getElementById("localClock");

function getNowTime(){
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function startClock(){
  const tick = () => {
    if (elClock) elClock.textContent = `الساعة الآن: ${getNowTime()}`;
  };
  tick();
  setInterval(tick, 1000);
}

startClock();






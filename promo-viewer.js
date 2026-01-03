const viewer = document.getElementById("promoViewer");
const viewerImg = document.getElementById("viewerImg");
const viewerClose = document.getElementById("viewerClose");
const viewerInner = document.getElementById("viewerInner");

function openViewer(src, alt){
  viewerImg.src = src;
  viewerImg.alt = alt || "عرض";
  viewer.classList.add("open");
  viewer.setAttribute("aria-hidden", "false");

  // رجّع السكرول للبداية باش الصورة تبان مزيان
  viewerInner.scrollTop = 0;
  viewerInner.scrollLeft = 0;

  // منع سكرول الصفحة لتحت
  document.body.style.overflow = "hidden";
}

function closeViewer(){
  viewer.classList.remove("open");
  viewer.setAttribute("aria-hidden", "true");
  viewerImg.src = "";
  document.body.style.overflow = "";
}

// فتح عند الضغط على أي صورة
document.querySelectorAll(".promo-img-click").forEach(img => {
  img.addEventListener("click", () => openViewer(img.src, img.alt));
});

// إغلاق بالزر
viewerClose.addEventListener("click", closeViewer);

// إغلاق عند الضغط خارج الصورة
viewer.addEventListener("click", (e) => {
  // إذا ضغطتي على الخلفية (ماشي الصورة ولا الزر)
  if (e.target === viewer) closeViewer();
});

// إغلاق بـ ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && viewer.classList.contains("open")) closeViewer();
});

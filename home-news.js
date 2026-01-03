const homeNews = [
  { id: 1, title: "طريق تثير احتجاجا في جماعة عامر" },
  { id: 2, title: "مالي ترافق الأسود إلى الثمن" },
  { id: 3, title: "حديقة الحيوانات بالرباط.. ولادة 80 حيوانا نادرا ومهددا بالانقراض" },
  { id: 4, title: "خبر تجريبي 4 (بدّلو بعنوان حقيقي لاحقاً)" },
  { id: 5, title: "خبر تجريبي 5 (بدّلو بعنوان حقيقي لاحقاً)" }
];

const list = document.getElementById("homeNewsList");

if(list){
  list.innerHTML = "";

  homeNews.forEach(item => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `article.html?id=${item.id}`;
    a.textContent = item.title;

    // مهم: باش النقر على العنوان مايفتحش news.html (حيت الكارد فيها onclick)
    a.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    li.appendChild(a);
    list.appendChild(li);
  });
}

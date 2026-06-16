(() => {
  const nav = document.querySelector(".site-header > nav");
  if (!nav) return;

  const links = [...nav.querySelectorAll("a")];
  const activeIndex = Math.max(0, links.findIndex((link) => link.classList.contains("active")));
  nav.style.setProperty("--active-index", activeIndex);
  document.body.classList.add("page-enter");
  document.body.dataset.slideDirection = "forward";

  window.addEventListener("pageshow", () => {
    document.body.classList.remove("page-leaving");
  });

  links.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      if (link.classList.contains("active") || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      nav.style.setProperty("--active-index", index);
      document.body.dataset.slideDirection = index > activeIndex ? "forward" : "back";
      document.body.classList.add("page-leaving");
      window.setTimeout(() => {
        window.location.href = link.href;
      }, 230);
    });
  });
})();

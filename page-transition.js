(() => {
  const localLinks = document.querySelectorAll("a[href]");
  document.documentElement.classList.add("page-ready");

  window.addEventListener("pageshow", () => {
    document.documentElement.classList.remove("page-exit");
  });

  localLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

      const nextUrl = new URL(href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;

      event.preventDefault();
      document.documentElement.classList.add("page-exit");
      window.setTimeout(() => {
        window.location.href = nextUrl.href;
      }, 170);
    });
  });
})();

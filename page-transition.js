(() => {
  const localLinks = document.querySelectorAll("a[href]");
  const isRecordsPage = window.location.pathname.includes("/historic-records/");
  document.documentElement.classList.add(isRecordsPage ? "page-ready-back" : "page-ready-forward");

  window.addEventListener("pageshow", () => {
    document.documentElement.classList.remove("page-exit-forward", "page-exit-back");
  });

  localLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

      const nextUrl = new URL(href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;

      event.preventDefault();
      const goingHome = nextUrl.pathname.replace(/\/$/, "") === "/chicblocko-gun-values";
      document.documentElement.classList.add(goingHome ? "page-exit-back" : "page-exit-forward");
      window.setTimeout(() => {
        window.location.href = nextUrl.href;
      }, 230);
    });
  });
})();

(() => {
  const source = window.CHICBLOCKO_SITE_SECTIONS?.data;
  if (!source) return;

  const badgeSources = {
    check: "assets/team/check-badge.svg",
    code: "assets/team/code-badge.png",
    crown: "assets/team/crown-badge.png",
    link: "assets/team/link-badge.png"
  };

  const cleanText = (value) => String(value || "").trim();
  const normalizeBadges = (value) => Array.isArray(value) ? value.filter(Boolean) : String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

  function safeImage(value) {
    const image = cleanText(value);
    if (!image) return "";
    if (/^(?:assets\/|https:\/\/|data:image\/)/i.test(image) && !image.includes("..")) return image;
    return "";
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function setImageBackground(element, property, image) {
    const src = safeImage(image);
    if (src) element.style.setProperty(property, `url("${src.replace(/"/g, "%22")}")`);
  }

  function appendBadges(parent, badges) {
    for (const badgeName of normalizeBadges(badges)) {
      const src = badgeSources[badgeName];
      if (!src) continue;
      const img = document.createElement("img");
      img.className = "icon-badge";
      img.src = src;
      img.width = 36;
      img.height = 36;
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = `${badgeName} badge`;
      parent.append(img);
    }
  }

  function makeProfileCard(item, { creator = false } = {}) {
    const card = makeElement("article", `profile-card${creator ? " creator-card" : ""}`);
    setImageBackground(card, "--profile-image", item.background || item.avatar);

    const top = makeElement("div", "profile-top");
    const avatar = document.createElement("img");
    avatar.src = safeImage(item.avatar) || "assets/chicblocko-logo.webp";
    avatar.width = creator ? 96 : 82;
    avatar.height = creator ? 96 : 82;
    avatar.loading = "lazy";
    avatar.decoding = "async";
    avatar.alt = cleanText(item.name);

    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.append(document.createTextNode(cleanText(item.name) || "Untitled"));
    appendBadges(title, item.badge);
    const role = makeElement("span", "profile-role", cleanText(item.role));
    copy.append(title, role);
    top.append(avatar, copy);
    card.append(top);

    if (cleanText(item.description)) {
      const description = document.createElement("p");
      description.textContent = cleanText(item.description);
      card.append(description);
    }
    return card;
  }

  function renderContributors() {
    const main = document.querySelector(".team-main");
    const data = source.contributors;
    if (!main || !data?.items?.length) return;

    main.querySelectorAll(".team-section").forEach((section) => section.remove());
    const returnLink = main.querySelector(".return-values");
    const insertBefore = returnLink || null;
    const items = data.items;
    const creator = items.find((item) => item.id === "darriel") || items.find((item) => cleanText(item.role).toLowerCase().includes("creator"));
    const ownerFallbackIds = new Set(["fyn", "run"]);
    const ownerIds = new Set([...(source.owners?.items || []).map((item) => item.id), ...ownerFallbackIds]);
    const contributors = items.filter((item) => item !== creator && !ownerIds.has(item.id));
    const owners = source.owners?.items?.length ? source.owners.items : items.filter((item) => ownerFallbackIds.has(item.id));

    if (creator) {
      const section = makeElement("section", "team-section creator-section");
      section.setAttribute("aria-labelledby", "creator-title");
      const header = makeElement("header", "team-heading");
      header.append(makeElement("h2", "", "CREATOR"), makeElement("p", "", "Creator of the Chicblocko Gun Values index"));
      header.querySelector("h2").id = "creator-title";
      section.append(header, makeProfileCard(creator, { creator: true }));
      main.insertBefore(section, insertBefore);
    }

    const section = makeElement("section", "team-section");
    section.setAttribute("aria-labelledby", "contributors-title");
    const header = makeElement("header", "team-heading");
    header.append(makeElement("h2", "", data.title || "CONTRIBUTORS"), makeElement("p", "", data.subtitle || ""));
    header.querySelector("h2").id = "contributors-title";
    const grid = makeElement("div", "profile-grid contributor-grid");
    contributors.forEach((item) => grid.append(makeProfileCard(item)));
    section.append(header, grid);
    main.insertBefore(section, insertBefore);

    if (owners.length) {
      const ownerSection = makeElement("section", "team-section");
      ownerSection.setAttribute("aria-labelledby", "owners-title");
      const ownerHeader = makeElement("header", "team-heading");
      ownerHeader.append(makeElement("h2", "", source.owners?.title || "GAME OWNERS"), makeElement("p", "", source.owners?.subtitle || "Chicblocko leadership"));
      ownerHeader.querySelector("h2").id = "owners-title";
      const ownerGrid = makeElement("div", "profile-grid contributor-grid");
      owners.forEach((item) => ownerGrid.append(makeProfileCard(item)));
      ownerSection.append(ownerHeader, ownerGrid);
      main.insertBefore(ownerSection, insertBefore);
    }
  }

  function makeRecordCard(item, sectionId) {
    if (sectionId === "most-owned") {
      const isVell = item.id === "vell-most-owned";
      const isCole = item.id === "cole-most-owned";
      const card = makeElement("article", `collector-card ${isVell ? "vell-card" : isCole ? "cole-card" : ""}`.trim());
      if (isVell) card.id = "vellCard";
      if (isCole) card.id = "coleCard";
      card.role = "button";
      card.tabIndex = 0;
      card.setAttribute("aria-haspopup", "dialog");
      card.setAttribute("aria-controls", isVell ? "vellCustomsDialog" : "ownedCustomsDialog");
      const background = makeElement("div", `collector-background${isVell ? " vell-background" : ""}`);
      setImageBackground(background, "--ban-image", item.background || item.avatar);
      background.setAttribute("aria-hidden", "true");
      const content = makeElement("div", "collector-content");
      const profile = makeElement("div", "collector-profile");
      const avatar = document.createElement("img");
      avatar.src = safeImage(item.avatar) || "assets/chicblocko-logo.webp";
      avatar.width = 86;
      avatar.height = 86;
      avatar.loading = "lazy";
      avatar.decoding = "async";
      avatar.alt = cleanText(item.name);
      const copy = document.createElement("div");
      copy.append(makeElement("h3", "", cleanText(item.name)), makeElement("span", "", cleanText(item.stat)));
      profile.append(avatar, copy);
      content.append(profile, makeElement("p", "", cleanText(item.description)), makeElement("span", "collector-open", "VIEW OWNED CUSTOMS"));
      card.append(background, content);
      return card;
    }

    const isPatrol = item.id === "scuba-patrols";
    const card = makeElement("article", `ban-card ${isPatrol ? "stars-card patrol-card" : "staff-week-card"}`);
    if (isPatrol) {
      card.id = "scubaPatrolCard";
      card.role = "button";
      card.tabIndex = 0;
      card.setAttribute("aria-haspopup", "dialog");
      card.setAttribute("aria-controls", "patrolDialog");
    }
    setImageBackground(card, "--ban-image", item.background || item.avatar);
    const avatar = document.createElement("img");
    avatar.src = safeImage(item.avatar) || "assets/chicblocko-logo.webp";
    avatar.width = 86;
    avatar.height = 86;
    avatar.loading = "lazy";
    avatar.decoding = "async";
    avatar.alt = cleanText(item.name);
    const copy = makeElement("div", isPatrol ? "patrol-card-copy" : "");
    copy.append(makeElement("h3", "", cleanText(item.name)), makeElement("span", "", cleanText(item.stat)));
    card.append(avatar, copy);
    if (isPatrol) {
      const action = makeElement("div", "patrol-card-action");
      action.setAttribute("aria-hidden", "true");
      action.append(document.createElement("span"));
      card.append(action);
    }
    return card;
  }

  function renderRecords() {
    const main = document.querySelector(".milestones-main");
    const data = source.records;
    if (!main || !data?.sections?.length || !data?.items?.length) return;
    main.querySelectorAll(".owned-section").forEach((section) => section.remove());
    const hero = main.querySelector(".milestones-hero");
    let anchor = hero?.nextSibling || null;

    for (const recordSection of data.sections) {
      const items = data.items.filter((item) => item.sectionId === recordSection.id);
      if (!items.length) continue;
      const section = makeElement("section", `owned-section ${recordSection.id}-section`);
      const titleId = `${recordSection.id}-title`;
      section.setAttribute("aria-labelledby", titleId);
      const header = makeElement("header", "owned-heading");
      const title = makeElement("h2", "", cleanText(recordSection.title));
      title.id = titleId;
      header.append(title, makeElement("p", "", cleanText(recordSection.subtitle)));
      section.append(header);
      const grid = makeElement("div", recordSection.id === "most-owned" ? "collector-grid" : items.length > 1 ? "banned-grid" : "");
      items.forEach((item) => grid.append(makeRecordCard(item, recordSection.id)));
      section.append(grid);
      main.insertBefore(section, anchor);
    }
  }

  if (document.body.classList.contains("team-page")) renderContributors();
  if (document.body.classList.contains("milestones-page")) renderRecords();
})();

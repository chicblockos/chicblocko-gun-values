(() => {
  const DATABASE_NAME = "chicblocko-custom-editor";
  const STORE_NAME = "site-data";
  const STATE_KEY = "current-listings";
  const card = document.getElementById("coleCard");
  const dialog = document.getElementById("ownedCustomsDialog");
  const closeButton = document.getElementById("closeOwnedCustoms");
  const detailDialog = document.getElementById("recordDetailDialog");
  const detailClose = document.getElementById("closeRecordDetail");
  const detailBack = document.getElementById("recordDetailBack");
  const vellCard = document.getElementById("vellCard");
  const vellDialog = document.getElementById("vellCustomsDialog");
  const vellClose = document.getElementById("closeVellCustoms");
  if (!card || !dialog || !closeButton) return;
  let returnDialog = null;

  const normalizeName = (value) => String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const aliases = {
    "og xmas custom": ["og xmas custom", "xmas 22 custom"],
    "soro custom": ["soro custom", "soro custom red"]
  };

  const readListings = () => new Promise((resolve) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onerror = () => resolve([]);
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        resolve([]);
        return;
      }
      const transaction = database.transaction(STORE_NAME, "readonly");
      const getRequest = transaction.objectStore(STORE_NAME).get(STATE_KEY);
      getRequest.onsuccess = () => resolve(Array.isArray(getRequest.result) ? getRequest.result : []);
      getRequest.onerror = () => resolve([]);
    };
  });

  const applySavedCustoms = async () => {
    const listings = await readListings();
    if (!listings.length) return;

    document.querySelectorAll(".owned-gun-card[data-custom-name]").forEach((gunCard) => {
      const requested = normalizeName(gunCard.dataset.customName);
      const names = aliases[requested] || [requested];
      const listing = listings.find((item) => names.includes(normalizeName(item.name)));
      if (!listing) return;

      const image = gunCard.querySelector(".owned-image img");
      const category = gunCard.querySelector(":scope > span:not(.owned-rank)");
      const title = gunCard.querySelector("h3");
      const model = gunCard.querySelector("p");
      if (image && listing.image && gunCard.dataset.fixedImage !== "true") {
        image.src = listing.image;
        image.alt = listing.name || gunCard.dataset.customName;
        image.style.objectFit = "contain";
        image.style.objectPosition = "center";
      }
      if (category && listing.category) category.textContent = listing.category;
      if (title && listing.name && gunCard.dataset.fixedName !== "true") {
        title.textContent = listing.name.toUpperCase();
      }
      if (model && listing.model) model.textContent = listing.model;
    });
  };

  const openDialog = () => {
    if (dialog.open) return;
    dialog.showModal();
    closeButton.focus();
  };

  const closeDialog = () => {
    if (!dialog.open) return;
    dialog.close();
    card.focus();
  };

  card.addEventListener("click", openDialog);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDialog();
    }
  });
  closeButton.addEventListener("click", closeDialog);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  const openVellDialog = () => {
    if (vellDialog && !vellDialog.open) {
      vellDialog.showModal();
      vellClose?.focus();
    }
  };
  const closeVellDialog = () => {
    if (vellDialog?.open) vellDialog.close();
  };
  vellCard?.addEventListener("click", openVellDialog);
  vellCard?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openVellDialog();
    }
  });
  vellClose?.addEventListener("click", closeVellDialog);
  vellDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeVellDialog();
  });
  vellDialog?.addEventListener("click", (event) => {
    if (event.target === vellDialog) closeVellDialog();
  });
  applySavedCustoms();

  const closeDetail = () => {
    if (!detailDialog?.open) return;
    detailDialog.close();
    if (returnDialog && !returnDialog.open) {
      returnDialog.showModal();
    }
    returnDialog = null;
  };

  document.querySelectorAll(".owned-gun-card").forEach((gunCard) => {
    gunCard.tabIndex = 0;
    gunCard.setAttribute("role", "button");
    const showDetail = () => {
      const image = gunCard.querySelector(".owned-image img");
      document.getElementById("recordDetailImage").src = image.src;
      document.getElementById("recordDetailImage").alt = image.alt;
      document.getElementById("recordDetailCategory").textContent = gunCard.querySelector(":scope > span")?.textContent || "";
      document.getElementById("recordDetailName").textContent = gunCard.querySelector("h3")?.textContent || "";
      document.getElementById("recordDetailModel").textContent = gunCard.querySelector("p")?.textContent || "";
      returnDialog = gunCard.closest("#vellCustomsDialog") || gunCard.closest("#ownedCustomsDialog");
      if (returnDialog?.open) returnDialog.close();
      if (!detailDialog.open) detailDialog.showModal();
    };
    gunCard.addEventListener("click", showDetail);
    gunCard.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showDetail();
      }
    });
  });

  detailClose?.addEventListener("click", closeDetail);
  detailBack?.addEventListener("click", closeDetail);
  detailDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDetail();
  });
  detailDialog?.addEventListener("click", (event) => {
    if (event.target === detailDialog) closeDetail();
  });
})();

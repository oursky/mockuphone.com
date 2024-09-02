import * as autocompletePluginRecentSearchesPkg from "@algolia/autocomplete-plugin-recent-searches";
const { createLocalStorageRecentSearchesPlugin } =
  autocompletePluginRecentSearchesPkg;
import * as autocompleteJsPkg from "@algolia/autocomplete-js";

const ALGOLIA_SEARCH_HISTORY_KEY = "brandModelSearch";
const LOCAL_STORAGE_KEY = `AUTOCOMPLETE_RECENT_SEARCHES:${ALGOLIA_SEARCH_HISTORY_KEY}`;

const { autocomplete } = autocompleteJsPkg;

const NUM_DEFAULT_MODEL_ITEMS_TO_DISPLAY = 0;
const NUM_DEFAULT_BRAND_ITEMS_TO_DISPLAY = 0;
const MAX_SEARCH_HISTORY_ITEM = 5;

function isArray(obj) {
  return Object.prototype.toString.call(obj) === "[object Array]";
}

function appendToLocalStorageRecentSearches(item, type) {
  const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY) ?? "";
  const existing = JSON.parse(existingStr);

  const newHistoryItem = { id: item.id, label: item.name, type };

  if (!isArray(existing)) {
    const newHistory = [newHistoryItem];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
    return;
  }
  const hasDuplicateHistory =
    existing.filter((history) => history.id === item.id).length > 0;
  if (hasDuplicateHistory) {
    const existingWithoutDuplicate = existing.filter(
      (history) => history.id !== item.id,
    );
    const newHistory = [newHistoryItem, ...existingWithoutDuplicate];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
    return;
  }

  const newHistory = [newHistoryItem, ...existing];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
}

function moveOldHistoryToTop(oldHistoryItem) {
  const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
  const existing = JSON.parse(existingStr);
  if (!isArray(existing)) {
    // unexpected, just return
    return;
  }
  const existingWithoutDuplicate = existing.filter(
    (history) => history.id !== oldHistoryItem.id,
  );
  const newHistory = [oldHistoryItem, ...existingWithoutDuplicate];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
}

function injectVariables() {
  return {
    modelItems: window.modelItems,
    brandItems: window.brandItems,
    containerIds: window.containerIds,
  };
}

function initializeAutocomplete(containerId, modelItems, brandItems) {
  const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
    key: ALGOLIA_SEARCH_HISTORY_KEY,
    MAX_SEARCH_HISTORY_ITEM,
    transformSource({ source }) {
      return {
        ...source,
        onSelect({ item }) {
          const { id: itemId, label } = item;
          const type = item.type ?? "";
          moveOldHistoryToTop(item); // move most recent to top
          switch (type) {
            case "model":
              window.location.href = `/model/${itemId}`;
              break;
            case "brand":
              window.location.href = `/type/all/?brand=${itemId}`;
              break;
            default:
              window.location.href = `/type/all/?query=${label}`;
          }
        },
      };
    },
  });
  autocomplete({
    container: `#${containerId}`,
    openOnFocus: true,
    plugins: [recentSearchesPlugin],
    placeholder: "Search Device",
    getSources() {
      return [
        {
          sourceId: "models",
          getItems({ query }) {
            const defaultDisplayItems = modelItems.slice(
              0,
              NUM_DEFAULT_MODEL_ITEMS_TO_DISPLAY,
            );
            const filtered = modelItems.filter((model) => {
              return model.name.toLowerCase().includes(query.toLowerCase());
            });
            return filtered.length > 0 ? filtered : defaultDisplayItems;
          },
          templates: {
            item({ item, html }) {
              return html`<a class="aa-ItemWrapper" href="${item.pathname}"
                >${item.name}</a
              >`;
            },
          },
          onSelect({ item }) {
            appendToLocalStorageRecentSearches(item, "model");
          },
          getItemUrl({ item }) {
            return `${window.location.origin}${item.pathname}`;
          },
        },
        {
          sourceId: "brands",
          getItems({ query }) {
            const defaultDisplayItems = brandItems.slice(
              0,
              NUM_DEFAULT_BRAND_ITEMS_TO_DISPLAY,
            );
            const filtered = brandItems.filter((brand) => {
              return brand.name.toLowerCase().includes(query.toLowerCase());
            });
            return filtered.length > 0 ? filtered : defaultDisplayItems;
          },
          templates: {
            item({ item, components, html }) {
              return html`<a class="aa-ItemWrapper" href="${item.pathname}"
                >${item.name}</a
              >`;
            },
          },
          onSelect({ item }) {
            appendToLocalStorageRecentSearches(item, "brand");
          },
          getItemUrl({ item }) {
            return `${window.location.origin}${item.pathname}`;
          },
        },
      ];
    },
    onSubmit({ state }) {
      window.location.href = `${window.location.origin}/type/all/?query=${state.query}`;
    },
  });
}

function initialize() {
  const { modelItems, brandItems, containerIds } = injectVariables();
  containerIds.forEach((containerId) => {
    initializeAutocomplete(containerId, modelItems, brandItems);
  });

  tippy(".aa-ClearButton", {
    content: "Clear",
    placement: "bottom",
    theme: "light-border",
  });

  const detachedSearchButtonList = document.querySelectorAll(
    ".aa-DetachedSearchButton",
  );
  detachedSearchButtonList.forEach((detachedSearchButton) => {
    detachedSearchButton.addEventListener("click", () => {
      const inputForm = document.querySelector(".aa-Form");

      if (inputForm.querySelector(".aa-DetachedCancelButton") != null) {
        return;
      }
      const newCancelButton = document.createElement("button");
      newCancelButton.type = "button";
      newCancelButton.classList.add("aa-DetachedCancelButton");

      newCancelButton.addEventListener("click", () => {
        // ref https://github.com/algolia/autocomplete/blob/d0b3b27d2d22f06590cef5606062ca0e48c9003f/packages/autocomplete-js/src/__tests__/detached.test.ts#L420
        const detachedContainer = document.querySelector(".aa-DetachedOverlay");
        document.body.removeChild(detachedContainer);
        document.body.classList.remove("aa-Detached");
      });
      inputForm.appendChild(newCancelButton);
    });
  });
}

function ready(fn) {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

function main() {
  initialize();
}

ready(main);

const isDebug = false;
const NUM_DEFAULT_MODEL_ITEMS_TO_DISPLAY = 0;
const NUM_DEFAULT_BRAND_ITEMS_TO_DISPLAY = 0;
const MAX_SEARCH_HISTORY_ITEM = 5;
const ALGOLIA_SEARCH_HISTORY_KEY = "brandModelSearch";
const LOCAL_STORAGE_KEY = `AUTOCOMPLETE_RECENT_SEARCHES:${ALGOLIA_SEARCH_HISTORY_KEY}`;

function ready(fn) {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
ready(main);

class RootViewModel {
  submittedQuery = "";
  selectedBrand = "all";
  _thumbnailList;
  _brandThumbnailList;
  _modelItems;
  _brandItems;

  constructor(thumbnailList, brandThumbnailList, modelItems, brandItems) {
    mobx.makeObservable(this, {
      selectedBrand: mobx.observable,
      submittedQuery: mobx.observable,
      // brandDeviceQueryResult: mobx.computed,
    });
    this._thumbnailList = thumbnailList;
    this._brandThumbnailList = brandThumbnailList;
    this._modelItems = modelItems;
    this._brandItems = brandItems;
  }

  getBrandDeviceQueryResult(brandNodeList, deviceNodeClassName) {
    // if whole-string match brand, return that brand directly
    // otherwise, substring match model name
    const brandMatches = [];
    const deviceMatches = [];

    for (let brandNode of brandNodeList) {
      if (
        brandNode.dataset.brandName.toLowerCase() ===
        this.submittedQuery.toLowerCase()
      ) {
        return {
          matchType: "singleBrandMatch",
          brandId: this.submittedQuery.toLowerCase(),
        };
      }

      let deviceNodes = Array.from(
        brandNode.querySelectorAll(`.${deviceNodeClassName}`),
      );
      const matchedDeviceNodes = deviceNodes.filter((deviceNode) => {
        return deviceNode.dataset.modelName
          .toLowerCase()
          .includes(this.submittedQuery.toLowerCase());
      });
      deviceMatches.push(...matchedDeviceNodes);
      if (matchedDeviceNodes.length > 0) {
        brandMatches.push(brandNode);
      }
    }

    return { matchType: "deviceNameMatch", brandMatches, deviceMatches };
  }
}

function changeToImage(deviceGridNode, index) {
  const currentIndex = Number(deviceGridNode.dataset.imageIndex);
  const imageNodes = deviceGridNode.querySelectorAll(".device-grid__image");
  imageNodes[currentIndex].classList.add("d-none");
  imageNodes[index].classList.remove("d-none");
  deviceGridNode.dataset.imageIndex = index;
}

function changeToNextImage(deviceGridNode) {
  const nImage = Number(deviceGridNode.dataset.nImage);
  const currentIndex = Number(deviceGridNode.dataset.imageIndex);
  const nextIndex = (currentIndex + 1) % nImage;
  changeToImage(deviceGridNode, nextIndex);
}

function makeCycleDeviceImages() {
  let cycle = null;
  return {
    cycle: (deviceGridNode) => {
      if (cycle != null) {
        clearInterval(cycle);
      }
      changeToNextImage(deviceGridNode);
      cycle = setInterval(() => {
        changeToNextImage(deviceGridNode);
      }, 1000);
    },
    uncycle: (deviceGridNode) => {
      if (cycle != null) {
        clearInterval(cycle);
      }
      changeToImage(deviceGridNode, 0);
    },
  };
}

const cycleDeviceImages = makeCycleDeviceImages();

function handleMouseEnterDeviceGrid(e) {
  const hoverBlur = e.target.querySelector(".device-grid__hover-blur");
  const overlay = e.target.querySelector(".device-grid__overlay");
  hoverBlur.classList.remove("d-none");
  overlay.classList.remove("d-none");
  cycleDeviceImages.cycle(e.target);
}

function handleMouseLeaveDeviceGrid(e) {
  const hoverBlur = e.target.querySelector(".device-grid__hover-blur");
  const overlay = e.target.querySelector(".device-grid__overlay");
  hoverBlur.classList.add("d-none");
  overlay.classList.add("d-none");
  cycleDeviceImages.uncycle(e.target);
}

function handleClickBrandLabelBtn(e, viewModel) {
  const brand = e.target.dataset.brandName;
  viewModel.selectedBrand = brand;
}
function handleSelectBrandOption(selectParent, viewModel) {
  const brand = selectParent.value;
  viewModel.selectedBrand = brand;
}

function isArray(obj) {
  return Object.prototype.toString.call(obj) === "[object Array]";
}

function appendToLocalStorageRecentSearches(item, type) {
  const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
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

function initializeSearch(viewModel, containerId) {
  const { autocomplete } = window["@algolia/autocomplete-js"];
  const { createLocalStorageRecentSearchesPlugin } =
    window["@algolia/autocomplete-plugin-recent-searches"];

  const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
    key: ALGOLIA_SEARCH_HISTORY_KEY,
    MAX_SEARCH_HISTORY_ITEM,
    transformSource({ source }) {
      return {
        ...source,
        onSelect({ item }) {
          const { id, label } = item;
          const type = item.type ?? "";
          moveOldHistoryToTop(item); // move most recent to top
          switch (type) {
            case "model":
              window.location.href = `/model/${id}`;
              break;
            case "brand":
              window.location.href = `/type/all/?brand=${id}`;
              break;
            default:
              window.location.href = `/type/all/?query=${label}`;
          }
        },
      };
    },
  });
  autocomplete({
    container: containerId,
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

function handleBrandSearchParams(viewModel) {
  const urlParams = new URLSearchParams(window.location.search);
  const brandParam = urlParams.get("brand");
  if (brandParam != null) {
    viewModel.selectedBrand = brandParam.toLowerCase();
  }
}

function handleQuerySearchParams(viewModel) {
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get("query");
  if (queryParam != null) {
    viewModel.submittedQuery = queryParam;
  }
}

function handleSubmittedQueryChange(viewModel) {
  const allBrandSections = document.querySelectorAll(
    ".device-section-list__item",
  );
  const deviceNodeClassName = "device-grid-container";
  const allDevices = document.querySelectorAll(`.${deviceNodeClassName}`);
  const searchInputs = document.querySelectorAll(".aa-Input");
  mobx.reaction(
    () => viewModel.submittedQuery,
    (query) => {
      if (query == null || query === "") {
        return;
      }

      const result = viewModel.getBrandDeviceQueryResult(
        Array.from(allBrandSections),
        deviceNodeClassName,
      );
      searchInputs.forEach((input) => {
        input.value = query;
      });
      switch (result.matchType) {
        case "singleBrandMatch": {
          viewModel.selectedBrand = result.brandId;
          break;
        }
        case "deviceNameMatch": {
          const brandIdMatches = result.brandMatches.map(
            (node) => node.dataset.brandName,
          );
          const modelIdMatches = result.deviceMatches.map(
            (node) => node.dataset.modelId,
          );
          allBrandSections.forEach((brandSection) => {
            if (brandIdMatches.includes(brandSection.dataset.brandName)) {
              brandSection.classList.remove("d-none");
            } else {
              brandSection.classList.add("d-none");
            }
          });
          allDevices.forEach((device) => {
            if (modelIdMatches.includes(device.dataset.modelId)) {
              device.classList.remove("d-none");
            } else {
              device.classList.add("d-none");
            }
          });
          break;
        }
        default: {
          break; // Do Nothing
        }
      }
    },
  );
}

function main() {
  const deviceGrids = document.querySelectorAll(".device-grid");
  const brands = document.querySelectorAll(".device-brand-list__item-button");
  const brandSelect = document.querySelector("#device-brand-select");

  const viewModel = new RootViewModel(
    window.thumbnailList,
    window.brandThumbnailList,
    window.modelItems,
    window.brandItems,
  );

  [
    "#device-list__header__autocomplete",
    "#device-list__page__autocomplete",
  ].forEach((containerId) => {
    initializeSearch(viewModel, containerId);
  });

  handleSubmittedQueryChange(viewModel);

  mobx.reaction(
    () => viewModel.selectedBrand,
    (selectedBrand, prevBrand) => {
      // check target exist
      const targetBrandListItem = document.querySelector(
        `#device-brand-list__item-button__${selectedBrand}`,
      );

      if (targetBrandListItem == null) {
        viewModel.selectedBrand = prevBrand;
      }
      // Show non-selected styles for all brand tags
      const allBrandListItems = document.querySelectorAll(
        ".device-brand-list__item-button",
      );
      allBrandListItems.forEach((n) =>
        n.classList.remove("device-brand-list__item-button--selected"),
      );

      // Show selected styles for target brand tags
      targetBrandListItem.classList.add(
        "device-brand-list__item-button--selected",
      );

      // Hide all brand sections
      const allBrandSections = document.querySelectorAll(
        ".device-section-list__item",
      );
      allBrandSections.forEach((n) => n.classList.add("d-none"));

      // Show target brand sections
      const targetBrandSections =
        selectedBrand === "all"
          ? allBrandSections
          : [
              document.querySelector(
                `#device-section-list__item-${selectedBrand}`,
              ),
            ];
      targetBrandSections.forEach((n) => {
        n.classList.remove("d-none");

        // Show device children
        const deviceChildren = n.querySelectorAll(".device-grid-container");
        deviceChildren.forEach((n) => n.classList.remove("d-none"));
      });
      brandSelect.value = selectedBrand;
    },
  );

  deviceGrids.forEach((deviceGrid) => {
    deviceGrid.addEventListener("mouseenter", handleMouseEnterDeviceGrid);
    deviceGrid.addEventListener("mouseleave", handleMouseLeaveDeviceGrid);
  });

  brands.forEach((brand) => {
    brand.addEventListener("click", (e) =>
      handleClickBrandLabelBtn(e, viewModel),
    );
  });

  brandSelect.addEventListener("change", () =>
    handleSelectBrandOption(brandSelect, viewModel),
  );

  handleBrandSearchParams(viewModel);
  handleQuerySearchParams(viewModel);
}

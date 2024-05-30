const isDebug = false;
const NUM_DEFAULT_MODEL_ITEMS_TO_DISPLAY = 0;
const NUM_DEFAULT_BRAND_ITEMS_TO_DISPLAY = 0;

function ready(fn) {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
ready(main);

class RootViewModel {
  searchText = "";
  selectedBrand = "all";
  _deviceList;
  _brandDeviceList;
  _modelItems;
  _brandItems;

  constructor(deviceList, brandDeviceList, modelItems, brandItems) {
    mobx.makeObservable(this, {
      searchText: mobx.observable,
      selectedBrand: mobx.observable,
      shouldShowSearchClear: mobx.computed,
    });
    this._deviceList = deviceList;
    this._brandDeviceList = brandDeviceList;
    this._modelItems = modelItems;
    this._brandItems = brandItems;
  }

  get shouldShowSearchClear() {
    return this.searchText !== "";
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

function handleSearchInput(viewModel) {
  // both inputs: header for lg-screen & top-of-page for sm-screen
  const searchInputList = document.querySelectorAll(".aa-Input");
  searchInputList.forEach((searchInput) => {
    searchInput.addEventListener("input", (e) => {
      viewModel.searchText = e.target.value;
    });
  });
}

function initializeSearch(viewModel, containerId) {
  const { autocomplete } = window["@algolia/autocomplete-js"];
  autocomplete({
    container: containerId,
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
          getItemUrl({ item }) {
            return `${window.location.origin}${item.pathname}`;
          },
        },
      ];
    },
  });

  handleSearchInput(viewModel);

  tippy(".aa-ClearButton", {
    content: "Clear",
    placement: "bottom",
    theme: "light-border",
  });
}

function main() {
  const deviceGrids = document.querySelectorAll(".device-grid");
  const brands = document.querySelectorAll(".device-brand-list__item-button");
  const brandSelect = document.querySelector("#device-brand-select");

  const viewModel = new RootViewModel(
    window.deviceList,
    window.brandDeviceList,
    window.modelItems,
    window.brandItems,
  );

  [
    "#device-list__header__autocomplete",
    "#device-list__page__autocomplete",
  ].forEach((containerId) => {
    initializeSearch(viewModel, containerId);
  });

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
      targetBrandSections.forEach((n) => n.classList.remove("d-none"));
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

  const urlParams = new URLSearchParams(window.location.search);
  const brandParam = urlParams.get("brand");

  if (brandParam != null) {
    viewModel.selectedBrand = brandParam;
  }
}

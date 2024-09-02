class RootViewModel {
  submittedQuery = "";
  selectedBrand = "all";
  _thumbnailList;
  _brandThumbnailList;

  constructor(thumbnailList, brandThumbnailList) {
    mobx.makeObservable(this, {
      selectedBrand: mobx.observable,
      submittedQuery: mobx.observable,
      // brandDeviceQueryResult: mobx.computed,
    });
    this._thumbnailList = thumbnailList;
    this._brandThumbnailList = brandThumbnailList;
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
  );

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

function ready(fn) {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
ready(main);

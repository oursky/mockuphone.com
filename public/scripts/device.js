const isDebug = true;

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
  shouldShowSearchSuggestionList = false;
  shouldShowFullscreenSearchOnBelowLg = false;
  selectedBrand = "all";
  _deviceList;
  _brandDeviceList;

  constructor(deviceList, brandDeviceList) {
    mobx.makeObservable(this, {
      searchText: mobx.observable,
      shouldShowSearchSuggestionList: mobx.observable,
      shouldShowFullscreenSearchOnBelowLg: mobx.observable,
      selectedBrand: mobx.observable,
    });
    this._deviceList = deviceList;
    this._brandDeviceList = brandDeviceList;
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

function main() {
  const deviceGrids = document.querySelectorAll(".device-grid");
  const brands = document.querySelectorAll(".device-brand-list__item-button");

  const viewModel = new RootViewModel(
    window.deviceList,
    window.brandDeviceList,
  );
  if (isDebug) {
    window.viewModel = viewModel;
  }

  mobx.reaction(
    () => viewModel.selectedBrand,
    (selectedBrand) => {
      // Show non-selected styles for all brand tags
      const allBrandListItems = document.querySelectorAll(
        ".device-brand-list__item-button",
      );
      allBrandListItems.forEach((n) =>
        n.classList.remove("device-brand-list__item-button--selected"),
      );

      // Show selected styles for target brand tags
      const targetBrandListItem = document.querySelector(
        `#device-brand-list__item-button__${selectedBrand}`,
      );

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
}

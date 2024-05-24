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
  _deviceList;

  constructor(deviceList) {
    mobx.makeObservable(this, {
      searchText: mobx.observable,
      shouldShowSearchSuggestionList: mobx.observable,
      shouldShowFullscreenSearchOnBelowLg: mobx.observable,
      suggestedDeviceList: mobx.computed,
      shouldShowSearchClear: mobx.computed,
    });
    this._deviceList = deviceList;
  }

  get suggestedDeviceList() {
    const targetText = this.searchText.toLowerCase().replace(/\s/g, "");
    return this._deviceList.filter(({ name }) => {
      return name.toLowerCase().replace(/\s/g, "").includes(targetText);
    });
  }

  get shouldShowSearchClear() {
    return this.searchText.trim().length > 0;
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

function main() {
  const deviceGrids = document.querySelectorAll(".device-grid");

  const viewModel = new RootViewModel(window.deviceList);
  if (isDebug) {
    window.viewModel = viewModel;
  }

  deviceGrids.forEach((deviceGrid) => {
    deviceGrid.addEventListener("mouseenter", handleMouseEnterDeviceGrid);
    deviceGrid.addEventListener("mouseleave", handleMouseLeaveDeviceGrid);
  });
}

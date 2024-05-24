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
  const searchInput = document.querySelector(".select-device__search-input");
  const searchClearBtn = document.querySelector(
    ".select-device__search-clear-btn",
  );
  const searchSuggestionList = document.querySelector(".suggestion-list");
  const fullscreenSearch = document.querySelector(".fullscreen-search");
  const fullscreenSearchInput = document.querySelector(
    ".fullscreen-search__search-input",
  );
  const fullscreenSearchCancelBtn = document.querySelector(
    ".fullscreen-search__search-cancel-btn",
  );
  const fullscreenSearchSuggestionList = document.querySelector(
    ".fullscreen-suggestion-list",
  );
  const deviceTagList = document.querySelector(".device-tag-list");
  const deviceSectionList = document.querySelector(".device-section-list");
  const deviceGrids = document.querySelectorAll(".device-grid");

  const viewModel = new RootViewModel(window.deviceList);
  if (isDebug) {
    window.viewModel = viewModel;
  }

  deviceGrids.forEach((deviceGrid) => {
    deviceGrid.addEventListener("mouseenter", handleMouseEnterDeviceGrid);
    deviceGrid.addEventListener("mouseleave", handleMouseLeaveDeviceGrid);
  });

  searchInput.addEventListener("input", (e) => {
    viewModel.searchText = e.target.value;
  });

  searchInput.addEventListener("click", (e) => {
    viewModel.shouldShowFullscreenSearchOnBelowLg = true;
  });

  searchInput.addEventListener("focus", (e) => {
    viewModel.shouldShowSearchSuggestionList = true;
  });

  searchInput.addEventListener("blur", (e) => {
    // allow click suggestion list before dismissing the list
    setTimeout(() => {
      viewModel.shouldShowSearchSuggestionList = false;
    }, 200);
  });

  // finish input
  searchInput.addEventListener("change", (e) => {
    viewModel.shouldShowSearchSuggestionList = false;
    viewModel.shouldShowFullscreenSearchOnBelowLg = false;
  });

  searchClearBtn.addEventListener("click", () => {
    viewModel.searchText = "";
  });

  searchSuggestionList.addEventListener("click", (e) => {
    viewModel.searchText = e.target.innerText;
  });

  fullscreenSearchInput.addEventListener("input", (e) => {
    viewModel.searchText = e.target.value;
  });

  fullscreenSearchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      viewModel.shouldShowFullscreenSearchOnBelowLg = false;
      viewModel.shouldShowSearchSuggestionList = false;
      e.target.blur();
    }
  });

  fullscreenSearchCancelBtn.addEventListener("click", () => {
    viewModel.shouldShowFullscreenSearchOnBelowLg = false;
    viewModel.shouldShowSearchSuggestionList = false;
    viewModel.searchText = "";
  });

  fullscreenSearchSuggestionList.addEventListener("click", (e) => {
    viewModel.shouldShowFullscreenSearchOnBelowLg = false;
    viewModel.shouldShowSearchSuggestionList = false;
    viewModel.searchText = e.target.innerText;
  });

  // observe viewModel: searchText, suggestedDeviceList
  mobx.autorun(() => {
    const searchText = viewModel.searchText;
    const suggestedDeviceList = viewModel.suggestedDeviceList;
    const suggestedDeviceIds = suggestedDeviceList.map((device) => device.id);

    // update search input
    searchInput.value = searchText;
    fullscreenSearchInput.value = searchText;

    // update device tag list
    const deviceTagNodes = Array.from(deviceTagList.children);
    deviceTagNodes.forEach((deviceTagNode) => {
      const deviceId = deviceTagNode.dataset.deviceId;
      if (suggestedDeviceIds.includes(deviceId)) {
        deviceTagNode.classList.remove("d-none");
      } else {
        deviceTagNode.classList.add("d-none");
      }
    });

    // // update device section list
    // const deviceSectionListItemNodes = Array.from(deviceSectionList.children);
    // deviceSectionListItemNodes.forEach((deviceSectionListItemNode) => {
    //   if (
    //     deviceSectionListItemNode.classList.contains(
    //       "device-section-list__request-device",
    //     )
    //   ) {
    //     return;
    //   }
    //   const deviceId = deviceSectionListItemNode.dataset.deviceId;
    //   if (suggestedDeviceIds.includes(deviceId)) {
    //     deviceSectionListItemNode.classList.remove("d-none");
    //   } else {
    //     deviceSectionListItemNode.classList.add("d-none");
    //   }
    // });

    // update search suggestion list
    const suggestionNodes = Array.from(searchSuggestionList.children);
    suggestionNodes.forEach((suggestionNode) => {
      const deviceId = suggestionNode.dataset.deviceId;
      if (suggestedDeviceIds.includes(deviceId)) {
        suggestionNode.classList.remove("d-none");
      } else {
        suggestionNode.classList.add("d-none");
      }
    });

    // update fullscreen search suggestion list
    const fullscreenSuggestionNodes = Array.from(
      fullscreenSearchSuggestionList.children,
    );
    fullscreenSuggestionNodes.forEach((suggestionNode) => {
      const deviceId = suggestionNode.dataset.deviceId;
      if (suggestedDeviceIds.includes(deviceId)) {
        suggestionNode.classList.remove("d-none");
      } else {
        suggestionNode.classList.add("d-none");
      }
    });
  });

  // observer viewModel: shouldShowSearchClear
  mobx.autorun(() => {
    if (viewModel.shouldShowSearchClear) {
      searchClearBtn.classList.remove("d-none");
    } else {
      searchClearBtn.classList.add("d-none");
    }
  });

  // observer viewModel: shouldShowSearchSuggestionList
  mobx.autorun(() => {
    if (viewModel.shouldShowSearchSuggestionList) {
      searchSuggestionList.classList.remove("d-none");
    } else {
      searchSuggestionList.classList.add("d-none");
    }
  });

  // observer viewModel: shouldShowFullscreenSearchOnBelowLg
  mobx.autorun(() => {
    if (viewModel.shouldShowFullscreenSearchOnBelowLg && screen.width < 992) {
      fullscreenSearch.classList.remove("d-none");
      setTimeout(() => {
        fullscreenSearchInput.focus();
      }, 100);
      document.body.classList.add("body--modal-open");
    } else {
      fullscreenSearch.classList.add("d-none");
      document.body.classList.remove("body--modal-open");
    }
  });
}

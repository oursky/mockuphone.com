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

  constructor() {
    mobx.makeObservable(this, {
      searchText: mobx.observable,
      shouldShowSearchClear: mobx.computed,
    });
  }

  get shouldShowSearchClear() {
    return this.searchText !== "";
  }
}

function handleSearchInput(viewModel) {
  const searchInput = document.querySelector(".search-device__input");
  searchInput.addEventListener("input", (e) => {
    viewModel.searchText = e.target.value;
  });

  const searchContainer = document.querySelector(".search-device__container");
  searchContainer.addEventListener("click", () => {
    searchInput.focus();
  });
}

function handleSearchClearBtn(viewModel) {
  const searchInput = document.querySelector(".search-device__input");
  const searchClearBtn = document.querySelector(".search-device__clear-btn");
  searchClearBtn.addEventListener("click", () => {
    viewModel.searchText = "";
  });

  mobx.reaction(
    () => viewModel.searchText,
    () => {
      searchInput.value = viewModel.searchText;
      if (viewModel.shouldShowSearchClear) {
        searchClearBtn.classList.remove("d-none");
      } else {
        searchClearBtn.classList.add("d-none");
      }
    },
  );

  tippy("[data-tippy-content]", {
    placement: "bottom",
    theme: "light-border",
  });
}

function main() {
  const viewModel = new RootViewModel();

  handleSearchInput(viewModel);
  handleSearchClearBtn(viewModel);
}

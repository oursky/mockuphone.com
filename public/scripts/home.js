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
  _brandThumbnailList;

  constructor(brandThumbnailList) {
    mobx.makeObservable(this, {
      searchText: mobx.observable,
      shouldShowSearchClear: mobx.computed,
    });
    this._brandThumbnailList = brandThumbnailList;
  }

  get shouldShowSearchClear() {
    return this.searchText !== "";
  }
}

function handleSearchInput(viewModel) {
  const searchInput = document.querySelector(".aa-Input");
  searchInput.addEventListener("input", (e) => {
    viewModel.searchText = e.target.value;
  });
}

function initializeAutocomplete(viewModel) {
  const { autocomplete } = window["@algolia/autocomplete-js"];
  autocomplete({
    container: "#homepage-autocomplete",
    placeholder: "Search Device",
    // FIXME: provide real sources
    getSources() {
      return [
        {
          sourceId: "products",
          getItems() {
            return [{ name: "a" }, { name: "b" }];
          },
          templates: {
            item({ item, components, html }) {
              return html`<a
                class="aa-ItemWrapper"
                href="http://localhost:3000/model/iphone-14/color/blue"
              >
                ${item.name}
              </a>`;
            },
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
  const viewModel = new RootViewModel(window.brandThumbnailList);
  initializeAutocomplete(viewModel);
}

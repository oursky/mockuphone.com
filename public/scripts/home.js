const NUM_DEFAULT_ITEMS_TO_DISPLAY = 7;

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
  _modelItems;

  constructor(modelItems, brandThumbnailList) {
    mobx.makeObservable(this, {
      searchText: mobx.observable,
      shouldShowSearchClear: mobx.computed,
    });
    this._brandThumbnailList = brandThumbnailList;
    this._modelItems = modelItems;
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

  const modelItems = viewModel._modelItems;

  autocomplete({
    container: "#homepage-autocomplete",
    placeholder: "Search Device",
    getSources() {
      return [
        {
          sourceId: "models",
          getItems({ query }) {
            const defaultDisplayItems = modelItems.slice(
              0,
              NUM_DEFAULT_ITEMS_TO_DISPLAY,
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
        },
        {
          sourceId: "brands",
          getItems() {
            return [{ name: "apple" }];
          },
          templates: {
            item({ item, components, html }) {
              return html`<a class="aa-ItemWrapper">${item.name}</a>`;
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
  const viewModel = new RootViewModel(
    window.modelItems,
    window.brandThumbnailList,
  );
  initializeAutocomplete(viewModel);
}

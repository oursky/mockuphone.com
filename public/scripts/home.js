const NUM_DEFAULT_MODEL_ITEMS_TO_DISPLAY = 7;
const NUM_DEFAULT_BRAND_ITEMS_TO_DISPLAY = 1;

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
  _modelItems;
  _brandItems;

  constructor(modelItems, brandItems) {
    mobx.makeObservable(this, {
      searchText: mobx.observable,
      shouldShowSearchClear: mobx.computed,
    });
    this._modelItems = modelItems;
    this._brandItems = brandItems;
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
  const brandItems = viewModel._brandItems;

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
    window.brandItems,
    window.brandThumbnailList,
  );
  initializeAutocomplete(viewModel);
}

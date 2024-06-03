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
function main() {
  const viewModel = new RootViewModel(window.modelItems, window.brandItems);
  initializeAutocomplete(viewModel);
}

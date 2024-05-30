import { BrandEnum, ModelEnum } from "../parse";

export interface AlgoliaSource<TItem extends AlgoliaItem = AlgoliaItem> {
  sourceId: string;
  items: Array<TItem>;
  templates: {
    item: ({ item, components, html }: any) => any; // FIXME: confirm `item` fn type
  };
}

export interface AlgoliaItem {
  id: string;
  name: string;
  pathname: string;
}

export interface BrandItem extends AlgoliaItem {
  id: BrandEnum;
  name: string;
  pathname: string;
}

export interface ModelItem extends AlgoliaItem {
  id: ModelEnum;
  name: string;
  pathname: string;
}

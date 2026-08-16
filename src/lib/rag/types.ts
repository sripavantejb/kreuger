export type KnowledgeSource =
  | "product"
  | "quotation"
  | "sales_order"
  | "order"
  | "alert"
  | "department"
  | "settings"
  | "manpower"
  | "docs";

export type PreparedChunk = {
  source: KnowledgeSource;
  sourceId?: string;
  title: string;
  content: string;
};

/** Supported field value types across all pages. */
export type FieldType =
  | "text"
  | "number"
  | "date"
  | "url"
  | "boolean"
  | "tag-list"
  | "pricing-plans";

/** A single column definition, unified from gpu-fields / model-fields / agent-tool-fields. */
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  visible: boolean;
  /** gpu-fields: column is computed at runtime (e.g. pricePerGb). */
  derived?: boolean;
  /** Enable heatmap bar rendering for this column. */
  heatmap?: boolean;
  /** Invert the heatmap color direction (lower = better, e.g. price). */
  inverseHeatmap?: boolean;
  /** External URL shown as 🔗 icon in table header (model/agent-tool fields). */
  source?: string;
  /** CSS class group for tag-list fields. */
  tagGroup?: string;
  /** Prefix string for display (e.g. currency symbol). */
  displayPrefix?: string;
  /** Tooltip description shown on hover. */
  description?: string;
}

/** Shape of gpu-fields.json */
export interface GpuFieldConfig {
  fieldDefs: FieldDef[];
  fieldOrder: string[];
  defaultVisibleKeys: string[];
}

/** Shape of model-fields.json and agent-tool-fields.json */
export interface RichFieldConfig {
  fields: FieldDef[];
  vendorLinks: Record<string, string>;
}

/** Normalized page config consumed by flat-table controllers. */
export interface FlatPageConfig {
  fields: FieldDef[];
  defaultVisibleKeys: string[];
  vendorLinks: Record<string, string>;
}

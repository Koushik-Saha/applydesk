import type { AtsType } from "../schemas/job";

export type { AtsType };

export interface ExtractedJob {
  title: string;
  company: string;
  location?: string;
  description: string;
  url: string;
  atsType: AtsType;
}

export type ExtractorFn = (doc: Document, url?: string) => Partial<ExtractedJob> | null;

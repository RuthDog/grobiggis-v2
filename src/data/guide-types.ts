export type GuideSourceKind = "myndighetsfakta" | "etablerad odlingserfarenhet";

export interface GuideSource {
  title: string;
  publisher: string;
  url: string;
  accessedAt: string;
  kind: GuideSourceKind;
}

export interface GuideSection {
  id: string;
  heading: string;
  paragraphs: string[];
  steps?: string[];
}

export interface KnowledgeGuide {
  id: string;
  slug: string;
  title: string;
  intro: string;
  category: string;
  audience: string;
  reviewedAt: string;
  sections: GuideSection[];
  relatedPlants: string[];
  relatedEvents: string[];
  sources: GuideSource[];
  caution?: string;
  version: number;
}

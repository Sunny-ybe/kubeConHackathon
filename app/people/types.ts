// Shapes shared by the people-card server actions and pages.
export type Card = {
  id: string;
  name: string;
  company: string;
  role: string;
  about: string;
  links: string[];
  created_at: string;
  /** ES highlight fragments with <em> marks, best first. */
  highlights?: string[];
};

export type CardStats = {
  total: number;
  companies: { key: string; label: string; count: number }[];
  themes: string[];
};

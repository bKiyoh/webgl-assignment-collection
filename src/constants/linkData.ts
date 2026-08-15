export type PageLink = {
  path: string;
  name: string;
  hasAction: boolean;
};

export const LINK_DATA: PageLink[] = [
  { path: "/", name: "Top", hasAction: true },
  { path: "/vol1", name: "Vol.1 2024/05/11", hasAction: true },
  { path: "/vol2", name: "Vol.2 2024/05/25", hasAction: false },
  { path: "/vol3", name: "Vol.3 2024/06/08", hasAction: true },
  { path: "/vol4", name: "Vol.4 2024/06/22", hasAction: true },
  { path: "/vol5", name: "Vol.5 2024/07/06", hasAction: false },
  { path: "/vol6", name: "Vol.6 2024/07/21", hasAction: false },
  { path: "/vol7", name: "Vol.7 2024/08/03", hasAction: false },
  { path: "/vol8", name: "Vol.8 2024/08/24", hasAction: false },
];

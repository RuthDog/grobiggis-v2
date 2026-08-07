export const normalizeSearchText = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

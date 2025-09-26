export interface ParsedName {
  firstname: string;
  lastname: string;
  username: string;
}
/**
 * Parses a full name into firstname, lastname, and generates a username
 */
export const parseName = (aName: string): ParsedName | null => {
  if (aName.toLocaleLowerCase() === "elias abrache") {
    return {
      firstname: "elias",
      lastname: "abrache",
      username: "elias",
    };
  }

  function normalizeUsername(name: string) {
    return name
      .normalize("NFD") // decompose accents
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .replace(/[^a-zA-Z0-9_-]/g, "") // keep only safe chars
      .toLowerCase();
  }

  const firstname = String(aName).split(" ")[0] || "";
  const lastname = String(aName).split(" ")[1] || "";

  if (!firstname.length || !lastname.length) {
    return null;
  }

  const username = firstname.toLowerCase() + lastname.slice(0, 1).toLowerCase();

  return {
    firstname,
    lastname,
    username: normalizeUsername(username),
  };
};

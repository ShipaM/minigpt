//class-transformer helpers shared by DTOs.
export const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

//Emails are compared case-insensitively, so they are stored and looked up in lower case.
export const normalizeEmail = ({ value }: { value: unknown }): unknown => {
  const trimmed = trimString({ value });
  return typeof trimmed === 'string' ? trimmed.toLowerCase() : trimmed;
};

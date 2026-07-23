import { capitalizeWords } from "#/utils/stringFunctions";
import {
  mediaTypeEnumValues,
  statusEnumValues,
  visibilityEnumValues,
} from "@media-voyage/shared/userMediaSchema";

/**
 * Turn an enum value list into Mantine `Select` option objects with
 * human-readable labels. Keeps the `{ value, label }` shape (and the
 * capitalizeWords labelling) consistent everywhere a media enum is offered
 * as a dropdown.
 */
export function toSelectOptions<T extends string>(values: readonly T[]) {
  return values.map((value) => ({ value, label: capitalizeWords(value) }));
}

export const statusOptions = toSelectOptions(statusEnumValues);
export const mediaTypeOptions = toSelectOptions(mediaTypeEnumValues);
export const visibilityOptions = toSelectOptions(visibilityEnumValues);

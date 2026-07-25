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

type Visibility = (typeof visibilityEnumValues)[number];

/**
 * Narrows an arbitrary string (e.g. `session.user.defaultVisibility`, which is
 * typed as a plain string by better-auth) to a real visibility value.
 */
export function toVisibility(value: string | null | undefined): Visibility {
  return visibilityEnumValues.includes(value as Visibility)
    ? (value as Visibility)
    : "private";
}

import { createFormContext } from "@mantine/form";
import type { UserMediaFormSchema } from "@media-voyage/shared/api";
import { createContext } from "react";

export const ADD_MEDIA_FORM_ID = "add-media-form";

export function getUpdateMediaFormId(id: string) {
  return `update-media-form-${id.toLowerCase()}`;
}

export type MediaFormStatus = { formId: string; isPending: boolean };

export const SetMediaFormStatusContext = createContext<
  ((status: MediaFormStatus | null) => void) | null
>(null);

export const [FormProvider, useFormContext, useForm] =
  createFormContext<UserMediaFormSchema>();

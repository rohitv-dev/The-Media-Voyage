import { createFormContext } from "@mantine/form";
import type { UserMediaFormSchema } from "@media-voyage/shared/api";

export const [FormProvider, useFormContext, useForm] =
  createFormContext<UserMediaFormSchema>();

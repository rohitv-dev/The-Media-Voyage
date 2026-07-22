import dayjs from "dayjs";

export function capitalizeWords(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatMonthLabel(month: string): string {
  // Appending a local-time marker (instead of parsing "YYYY-MM" as a
  // date-only string) avoids dayjs/Date treating it as UTC midnight, which
  // can roll back to the previous month once formatted in the local timezone.
  return dayjs(`${month}-01T00:00:00`).format("MMM YYYY");
}

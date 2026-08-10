import type { MediaRecord, SourceMediaRecord } from "@media-voyage/shared/api";
import {
  IconBook,
  IconDeviceGamepad2,
  IconDeviceTv,
  IconMovie,
} from "@tabler/icons-react";
import { capitalizeWords } from "#/utils/strings";

const mediaSourceLabels: Record<string, string> = {
  db: "Catalog",
  tmdb_movie: "TMDB",
  tmdb_tv: "TMDB",
  igdb: "IGDB",
  open_library: "Open Library",
};

export function getMediaSourceLabel(source: SourceMediaRecord["source"]) {
  return mediaSourceLabels[source] ?? capitalizeWords(source);
}

export function getStatusColor(status: MediaRecord["status"]) {
  switch (status) {
    case "completed":
      return "green";
    case "in_progress":
      return "blue";
    case "planned":
      return "orange";
    case "dropped":
      return "red";
    case "on_hold":
      return "yellow";
    case "revisiting":
      return "violet";
  }
}

export function getTypeColor(type: MediaRecord["type"]) {
  switch (type) {
    case "movie":
      return "pink";
    case "show":
      return "cyan";
    case "game":
      return "teal";
    case "book":
      return "indigo";
  }
}

export function getTypeIcon(type: MediaRecord["type"]) {
  switch (type) {
    case "movie":
      return <IconMovie size={18} />;
    case "show":
      return <IconDeviceTv size={18} />;
    case "game":
      return <IconDeviceGamepad2 size={18} />;
    case "book":
      return <IconBook size={18} />;
  }
}

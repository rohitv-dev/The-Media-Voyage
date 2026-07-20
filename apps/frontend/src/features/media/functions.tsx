import type { MediaRecord } from "@media-voyage/shared/api";
import type { Status } from "@media-voyage/shared/userMediaSchema";
import { IconMovie, IconDeviceTv, IconDeviceGamepad2, IconBook } from "@tabler/icons-react";

export function getStatusColor(status: Status) {
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
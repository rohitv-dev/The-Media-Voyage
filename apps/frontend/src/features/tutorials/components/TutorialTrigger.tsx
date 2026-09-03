import { ActionIcon, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

type TutorialTriggerProps = {
  label: string;
  onClick: () => void;
};

export function TutorialTrigger({ label, onClick }: TutorialTriggerProps) {
  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        type="button"
        variant="subtle"
        color="gray"
        size="lg"
        aria-label={label}
        onClick={onClick}
      >
        <IconInfoCircle size={19} />
      </ActionIcon>
    </Tooltip>
  );
}

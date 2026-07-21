import { UnstyledButton, Group } from "@mantine/core";
import { IconChevronDown, type ReactNode } from "@tabler/icons-react";
import { SectionHeading } from "./SectionHeading";

type CollapsibleSectionHeadingProps = {
  icon: ReactNode;
  title: string;
  description: string;
  opened: boolean;
  onToggle: () => void;
}

export function CollapsibleSectionHeading({
  icon,
  title,
  description,
  opened,
  onToggle,
}: CollapsibleSectionHeadingProps) {
  const heading = (
    <SectionHeading
      icon={icon}
      title={title}
      description={description}
    />
  );

  return (
    <>
      <UnstyledButton
        hiddenFrom="sm"
        w="100%"
        onClick={onToggle}
        aria-expanded={opened}
      >
        <Group justify="space-between" wrap="nowrap" gap="sm">
          {heading}
          <IconChevronDown
            size={18}
            style={{
              flexShrink: 0,
              transform: opened ? "rotate(180deg)" : undefined,
            }}
          />
        </Group>
      </UnstyledButton>

      <Group visibleFrom="sm">{heading}</Group>
    </>
  );
}
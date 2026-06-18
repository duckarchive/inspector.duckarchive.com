"use client";

import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";

interface EditCellProps {
  hasPending: boolean;
  onEdit: () => void;
  label?: string;
  color?: "default" | "primary";
}

/**
 * Action cell for editor tables. When the instance has an unresolved action,
 * the edit button is replaced with a "pending" chip so it cannot be edited
 * until the queued action is resolved.
 */
const EditCell: React.FC<EditCellProps> = ({ hasPending, onEdit, label = "Редагувати", color = "default" }) =>
  hasPending ? (
    <Chip size="sm" color="warning" variant="flat">
      Очікує дію
    </Chip>
  ) : (
    <Button size="sm" color={color} onPress={onEdit}>
      {label}
    </Button>
  );

export default EditCell;

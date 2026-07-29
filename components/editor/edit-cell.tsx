"use client";

import { Button } from "@heroui/button";
import { FaClock, FaPen } from "react-icons/fa";

interface EditCellProps {
  hasPending: boolean;
  onEdit: () => void;
  color?: "default" | "primary";
}

/**
 * Action cell for editor tables. When the instance has an unresolved action,
 * the edit button is replaced with a "pending" chip so it cannot be edited
 * until the queued action is resolved.
 */
const EditCell: React.FC<EditCellProps> = ({ hasPending, onEdit, color = "default" }) => (
  <Button isIconOnly size="sm" color={color} onPress={onEdit} disabled={hasPending} isDisabled={hasPending}>
    {hasPending ? <FaClock /> : <FaPen />}
  </Button>
);

export default EditCell;

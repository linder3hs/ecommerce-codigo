import { Badge } from "@/components/ui/badge";

export function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "secondary" : "outline"}>
      {isActive ? "Activo" : "Inactivo"}
    </Badge>
  );
}

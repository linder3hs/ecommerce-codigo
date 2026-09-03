import { Badge } from "@/components/ui/badge";

export function CategoryStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "secondary" : "outline"}>
      {isActive ? "Activa" : "Inactiva"}
    </Badge>
  );
}

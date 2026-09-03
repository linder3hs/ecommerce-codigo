"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ACTION_OPTIONS, ENTITY_TYPE_OPTIONS } from "../constants";

import type { AuditLogActor } from "../types/audit-log";

type AuditLogsToolbarProps = {
  entityType: string;
  onEntityTypeChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  actor: AuditLogActor | null;
  onClearActor: () => void;
};

export function AuditLogsToolbar({
  entityType,
  onEntityTypeChange,
  action,
  onActionChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  actor,
  onClearActor,
}: AuditLogsToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-entity-type">Entidad</Label>
          <Select value={entityType} onValueChange={onEntityTypeChange}>
            <SelectTrigger id="audit-entity-type" className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-action">Acción</Label>
          <Select value={action} onValueChange={onActionChange}>
            <SelectTrigger id="audit-action" className="sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-date-from">Desde</Label>
          <Input
            id="audit-date-from"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="sm:w-44"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-date-to">Hasta</Label>
          <Input
            id="audit-date-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => onDateToChange(event.target.value)}
            className="sm:w-44"
          />
        </div>
      </div>

      {/* El filtro por autor se activa pulsando su correo en la tabla: así no
          hace falta listar usuarios, que exige un permiso distinto del que abre
          esta pantalla. */}
      {actor ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Autor:</span>
          <Badge variant="secondary" className="gap-1">
            {actor.email}
            <Button
              variant="ghost"
              size="icon"
              className="size-4"
              aria-label={`Quitar el filtro por ${actor.email}`}
              onClick={onClearActor}
            >
              <X className="size-3" aria-hidden />
            </Button>
          </Badge>
        </div>
      ) : null}
    </div>
  );
}

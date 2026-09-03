"use client";

import { Search, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { USER_STATUS_OPTIONS, type UserStatusFilter } from "../constants";

import { RoleSelect } from "./role-select";

type CustomersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: UserStatusFilter;
  onStatusChange: (value: UserStatusFilter) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  canInvite: boolean;
  onInvite: () => void;
};

export function CustomersToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  roleFilter,
  onRoleFilterChange,
  canInvite,
  onInvite,
}: CustomersToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:max-w-2xl">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar usuarios"
            className="pl-8"
          />
        </div>

        <RoleSelect
          valueKey="id"
          value={roleFilter}
          onValueChange={onRoleFilterChange}
          allOptionLabel="Todos los roles"
          className="sm:w-48"
          aria-label="Filtrar por rol"
        />

        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as UserStatusFilter)}
        >
          <SelectTrigger className="sm:w-40" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {canInvite ? (
        <Button onClick={onInvite}>
          <UserPlus className="size-4" aria-hidden />
          Invitar usuario
        </Button>
      ) : null}
    </div>
  );
}

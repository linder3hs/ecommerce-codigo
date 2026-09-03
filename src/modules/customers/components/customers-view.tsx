"use client";

import { useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";

import {
  ALL_FILTER_VALUE,
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  type UserStatusFilter,
} from "../constants";
import { useUsers } from "../hooks/use-users";

import { CustomersTable } from "./customers-table";
import { CustomersToolbar } from "./customers-toolbar";
import { InviteUserDialog } from "./invite-user-dialog";

import type { UserQueryInput } from "../schemas/user.schema";
import type { UserCapabilities } from "../types/user";
import type { PaginationState } from "@tanstack/react-table";

const FIRST_PAGE: PaginationState = {
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
};

function toIsActive(status: UserStatusFilter): boolean | undefined {
  return status === ALL_FILTER_VALUE ? undefined : status === "true";
}

export function CustomersView({
  capabilities,
}: {
  capabilities: UserCapabilities;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UserStatusFilter>(ALL_FILTER_VALUE);
  const [roleFilter, setRoleFilter] = useState<string>(ALL_FILTER_VALUE);
  const [pagination, setPagination] = useState<PaginationState>(FIRST_PAGE);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const params: UserQueryInput = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: debouncedSearch.trim() || undefined,
    isActive: toIsActive(status),
    roleId: roleFilter === ALL_FILTER_VALUE ? undefined : roleFilter,
  };

  const users = useUsers(params);

  function resetToFirstPage() {
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    resetToFirstPage();
  }

  function handleStatusChange(value: UserStatusFilter) {
    setStatus(value);
    resetToFirstPage();
  }

  function handleRoleFilterChange(value: string) {
    setRoleFilter(value);
    resetToFirstPage();
  }

  return (
    <div className="flex flex-col gap-6">
      <CustomersToolbar
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
        roleFilter={roleFilter}
        onRoleFilterChange={handleRoleFilterChange}
        canInvite={capabilities.canInvite}
        onInvite={() => setIsInviteOpen(true)}
      />

      <CustomersTable
        data={users.data?.data}
        rowCount={users.data?.meta.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        capabilities={capabilities}
        isLoading={users.isPending}
        isError={users.isError}
        errorMessage={users.error?.message ?? null}
        onRetry={() => void users.refetch()}
      />

      {capabilities.canInvite ? (
        <InviteUserDialog
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
        />
      ) : null}
    </div>
  );
}

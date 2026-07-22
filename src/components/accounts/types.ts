export interface AccountEntry {
  id: string;
  name: string;
  phone: string;
  status: "active" | "suspended" | "error" | "unconfigured";
  lastActive: string;
  createdAt: string;
  todaySent: number;
  groupCount: number;
}

export type AccountStatus = AccountEntry["status"];

export interface AccountFilters {
  search: string;
  status: AccountStatus | "all";
}

export type UserRole = "owner" | "manager" | "cashier" | "chef" | "accountant";

export interface RolePermissions {
  label: string;
  labelEn: string;
  badgeColor: string;
  defaultRoute: string;
  canViewOrders: boolean;
  canCreateOrder: boolean;
  canUpdateOrderStatus: boolean;
  canDeleteOrder: boolean;
  canViewMenu: boolean;
  canEditMenu: boolean;
  canViewInventory: boolean;
  canEditInventory: boolean;
  canViewExpenses: boolean;
  canAddExpense: boolean;
  canViewReports: boolean;
  canViewFinance: boolean;
  canManageUsers: boolean;
  canViewChat: boolean;
  canViewKitchen: boolean;
  canManageSettings: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
    label: "صاحب المحل (مدير عام)",
    labelEn: "Owner",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    defaultRoute: "/dashboard",
    canViewOrders: true,
    canCreateOrder: true,
    canUpdateOrderStatus: true,
    canDeleteOrder: true,
    canViewMenu: true,
    canEditMenu: true,
    canViewInventory: true,
    canEditInventory: true,
    canViewExpenses: true,
    canAddExpense: true,
    canViewReports: true,
    canViewFinance: true,
    canManageUsers: true,
    canViewChat: true,
    canViewKitchen: true,
    canManageSettings: true,
  },
  manager: {
    label: "مدير / Manager",
    labelEn: "Manager",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    defaultRoute: "/dashboard",
    canViewOrders: true,
    canCreateOrder: true,
    canUpdateOrderStatus: true,
    canDeleteOrder: true,
    canViewMenu: true,
    canEditMenu: true,
    canViewInventory: true,
    canEditInventory: true,
    canViewExpenses: true,
    canAddExpense: true,
    canViewReports: true,
    canViewFinance: true,
    canManageUsers: true,
    canViewChat: true,
    canViewKitchen: true,
    canManageSettings: false,
  },
  cashier: {
    label: "كاشير (خدمة العملاء)",
    labelEn: "Cashier",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    defaultRoute: "/cashier",
    canViewOrders: true,
    canCreateOrder: true,
    canUpdateOrderStatus: true,
    canDeleteOrder: false,
    canViewMenu: true,
    canEditMenu: false,
    canViewInventory: false,
    canEditInventory: false,
    canViewExpenses: false,
    canAddExpense: false,
    canViewReports: false,
    canViewFinance: false,
    canManageUsers: false,
    canViewChat: true,
    canViewKitchen: false,
    canManageSettings: false,
  },
  chef: {
    label: "شيف المطبخ",
    labelEn: "Chef",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    defaultRoute: "/kitchen",
    canViewOrders: true,
    canCreateOrder: false,
    canUpdateOrderStatus: true,
    canDeleteOrder: false,
    canViewMenu: true,
    canEditMenu: false,
    canViewInventory: true,
    canEditInventory: false,
    canViewExpenses: false,
    canAddExpense: false,
    canViewReports: false,
    canViewFinance: false,
    canManageUsers: false,
    canViewChat: true,
    canViewKitchen: true,
    canManageSettings: false,
  },
  accountant: {
    label: "محاسب (تقارير مالية)",
    labelEn: "Accountant",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    defaultRoute: "/reports",
    canViewOrders: true,
    canCreateOrder: false,
    canUpdateOrderStatus: false,
    canDeleteOrder: false,
    canViewMenu: true,
    canEditMenu: false,
    canViewInventory: true,
    canEditInventory: false,
    canViewExpenses: true,
    canAddExpense: true,
    canViewReports: true,
    canViewFinance: true,
    canManageUsers: false,
    canViewChat: true,
    canViewKitchen: false,
    canManageSettings: false,
  },
};

export function getPermissions(role?: string | null): RolePermissions {
  const normalized = (role?.toLowerCase() || "cashier") as UserRole;
  return ROLE_PERMISSIONS[normalized] || ROLE_PERMISSIONS.cashier;
}

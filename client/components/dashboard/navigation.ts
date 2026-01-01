import {
  type LucideIcon,
  Calendar,
  Users,
  FileText,
  Settings,
  Home,
  Stethoscope,
  FolderOpen,
  Package,
  Receipt,
  DollarSign,
  TrendingUp,
  Warehouse,
} from "lucide-react";

export interface NavChildItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavItem {
  name: string;
  href?: string;
  icon: LucideIcon;
  dropdown?: boolean;
  children?: NavChildItem[];
}

export const navigation: NavItem[] = [
  { name: "Tableau de Bord", href: "/", icon: Home },
  { name: "Rendez-vous", href: "/appointments", icon: Calendar },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Employés", href: "/employees", icon: Users },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Types de Documents", href: "/document-types", icon: FolderOpen },
  {
    name: "Biens",
    icon: Package,
    dropdown: true,
    children: [
      { name: "Produits", href: "/products", icon: Package },
      { name: "Inventaire", href: "/inventaire", icon: Warehouse },
      { name: "Soins", href: "/soins", icon: Stethoscope },
    ],
  },
  { name: "Factures", href: "/invoices", icon: Receipt },
  { name: "Paiements", href: "/payments", icon: DollarSign },
  { name: "Rapports", href: "/reports", icon: TrendingUp },
  { name: "Paramètres", href: "/settings", icon: Settings },
];

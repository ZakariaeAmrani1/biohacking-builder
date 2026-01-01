import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  FileText,
  Settings,
  Home,
  Stethoscope,
  Heart,
  FolderOpen,
  Package,
  ChevronDown,
  ChevronRight,
  Receipt,
  DollarSign,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";
import { navigation } from "./navigation";

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [expandedDropdowns, setExpandedDropdowns] = useState<string[]>(() => {
    const saved = localStorage.getItem("sidebar-expanded-dropdowns");
    return saved ? JSON.parse(saved) : ["Biens"];
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      "sidebar-expanded-dropdowns",
      JSON.stringify(expandedDropdowns),
    );
  }, [expandedDropdowns]);

  const toggleDropdown = (itemName: string) => {
    setExpandedDropdowns((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName],
    );
  };

  const isChildActive = (children: any[]) => {
    return children.some((child) => location.pathname === child.href);
  };

  const items = navigation.filter((item) => {
    if (item.href === "/employees" && user?.role !== "admin") return false;
    return true;
  });

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex h-full flex-col bg-card border-r border-border transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-border transition-all duration-300",
            isCollapsed ? "px-3 justify-center" : "px-6 justify-start",
          )}
        >
          <div className="flex items-center justify-start">
            <div
              className={cn(
                "flex items-center justify-start",
                isCollapsed ? "h-12 w-12" : "h-18 w-44",
              )}
            >
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F16493a39c179465f9ca598ede9454dc8%2Fcceedcfad29a48b9a90d85058157ec8d?format=webp&width=800"
                alt="BioHacking Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8 p-0 ml-auto"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
          {isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(false)}
              className="h-8 w-8 p-0 absolute top-4 left-12"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 space-y-1 py-4 transition-all duration-300",
            isCollapsed ? "px-2" : "px-3",
          )}
        >
          {items.map((item) => {
            if (item.dropdown && item.children) {
              const isExpanded = expandedDropdowns.includes(item.name);
              const hasActiveChild = isChildActive(item.children);

              if (isCollapsed) {
                // For collapsed state, show only the first child if any is active
                const activeChild = item.children.find(
                  (child) => location.pathname === child.href,
                );
                if (activeChild) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <Link
                          to={activeChild.href}
                          className={cn(
                            "group flex items-center justify-center rounded-lg p-2 text-sm font-medium transition-colors bg-primary text-primary-foreground",
                          )}
                        >
                          <activeChild.icon className="h-5 w-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{activeChild.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                } else {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() =>
                            !isCollapsed && toggleDropdown(item.name)
                          }
                          className={cn(
                            "group flex items-center justify-center rounded-lg p-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
              }

              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      hasActiveChild
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    ) : (
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const isChildActiveItem =
                          location.pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            className={cn(
                              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isChildActiveItem
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            )}
                          >
                            <child.icon className="h-4 w-4" />
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            } else {
              const isActive = location.pathname === item.href;

              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          "group flex items-center justify-center rounded-lg p-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            }
          })}
        </nav>

        {/* Footer */}
        <div
          className={cn(
            "border-t border-border transition-all duration-300",
            isCollapsed ? "p-2" : "p-4",
          )}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {user?.prenom?.[0]?.toUpperCase()}
                      {user?.nom?.[0]?.toUpperCase()}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div>
                    <p className="font-medium">
                      {user ? UserService.getDisplayName(user) : "Utilisateur"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user
                        ? UserService.getRoleDisplayName(user.role)
                        : "Rôle"}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Se déconnecter</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {user?.prenom?.[0]?.toUpperCase()}
                  {user?.nom?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user ? UserService.getDisplayName(user) : "Utilisateur"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user ? UserService.getRoleDisplayName(user.role) : "Rôle"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

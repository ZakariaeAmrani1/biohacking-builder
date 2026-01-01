import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, ChevronDown, ChevronRight } from "lucide-react";
import { navigation } from "./navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { useTheme } from "@/hooks/use-theme";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [expandedDropdowns, setExpandedDropdowns] = useState<string[]>([
    "Biens",
  ]);
  const toggleDropdown = (itemName: string) => {
    setExpandedDropdowns((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName],
    );
  };
  const isChildActive = (children: any[]) =>
    children.some((child) => location.pathname === child.href);

  const items = navigation.filter((item) => {
    if (item.href === "/employees" && user?.role !== "admin") return false;
    return true;
  });

  return (
    <div className="lg:hidden border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <div className="flex h-10 w-20 items-center justify-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F16493a39c179465f9ca598ede9454dc8%2Fcceedcfad29a48b9a90d85058157ec8d?format=webp&width=800"
              alt="BioHacking Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <div className="flex h-full w-full flex-col bg-card">
              {/* Logo */}
              <div className="flex h-16 items-center border-b border-border px-6">
                <div className="flex items-center justify-center w-full">
                  <div className="flex h-12 w-24 items-center justify-center">
                    <img
                      src="https://cdn.builder.io/api/v1/image/assets%2F16493a39c179465f9ca598ede9454dc8%2Fcceedcfad29a48b9a90d85058157ec8d?format=webp&width=800"
                      alt="BioHacking Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 px-3 py-4">
                {items.map((item) => {
                  if (item.dropdown && item.children) {
                    const isExpanded = expandedDropdowns.includes(item.name);
                    const hasActiveChild = isChildActive(item.children);

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
                                  onClick={() => setOpen(false)}
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
                    return (
                      <Link
                        key={item.name}
                        to={item.href as string}
                        onClick={() => setOpen(false)}
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
              <div className="border-t border-border p-4">
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
                      {user
                        ? UserService.getRoleDisplayName(user.role)
                        : "Rôle"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    title="Se déconnecter"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

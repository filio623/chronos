"use client";

import React from "react";
import Link from "next/link";
import { tailwindToHex } from "@/lib/colors";
import {
  LayoutDashboard,
  Clock,
  Briefcase,
  FileBarChart,
  Users,
  CalendarDays,
  Building2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export type SidebarRetainer = {
  id: string;
  name: string;
  color: string;
};

interface SidebarProps {
  currentView: string;
  retainers: SidebarRetainer[];
  onRetainerClick?: (clientId: string) => void;
  highlightedRetainerId?: string | null;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

const NAV = [
  { view: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
  { view: "timesheet", href: "/timesheet", label: "Timesheet", icon: CalendarDays },
  { view: "tracker", href: "/tracker", label: "Tracker", icon: Clock },
  { view: "projects", href: "/projects", label: "Projects", icon: Briefcase },
  { view: "clients", href: "/clients", label: "Clients", icon: Users },
  { view: "reports", href: "/reports", label: "Reports", icon: FileBarChart },
] as const;

function SidebarContent({
  currentView,
  retainers,
  onRetainerClick,
  highlightedRetainerId,
  onNavigate,
}: {
  currentView: string;
  retainers: SidebarRetainer[];
  onRetainerClick?: (clientId: string) => void;
  highlightedRetainerId?: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="h-14 flex items-center px-4 border-b border-transparent">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight">Chronos</span>
        </Link>
      </div>

      <nav className="px-2 py-4 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.view;
          return (
            <Link
              key={item.view}
              href={item.href}
              onClick={onNavigate}
              className={`
                w-full flex items-center gap-3 px-3 py-1.5 text-sm rounded-md transition-all duration-200
                ${active
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-medium"
                  : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                }
              `}
            >
              <span className={active ? "text-indigo-600" : "text-slate-400"}>
                <Icon size={16} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 px-4 mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Retainers</h3>
      </div>
      <div className="px-2 space-y-0.5 flex-1 overflow-y-auto">
        {retainers.length === 0 ? (
          <p className="px-3 py-1.5 text-xs text-slate-400">No active retainers</p>
        ) : (
          retainers.slice(0, 6).map((retainer) => {
            const isHighlighted = highlightedRetainerId === retainer.id;
            return (
              <Link
                key={retainer.id}
                href={`/clients?highlight=${retainer.id}`}
                onClick={() => {
                  onRetainerClick?.(retainer.id);
                  onNavigate?.();
                }}
                className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm rounded-md transition-colors text-left ${isHighlighted ? "bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tailwindToHex(retainer.color || "text-slate-600") }}
                ></span>
                <span className="truncate">{retainer.name}</span>
              </Link>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-3 w-full p-2 text-left">
          <div className="w-8 h-8 rounded-md bg-slate-100 flex-shrink-0 flex items-center justify-center">
            <Building2 size={16} className="text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">Workspace</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  retainers,
  onRetainerClick,
  highlightedRetainerId,
  mobileOpen,
  onMobileOpenChange,
}) => {
  const isMobile = useIsMobile();

  const contentProps = {
    currentView,
    retainers,
    onRetainerClick,
    highlightedRetainerId,
  };

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[250px] p-0">
          <SidebarContent {...contentProps} onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-[250px] border-r border-slate-200 h-screen fixed left-0 top-0 z-20">
      <SidebarContent {...contentProps} />
    </aside>
  );
};

export default Sidebar;

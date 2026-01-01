import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsCards from "@/components/dashboard/StatsCards";
import AppointmentCalendar from "@/components/dashboard/AppointmentCalendar";
import RecentActivities from "@/components/dashboard/RecentActivities";
import QuickActions from "@/components/dashboard/QuickActions";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord</h1>
          <p className="text-muted-foreground">
            Bienvenue dans le Système de Gestion de Clinique Biohacking
          </p>
        </div>

        <StatsCards />

        <div className="grid gap-6 xl:grid-cols-3 lg:grid-cols-1">
          <div className="xl:col-span-2">
            <AppointmentCalendar />
          </div>
          <div className="space-y-6">
            <QuickActions />
            <RecentActivities />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

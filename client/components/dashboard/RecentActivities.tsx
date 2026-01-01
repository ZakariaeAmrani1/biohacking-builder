import { useState, useEffect } from "react";
import {
  Clock,
  User,
  Package,
  Stethoscope,
  Calendar,
  Receipt,
  FileText,
  FileType,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivitiesService, Activity } from "@/services/activitiesService";

// Icon mapping for different activity types
const ACTIVITY_ICONS = {
  appointment: Calendar,
  patient: User,
  product: Package,
  soin: Stethoscope,
  invoice: Receipt,
  document: FileText,
  document_template: FileType,
};

interface ActivityWithDisplay extends Activity {
  relativeTime: string;
  config: { title: string; color: string };
}

export default function RecentActivities() {
  const [activities, setActivities] = useState<ActivityWithDisplay[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadActivities = () => {
    const recentActivities = ActivitiesService.getRecentActivities(
      8,
    ) as ActivityWithDisplay[];
    setActivities(recentActivities);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      loadActivities();
      setIsRefreshing(false);
    }, 500);
  };

  // Load activities on mount and set up polling for real-time updates
  useEffect(() => {
    loadActivities();

    // Poll for new activities every 30 seconds
    const interval = setInterval(loadActivities, 30000);

    return () => clearInterval(interval);
  }, []);

  // Custom event listener for real-time activity updates
  useEffect(() => {
    const handleActivityUpdate = () => {
      loadActivities();
    };

    // Listen for custom activity events
    window.addEventListener("activityLogged", handleActivityUpdate);

    return () => {
      window.removeEventListener("activityLogged", handleActivityUpdate);
    };
  }, []);

  const getActivityIcon = (type: Activity["type"]) => {
    return ACTIVITY_ICONS[type] || FileText;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          Activités Récentes
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div
                    className={`rounded-full p-2 bg-accent ${activity.config?.color || "text-gray-500"}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Par {activity.createdBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {activity.relativeTime}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucune activité récente
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Les actions des utilisateurs apparaîtront ici
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

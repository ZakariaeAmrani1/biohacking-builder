export interface Activity {
  id: string;
  type:
    | "appointment"
    | "patient"
    | "product"
    | "soin"
    | "invoice"
    | "document"
    | "document_template";
  action: "created" | "updated" | "deleted" | "completed" | "cancelled";
  title: string;
  description: string;
  entityId: number;
  entityName: string;
  timestamp: string;
  createdBy: string;
  metadata?: Record<string, any>;
}

// In-memory storage for activities (in production, this would be in a database)
let activities: Activity[] = [];

// Activity type configurations
const ACTIVITY_CONFIGS = {
  appointment: {
    created: { title: "Nouveau rendez-vous programmé", color: "text-blue-500" },
    updated: { title: "Rendez-vous modifié", color: "text-blue-600" },
    deleted: { title: "Rendez-vous supprimé", color: "text-red-500" },
    cancelled: { title: "Rendez-vous annulé", color: "text-red-500" },
    completed: { title: "Rendez-vous terminé", color: "text-green-500" },
  },
  patient: {
    created: { title: "Nouveau patient enregistré", color: "text-purple-500" },
    updated: {
      title: "Informations patient mises à jour",
      color: "text-purple-600",
    },
    deleted: { title: "Patient supprimé", color: "text-red-500" },
  },
  product: {
    created: { title: "Nouveau produit ajouté", color: "text-indigo-500" },
    updated: { title: "Produit modifié", color: "text-indigo-600" },
    deleted: { title: "Produit supprimé", color: "text-red-500" },
  },
  soin: {
    created: { title: "Nouveau soin créé", color: "text-orange-500" },
    updated: { title: "Soin modifié", color: "text-orange-600" },
    deleted: { title: "Soin supprimé", color: "text-red-500" },
  },
  invoice: {
    created: { title: "Nouvelle facture créée", color: "text-teal-500" },
    updated: { title: "Facture modifiée", color: "text-teal-600" },
    deleted: { title: "Facture supprimée", color: "text-red-500" },
  },
  document: {
    created: { title: "Nouveau document créé", color: "text-cyan-500" },
    updated: { title: "Document modifié", color: "text-cyan-600" },
    deleted: { title: "Document supprimé", color: "text-red-500" },
  },
  document_template: {
    created: {
      title: "Nouveau modèle de document créé",
      color: "text-pink-500",
    },
    updated: { title: "Modèle de document modifié", color: "text-pink-600" },
    deleted: { title: "Modèle de document supprimé", color: "text-red-500" },
  },
};

export class ActivitiesService {
  // Generate a unique ID for activities
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Format relative time
  private static formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60)
      return `il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
    if (diffHours < 24)
      return `il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
    if (diffDays < 7)
      return `il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;

    return activityTime.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Log a new activity
  static logActivity(
    type: Activity["type"],
    action: Activity["action"],
    entityId: number,
    entityName: string,
    createdBy: string,
    metadata?: Record<string, any>,
  ): void {
    const config = ACTIVITY_CONFIGS[type]?.[action];
    if (!config) return;

    const activity: Activity = {
      id: this.generateId(),
      type,
      action,
      title: config.title,
      description: this.generateDescription(type, action, entityName, metadata),
      entityId,
      entityName,
      timestamp: new Date().toISOString(),
      createdBy,
      metadata,
    };

    // Add to beginning of array (most recent first)
    activities.unshift(activity);

    // Keep only last 100 activities to prevent memory issues
    if (activities.length > 100) {
      activities = activities.slice(0, 100);
    }

    console.log("Activity logged:", activity);
  }

  // Generate description based on activity type and metadata
  private static generateDescription(
    type: Activity["type"],
    action: Activity["action"],
    entityName: string,
    metadata?: Record<string, any>,
  ): string {
    switch (type) {
      case "appointment":
        const patientName = metadata?.patientName || "Patient";
        const appointmentType = metadata?.appointmentType || "Consultation";
        if (action === "created") return `${patientName} - ${appointmentType}`;
        if (action === "updated") return `${patientName} - ${appointmentType}`;
        if (action === "cancelled")
          return `${patientName} - ${appointmentType}`;
        return `${patientName} - ${appointmentType}`;

      case "patient":
        if (action === "created") return `${entityName} ajouté au système`;
        if (action === "updated") return `Profil de ${entityName} mis à jour`;
        return `Patient ${entityName}`;

      case "product":
        if (action === "created") return `${entityName} ajouté au catalogue`;
        if (action === "updated")
          return `${entityName} modifié dans le catalogue`;
        return `Produit ${entityName}`;

      case "soin":
        if (action === "created")
          return `${entityName} ajouté aux soins disponibles`;
        if (action === "updated") return `${entityName} modifié`;
        return `Soin ${entityName}`;

      case "invoice":
        const clientName = metadata?.clientName || "Client";
        const amount = metadata?.amount ? ` - ${metadata.amount}€` : "";
        if (action === "created") return `Facture pour ${clientName}${amount}`;
        return `Facture ${entityName} - ${clientName}`;

      case "document":
        const patientDoc = metadata?.patientName || "Patient";
        const docType = metadata?.documentType || "Document";
        return `${docType} pour ${patientDoc}`;

      case "document_template":
        if (action === "created") return `Modèle "${entityName}" créé`;
        return `Modèle "${entityName}"`;

      default:
        return entityName;
    }
  }

  // Get recent activities for display
  static getRecentActivities(limit: number = 10): Activity[] {
    return activities.slice(0, limit).map((activity) => ({
      ...activity,
      relativeTime: this.formatRelativeTime(activity.timestamp),
      config: ACTIVITY_CONFIGS[activity.type]?.[activity.action],
    }));
  }

  // Get activities by type
  static getActivitiesByType(
    type: Activity["type"],
    limit: number = 20,
  ): Activity[] {
    return activities
      .filter((activity) => activity.type === type)
      .slice(0, limit)
      .map((activity) => ({
        ...activity,
        relativeTime: this.formatRelativeTime(activity.timestamp),
        config: ACTIVITY_CONFIGS[activity.type]?.[activity.action],
      }));
  }

  // Get activities by user
  static getActivitiesByUser(
    createdBy: string,
    limit: number = 20,
  ): Activity[] {
    return activities
      .filter((activity) => activity.createdBy === createdBy)
      .slice(0, limit)
      .map((activity) => ({
        ...activity,
        relativeTime: this.formatRelativeTime(activity.timestamp),
        config: ACTIVITY_CONFIGS[activity.type]?.[activity.action],
      }));
  }

  // Clear all activities (useful for testing)
  static clearActivities(): void {
    activities = [];
  }

  // Initialize with some sample activities
  static initializeSampleActivities(): void {
    const sampleActivities = [
      {
        type: "appointment" as const,
        action: "created" as const,
        entityId: 1,
        entityName: "RV-001",
        createdBy: "Dr. Smith",
        metadata: {
          patientName: "Marie Laurent",
          appointmentType: "Consultation Biohacking",
        },
      },
      {
        type: "patient" as const,
        action: "created" as const,
        entityId: 2,
        entityName: "Pierre Martin",
        createdBy: "Dr. Dubois",
      },
      {
        type: "appointment" as const,
        action: "completed" as const,
        entityId: 3,
        entityName: "RV-002",
        createdBy: "Dr. Martin",
        metadata: {
          patientName: "Sophie Wilson",
          appointmentType: "Thérapie IV",
        },
      },
    ];

    // Add sample activities with different timestamps
    sampleActivities.forEach((sample, index) => {
      const timestamp = new Date();
      timestamp.setMinutes(timestamp.getMinutes() - (index + 1) * 15);

      const activity: Activity = {
        id: this.generateId(),
        type: sample.type,
        action: sample.action,
        title: ACTIVITY_CONFIGS[sample.type][sample.action].title,
        description: this.generateDescription(
          sample.type,
          sample.action,
          sample.entityName,
          sample.metadata,
        ),
        entityId: sample.entityId,
        entityName: sample.entityName,
        timestamp: timestamp.toISOString(),
        createdBy: sample.createdBy,
        metadata: sample.metadata,
      };

      activities.unshift(activity);
    });
  }
}

// Initialize sample activities on first load
if (activities.length === 0) {
  ActivitiesService.initializeSampleActivities();
}

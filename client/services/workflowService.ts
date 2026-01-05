import api from "../api/axios";
import { AuthService } from "./authService";
import { ActivitiesService } from "./activitiesService";
import { ClientsService, Client } from "./clientsService";
import { AppointmentsService, RendezVous } from "./appointmentsService";
import { InvoicesService, Facture } from "./invoicesService";

// Workflow types
export interface Workflow {
  id: number;
  client_CIN: string;
  rendez_vous_id: number;
  facture_id?: number;
  status: "En cours" | "Terminé";
  created_at: string;
  Cree_par: string;
}

// Form data for creating/updating workflow
export interface WorkflowFormData {
  client_CIN: string;
  rendez_vous_id: number;
  facture_id?: number;
  Cree_par: string;
}

// Enriched workflow with resolved details
export interface WorkflowWithDetails extends Workflow {
  client?: Client;
  appointment?: RendezVous;
  invoice?: Facture;
  patientName?: string;
  appointmentDate?: string;
  totalAmount?: number;
  paymentMethod?: string;
  appointmentStatus?: string;
  invoiceStatus?: string;
  soins?: string[];
  products?: string[];
  paymentDate?: string;
}

// Mock data storage
let mockWorkflows: Workflow[] = [];

export class WorkflowService {
  // Get all workflows
  static async getAll(): Promise<Workflow[]> {
    const result = await api.get(`workflow`);
    const data = result.data;

    mockWorkflows = data.map((workflow) => ({
      id: workflow.id,
      client_CIN: workflow.client_CIN,
      rendez_vous_id: workflow.rendez_vous_id,
      facture_id: workflow.facture_id || undefined,
      status: workflow.facture_id ? "Terminé" : "En cours",
      created_at: workflow.created_at,
      Cree_par: workflow.Cree_par,
    }));

    return mockWorkflows.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  // Get workflow by ID with resolved details
  static async getById(id: number): Promise<WorkflowWithDetails | null> {
    const workflow = mockWorkflows.find((w) => w.id === id);
    if (!workflow) return null;

    return this.enrichWorkflow(workflow);
  }

  // Get all workflows with resolved details
  static async getAllWithDetails(): Promise<WorkflowWithDetails[]> {
    const workflows = await this.getAll();

    // Ensure mock data arrays are populated before enriching
    await AppointmentsService.getAll();
    await InvoicesService.getAll();

    return Promise.all(workflows.map((w) => this.enrichWorkflow(w)));
  }

  // Enrich workflow with client, appointment, and invoice details
  private static async enrichWorkflow(
    workflow: Workflow,
  ): Promise<WorkflowWithDetails> {
    const result: WorkflowWithDetails = { ...workflow };

    try {
      // Fetch client details
      const client = await ClientsService.getByCIN(workflow.client_CIN);
      if (client) {
        result.client = client;
        result.patientName = `${client.prenom} ${client.nom}`;
      }
    } catch (error) {
      console.error("Error fetching client:", error);
    }

    try {
      // Fetch appointment details
      const appointment = await AppointmentsService.getById(
        workflow.rendez_vous_id,
      );
      if (appointment) {
        result.appointment = appointment;
        result.appointmentDate = appointment.date_rendez_vous;
        result.appointmentStatus = appointment.status;
      }
    } catch (error) {
      console.error("Error fetching appointment:", error);
    }

    // Fetch invoice details if present
    if (workflow.facture_id) {
      try {
        const invoice = await InvoicesService.getById(workflow.facture_id);
        if (invoice) {
          result.invoice = invoice;
          result.totalAmount = invoice.prix_total;
          result.paymentMethod = invoice.methode_paiement;
          result.invoiceStatus = invoice.statut;
          result.paymentDate = invoice.date_paiement;

          // Extract soins and products from invoice items
          result.soins = invoice.items
            .filter((item) => item.type_bien === "soin")
            .map((item) => item.nom_bien);

          result.products = invoice.items
            .filter((item) => item.type_bien === "produit")
            .map((item) => item.nom_bien);

          // Update status: Terminé only if invoice is PAID
          result.status = invoice.statut === "Payée" ? "Terminé" : "En cours";
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
      }
    }

    return result;
  }

  // Create new workflow
  static async create(data: WorkflowFormData): Promise<Workflow> {
    const currentUser = AuthService.getCurrentUser();

    const response = await api.post(`workflow`, {
      client_CIN: data.client_CIN,
      rendez_vous_id: data.rendez_vous_id,
      facture_id: data.facture_id || null,
      Cree_par: currentUser.CIN,
    });

    const newWorkflow: Workflow = {
      id: response.data.id,
      client_CIN: data.client_CIN,
      rendez_vous_id: data.rendez_vous_id,
      facture_id: data.facture_id,
      status: data.facture_id ? "Terminé" : "En cours",
      created_at: new Date().toISOString(),
      Cree_par: currentUser.CIN,
    };

    mockWorkflows.push(newWorkflow);

    ActivitiesService.logActivity(
      "workflow",
      "created",
      newWorkflow.id,
      `Flux-${newWorkflow.id.toString().padStart(3, "0")}`,
      data.Cree_par,
      {
        patientCIN: data.client_CIN,
        appointmentId: data.rendez_vous_id,
        invoiceId: data.facture_id,
      },
    );

    window.dispatchEvent(new CustomEvent("activityLogged"));

    return newWorkflow;
  }

  // Update existing workflow
  static async update(
    id: number,
    data: WorkflowFormData,
  ): Promise<Workflow | null> {
    const index = mockWorkflows.findIndex((w) => w.id === id);
    if (index === -1) return null;

    const currentUser = AuthService.getCurrentUser();

    await api.patch(`workflow/${id}`, {
      client_CIN: data.client_CIN,
      rendez_vous_id: data.rendez_vous_id,
      facture_id: data.facture_id || null,
      Cree_par: currentUser.CIN,
    });

    const updatedWorkflow: Workflow = {
      ...mockWorkflows[index],
      client_CIN: data.client_CIN,
      rendez_vous_id: data.rendez_vous_id,
      facture_id: data.facture_id,
      status: data.facture_id ? "Terminé" : "En cours",
    };

    mockWorkflows[index] = updatedWorkflow;

    ActivitiesService.logActivity(
      "workflow",
      "updated",
      id,
      `Flux-${id.toString().padStart(3, "0")}`,
      data.Cree_par,
      {
        patientCIN: data.client_CIN,
        appointmentId: data.rendez_vous_id,
        invoiceId: data.facture_id,
      },
    );

    window.dispatchEvent(new CustomEvent("activityLogged"));

    return updatedWorkflow;
  }

  // Delete workflow
  static async delete(id: number): Promise<boolean> {
    const index = mockWorkflows.findIndex((w) => w.id === id);
    if (index === -1) return false;

    const deletedWorkflow = mockWorkflows[index];

    await api.delete(`workflow/${id}`);

    mockWorkflows.splice(index, 1);

    ActivitiesService.logActivity(
      "workflow",
      "deleted",
      id,
      `Flux-${id.toString().padStart(3, "0")}`,
      "System",
      {
        patientCIN: deletedWorkflow.client_CIN,
        appointmentId: deletedWorkflow.rendez_vous_id,
      },
    );

    window.dispatchEvent(new CustomEvent("activityLogged"));

    return true;
  }

  // Search workflows
  static async search(query: string): Promise<Workflow[]> {
    const lowerQuery = query.toLowerCase();
    return mockWorkflows.filter(
      (workflow) =>
        workflow.client_CIN.toLowerCase().includes(lowerQuery) ||
        workflow.Cree_par.toLowerCase().includes(lowerQuery),
    );
  }

  // Filter workflows
  static async filter(filters: {
    status?: string;
    creator?: string;
  }): Promise<Workflow[]> {
    return mockWorkflows.filter((workflow) => {
      if (
        filters.status &&
        filters.status !== "tous" &&
        workflow.status !== filters.status
      ) {
        return false;
      }

      if (
        filters.creator &&
        filters.creator !== "tous" &&
        workflow.Cree_par !== filters.creator
      ) {
        return false;
      }

      return true;
    });
  }

  // Get workflows for a specific client
  static async getByClientCIN(cin: string): Promise<Workflow[]> {
    return mockWorkflows.filter((workflow) => workflow.client_CIN === cin);
  }

  // Get workflows by status
  static async getByStatus(
    status: "En cours" | "Terminé",
  ): Promise<Workflow[]> {
    return mockWorkflows.filter((workflow) => workflow.status === status);
  }
}

// Validation function
export const validateWorkflowData = (data: WorkflowFormData): string[] => {
  const errors: string[] = [];

  if (!data.client_CIN.trim()) {
    errors.push("Le CIN du patient est obligatoire");
  }

  if (!data.rendez_vous_id || data.rendez_vous_id <= 0) {
    errors.push("Le rendez-vous est obligatoire");
  }

  if (!data.Cree_par.trim()) {
    errors.push("Le créateur est obligatoire");
  }

  return errors;
};

// Get workflow status color
export const getWorkflowStatusColor = (
  status: "En cours" | "Terminé",
): string => {
  switch (status) {
    case "En cours":
      return "bg-blue-100 text-blue-800";
    case "Terminé":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Get workflow status icon
export const getWorkflowStatusBadge = (
  status: "En cours" | "Terminé",
): string => {
  switch (status) {
    case "En cours":
      return "En cours";
    case "Terminé":
      return "Terminé";
    default:
      return "Inconnu";
  }
};

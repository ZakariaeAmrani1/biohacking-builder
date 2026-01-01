import { ClientsService, Client } from "./clientsService";
import { ActivitiesService } from "./activitiesService";
import api from "../api/axios";
import { AuthService } from "./authService";
import { SoinsService } from "./soinsService";

// Type matching your database structure
export interface RendezVous {
  id: number;
  CIN: string;
  sujet: string;
  date_rendez_vous: string;
  created_at: string;
  Cree_par: string;
  status?: "programmé" | "confirmé" | "terminé" | "annulé";
  patient_nom?: string; // Additional field for display
  email?: string;
  client_id?: number; // Reference to client table
  Cabinet?: string;
  soin_id?: number;
  soin_nom?: string;
}

// Create/Update form data interface
export interface AppointmentFormData {
  client_id: number;
  CIN: string;
  sujet: string;
  date_rendez_vous: string;
  Cree_par: string;
  status: "programmé" | "confirmé" | "terminé" | "annulé";
  Cabinet: string;
  soin_id: number;
}

// Helper function to get dates relative to today
const getRelativeDate = (
  daysFromToday: number,
  hour: number = 10,
  minute: number = 0,
): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

// Mock data storage - in real app this would connect to your backend
let mockAppointments: RendezVous[] = [];

export class AppointmentsService {
  // Get all appointments
  static async getAll(): Promise<RendezVous[]> {
    const result = await api.get(`rendez-vous`);
    const appointments = result.data;
    mockAppointments = appointments.map((appointment) => ({
      id: appointment.id,
      CIN: appointment.CIN,
      sujet: appointment.sujet,
      date_rendez_vous: appointment.date_rendez_vous,
      created_at: appointment.created_at,
      Cree_par: appointment.Cree_par,
      status: appointment.status,
      patient_nom: `${appointment.client.prenom} ${appointment.client.nom}`,
      client_id: appointment.client.id,
      email: appointment.client.email,
      Cabinet: appointment.cabinet,
      soin_id: appointment.soin_id,
      soin_nom: appointment.soin?.Nom || appointment.soin_nom || undefined,
    }));
    return mockAppointments.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  // Get appointment by ID
  static async getById(id: number): Promise<RendezVous | null> {
    const appointment = mockAppointments.find((apt) => apt.id === id);
    return appointment || null;
  }

  // Create new appointment
  static async create(data: AppointmentFormData): Promise<RendezVous> {
    const currentUser = AuthService.getCurrentUser();

    // Get client information from client_id
    const client = await ClientsService.getById(data.client_id);
    if (!client) {
      throw new Error("Client non trouvé");
    }

    const date = new Date(data.date_rendez_vous);
    const response = await api.post(`rendez-vous`, {
      CIN: client.CIN,
      sujet: data.sujet,
      date_rendez_vous: date.toISOString(),
      status: data.status,
      cabinet: data.Cabinet,
      Cree_par: currentUser.CIN,
      soin_id: data.soin_id,
    });

    // Try to resolve soin name for display
    let soinName: string | undefined = undefined;
    try {
      const soin = await SoinsService.getById(data.soin_id);
      soinName = soin?.Nom;
    } catch (err) {
      // ignore
    }

    const newAppointment: RendezVous = {
      id: response.data.id,
      CIN: client.CIN,
      patient_nom: `${client.prenom} ${client.nom}`,
      sujet: data.sujet,
      date_rendez_vous: data.date_rendez_vous,
      Cree_par: data.Cree_par,
      status: data.status,
      client_id: data.client_id,
      created_at: new Date().toISOString(),
      Cabinet: data.Cabinet,
      soin_id: data.soin_id,
      soin_nom: soinName,
    };

    mockAppointments.push(newAppointment);

    // Log activity
    ActivitiesService.logActivity(
      "appointment",
      "created",
      newAppointment.id,
      `RV-${newAppointment.id.toString().padStart(3, "0")}`,
      data.Cree_par,
      {
        patientName: newAppointment.patient_nom,
        appointmentType: data.sujet,
      },
    );

    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent("activityLogged"));

    return newAppointment;
  }

  // Update existing appointment
  static async update(
    id: number,
    data: AppointmentFormData,
  ): Promise<RendezVous | null> {
    const index = mockAppointments.findIndex((apt) => apt.id === id);
    if (index === -1) return null;

    // Get client information from client_id
    const client = await ClientsService.getById(data.client_id);
    if (!client) {
      throw new Error("Client non trouvé");
    }

    const currentUser = AuthService.getCurrentUser();
    const date = new Date(data.date_rendez_vous);
    const result = await api.patch(`rendez-vous/${id}`, {
      CIN: client.CIN,
      sujet: data.sujet,
      date_rendez_vous: date.toISOString(),
      status: data.status,
      cabinet: data.Cabinet,
      Cree_par: currentUser.CIN,
      soin_id: data.soin_id,
      // Cabinet not sent if backend doesn't support it
    });

    // Try to resolve soin name
    let soinName: string | undefined = undefined;
    try {
      const soin = await SoinsService.getById(data.soin_id);
      soinName = soin?.Nom;
    } catch (err) {
      // ignore
    }

    const updatedAppointment: RendezVous = {
      ...mockAppointments[index],
      CIN: client.CIN,
      patient_nom: `${client.prenom} ${client.nom}`,
      sujet: data.sujet,
      date_rendez_vous: data.date_rendez_vous,
      Cree_par: data.Cree_par,
      status: data.status,
      client_id: data.client_id,
      Cabinet: data.Cabinet,
      soin_id: data.soin_id,
      soin_nom: soinName,
    };

    mockAppointments[index] = updatedAppointment;

    // Log activity
    ActivitiesService.logActivity(
      "appointment",
      "updated",
      id,
      `RV-${id.toString().padStart(3, "0")}`,
      data.Cree_par,
      {
        patientName: updatedAppointment.patient_nom,
        appointmentType: data.sujet,
      },
    );

    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent("activityLogged"));

    return updatedAppointment;
  }

  // Delete appointment
  static async delete(id: number): Promise<boolean> {
    const result = await api.delete(`rendez-vous/${id}`);

    const index = mockAppointments.findIndex((apt) => apt.id === id);
    if (index === -1) return false;

    const deletedAppointment = mockAppointments[index];
    mockAppointments.splice(index, 1);

    // Log activity
    ActivitiesService.logActivity(
      "appointment",
      "deleted",
      id,
      `RV-${id.toString().padStart(3, "0")}`,
      "System", // We don't have user context in delete, could be improved
      {
        patientName: deletedAppointment.patient_nom,
        appointmentType: deletedAppointment.sujet,
      },
    );

    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent("activityLogged"));

    return true;
  }

  // Search appointments
  static async search(query: string): Promise<RendezVous[]> {
    const lowerQuery = query.toLowerCase();
    return mockAppointments.filter(
      (appointment) =>
        appointment.patient_nom?.toLowerCase().includes(lowerQuery) ||
        appointment.CIN.toLowerCase().includes(lowerQuery) ||
        appointment.sujet.toLowerCase().includes(lowerQuery),
    );
  }

  // Filter appointments
  static async filter(filters: {
    status?: string;
    creator?: string;
    dateRange?: string;
  }): Promise<RendezVous[]> {
    return mockAppointments.filter((appointment) => {
      if (
        filters.status &&
        filters.status !== "tous" &&
        appointment.status !== filters.status
      ) {
        return false;
      }

      if (
        filters.creator &&
        filters.creator !== "tous" &&
        appointment.Cree_par !== filters.creator
      ) {
        return false;
      }

      // Add date filtering logic if needed

      return true;
    });
  }
}

// Utility functions for validation
export const validateAppointmentData = (
  data: AppointmentFormData,
  excludeAppointmentId?: number,
): string[] => {
  const errors: string[] = [];

  if (!data.client_id || data.client_id <= 0) {
    errors.push("Veuillez sélectionner un patient");
  }

  if (!data.sujet.trim()) {
    errors.push("Le sujet du rendez-vous est obligatoire");
  }

  if (!data.date_rendez_vous) {
    errors.push("La date et l'heure sont obligatoires");
  } else {
    const appointmentDate = new Date(data.date_rendez_vous);
    const now = new Date();
    if (appointmentDate < now) {
      errors.push("La date du rendez-vous ne peut pas être dans le passé");
    }

    // Note: We've removed time slot availability checking to allow any time booking
  }

  if (!data.Cree_par.trim()) {
    errors.push("Le créateur est obligatoire");
  }

  if (!data.Cabinet || !data.Cabinet.trim()) {
    errors.push("Le cabinet est obligatoire");
  }

  if (!data.soin_id || data.soin_id <= 0) {
    errors.push("Veuillez sélectionner un soin");
  }

  return errors;
};

// Get available doctors/creators
export const getAvailableDoctors = (): string[] => {
  return ["Dr. Smith", "Dr. Martin", "Dr. Dubois", "Dr. Laurent"];
};

// Get appointment subjects/types
export const getAppointmentTypes = (): string[] => {
  return [
    "Consultation Biohacking",
    "Thérapie IV",
    "Séance de Cryothérapie",
    "Analyse du Bilan Sanguin",
    "Consultation Bien-être",
    "Suivi Post-Traitement",
    "Thérapie par Ondes de Choc",
    "Consultation Nutritionnelle",
    "Examen Médical Complet",
    "Thérapie par la Lumière",
    "Consultation Hormonale",
    "Séance de Récupération",
  ];
};

// Time slot interface
export interface TimeSlot {
  datetime: string;
  time: string;
  available: boolean;
}

// Working hours configuration
const WORKING_HOURS = {
  start: 10, // 10 AM
  end: 19, // 7 PM
  appointmentDuration: 60, // 1 hour in minutes
  slotInterval: 30, // 30 minutes between slots
};

// Generate time slots for a specific date
export const generateTimeSlotsForDate = (
  date: Date,
  excludeAppointmentId?: number,
): TimeSlot[] => {
  const slots: TimeSlot[] = [];

  // Calculate total minutes in working day
  const startMinutes = WORKING_HOURS.start * 60; // 8 AM = 480 minutes
  const endMinutes = WORKING_HOURS.end * 60; // 6 PM = 1080 minutes

  // Helper: local datetime string YYYY-MM-DDTHH:MM
  const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  // Generate slots at 30-minute intervals
  for (
    let minutes = startMinutes;
    minutes < endMinutes;
    minutes += WORKING_HOURS.slotInterval
  ) {
    const slotDate = new Date(date);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slotDate.setHours(hours, mins, 0, 0);

    // All slots are available - no conflict checking
    slots.push({
      datetime: toLocalInputValue(slotDate), // Local datetime for datetime-local inputs
      time: slotDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      available: true, // Always available
    });
  }

  return slots;
};

// Get available dates within a date range (next 30 days by default)
export const getAvailableDates = (
  startDate: Date = new Date(),
  daysAhead: number = 30,
  excludeAppointmentId?: number,
): { date: Date; hasAvailableSlots: boolean }[] => {
  const dates: { date: Date; hasAvailableSlots: boolean }[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // Skip weekends (optional - can be configured)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue; // Skip Sunday (0) and Saturday (6)
    }

    // All dates have available slots since we removed conflict checking
    dates.push({
      date,
      hasAvailableSlots: true, // Always true
    });
  }

  return dates;
};

// Check if a specific datetime is available
export const isTimeSlotAvailable = (
  datetime: string,
  excludeAppointmentId?: number,
): boolean => {
  const slotDate = new Date(datetime);
  const hours = slotDate.getHours();
  const minutes = slotDate.getMinutes();

  // Check if time is within working hours and on valid intervals
  const isWithinWorkingHours =
    hours >= WORKING_HOURS.start && hours < WORKING_HOURS.end;
  const isValidInterval = minutes % WORKING_HOURS.slotInterval === 0;

  // Also check for weekend (but still allow booking)
  const dayOfWeek = slotDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // For now, allow all slots within working hours with correct intervals
  // We can add more restrictions later if needed
  return isWithinWorkingHours && isValidInterval;
};

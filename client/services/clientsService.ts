import api from "../api/axios";

export interface Client {
  id: number;
  CIN: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  adresse: string;
  numero_telephone: string;
  email: string;
  groupe_sanguin: string;
  antecedents: string;
  allergies: string;
  commentaire: string;
  created_at: string;
  Cree_par: string;
}

export interface Utilisateur {
  id: number;
  CIN: string;
  nom: string;
}

// Create/Update form data interface
export interface ClientFormData {
  CIN: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  adresse: string;
  numero_telephone: string;
  email: string;
  groupe_sanguin: string;
  antecedents: string;
  allergies: string;
  commentaire: string;
  Cree_par: string;
}

import { ActivitiesService } from "./activitiesService";
import { AuthService } from "./authService";

// Mock data storage - in real app this would connect to your backend
let mockClients: Client[] = [];

export class ClientsService {
  // Get all clients
  static async getAll(): Promise<Client[]> {
    const result = await api.get(`client`);
    const data = result.data;
    mockClients = data.map((client) => ({
      id: client.id,
      CIN: client.CIN,
      nom: client.nom,
      prenom: client.prenom,
      date_naissance: client.date_naissance,
      adresse: client.adresse,
      numero_telephone: client.numero_telephone,
      email: client.email,
      groupe_sanguin: client.groupe_sanguin,
      antecedents: client.antecedents,
      allergies: client.allergies,
      commentaire: client.commentaire,
      created_at: client.created_at,
      Cree_par: client.Cree_par,
    }));
    return mockClients.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  // Get client by ID
  static async getById(id: number): Promise<Client | null> {
    if (mockClients.length === 0) {
      await this.getAll();
    }
    const client = mockClients.find((client) => client.id === id);
    return client || null;
  }

  static async getByCIN(CIN: string): Promise<Client | null> {
    if (mockClients.length === 0) {
      await this.getAll();
    }
    const client = mockClients.find((client) => client.CIN === CIN);
    return client || null;
  }

  // Create new client
  static async create(data: ClientFormData): Promise<Client> {
    const currentUser = AuthService.getCurrentUser();
    const result = await api.post(`client`, {
      CIN: data.CIN,
      nom: data.nom,
      prenom: data.prenom,
      date_naissance: data.date_naissance,
      adresse: data.adresse,
      numero_telephone: data.numero_telephone,
      groupe_sanguin: data.groupe_sanguin,
      email: data.email,
      commentaire: data.commentaire,
      allergies: data.allergies,
      antecedents: data.antecedents,
      Cree_par: currentUser.CIN,
    });

    const newClient: Client = {
      id: result.data.id,
      CIN: data.CIN,
      nom: data.nom,
      prenom: data.prenom,
      date_naissance: data.date_naissance,
      adresse: data.adresse,
      numero_telephone: data.numero_telephone,
      groupe_sanguin: data.groupe_sanguin,
      email: data.email,
      allergies: data.allergies,
      antecedents: data.antecedents,
      commentaire: data.commentaire,
      created_at: result.created_at,
      Cree_par: currentUser.CIN,
    };

    mockClients.push(newClient);

    ActivitiesService.logActivity(
      "patient",
      "created",
      newClient.id,
      `${newClient.prenom} ${newClient.nom}`,
      data.Cree_par,
    );

    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent("activityLogged"));

    return newClient;
  }

  // Update existing client
  static async update(
    id: number,
    data: ClientFormData,
  ): Promise<Client | null> {
    const index = mockClients.findIndex((client) => client.id === id);
    if (index === -1) return null;
    const currentUser = AuthService.getCurrentUser();
    const result = await api.patch(`client/${id}`, {
      CIN: data.CIN,
      nom: data.nom,
      prenom: data.prenom,
      date_naissance: data.date_naissance,
      adresse: data.adresse,
      numero_telephone: data.numero_telephone,
      groupe_sanguin: data.groupe_sanguin,
      email: data.email,
      commentaire: data.commentaire,
      allergies: data.allergies,
      antecedents: data.antecedents,
      Cree_par: currentUser.CIN,
    });
    const updatedClient: Client = {
      ...mockClients[index],
      ...data,
    };

    mockClients[index] = updatedClient;

    // Log activity
    ActivitiesService.logActivity(
      "patient",
      "updated",
      id,
      `${updatedClient.prenom} ${updatedClient.nom}`,
      data.Cree_par,
    );

    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent("activityLogged"));

    return updatedClient;
  }

  // Delete client
  static async delete(id: number): Promise<boolean> {
    const result = await api.delete(`client/${id}`);

    const index = mockClients.findIndex((client) => client.id === id);
    if (index === -1) return false;

    const deletedClient = mockClients[index];
    mockClients.splice(index, 1);

    // Log activity
    ActivitiesService.logActivity(
      "patient",
      "deleted",
      id,
      `${deletedClient.prenom} ${deletedClient.nom}`,
      "System", // Could be improved to track actual user
    );

    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent("activityLogged"));

    return true;
  }

  // Search clients
  static async search(query: string): Promise<Client[]> {
    const lowerQuery = query.toLowerCase();
    return mockClients.filter(
      (client) =>
        client.nom.toLowerCase().includes(lowerQuery) ||
        client.prenom.toLowerCase().includes(lowerQuery) ||
        client.CIN.toLowerCase().includes(lowerQuery) ||
        client.email.toLowerCase().includes(lowerQuery) ||
        client.numero_telephone.includes(query),
    );
  }

  // Filter clients
  static async filter(filters: {
    groupeSanguin?: string;
    creator?: string;
    ageRange?: string;
  }): Promise<Client[]> {
    return mockClients.filter((client) => {
      if (
        filters.groupeSanguin &&
        filters.groupeSanguin !== "tous" &&
        client.groupe_sanguin !== filters.groupeSanguin
      ) {
        return false;
      }

      if (
        filters.creator &&
        filters.creator !== "tous" &&
        client.Cree_par !== filters.creator
      ) {
        return false;
      }

      // Add age filtering logic if needed

      return true;
    });
  }
}

// Utility functions for validation
export const validateClientData = (data: ClientFormData): string[] => {
  const errors: string[] = [];

  if (!data.CIN.trim()) {
    errors.push("Le CIN est obligatoire");
  } else if (!/^[A-Z]{1,2}\d{5,}$/.test(data.CIN)) {
    errors.push("Le CIN doit suivre le format B1234567 ou BR54657");
  }

  if (!data.nom.trim()) {
    errors.push("Le nom est obligatoire");
  }

  if (!data.prenom.trim()) {
    errors.push("Le prénom est obligatoire");
  }

  // if (!data.date_naissance) {
  //   errors.push("La date de naissance est obligatoire");
  // } else {
  //   const birthDate = new Date(data.date_naissance);
  //   const now = new Date();
  //   const age = now.getFullYear() - birthDate.getFullYear();
  //   if (age < 0 || age > 120) {
  //     errors.push("La date de naissance n'est pas valide");
  //   }
  // }

  if (data.date_naissance) {
    const birthDate = new Date(data.date_naissance);
    const now = new Date();
    const age = now.getFullYear() - birthDate.getFullYear();
    if (age < 0 || age > 120) {
      errors.push("La date de naissance n'est pas valide");
    }
  }

  // if (!data.adresse.trim()) {
  //   errors.push("L'adresse est obligatoire");
  // }

  // if (!data.numero_telephone.trim()) {
  //   errors.push("Le numéro de téléphone est obligatoire");
  // } else

  if (
    data.numero_telephone.trim() &&
    !/^(\+212|0|\+33)[1-9]\d{7,8}$/.test(
      data.numero_telephone.replace(/\s/g, ""),
    )
  ) {
    errors.push("Le numéro de téléphone n'est pas au format belge valide");
  }

  // if (
  //   data.numero_telephone.trim() &&
  //   !/^(\+212|0|\+33)[1-9]\d{7,8}$/.test(
  //     data.numero_telephone.replace(/\s/g, ""),
  //   )
  // ) {
  //   errors.push("Le numéro de téléphone n'est pas au format belge valide");
  // }

  // if (!data.email.trim()) {
  //   errors.push("L'email est obligatoire");
  // } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
  //   errors.push("L'email n'est pas valide");
  // }

  if (data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("L'email n'est pas valide");
  }

  // if (!data.groupe_sanguin.trim()) {
  //   errors.push("Le groupe sanguin est obligatoire");
  // }

  if (!data.Cree_par.trim()) {
    errors.push("Le créateur est obligatoire");
  }

  return errors;
};

// Get available doctors/creators
export const getAvailableDoctors = (): string[] => {
  return ["Dr. Smith", "Dr. Martin", "Dr. Dubois", "Dr. Laurent"];
};

// Get blood groups
export const getBloodGroups = (): string[] => {
  return ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
};

// Calculate age from birth date
export const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

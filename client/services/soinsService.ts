import api from "../api/axios"; // Soin types
import { ActivitiesService } from "./activitiesService";
import { AuthService } from "./authService";
import { CurrencyService } from "./currencyService";
export interface Soin {
  id: number;
  Nom: string;
  Type: string;
  prix: number;
  Cree_par: string;
  created_at: string;
  Cabinet?: string;
  therapeute?: string | null;
}

export interface SoinFormData {
  Nom: string;
  Type: string;
  prix: number;
  Cree_par: string;
  Cabinet: string;
  therapeute: string;
}

// Mock data storage
let mockSoins: Soin[] = [];

export class SoinsService {
  // Get all soins
  static async getAll(): Promise<Soin[]> {
    mockSoins = [];
    const result = await api.get(`bien?type=SERVICE`);
    const data = result.data;

    mockSoins = data.map((service) => ({
      id: service.id,
      Nom: service.Nom,
      Type: service.Type,
      prix: service.prix,
      Cree_par: service.Cree_par,
      created_at: service.created_at,
      Cabinet: service.cabinet,
      therapeute: service.therapeute ?? null,
    }));
    return mockSoins.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  // Get soin by ID
  static async getById(id: number): Promise<Soin | null> {
    const soin = mockSoins.find((soin) => soin.id === id);
    return soin || null;
  }

  // Create new soin
  static async create(data: SoinFormData): Promise<Soin> {
    const currentUser = AuthService.getCurrentUser();
    const result = await api.post(`bien`, {
      Nom: data.Nom,
      bien_type: "SERVICE",
      Type: data.Type,
      prix: data.prix,
      stock: 1,
      cabinet: data.Cabinet,
      Cree_par: currentUser.CIN,
      therapeute: data.therapeute,
    });

    const newSoin: Soin = {
      id: Math.max(0, Math.max(0, ...mockSoins.map((soin) => soin.id))) + 1,
      ...data,
      created_at: new Date().toISOString(),
    };

    mockSoins.push(newSoin);

    ActivitiesService.logActivity(
      "soin",
      "created",
      newSoin.id,
      newSoin.Nom,
      data.Cree_par,
    );

    window.dispatchEvent(new CustomEvent("activityLogged"));

    return newSoin;
  }

  // Update existing soin
  static async update(id: number, data: SoinFormData): Promise<Soin | null> {
    const currentUser = AuthService.getCurrentUser();
    const result = await api.patch(`bien/${id}`, {
      Nom: data.Nom,
      bien_type: "SERVICE",
      Type: data.Type,
      prix: data.prix,
      cabinet: data.Cabinet,
      stock: 1,
      Cree_par: currentUser.CIN,
      therapeute: data.therapeute,
      // Cabinet intentionally not sent if backend doesn't support it
    });

    const index = mockSoins.findIndex((soin) => soin.id === id);
    if (index === -1) return null;

    const updatedSoin: Soin = {
      ...mockSoins[index],
      ...data,
    };

    mockSoins[index] = updatedSoin;
    return updatedSoin;
  }

  // Delete soin
  static async delete(id: number): Promise<boolean> {
    const result = await api.delete(`bien/${id}`);

    const index = mockSoins.findIndex((soin) => soin.id === id);
    if (index === -1) return false;

    mockSoins.splice(index, 1);
    return true;
  }

  // Search soins
  static async search(query: string): Promise<Soin[]> {
    const lowerQuery = query.toLowerCase();
    return mockSoins.filter(
      (soin) =>
        soin.Nom.toLowerCase().includes(lowerQuery) ||
        soin.Type.toLowerCase().includes(lowerQuery) ||
        soin.Cree_par.toLowerCase().includes(lowerQuery),
    );
  }

  // Get soins by type
  static async getByType(type: string): Promise<Soin[]> {
    return mockSoins.filter((soin) => soin.Type === type);
  }

  // Get price range statistics
  static async getPriceRange(): Promise<{
    min: number;
    max: number;
    avg: number;
  }> {
    const prices = mockSoins.map((soin) => soin.prix);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    };
  }
}

// Validation functions
export const validateSoinData = (data: SoinFormData): string[] => {
  const errors: string[] = [];

  if (!data.Nom.trim()) {
    errors.push("Le nom du soin est obligatoire");
  }

  if (!data.Type) {
    errors.push("Le type de soin est obligatoire");
  }

  if (!data.prix || data.prix <= 0) {
    errors.push("Le prix doit être supérieur à 0");
  }

  if (!data.Cree_par.trim()) {
    errors.push("Le créateur est obligatoire");
  }

  if (!data.Cabinet || !data.Cabinet.trim()) {
    errors.push("Le cabinet est obligatoire");
  }

  if (!data.therapeute || !data.therapeute.trim()) {
    errors.push("Le thérapeute est obligatoire");
  }

  return errors;
};

// Utility functions
export const getAvailableDoctors = (): string[] => {
  return ["Dr. Smith", "Dr. Martin", "Dr. Dubois", "Dr. Laurent"];
};

export const getSoinTypeColor = (type: string): string => {
  switch (type) {
    case "Consultation":
      return "bg-blue-100 text-blue-800";
    case "Diagnostic":
      return "bg-purple-100 text-purple-800";
    case "Préventif":
      return "bg-green-100 text-green-800";
    case "Thérapeutique":
      return "bg-orange-100 text-orange-800";
    case "Chirurgie":
      return "bg-red-100 text-red-800";
    case "Rééducation":
      return "bg-indigo-100 text-indigo-800";
    case "Urgence":
      return "bg-yellow-100 text-yellow-800";
    case "Suivi":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const formatPrice = (price: number): string => {
  return CurrencyService.formatCurrency(price);
};

export const createEmptySoin = (CIN?: string): SoinFormData => {
  return {
    Nom: "",
    Type: "Consultation",
    prix: 0,
    Cree_par: CIN || "",
    Cabinet: "Biohacking",
    therapeute: "",
  };
};

// Get statistics by type
export const getStatisticsByType = (soins: Soin[]) => {
  const statsByType: Record<
    string,
    { count: number; totalRevenue: number; avgPrice: number }
  > = {};

  const uniqueTypes = Array.from(new Set(soins.map((s) => s.Type)));
  uniqueTypes.forEach((type) => {
    const soinsOfType = soins.filter((soin) => soin.Type === type);
    const totalRevenue = soinsOfType.reduce((sum, soin) => sum + soin.prix, 0);

    statsByType[type] = {
      count: soinsOfType.length,
      totalRevenue,
      avgPrice: soinsOfType.length > 0 ? totalRevenue / soinsOfType.length : 0,
    };
  });

  return statsByType;
};

// Calculate revenue statistics
export const getRevenueStatistics = (soins: Soin[]) => {
  const totalRevenue = soins.reduce((total, soin) => total + soin.prix, 0);
  const averagePrice = soins.length > 0 ? totalRevenue / soins.length : 0;
  const highestPrice = Math.max(...soins.map((soin) => soin.prix));
  const lowestPrice = Math.min(...soins.map((soin) => soin.prix));

  return {
    totalRevenue,
    averagePrice,
    highestPrice,
    lowestPrice,
    totalServices: soins.length,
  };
};

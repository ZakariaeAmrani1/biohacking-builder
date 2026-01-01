import api from "../api/axios";
export interface Entreprise {
  id: number;
  ICE: number;
  CNSS: number;
  RC: number;
  IF: number;
  RIB: number;
  patente: number;
  adresse: string;
  email?: string;
  numero_telephone?: string;
  created_at: string;
}

export interface EntrepriseFormData {
  ICE: number | string;
  CNSS: number | string;
  RC: number | string;
  IF: number | string;
  RIB: number | string;
  patente: number | string;
  adresse: string;
  email?: string;
  numero_telephone?: string;
}

// Mock company data
let currentEntreprise: Entreprise | null = null;

export class EntrepriseService {
  // Get company information
  static async getEntreprise(): Promise<Entreprise | null> {
    try {
      const result = await api.get(`entreprise`);
      const data = result.data;
      if (data !== "") {
        currentEntreprise = {
          id: data.id,
          ICE: data.ICE,
          CNSS: data.CNSS,
          RC: data.RC,
          IF: data.IF,
          RIB: data.RIB,
          patente: data.patente,
          adresse: data.adresse,
          email: data.email,
          numero_telephone: data.numero_telephone,
          created_at: data.created_at,
        };
        return currentEntreprise;
      }
    } catch (error) {
      throw new Error("Erreur: " + error.response.data.message);
    }
    return null;
  }

  // Update company information
  static async updateEntreprise(data: EntrepriseFormData): Promise<Entreprise> {
    try {
      const result = await api.patch(
        `entreprise/${currentEntreprise.id}`,
        data,
      );

      const numericData = {
        ICE: typeof data.ICE === "string" ? parseInt(data.ICE) : data.ICE,
        CNSS: typeof data.CNSS === "string" ? parseInt(data.CNSS) : data.CNSS,
        RC: typeof data.RC === "string" ? parseInt(data.RC) : data.RC,
        IF: typeof data.IF === "string" ? parseInt(data.IF) : data.IF,
        RIB: typeof data.RIB === "string" ? parseInt(data.RIB) : data.RIB,
        patente:
          typeof data.patente === "string"
            ? parseInt(data.patente)
            : data.patente,
        adresse: data.adresse,
        email: data.email,
        numero_telephone: data.numero_telephone,
      };
      const updatedEntreprise: Entreprise = {
        ...currentEntreprise!,
        ...numericData,
      };

      currentEntreprise = updatedEntreprise;

      return updatedEntreprise;
    } catch (error) {
      throw new Error("Erreur: " + error.response.data.message);
    }
  }

  // Create new company information
  static async createEntreprise(data: EntrepriseFormData): Promise<Entreprise> {
    // Convert string numbers to integers

    try {
      const result = await api.post(`entreprise/`, data);

      const numericData = {
        ICE: typeof data.ICE === "string" ? parseInt(data.ICE) : data.ICE,
        CNSS: typeof data.CNSS === "string" ? parseInt(data.CNSS) : data.CNSS,
        RC: typeof data.RC === "string" ? parseInt(data.RC) : data.RC,
        IF: typeof data.IF === "string" ? parseInt(data.IF) : data.IF,
        RIB: typeof data.RIB === "string" ? parseInt(data.RIB) : data.RIB,
        patente:
          typeof data.patente === "string"
            ? parseInt(data.patente)
            : data.patente,
        adresse: data.adresse,
        email: data.email,
        numero_telephone: data.numero_telephone,
      };
      const newEntreprise: Entreprise = {
        id: result.data.id,
        ...numericData,
        created_at: new Date().toISOString(),
      };

      currentEntreprise = newEntreprise;

      return newEntreprise;
    } catch (error) {
      throw new Error("Erreur: " + error.response.data.message);
    }
  }

  // Validate company form data
  static validateEntrepriseData(data: EntrepriseFormData): string[] {
    const errors: string[] = [];

    // Convert to numbers for validation
    const ice = typeof data.ICE === "string" ? parseInt(data.ICE) : data.ICE;
    const cnss =
      typeof data.CNSS === "string" ? parseInt(data.CNSS) : data.CNSS;
    const rc = typeof data.RC === "string" ? parseInt(data.RC) : data.RC;
    const ifNumber = typeof data.IF === "string" ? parseInt(data.IF) : data.IF;
    const rib = typeof data.RIB === "string" ? parseInt(data.RIB) : data.RIB;
    const patente =
      typeof data.patente === "string" ? parseInt(data.patente) : data.patente;

    if (!data.ICE || isNaN(ice) || ice <= 0) {
      errors.push("L'ICE est obligatoire et doit être un nombre valide");
    }

    if (!data.CNSS || isNaN(cnss) || cnss <= 0) {
      errors.push("Le CNSS est obligatoire et doit être un nombre valide");
    }

    if (!data.RC || isNaN(rc) || rc <= 0) {
      errors.push("Le RC est obligatoire et doit être un nombre valide");
    }

    if (!data.IF || isNaN(ifNumber) || ifNumber <= 0) {
      errors.push("L'IF est obligatoire et doit être un nombre valide");
    }

    if (!data.RIB || isNaN(rib) || rib <= 0) {
      errors.push("Le RIB est obligatoire et doit être un nombre valide");
    }

    if (!data.patente || isNaN(patente) || patente <= 0) {
      errors.push("La patente est obligatoire et doit être un nombre valide");
    }

    if (!data.adresse.trim()) {
      errors.push("L'adresse est obligatoire");
    }

    return errors;
  }

  // Save or update company information
  static async saveEntreprise(data: EntrepriseFormData): Promise<Entreprise> {
    if (currentEntreprise !== null) {
      return this.updateEntreprise(data);
    } else {
      return this.createEntreprise(data);
    }
  }
}

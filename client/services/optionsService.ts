import api from "@/api/axios";

export interface OptionLists {
  bankNames: string[];
  appointmentTypes: string[];
  soinTypes: string[];
}

const defaultOptions: OptionLists = {
  bankNames: [
    "Attijariwafa bank",
    "BMCE Bank of Africa",
    "CIH Bank",
    "Banque Populaire",
    "Société Générale",
    "Crédit du Maroc",
    "BMCI",
    "Bank Al-Maghrib",
  ],
  appointmentTypes: [
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
  ],
  soinTypes: [
    "Consultation",
    "Diagnostic",
    "Préventif",
    "Thérapeutique",
    "Chirurgie",
    "Rééducation",
    "Urgence",
    "Suivi",
  ],
};

export class OptionsService {
  static async getAll(): Promise<OptionLists> {
    try {
      const result = await api.get(`options`);

      const data = result.data as OptionLists;
      console.log(data);
      return {
        bankNames: Array.isArray(data.bankNames)
          ? data.bankNames
          : defaultOptions.bankNames,
        appointmentTypes: Array.isArray(data.appointmentTypes)
          ? data.appointmentTypes
          : defaultOptions.appointmentTypes,
        soinTypes: Array.isArray(data.soinTypes)
          ? data.soinTypes
          : defaultOptions.soinTypes,
      };
    } catch (error) {
      throw Error("Erreur");
    }
  }

  static async getAppointmentTypes(): Promise<string[]> {
    const data = await this.getAll();
    return data.appointmentTypes;
  }

  static async getBankNames(): Promise<string[]> {
    const data = await this.getAll();
    return data.bankNames;
  }

  static async getSoinTypes(): Promise<string[]> {
    const data = await this.getAll();
    return data.soinTypes;
  }

  static async update(partial: Partial<OptionLists>): Promise<OptionLists> {
    try {
      const result = await api.put(`options`, partial);

      return result.data as OptionLists;
    } catch (error) {
      console.log(error);
      throw new Error("Impossible de sauvegarder les options");
    }
  }
}

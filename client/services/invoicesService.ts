import { CurrencyService } from "./currencyService";
import api from "../api/axios";
import { AuthService } from "./authService";
import { ProductsService } from "./productsService";

// Invoice types
export interface Facture {
  id: number;
  CIN: string;
  date: string;
  prix_total: number;
  prix_ht: number;
  tva_amount: number;
  tva_rate: number;
  statut: FactureStatut;
  notes: string;
  date_paiement?: string;
  methode_paiement?: string;
  cheque_numero?: string;
  cheque_banque?: string;
  cheque_date_tirage?: string;
  Cree_par: string;
  created_at: string;
}

export interface FactureBien {
  id: number;
  id_facture: number;
  id_bien: number;
  type_bien: TypeBien;
  quantite: number;
  Cree_par: string;
  prix_unitaire: number;
  nom_bien: string;
}

export interface FactureFormData {
  CIN: string;
  date: string;
  statut: FactureStatut;
  notes: string;
  Cree_par: string;
  date_paiement?: string;
  methode_paiement?: string;
  cheque_numero?: string;
  cheque_banque?: string;
  cheque_date_tirage?: string;
  items: FactureItem[];
}

export interface FactureItem {
  id_bien: number;
  type_bien: TypeBien;
  quantite: number;
  prix_unitaire: number;
  nom_bien: string;
}

export interface FactureWithDetails extends Facture {
  items: FactureBien[];
  patient_name?: string;
}

// Enums
export enum FactureStatut {
  BROUILLON = "Brouillon",
  ENVOYEE = "Envoyée",
  PAYEE = "Payée",
  ANNULEE = "Annulée",
  EN_RETARD = "En retard",
}

export enum TypeBien {
  PRODUIT = "produit",
  SOIN = "soin",
}

// Mock data storage
let mockFactures: Facture[] = [];

let mockFactureBiens: FactureBien[] = [];

// Helpers for stock adjustments
const buildProductQtyMap = (
  items: Array<FactureItem | FactureBien>,
): Map<number, number> => {
  const map = new Map<number, number>();
  for (const it of items) {
    // @ts-ignore - both types have type_bien, id_bien, quantite
    if ((it as any).type_bien === TypeBien.PRODUIT) {
      const id = (it as any).id_bien as number;
      const qty = (it as any).quantite as number;
      map.set(id, (map.get(id) || 0) + qty);
    }
  }
  return map;
};

const clamp = (n: number, min: number) => (n < min ? min : n);

const adjustProductStocks = async (
  qtyMap: Map<number, number>,
  sign: -1 | 1,
) => {
  for (const [productId, qty] of qtyMap) {
    let product = await ProductsService.getById(productId);
    if (!product) {
      await ProductsService.getAll();
      product = await ProductsService.getById(productId);
    }
    if (!product) continue;
    const delta = qty * sign;
    const newStock = clamp(product.stock + delta, 0);
    await ProductsService.update(productId, {
      Nom: product.Nom,
      prix: product.prix,
      stock: newStock,
      Cree_par: AuthService.getCurrentUser().CIN,
    });
  }
};

export class InvoicesService {
  static async getAll(): Promise<Facture[]> {
    mockFactures = [];
    mockFactureBiens = [];
    const result = await api.get(`facture`);
    const data = result.data;

    mockFactures = data.map((facture) => ({
      id: facture.id,
      CIN: facture.CIN,
      date: facture.date,
      prix_ht: facture.date,
      tva_amount: facture.date,
      tva_rate: 20,
      prix_total: facture.prix_total,
      statut:
        facture.statut === "Brouillon"
          ? FactureStatut.BROUILLON
          : facture.statut === "Envoyée"
            ? FactureStatut.ENVOYEE
            : facture.statut === "Payée"
              ? FactureStatut.PAYEE
              : facture.statut === "Annulée"
                ? FactureStatut.ANNULEE
                : FactureStatut.EN_RETARD,
      notes: facture.notes,
      date_paiement: facture.date_paiement,
      methode_paiement: facture.methode_paiement,
      cheque_numero: facture.cheque_numero,
      cheque_banque: facture.cheque_banque,
      cheque_date_tirage: new Date(facture.cheque_date_tirage)
        .toISOString()
        .slice(0, 10),
      Cree_par: facture.Cree_par,
      created_at: facture.created_at,
    }));

    const result1 = await api.get(`facture-bien`);
    const data1 = result1.data;

    mockFactureBiens = data1.map((facture) => ({
      id: facture.id,
      id_facture: facture.id_facture,
      id_bien: facture.id_bien,
      type_bien: facture.type_bien,
      quantite: facture.quantite,
      Cree_par: facture.Cree_par,
      nom_bien: facture.bien.Nom,
      movementType: facture.movementType,
      prix_unitaire: facture.prix,
    }));
    return mockFactures.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  static async getAllWithDetails(): Promise<FactureWithDetails[]> {
    return mockFactures.map((facture) => ({
      ...facture,
      items: mockFactureBiens.filter((item) => item.id_facture === facture.id),
    }));
  }

  static async getById(id: number): Promise<FactureWithDetails | null> {
    const facture = mockFactures.find((facture) => facture.id === id);
    if (!facture) return null;

    const items = mockFactureBiens.filter((item) => item.id_facture === id);
    return {
      ...facture,
      items,
    };
  }

  // Get invoices by patient CIN
  static async getByPatientCIN(cin: string): Promise<Facture[]> {
    return mockFactures.filter((facture) => facture.CIN === cin);
  }

  // Create new invoice
  static async create(data: FactureFormData): Promise<FactureWithDetails> {
    const prix_ht = data.items.reduce(
      (total, item) => total + item.prix_unitaire * item.quantite,
      0,
    );
    const tva_rate = 20;
    const tva_amount = parseFloat((prix_ht * (tva_rate / 100)).toFixed(2));
    const prix_total = parseFloat((prix_ht + tva_amount).toFixed(2));
    const currentUser = AuthService.getCurrentUser();
    const result = await api.post(`facture`, {
      CIN: data.CIN,
      date: data.date,
      prix_total: prix_total,
      statut: data.statut,
      notes: data.notes ? data.notes : null,
      date_paiement: data.date_paiement
        ? new Date(data.date_paiement).toISOString()
        : null,
      methode_paiement: data.methode_paiement ? data.methode_paiement : null,
      cheque_numero: data.cheque_numero ? data.cheque_numero : null,
      cheque_banque: data.cheque_banque ? data.cheque_banque : null,
      cheque_date_tirage: data.cheque_date_tirage
        ? new Date(data.cheque_date_tirage).toISOString()
        : null,
      Cree_par: currentUser.CIN,
    });
    const facture_id = result.data.id;
    const newFacture: Facture = {
      id: facture_id,
      CIN: data.CIN,
      date: data.date,
      prix_ht,
      tva_amount,
      tva_rate,
      prix_total,
      statut: data.statut,
      notes: data.notes,
      Cree_par: data.Cree_par,
      created_at: new Date().toISOString(),
      date_paiement: data.date_paiement,
      methode_paiement: data.methode_paiement,
      cheque_numero: data.cheque_numero,
      cheque_banque: data.cheque_banque,
      cheque_date_tirage: data.cheque_date_tirage,
    };

    mockFactures.push(newFacture);
    const newItems: FactureBien[] = [];
    data.items.map(async (item) => {
      const res = await api.post(`facture-bien`, {
        id_facture: facture_id,
        id_bien: item.id_bien,
        type_bien: item.type_bien,
        quantite: item.quantite,
        prix: item.prix_unitaire,
        Cree_par: currentUser.CIN,
      });
      newItems.push({
        id: res.data.id,
        id_facture: newFacture.id,
        id_bien: item.id_bien,
        type_bien: item.type_bien,
        quantite: item.quantite,
        Cree_par: data.Cree_par,
        prix_unitaire: item.prix_unitaire,
        nom_bien: item.nom_bien,
      });
    });

    mockFactureBiens.push(...newItems);

    // Adjust stock if invoice is paid at creation
    if (data.statut === FactureStatut.PAYEE) {
      const qtyMap = buildProductQtyMap(data.items);
      await adjustProductStocks(qtyMap, -1);
    }

    return {
      ...newFacture,
      items: newItems,
    };
  }

  // Update existing invoice
  static async update(
    id: number,
    data: FactureFormData,
  ): Promise<FactureWithDetails | null> {
    const index = mockFactures.findIndex((facture) => facture.id === id);
    if (index === -1) return null;

    const prix_ht = data.items.reduce(
      (total, item) => total + item.prix_unitaire * item.quantite,
      0,
    );
    const tva_rate = 20;
    const tva_amount = parseFloat((prix_ht * (tva_rate / 100)).toFixed(2));
    const prix_total = parseFloat((prix_ht + tva_amount).toFixed(2));

    const currentUser = AuthService.getCurrentUser();
    const result = await api.patch(`facture/${id}`, {
      CIN: data.CIN,
      date: data.date,
      prix_total: prix_total,
      statut: data.statut,
      notes: data.notes ? data.notes : null,
      date_paiement: data.date_paiement
        ? new Date(data.date_paiement).toISOString()
        : null,
      methode_paiement: data.methode_paiement ? data.methode_paiement : null,
      cheque_numero: data.cheque_numero ? data.cheque_numero : null,
      cheque_banque: data.cheque_banque ? data.cheque_banque : null,
      cheque_date_tirage: data.cheque_date_tirage
        ? new Date(data.cheque_date_tirage).toISOString()
        : null,
      Cree_par: currentUser.CIN,
    });

    const updatedFacture: Facture = {
      ...mockFactures[index],
      CIN: data.CIN,
      date: data.date,
      prix_ht,
      tva_amount,
      tva_rate,
      prix_total,
      statut: data.statut,
      notes: data.notes,
      Cree_par: data.Cree_par,
      date_paiement: data.date_paiement
        ? new Date(data.date_paiement).toISOString()
        : null,
      methode_paiement: data.methode_paiement ? data.methode_paiement : null,
      cheque_numero: data.cheque_numero ? data.cheque_numero : null,
      cheque_banque: data.cheque_banque ? data.cheque_banque : null,
      cheque_date_tirage: data.cheque_date_tirage
        ? new Date(data.cheque_date_tirage).toISOString().slice(0, 10)
        : null,
    };

    const oldStatus = mockFactures[index].statut;
    const oldItems = mockFactureBiens.filter((item) => item.id_facture === id);
    const oldQtyMap = buildProductQtyMap(oldItems);
    const newQtyMap = buildProductQtyMap(data.items);

    mockFactures[index] = updatedFacture;

    await api.delete(`facture-bien/${id}`);

    mockFactureBiens = mockFactureBiens.filter(
      (item) => item.id_facture !== id,
    );

    const newItems: FactureBien[] = [];
    data.items.map(async (item) => {
      const res = await api.post(`facture-bien`, {
        id_facture: id,
        id_bien: item.id_bien,
        type_bien: item.type_bien,
        quantite: item.quantite,
        prix: item.prix_unitaire,
        Cree_par: currentUser.CIN,
      });

      newItems.push({
        id: res.data.id,
        id_facture: id,
        id_bien: item.id_bien,
        type_bien: item.type_bien,
        quantite: item.quantite,
        Cree_par: data.Cree_par,
        prix_unitaire: item.prix_unitaire,
        nom_bien: item.nom_bien,
      });
    });

    mockFactureBiens.push(...newItems);

    // Stock adjustment logic on update
    if (
      oldStatus !== FactureStatut.PAYEE &&
      data.statut === FactureStatut.PAYEE
    ) {
      // became paid: decrement by new quantities
      await adjustProductStocks(newQtyMap, -1);
    } else if (
      oldStatus === FactureStatut.PAYEE &&
      data.statut !== FactureStatut.PAYEE
    ) {
      // became non-paid: restock old quantities
      await adjustProductStocks(oldQtyMap, 1);
    } else if (
      oldStatus === FactureStatut.PAYEE &&
      data.statut === FactureStatut.PAYEE
    ) {
      // still paid: adjust by delta between new and old
      const deltaMap = new Map<number, number>();
      const keys = new Set<number>([...oldQtyMap.keys(), ...newQtyMap.keys()]);
      for (const k of keys) {
        const delta = (newQtyMap.get(k) || 0) - (oldQtyMap.get(k) || 0);
        if (delta !== 0) deltaMap.set(k, delta);
      }
      // For positive delta, decrement; for negative delta, increment
      const decMap = new Map<number, number>();
      const incMap = new Map<number, number>();
      for (const [k, v] of deltaMap) {
        if (v > 0) decMap.set(k, v);
        else incMap.set(k, -v);
      }
      if (decMap.size > 0) await adjustProductStocks(decMap, -1);
      if (incMap.size > 0) await adjustProductStocks(incMap, 1);
    }

    return {
      ...updatedFacture,
      items: newItems,
    };
  }

  // Delete invoice
  static async delete(id: number): Promise<boolean> {
    const index = mockFactures.findIndex((facture) => facture.id === id);
    if (index === -1) return false;

    const wasPaid = mockFactures[index].statut === FactureStatut.PAYEE;
    const itemsToRevert = mockFactureBiens.filter((i) => i.id_facture === id);

    await api.delete(`facture-bien/${id}`);
    await api.delete(`facture/${id}`);

    mockFactures.splice(index, 1);
    mockFactureBiens = mockFactureBiens.filter(
      (item) => item.id_facture !== id,
    );

    if (wasPaid) {
      const qtyMap = buildProductQtyMap(itemsToRevert);
      await adjustProductStocks(qtyMap, 1);
    }

    return true;
  }

  // Search invoices
  static async search(query: string): Promise<Facture[]> {
    const lowerQuery = query.toLowerCase();
    return mockFactures.filter(
      (facture) =>
        facture.CIN.toLowerCase().includes(lowerQuery) ||
        facture.Cree_par.toLowerCase().includes(lowerQuery) ||
        facture.notes.toLowerCase().includes(lowerQuery),
    );
  }

  // Update invoice status
  static async updateStatus(
    id: number,
    status: FactureStatut,
    date_paiement?: string,
    methode_paiement?: string,
    cheque_numero?: string,
    cheque_banque?: string,
    cheque_date_tirage?: string,
  ): Promise<Facture | null> {
    const index = mockFactures.findIndex((facture) => facture.id === id);
    if (index === -1) return null;
    const payload: any = { statut: status };
    if (date_paiement)
      payload.date_paiement = new Date(date_paiement).toISOString();
    if (methode_paiement) payload.methode_paiement = methode_paiement;
    if (cheque_numero) payload.cheque_numero = cheque_numero;
    if (cheque_banque) payload.cheque_banque = cheque_banque;
    if (cheque_date_tirage)
      payload.cheque_date_tirage = new Date(cheque_date_tirage).toISOString();
    const prevStatus = mockFactures[index].statut;

    await api.patch(`facture/${id}`, payload);
    mockFactures[index].statut = status;
    mockFactures[index].date_paiement = date_paiement;
    if (methode_paiement)
      mockFactures[index].methode_paiement = methode_paiement;
    if (cheque_numero) mockFactures[index].cheque_numero = cheque_numero;
    if (cheque_banque) mockFactures[index].cheque_banque = cheque_banque;
    if (cheque_date_tirage)
      mockFactures[index].cheque_date_tirage = cheque_date_tirage;

    if (prevStatus !== FactureStatut.PAYEE && status === FactureStatut.PAYEE) {
      const items = mockFactureBiens.filter((i) => i.id_facture === id);
      const qtyMap = buildProductQtyMap(items);
      await adjustProductStocks(qtyMap, -1);
    } else if (
      prevStatus === FactureStatut.PAYEE &&
      status !== FactureStatut.PAYEE
    ) {
      const items = mockFactureBiens.filter((i) => i.id_facture === id);
      const qtyMap = buildProductQtyMap(items);
      await adjustProductStocks(qtyMap, 1);
    }

    return mockFactures[index];
  }
}

// Validation functions
export const validateFactureData = (data: FactureFormData): string[] => {
  const errors: string[] = [];

  if (!data.CIN.trim()) {
    errors.push("Le CIN du patient est obligatoire");
  }

  if (!data.date) {
    errors.push("La date de la facture est obligatoire");
  }

  if (!data.Cree_par.trim()) {
    errors.push("Le créateur est obligatoire");
  }

  if (data.statut === FactureStatut.PAYEE && !data.date_paiement) {
    errors.push("La date de paiement est obligatoire pour une facture payée");
  }

  if (data.methode_paiement === "Par chéque") {
    if (!data.cheque_numero || !data.cheque_numero.trim()) {
      errors.push(
        "Le numéro de chèque est requis lorsque le paiement est par chèque",
      );
    }
    if (!data.cheque_banque || !data.cheque_banque.trim()) {
      errors.push(
        "Le nom de la banque est requis lorsque le paiement est par chèque",
      );
    }
    if (!data.cheque_date_tirage) {
      errors.push(
        "La date de tirage du chèque est requise lorsque le paiement est par chèque",
      );
    }
  }

  if (!data.items || data.items.length === 0) {
    errors.push("Au moins un article est requis");
  } else {
    data.items.forEach((item, index) => {
      if (!item.id_bien) {
        errors.push(
          `L'article ${index + 1} doit avoir un produit/service sélectionné`,
        );
      }
      if (item.quantite <= 0) {
        errors.push(
          `L'article ${index + 1} doit avoir une quantité supérieure à 0`,
        );
      }
      if (item.prix_unitaire <= 0) {
        errors.push(`L'article ${index + 1} doit avoir un prix supérieur à 0`);
      }
    });
  }

  return errors;
};

// Utility functions
export const getAvailableDoctors = (): string[] => {
  return ["Dr. Smith", "Dr. Martin", "Dr. Dubois", "Dr. Laurent"];
};

export const getFactureStatuses = (): FactureStatut[] => {
  return Object.values(FactureStatut);
};

export const getStatusColor = (status: FactureStatut): string => {
  switch (status) {
    case FactureStatut.BROUILLON:
      return "bg-gray-100 text-gray-800";
    case FactureStatut.ENVOYEE:
      return "bg-blue-100 text-blue-800";
    case FactureStatut.PAYEE:
      return "bg-green-100 text-green-800";
    case FactureStatut.ANNULEE:
      return "bg-red-100 text-red-800";
    case FactureStatut.EN_RETARD:
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const formatPrice = (price: number): string => {
  return CurrencyService.formatCurrency(price);
};

export const createEmptyFacture = (CIN?: string): FactureFormData => {
  return {
    CIN: "",
    date: new Date().toISOString().slice(0, 16),
    statut: FactureStatut.BROUILLON,
    notes: "",
    Cree_par: CIN,
    date_paiement: undefined,
    methode_paiement: undefined,
    cheque_numero: undefined,
    cheque_banque: undefined,
    cheque_date_tirage: new Date().toISOString().slice(0, 16),
    items: [],
  };
};

export const createEmptyItem = (): FactureItem => {
  return {
    id_bien: 0,
    type_bien: TypeBien.PRODUIT,
    quantite: 1,
    prix_unitaire: 0,
    nom_bien: "",
  };
};

// Get invoice statistics
export const getInvoiceStatistics = (factures: Facture[]) => {
  const totalInvoices = factures.length;
  const totalRevenue = factures.reduce(
    (sum, facture) => sum + facture.prix_total,
    0,
  );
  const paidInvoices = factures.filter(
    (f) => f.statut === FactureStatut.PAYEE,
  ).length;
  const pendingInvoices = factures.filter(
    (f) => f.statut === FactureStatut.ENVOYEE,
  ).length;
  const overdueInvoices = factures.filter(
    (f) => f.statut === FactureStatut.EN_RETARD,
  ).length;
  const draftInvoices = factures.filter(
    (f) => f.statut === FactureStatut.BROUILLON,
  ).length;

  return {
    totalInvoices,
    totalRevenue,
    paidInvoices,
    pendingInvoices,
    overdueInvoices,
    draftInvoices,
    averageInvoiceValue: totalInvoices > 0 ? totalRevenue / totalInvoices : 0,
  };
};

// Calculate invoice total
export const calculateInvoiceTotal = (items: FactureItem[]): number => {
  return items.reduce(
    (total, item) => total + item.prix_unitaire * item.quantite,
    0,
  );
};

// Calculate invoice totals with TVA
export const calculateInvoiceTotals = (
  items: FactureItem[],
): {
  prix_ht: number;
  tva_amount: number;
  tva_rate: number;
  prix_total: number;
} => {
  const prix_ht = items.reduce(
    (total, item) => total + item.prix_unitaire * item.quantite,
    0,
  );
  const tva_rate = 20;
  const tva_amount = parseFloat((prix_ht * (tva_rate / 100)).toFixed(2));
  const prix_total = parseFloat((prix_ht + tva_amount).toFixed(2));

  return {
    prix_ht,
    tva_amount,
    tva_rate,
    prix_total,
  };
};

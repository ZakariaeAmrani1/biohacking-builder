import api from "../api/axios";
import { CurrencyService } from "./currencyService";
import { ProductsService, Product } from "./productsService";
import { AuthService } from "./authService";

export type MovementType = "IN" | "OUT";

export interface InventoryMovementRaw {
  id: number;
  id_facture: number | null;
  id_bien: number;
  type_bien: string;
  quantite: number;
  Cree_par: string;
  prix: number;
  created_at: string;
  movementType: MovementType;
  bien?: { Nom: string };
}

export interface FactureRaw {
  id: number;
  CIN: string;
  date: string;
  prix_total: number;
  statut: string; // "Payée", etc.
  created_at: string;
}

export interface InventoryMovement {
  id: number;
  id_facture: number | null;
  id_bien: number;
  nom_bien: string;
  quantite: number;
  prix: number; // unit price
  total: number;
  movementType: MovementType;
  date: string; // OUT (invoice-linked) -> facture.date, otherwise -> created_at
  Cree_par: string;
  created_at: string;
}

export interface InventoryFormData {
  id_bien: number;
  quantite: number;
  prix: number;
  date?: string; // optional override, defaults to now
  movementType: MovementType;
}

const clamp = (n: number, min: number) => (n < min ? min : n);

export class InventoryService {
  private static async ensureProduct(
    productId: number,
  ): Promise<Product | null> {
    let p = await ProductsService.getById(productId);
    if (!p) {
      await ProductsService.getAll();
      p = await ProductsService.getById(productId);
    }
    return p || null;
  }

  static async getAll(): Promise<InventoryMovement[]> {
    const [factureRes, itemsRes] = await Promise.all([
      api.get<FactureRaw[]>(`facture`),
      api.get<InventoryMovementRaw[]>(`facture-bien`),
    ]);

    const facturesById = new Map<number, FactureRaw>();
    for (const f of factureRes.data) facturesById.set(f.id, f);

    const items = itemsRes.data.filter(
      (it) => (it.type_bien || "").toLowerCase() === "produit",
    );

    const result: InventoryMovement[] = [];
    for (const it of items) {
      const linkedFacture = it.id_facture
        ? facturesById.get(it.id_facture)
        : undefined;

      const isOut =
        it.movementType === "OUT" ||
        (!!it.id_facture && it.movementType !== "IN");

      // Invoice-linked OUT should only show when paid
      if (isOut && it.id_facture) {
        if (!linkedFacture) continue;
        if (linkedFacture.statut !== "Payée") continue;
      }

      // Manual OUT (no id_facture) should be included always
      if (isOut && !it.id_facture) {
        // ok
      }

      const nom_bien = it.bien?.Nom ?? "";
      const date = isOut && linkedFacture ? linkedFacture.date : it.created_at;
      result.push({
        id: it.id,
        id_facture: it.id_facture ?? null,
        id_bien: it.id_bien,
        nom_bien,
        quantite: it.quantite,
        prix: it.prix,
        total: it.prix * it.quantite,
        movementType: isOut ? "OUT" : "IN",
        date,
        Cree_par: it.Cree_par,
        created_at: it.created_at,
      });
    }

    // Sort by date desc
    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  static async createIN(data: InventoryFormData): Promise<InventoryMovement> {
    const current = AuthService.getCurrentUser();
    const payload: any = {
      id_bien: data.id_bien,
      type_bien: "produit",
      quantite: data.quantite,
      prix: data.prix,
      movementType: "IN",
      Cree_par: current?.CIN,
    };
    if (data.date) payload.created_at = new Date(data.date).toISOString();

    const res = await api.post(`facture-bien`, payload);

    let product = await InventoryService.ensureProduct(data.id_bien);
    if (product) {
      const newStock = clamp(product.stock + data.quantite, 0);
      await ProductsService.update(product.id, {
        Nom: product.Nom,
        prix: product.prix,
        stock: newStock,
        Cree_par: current?.CIN || "",
      });
      product = { ...product, stock: newStock };
    }

    const nom_bien = product?.Nom || "";

    const nowIso = data.date
      ? new Date(data.date).toISOString()
      : new Date().toISOString();
    return {
      id: res.data.id,
      id_facture: null,
      id_bien: data.id_bien,
      nom_bien,
      quantite: data.quantite,
      prix: data.prix,
      total: data.prix * data.quantite,
      movementType: "IN",
      date: nowIso,
      Cree_par: current?.CIN || "",
      created_at: nowIso,
    };
  }

  static async updateIN(id: number, data: InventoryFormData): Promise<boolean> {
    // Fetch previous IN movement to compute stock delta
    const allRes = await api.get<InventoryMovementRaw[]>(`facture-bien`);
    const prev = allRes.data.find(
      (it) => it.id === id && (it.type_bien || "").toLowerCase() === "produit",
    );

    const payload: any = {
      id_bien: data.id_bien,
      type_bien: "produit",
      quantite: data.quantite,
      prix: data.prix,
      movementType: "IN",
    };
    if (data.date) payload.created_at = new Date(data.date).toISOString();

    await api.patch(`facture-bien/${id}`, payload);

    const current = AuthService.getCurrentUser();

    if (prev) {
      if (prev.id_bien === data.id_bien) {
        // Same product: apply delta (IN adds stock)
        let product = await InventoryService.ensureProduct(data.id_bien);
        if (product) {
          const delta = data.quantite - prev.quantite;
          if (delta !== 0) {
            const newStock = clamp(product.stock + delta, 0);
            await ProductsService.update(product.id, {
              Nom: product.Nom,
              prix: product.prix,
              stock: newStock,
              Cree_par: current?.CIN || "",
            });
          }
        }
      } else {
        // Product changed: revert old, apply new
        const oldProduct = await InventoryService.ensureProduct(prev.id_bien);
        if (oldProduct) {
          const newStock = clamp(oldProduct.stock - prev.quantite, 0);
          await ProductsService.update(oldProduct.id, {
            Nom: oldProduct.Nom,
            prix: oldProduct.prix,
            stock: newStock,
            Cree_par: current?.CIN || "",
          });
        }
        const newProduct = await InventoryService.ensureProduct(data.id_bien);
        if (newProduct) {
          const newStock = clamp(newProduct.stock + data.quantite, 0);
          await ProductsService.update(newProduct.id, {
            Nom: newProduct.Nom,
            prix: newProduct.prix,
            stock: newStock,
            Cree_par: current?.CIN || "",
          });
        }
      }
    }

    return true;
  }

  static async createOUT(data: InventoryFormData): Promise<InventoryMovement> {
    const current = AuthService.getCurrentUser();
    const payload: any = {
      id_bien: data.id_bien,
      type_bien: "produit",
      quantite: data.quantite,
      prix: data.prix,
      movementType: "OUT",
      Cree_par: current?.CIN,
    };
    if (data.date) payload.created_at = new Date(data.date).toISOString();

    const res = await api.post(`facture-bien`, payload);

    let product = await InventoryService.ensureProduct(data.id_bien);
    if (product) {
      const newStock = clamp(product.stock - data.quantite, 0);
      await ProductsService.update(product.id, {
        Nom: product.Nom,
        prix: product.prix,
        stock: newStock,
        Cree_par: current?.CIN || "",
      });
      product = { ...product, stock: newStock };
    }

    const nom_bien = product?.Nom || "";
    const nowIso = data.date
      ? new Date(data.date).toISOString()
      : new Date().toISOString();
    return {
      id: res.data.id,
      id_facture: null,
      id_bien: data.id_bien,
      nom_bien,
      quantite: data.quantite,
      prix: data.prix,
      total: data.prix * data.quantite,
      movementType: "OUT",
      date: nowIso,
      Cree_par: current?.CIN || "",
      created_at: nowIso,
    };
  }

  static async updateOUT(
    id: number,
    data: InventoryFormData,
  ): Promise<boolean> {
    // Fetch previous OUT movement to compute stock delta
    const allRes = await api.get<InventoryMovementRaw[]>(`facture-bien`);
    const prev = allRes.data.find(
      (it) => it.id === id && (it.type_bien || "").toLowerCase() === "produit",
    );

    const payload: any = {
      id_bien: data.id_bien,
      type_bien: "produit",
      quantite: data.quantite,
      prix: data.prix,
      movementType: "OUT",
    };
    if (data.date) payload.created_at = new Date(data.date).toISOString();

    await api.patch(`facture-bien/${id}`, payload);

    const current = AuthService.getCurrentUser();

    if (prev) {
      if (prev.id_bien === data.id_bien) {
        // Same product: OUT reduces stock; apply delta accordingly
        let product = await InventoryService.ensureProduct(data.id_bien);
        if (product) {
          const deltaQty = data.quantite - prev.quantite; // positive means more OUT
          if (deltaQty !== 0) {
            const newStock = clamp(product.stock - deltaQty, 0);
            await ProductsService.update(product.id, {
              Nom: product.Nom,
              prix: product.prix,
              stock: newStock,
              Cree_par: current?.CIN || "",
            });
          }
        }
      } else {
        // Product changed: add back to old, subtract from new
        const oldProduct = await InventoryService.ensureProduct(prev.id_bien);
        if (oldProduct) {
          const newStock = clamp(oldProduct.stock + prev.quantite, 0);
          await ProductsService.update(oldProduct.id, {
            Nom: oldProduct.Nom,
            prix: oldProduct.prix,
            stock: newStock,
            Cree_par: current?.CIN || "",
          });
        }
        const newProduct = await InventoryService.ensureProduct(data.id_bien);
        if (newProduct) {
          const newStock = clamp(newProduct.stock - data.quantite, 0);
          await ProductsService.update(newProduct.id, {
            Nom: newProduct.Nom,
            prix: newProduct.prix,
            stock: newStock,
            Cree_par: current?.CIN || "",
          });
        }
      }
    }

    return true;
  }

  static async deleteMovement(
    id: number,
    movementType: MovementType,
  ): Promise<boolean> {
    // Fetch movement to revert stock
    const allRes = await api.get<InventoryMovementRaw[]>(`facture-bien`);
    const prev = allRes.data.find(
      (it) => it.id === id && (it.type_bien || "").toLowerCase() === "produit",
    );

    if (movementType === "IN") {
      await api.delete(`facture-bien/IN/${id}`);
    } else {
      await api.delete(`facture-bien/IN/${id}`);
    }

    if (prev) {
      let product = await InventoryService.ensureProduct(prev.id_bien);
      if (product) {
        const delta = movementType === "IN" ? -prev.quantite : +prev.quantite;
        const newStock = clamp(product.stock + delta, 0);
        await ProductsService.update(product.id, {
          Nom: product.Nom,
          prix: product.prix,
          stock: newStock,
          Cree_par: AuthService.getCurrentUser()?.CIN || "",
        });
      }
    }

    return true;
  }
}

export const formatPrice = (price: number): string => {
  return CurrencyService.formatCurrency(price);
};

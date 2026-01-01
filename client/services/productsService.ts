import { CurrencyService } from "./currencyService";
import api from "../api/axios";

// Product types
export interface Product {
  id: number;
  Nom: string;
  prix: number;
  stock: number;
  Cree_par: string;
  created_at: string;
}

export interface ProductFormData {
  Nom: string;
  prix: number;
  stock: number;
  Cree_par: string;
}

import { ActivitiesService } from "./activitiesService";
import { AuthService } from "./authService";

// Mock data storage
let mockProducts: Product[] = [];

export class ProductsService {
  // Get all products
  static async getAll(): Promise<Product[]> {
    mockProducts = [];
    const result = await api.get(`bien?type=PRODUIT`);
    const data = result.data;

    mockProducts = data.map((product) => ({
      id: product.id,
      Nom: product.Nom,
      prix: product.prix,
      stock: product.stock,
      Cree_par: product.Cree_par,
      created_at: product.created_at,
    }));
    return mockProducts.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  // Get product by ID
  static async getById(id: number): Promise<Product | null> {
    const product = mockProducts.find((product) => product.id === id);
    return product || null;
  }

  // Create new product
  static async create(data: ProductFormData): Promise<Product> {
    const currentUser = AuthService.getCurrentUser();
    const result = await api.post(`bien`, {
      Nom: data.Nom,
      bien_type: "PRODUIT",
      Type: "",
      prix: data.prix,
      stock: data.stock,
      Cree_par: currentUser.CIN,
    });

    const newProduct: Product = {
      id: Math.max(...mockProducts.map((product) => product.id)) + 1,
      ...data,
      created_at: new Date().toISOString(),
    };

    mockProducts.push(newProduct);

    // Log activity
    ActivitiesService.logActivity(
      "product",
      "created",
      newProduct.id,
      newProduct.Nom,
      data.Cree_par,
    );

    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent("activityLogged"));

    return newProduct;
  }

  // Update existing product
  static async update(
    id: number,
    data: ProductFormData,
  ): Promise<Product | null> {
    const currentUser = AuthService.getCurrentUser();
    const result = await api.patch(`bien/${id}`, {
      Nom: data.Nom,
      bien_type: "PRODUIT",
      Type: "",
      prix: data.prix,
      stock: data.stock,
      Cree_par: currentUser.CIN,
    });

    const index = mockProducts.findIndex((product) => product.id === id);
    if (index === -1) return null;

    const updatedProduct: Product = {
      ...mockProducts[index],
      ...data,
    };

    mockProducts[index] = updatedProduct;
    return updatedProduct;
  }

  // Delete product
  static async delete(id: number): Promise<boolean> {
    const result = await api.delete(`bien/${id}`);

    const index = mockProducts.findIndex((product) => product.id === id);
    if (index === -1) return false;

    mockProducts.splice(index, 1);
    return true;
  }

  // Search products
  static async search(query: string): Promise<Product[]> {
    const lowerQuery = query.toLowerCase();
    return mockProducts.filter(
      (product) =>
        product.Nom.toLowerCase().includes(lowerQuery) ||
        product.Cree_par.toLowerCase().includes(lowerQuery),
    );
  }

  // Get low stock products (stock <= threshold)
  static async getLowStock(threshold: number = 10): Promise<Product[]> {
    return mockProducts.filter((product) => product.stock <= threshold);
  }

  // Update stock
  static async updateStock(
    id: number,
    newStock: number,
  ): Promise<Product | null> {
    const index = mockProducts.findIndex((product) => product.id === id);
    if (index === -1) return null;

    mockProducts[index].stock = newStock;
    return mockProducts[index];
  }
}

// Validation functions
export const validateProductData = (data: ProductFormData): string[] => {
  const errors: string[] = [];

  if (!data.Nom.trim()) {
    errors.push("Le nom du produit est obligatoire");
  }

  if (!data.prix || data.prix <= 0) {
    errors.push("Le prix doit être supérieur à 0");
  }

  if (data.stock < 0) {
    errors.push("Le stock ne peut pas être négatif");
  }

  if (!data.Cree_par.trim()) {
    errors.push("Le créateur est obligatoire");
  }

  return errors;
};

// Utility functions
export const getAvailableDoctors = (): string[] => {
  return ["Dr. Smith", "Dr. Martin", "Dr. Dubois", "Dr. Laurent"];
};

export const formatPrice = (price: number): string => {
  return CurrencyService.formatCurrency(price);
};

export const getStockStatus = (
  stock: number,
): {
  status: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} => {
  if (stock === 0) {
    return { status: "Rupture", variant: "destructive" };
  } else if (stock <= 10) {
    return { status: "Stock faible", variant: "outline" };
  } else {
    return { status: "En stock", variant: "secondary" };
  }
};

export const createEmptyProduct = (CIN?: string): ProductFormData => {
  return {
    Nom: "",
    prix: 0,
    stock: 0,
    Cree_par: CIN || "",
  };
};

// Calculate total inventory value
export const calculateTotalValue = (products: Product[]): number => {
  return products.reduce(
    (total, product) => total + product.prix * product.stock,
    0,
  );
};

// Get stock statistics
export const getStockStatistics = (products: Product[]) => {
  const totalProducts = products.length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const inStock = products.filter((p) => p.stock > 10).length;
  const totalValue = calculateTotalValue(products);

  return {
    totalProducts,
    outOfStock,
    lowStock,
    inStock,
    totalValue,
  };
};

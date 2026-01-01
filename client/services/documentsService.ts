// Document types
import api from "../api/axios";
import { AuthService } from "./authService";

export interface Document {
  id: number;
  template_id: number;
  CIN: string;
  data_json: Record<string, any>;
  Cree_par: string;
  created_at: string;
}

export interface DocumentFormData {
  template_id: number;
  CIN: string;
  data_json: Record<string, any>;
  Cree_par: string;
}

// Mock data storage
let mockDocuments: Document[] = [];

export class DocumentsService {
  // Get all documents
  static async getAll(): Promise<Document[]> {
    mockDocuments = [];
    const result = await api.get(`document`);
    const data = result.data;

    mockDocuments = data.map((document) => ({
      id: document.id,
      template_id: document.template_id,
      CIN: document.CIN,
      data_json: document.data_json,
      Cree_par: document.Cree_par,
      created_at: document.created_at,
    }));
    return mockDocuments;
  }

  // Get documents by patient CIN
  static async getByPatientCIN(cin: string): Promise<Document[]> {
    await this.getAll();
    return mockDocuments.filter((doc) => doc.CIN === cin);
  }

  // Get document by ID
  static async getById(id: number): Promise<Document | null> {
    await this.getAll();
    const document = mockDocuments.find((doc) => doc.id === id);
    return document || null;
  }

  // Create new document
  static async create(data: DocumentFormData): Promise<Document> {
    const currentUser = AuthService.getCurrentUser();
    const result = await api.post(`document`, {
      template_id: data.template_id,
      CIN: data.CIN,
      data_json: data.data_json,
      Cree_par: currentUser.CIN,
    });
    const newDocument: Document = {
      id: result.data.id,
      ...data,
      created_at: new Date().toISOString(),
    };

    mockDocuments.push(newDocument);
    return newDocument;
  }

  // Update existing document
  static async update(
    id: number,
    data: DocumentFormData,
  ): Promise<Document | null> {
    const index = mockDocuments.findIndex((doc) => doc.id === id);
    if (index === -1) return null;

    const currentUser = AuthService.getCurrentUser();
    const result = await api.patch(`document/${id}`, {
      template_id: data.template_id,
      CIN: data.CIN,
      data_json: data.data_json,
      Cree_par: currentUser.CIN,
    });

    const updatedDocument: Document = {
      ...mockDocuments[index],
      ...data,
    };

    mockDocuments[index] = updatedDocument;
    return updatedDocument;
  }

  // Delete document
  static async delete(id: number): Promise<boolean> {
    const result = await api.delete(`document/${id}`);
    const index = mockDocuments.findIndex((doc) => doc.id === id);
    if (index === -1) return false;

    mockDocuments.splice(index, 1);
    return true;
  }

  // Search documents
  static async search(query: string, cin?: string): Promise<Document[]> {
    const lowerQuery = query.toLowerCase();
    let filteredDocs = mockDocuments;

    if (cin) {
      filteredDocs = filteredDocs.filter((doc) => doc.CIN === cin);
    }

    return filteredDocs.filter(
      (doc) =>
        doc.Cree_par.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(doc.data_json).toLowerCase().includes(lowerQuery),
    );
  }

  // Get documents by template ID
  static async getByTemplateId(templateId: number): Promise<Document[]> {
    return mockDocuments.filter((doc) => doc.template_id === templateId);
  }
}

// Validation functions
export const validateDocumentData = (data: DocumentFormData): string[] => {
  const errors: string[] = [];

  if (!data.template_id) {
    errors.push("Le modèle de document est obligatoire");
  }

  if (!data.CIN.trim()) {
    errors.push("Le CIN du patient est obligatoire");
  }

  if (!data.Cree_par.trim()) {
    errors.push("Le créateur est obligatoire");
  }

  if (!data.data_json || Object.keys(data.data_json).length === 0) {
    errors.push("Les données du document sont obligatoires");
  }

  return errors;
};

// Utility functions
export const getAvailableDoctors = (): string[] => {
  return ["Dr. Smith", "Dr. Martin", "Dr. Dubois", "Dr. Laurent"];
};

export const createEmptyDocumentData = (): DocumentFormData => {
  const user = AuthService.getCurrentUser();
  return {
    template_id: 0,
    CIN: "",
    data_json: {},
    Cree_par: user.CIN,
  };
};

// Compute a stable storage key for a field based on its position in the template
export const computeFieldKey = (
  templateId: number,
  sectionIndex: number,
  fieldIndex: number,
): string => {
  return `fld:${templateId}:${sectionIndex}:${fieldIndex}`;
};

// Helper function to get field value from document data with support for fallback by name
export const getFieldValue = (
  data: Record<string, any>,
  fieldKeyOrName: string,
  fallbackName?: string,
): any => {
  if (Object.prototype.hasOwnProperty.call(data, fieldKeyOrName)) {
    return data[fieldKeyOrName];
  }
  if (
    fallbackName &&
    Object.prototype.hasOwnProperty.call(data, fallbackName)
  ) {
    return data[fallbackName];
  }
  return "";
};

// Helper function to set field value in document data, migrating away from name-based keys if needed
export const setFieldValue = (
  data: Record<string, any>,
  fieldKeyOrName: string,
  value: any,
  fallbackName?: string,
): Record<string, any> => {
  const next = { ...data, [fieldKeyOrName]: value } as Record<string, any>;
  // If we provided a fallback name (old name-based key), remove it to avoid duplication
  if (
    fallbackName &&
    fallbackName !== fieldKeyOrName &&
    Object.prototype.hasOwnProperty.call(next, fallbackName)
  ) {
    delete next[fallbackName];
  }
  return next;
};

// Helper to format document data for display
export const formatDocumentData = (
  data: Record<string, any>,
): Array<{ key: string; value: any }> => {
  return Object.entries(data).map(([key, value]) => ({
    key,
    value,
  }));
};

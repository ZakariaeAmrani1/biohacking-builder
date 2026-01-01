import api from "../api/axios";
import { AuthService } from "./authService";

export interface ScannedDocument {
  id: number;
  title: string;
  description?: string | null;
  filename: string; // original file name
  createdAt: string; // ISO
  CIN: string; // patient CIN
  Cree_par: string; // creator CIN
  file_url?: string;
  file_download_url?: string;
}

export interface ScannedDocumentFormData {
  title: string;
  description?: string;
  file: File | null;
  CIN: string;
  Cree_par: string;
}

let mockScannedDocs: ScannedDocument[] = [];
let nextId = 1;

export class ScannedDocumentsService {
  static async getAll(): Promise<ScannedDocument[]> {
    mockScannedDocs = [];
    const baseURL = import.meta.env.VITE_API_URL;
    const result = await api.get(`scanned-document`);
    const data = result.data;

    mockScannedDocs = data.map((document) => ({
      id: document.id,
      title: document.title,
      description: document.description,
      filename: document.filePath,
      createdAt: document.createdAt,
      CIN: document.CIN,
      Cree_par: document.Cree_par,
      file_url: `${baseURL}/scanned-document/${document.id}/preview`,
      file_download_url: `${baseURL}/scanned-document/${document.id}/download`,
    }));

    return mockScannedDocs;
  }

  static async getById(id: number): Promise<ScannedDocument | null> {
    this.getAll();
    return mockScannedDocs.find((d) => d.id === id) || null;
  }

  static async getByPatientCIN(cin: string): Promise<ScannedDocument[]> {
    await this.getAll();
    return mockScannedDocs.filter((d) => d.CIN === cin);
  }

  static async create(data: ScannedDocumentFormData): Promise<ScannedDocument> {
    const currentUser = AuthService.getCurrentUser();
    const now = new Date().toISOString();

    const form = new FormData();
    form.append("title", data.title);
    if (data.description) form.append("description", data.description);
    form.append("CIN", data.CIN);
    form.append("Cree_par", currentUser?.CIN || data.Cree_par);
    if (data.file) form.append("file", data.file);
    const result = await api.post(`scanned-document`, form);

    let fileUrl: string | undefined;
    let filename = "fichier.pdf";
    if (data.file) {
      try {
        fileUrl = URL.createObjectURL(data.file);
        filename = data.file.name || filename;
      } catch {
        fileUrl = undefined;
      }
    }

    const newDoc: ScannedDocument = {
      id: result.data.id,
      title: data.title,
      description: data.description || null,
      filename,
      createdAt: now,
      CIN: data.CIN,
      Cree_par: currentUser?.CIN || data.Cree_par,
      file_url: fileUrl,
    };

    mockScannedDocs.push(newDoc);
    return newDoc;
  }

  static async update(
    id: number,
    data: Partial<ScannedDocumentFormData>,
  ): Promise<ScannedDocument | null> {
    const index = mockScannedDocs.findIndex((d) => d.id === id);
    if (index === -1) return null;

    const form = new FormData();
    form.append("title", data.title);
    if (data.description) form.append("description", data.description);
    form.append("CIN", data.CIN);
    if (data.file) form.append("file", data.file);
    await api.patch(`scanned-document/${id}`, form);
    let fileUrl = mockScannedDocs[index].file_url;
    let filename = mockScannedDocs[index].filename;

    const baseURL = import.meta.env.VITE_API_URL;
    if (data.file) {
      try {
        fileUrl = `${baseURL}/scanned-document/${id}/preview`;
        filename = data.file.name || filename;
      } catch {}
    }

    const updated: ScannedDocument = {
      ...mockScannedDocs[index],
      title: data.title ?? mockScannedDocs[index].title,
      description: data.description ?? mockScannedDocs[index].description,
      CIN: data.CIN ?? mockScannedDocs[index].CIN,
      Cree_par: mockScannedDocs[index].Cree_par,
      filename,
      file_url: fileUrl,
    };

    mockScannedDocs[index] = updated;

    return updated;
  }

  static async delete(id: number): Promise<boolean> {
    await api.delete(`scanned-document/${id}`);
    const index = mockScannedDocs.findIndex((d) => d.id === id);
    if (index === -1) return false;
    mockScannedDocs.splice(index, 1);
    return true;
  }

  static async search(query: string, cin?: string): Promise<ScannedDocument[]> {
    const q = query.toLowerCase();
    return mockScannedDocs.filter((d) => {
      if (cin && d.CIN !== cin) return false;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q) ||
        d.filename.toLowerCase().includes(q) ||
        d.CIN.toLowerCase().includes(q) ||
        d.Cree_par.toLowerCase().includes(q)
      );
    });
  }
}

export const createEmptyScannedDocData = (): ScannedDocumentFormData => {
  const user = AuthService.getCurrentUser();
  return {
    title: "",
    description: "",
    file: null,
    CIN: "",
    Cree_par: user?.CIN || "",
  };
};

export const validateScannedDoc = (
  data: ScannedDocumentFormData,
  requireFile: boolean = true,
): string[] => {
  const errors: string[] = [];
  if (!data.title.trim()) errors.push("Le titre est obligatoire");
  if (!data.CIN.trim()) errors.push("Le CIN du patient est obligatoire");
  if (requireFile && !data.file) errors.push("Le fichier PDF est obligatoire");
  return errors;
};

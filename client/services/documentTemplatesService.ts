// Document template types
import api from "../api/axios";
import { ActivitiesService } from "./activitiesService";
import { AuthService } from "./authService";

export interface DocumentField {
  name: string;
  type: "text" | "number" | "textarea" | "date" | "select" | "checkbox";
  required?: boolean;
  options?: string[]; // For select fields
}

export interface DocumentSection {
  title: string;
  fields: DocumentField[];
}

export interface DocumentTemplate {
  id: number;
  name: string;
  sections_json: {
    sections: DocumentSection[];
  };
  Cree_par: string;
  created_at: string;
}

export interface DocumentTemplateFormData {
  name: string;
  sections_json: {
    sections: DocumentSection[];
  };
  Cree_par: string;
}

// Mock data storage
let mockTemplates: DocumentTemplate[] = [];

export class DocumentTemplatesService {
  // Get all templates
  static async getAll(): Promise<DocumentTemplate[]> {
    mockTemplates = [];
    const result = await api.get(`document-templates`);
    const data = result.data;

    mockTemplates = data.map((template) => ({
      id: template.id,
      name: template.name,
      sections_json: template.sections_json,
      Cree_par: template.Cree_par,
      created_at: template.created_at,
    }));
    return mockTemplates.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  // Get template by ID
  static async getById(id: number): Promise<DocumentTemplate | null> {
    const template = mockTemplates.find((template) => template.id === id);
    return template || null;
  }

  // Create new template
  static async create(
    data: DocumentTemplateFormData,
  ): Promise<DocumentTemplate> {
    const currentUser = AuthService.getCurrentUser();
    const result = await api.post(`document-templates`, {
      name: data.name,
      sections_json: data.sections_json,
      Cree_par: currentUser.CIN,
    });

    const newTemplate: DocumentTemplate = {
      id: result.id,
      ...data,
      created_at: result.created_at,
    };

    mockTemplates.push(newTemplate);

    ActivitiesService.logActivity(
      "document_template",
      "created",
      newTemplate.id,
      `${newTemplate.name}`,
      data.Cree_par,
    );

    window.dispatchEvent(new CustomEvent("activityLogged"));

    return newTemplate;
  }

  // Update existing template
  static async update(
    id: number,
    data: DocumentTemplateFormData,
  ): Promise<DocumentTemplate | null> {
    const index = mockTemplates.findIndex((template) => template.id === id);
    if (index === -1) return null;

    const currentUser = AuthService.getCurrentUser();
    const result = await api.patch(`document-templates/${id}`, {
      name: data.name,
      sections_json: data.sections_json,
      Cree_par: currentUser.CIN,
    });

    const updatedTemplate: DocumentTemplate = {
      ...mockTemplates[index],
      ...data,
    };

    mockTemplates[index] = updatedTemplate;
    return updatedTemplate;
  }

  // Delete template
  static async delete(id: number): Promise<boolean> {
    const result = await api.delete(`document-templates/${id}`);

    const index = mockTemplates.findIndex((template) => template.id === id);
    if (index === -1) return false;

    mockTemplates.splice(index, 1);
    return true;
  }

  // Search templates
  static async search(query: string): Promise<DocumentTemplate[]> {
    const lowerQuery = query.toLowerCase();
    return mockTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.Cree_par.toLowerCase().includes(lowerQuery),
    );
  }
}

// Validation functions
export const validateTemplateData = (
  data: DocumentTemplateFormData,
): string[] => {
  const errors: string[] = [];

  if (!data.name.trim()) {
    errors.push("Le nom du modèle est obligatoire");
  }

  if (!data.Cree_par.trim()) {
    errors.push("Le créateur est obligatoire");
  }

  if (
    !data.sections_json.sections ||
    data.sections_json.sections.length === 0
  ) {
    errors.push("Au moins une section est requise");
  } else {
    data.sections_json.sections.forEach((section, sectionIndex) => {
      if (!section.title.trim()) {
        errors.push(
          `Le titre de la section ${sectionIndex + 1} est obligatoire`,
        );
      }

      if (!section.fields || section.fields.length === 0) {
        errors.push(
          `La section "${section.title}" doit contenir au moins un champ`,
        );
      } else {
        section.fields.forEach((field, fieldIndex) => {
          if (!field.name.trim()) {
            errors.push(
              `Le nom du champ ${fieldIndex + 1} dans "${section.title}" est obligatoire`,
            );
          }

          if (!field.type) {
            errors.push(
              `Le type du champ "${field.name}" dans "${section.title}" est obligatoire`,
            );
          }

          if (
            field.type === "select" &&
            (!field.options || field.options.length === 0)
          ) {
            errors.push(
              `Le champ "${field.name}" de type "select" doit avoir des options`,
            );
          }
        });
      }
    });
  }

  return errors;
};

// Utility functions
export const getAvailableDoctors = (): string[] => {
  return ["Dr. Smith", "Dr. Martin", "Dr. Dubois", "Dr. Laurent"];
};

export const getFieldTypes = (): Array<{ value: string; label: string }> => {
  return [
    { value: "text", label: "Texte" },
    { value: "number", label: "Nombre" },
    { value: "textarea", label: "Zone de texte" },
    { value: "date", label: "Date" },
    { value: "select", label: "Liste déroulante" },
    { value: "checkbox", label: "Case à cocher" },
  ];
};

export const createEmptyTemplate = (CIN?: string): DocumentTemplateFormData => {
  return {
    name: "",
    sections_json: {
      sections: [
        {
          title: "",
          fields: [
            {
              name: "",
              type: "text",
              required: false,
            },
          ],
        },
      ],
    },
    Cree_par: CIN || "",
  };
};

export const createEmptySection = (): DocumentSection => {
  return {
    title: "",
    fields: [
      {
        name: "",
        type: "text",
        required: false,
      },
    ],
  };
};

export const createEmptyField = (): DocumentField => {
  return {
    name: "",
    type: "text",
    required: false,
  };
};

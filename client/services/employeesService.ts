import api from "../api/axios";
import { RegisterData } from "./authService";
import { User, UserFormData } from "./userService";

export type Employee = User;

export type EmployeeCreateData = RegisterData;
export type EmployeeUpdateData = UserFormData;

let mockEmployees: Employee[] = [];

export class EmployeesService {
  static async getAll(): Promise<Employee[]> {
    const result = await api.get(`utilisateur`);
    const data = result.data;
    mockEmployees = data.map((u: any) => ({
      id: u.id,
      CIN: u.CIN,
      nom: u.nom,
      prenom: u.prenom,
      date_naissance: u.date_naissance,
      adresse: u.adresse,
      numero_telephone: u.numero_telephone,
      email: u.email,
      role: u.role,
      created_at: u.created_at,
    }));
    return mockEmployees.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  static async getById(id: number): Promise<Employee | null> {
    if (mockEmployees.length === 0) await this.getAll();
    return mockEmployees.find((e) => e.id === id) || null;
  }

  static async create(data: EmployeeCreateData): Promise<Employee> {
    const payload = {
      CIN: data.CIN,
      nom: data.nom,
      prenom: data.prenom,
      date_naissance: new Date(data.date_naissance),
      adresse: data.adresse,
      numero_telephone: data.numero_telephone,
      email: data.email,
      password: data.password,
      // confirmPassword: data.confirmPassword,
      role: data.role,
    };

    const result = await api.post(`utilisateur`, payload);
    const u = result.data;
    const newEmployee: Employee = {
      id: u.id,
      CIN: u.CIN,
      nom: u.nom,
      prenom: u.prenom,
      date_naissance: u.date_naissance,
      adresse: u.adresse,
      numero_telephone: u.numero_telephone,
      email: u.email,
      role: u.role,
      created_at: u.created_at,
    };
    mockEmployees.unshift(newEmployee);
    return newEmployee;
  }

  static async update(
    id: number,
    data: EmployeeUpdateData,
  ): Promise<Employee | null> {
    const index = mockEmployees.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const payload = {
      CIN: data.CIN,
      nom: data.nom,
      prenom: data.prenom,
      date_naissance: data.date_naissance,
      adresse: data.adresse,
      numero_telephone: data.numero_telephone,
      email: data.email,
      role: data.role,
    };

    await api.patch(`utilisateur/${id}`, payload);
    const updated: Employee = { ...mockEmployees[index], ...payload };
    mockEmployees[index] = updated;
    return updated;
  }

  static async delete(id: number): Promise<boolean> {
    await api.delete(`utilisateur/${id}`);
    const index = mockEmployees.findIndex((e) => e.id === id);
    if (index === -1) return false;
    mockEmployees.splice(index, 1);
    return true;
  }
}

export const validateEmployeeCreate = (data: EmployeeCreateData): string[] => {
  const errors: string[] = [];
  if (!data.CIN?.trim()) errors.push("Le CIN est obligatoire");
  if (!data.nom?.trim()) errors.push("Le nom est obligatoire");
  if (!data.prenom?.trim()) errors.push("Le prénom est obligatoire");
  if (!data.date_naissance) errors.push("La date de naissance est obligatoire");
  if (!data.email?.trim()) errors.push("L'email est obligatoire");
  else if (!/\S+@\S+\.\S+/.test(data.email))
    errors.push("L'email n'est pas valide");
  if (!data.password) errors.push("Le mot de passe est obligatoire");
  else if (data.password.length < 6)
    errors.push("Le mot de passe doit contenir au moins 6 caractères");
  if (data.password !== data.confirmPassword)
    errors.push("Les mots de passe ne correspondent pas");
  return errors;
};

export const validateEmployeeUpdate = (data: EmployeeUpdateData): string[] => {
  const errors: string[] = [];
  if (!data.CIN?.trim()) errors.push("Le CIN est obligatoire");
  if (!data.nom?.trim()) errors.push("Le nom est obligatoire");
  if (!data.prenom?.trim()) errors.push("Le prénom est obligatoire");
  if (!data.date_naissance) errors.push("La date de naissance est obligatoire");
  if (!data.email?.trim()) errors.push("L'email est obligatoire");
  else if (!/\S+@\S+\.\S+/.test(data.email))
    errors.push("L'email n'est pas valide");
  return errors;
};

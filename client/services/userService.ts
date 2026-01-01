import { json } from "react-router-dom";
import api from "../api/axios";

export interface User {
  id: number;
  CIN: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  adresse: string;
  numero_telephone: string;
  email: string;
  password?: string; // Optional for security
  role: "admin" | "therapeute";
  created_at: string;
}

export interface UserFormData {
  CIN: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  adresse: string;
  numero_telephone: string;
  email: string;
  role: User["role"];
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

let currentUser: User = {
  id: 0,
  CIN: "",
  nom: "",
  prenom: "",
  date_naissance: "",
  adresse: "",
  numero_telephone: "",
  email: "",
  role: "admin",
  created_at: "",
};

export class UserService {
  static async getCurrentAllUsers() {
    const allUSers = [];
    const result = await api.get(`utilisateur`);
    const data = result.data;
    data.map((user) => {
      allUSers.push({
        id: user.id,
        nom: user.nom + " " + user.prenom,
        CIN: user.CIN,
      });
    });
    return allUSers;
  }

  // Get current user profile
  static async getCurrentUser(): Promise<User> {
    const user = JSON.parse(localStorage.getItem("biohacking-clinic-user"));
    currentUser = {
      id: user.id,
      CIN: user.CIN,
      nom: user.nom,
      prenom: user.prenom,
      date_naissance: user.date_naissance,
      adresse: user.adresse,
      numero_telephone: user.numero_telephone,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    };
    return currentUser as User;
  }

  // Update user profile
  static async updateProfile(data: UserFormData): Promise<User> {
    try {
      const result = await api.patch(`utilisateur/${currentUser.id}`, data);
      const updatedUser: User = {
        ...currentUser,
        ...data,
      };
      currentUser = updatedUser;
      const { password, ...userWithoutPassword } = updatedUser;
      localStorage.setItem(
        "biohacking-clinic-user",
        JSON.stringify(updatedUser),
      );
      return userWithoutPassword as User;
    } catch (error) {
      throw new Error("Erreur: " + error.response.data.message);
    }
  }

  // Change password
  static async changePassword(data: PasswordChangeData): Promise<boolean> {
    try {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      if (data.newPassword.length < 8) {
        throw new Error("Le mot de passe doit contenir au moins 8 caractères");
      }

      const result = await api.patch(`auth/update-password/${currentUser.id}`, {
        oldPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      const updatedUser: User = {
        ...currentUser,
        ...data,
      };
      currentUser = updatedUser;
      console.log(updatedUser);
      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      localStorage.setItem(
        "biohacking-clinic-user",
        JSON.stringify(updatedUser),
      );
      return true;
    } catch (error) {
      throw new Error("Erreur: " + error.response.data.message);
    }
  }

  // Validate user form data
  static validateUserData(data: UserFormData): string[] {
    const errors: string[] = [];

    if (!data.CIN.trim()) {
      errors.push("Le CIN est obligatoire");
    }

    if (!data.nom.trim()) {
      errors.push("Le nom est obligatoire");
    }

    if (!data.prenom.trim()) {
      errors.push("Le prénom est obligatoire");
    }

    if (!data.date_naissance) {
      errors.push("La date de naissance est obligatoire");
    }

    if (!data.adresse.trim()) {
      errors.push("L'adresse est obligatoire");
    }

    if (!data.numero_telephone.trim()) {
      errors.push("Le numéro de téléphone est obligatoire");
    }

    if (!data.email.trim()) {
      errors.push("L'email est obligatoire");
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      errors.push("L'email n'est pas valide");
    }

    return errors;
  }

  // Get available roles
  static getAvailableRoles(): { value: User["role"]; label: string }[] {
    return [
      { value: "admin", label: "Administrateur" },
      { value: "therapeute", label: "Thérapeute" },
    ];
  }

  // Format user display name
  static getDisplayName(user: User): string {
    return `${user.prenom} ${user.nom}`;
  }

  // Get role display name
  static getRoleDisplayName(role: User["role"]): string {
    const roles = this.getAvailableRoles();
    return roles.find((r) => r.value === role)?.label || role;
  }
}

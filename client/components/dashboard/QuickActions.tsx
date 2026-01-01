import { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  Users,
  FileText,
  Package,
  Stethoscope,
  Receipt,
  FileType,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// Import the form modals
import AppointmentFormModal from "@/components/appointments/AppointmentFormModal";
import ClientFormModal from "@/components/clients/ClientFormModal";
import ProductFormModal from "@/components/products/ProductFormModal";
import SoinFormModal from "@/components/soins/SoinFormModal";
import InvoiceFormModal from "@/components/invoices/InvoiceFormModal";
import DocumentFormModal from "@/components/documents/DocumentFormModal";
import DocumentTemplateFormModal from "@/components/documentTemplates/DocumentTemplateFormModal";

// Import services for creating entities
import {
  AppointmentFormData,
  AppointmentsService,
} from "@/services/appointmentsService";
import {
  ClientFormData,
  ClientsService,
  Utilisateur,
} from "@/services/clientsService";
import { ProductFormData, ProductsService } from "@/services/productsService";
import { SoinFormData, SoinsService } from "@/services/soinsService";
import { FactureFormData, InvoicesService } from "@/services/invoicesService";
import {
  DocumentFormData,
  DocumentsService,
} from "@/services/documentsService";
import {
  DocumentTemplateFormData,
  DocumentTemplatesService,
  DocumentTemplate,
} from "@/services/documentTemplatesService";
import { UserService } from "@/services/userService";
import { Employee, EmployeesService } from "@/services/employeesService";

interface QuickAction {
  title: string;
  description: string;
  icon: any;
  color: string;
  modalKey: string;
}

export default function QuickActions() {
  const { toast } = useToast();

  // Modal states
  const [openModals, setOpenModals] = useState<Record<string, boolean>>({
    appointment: false,
    patient: false,
    product: false,
    soin: false,
    invoice: false,
    document: false,
    documentTemplate: false,
  });

  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const [documentTemplates, setDocumentTemplates] = useState<
    DocumentTemplate[]
  >([]);

  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [therapeutes, setTherapeutes] = useState<Employee[]>([]);

  // Load document templates when component mounts
  useEffect(() => {
    loadDocumentTemplates();
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadDocumentTemplates = async () => {
    try {
      const templates = await DocumentTemplatesService.getAll();
      setDocumentTemplates(templates);
    } catch (error) {
      console.error("Error loading document templates:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const [userData, employeeData] = await Promise.all([
        UserService.getCurrentAllUsers(),
        EmployeesService.getAll(),
      ]);
      setUsers(userData);
      setTherapeutes(
        employeeData.filter((employee) => employee.role === "therapeute"),
      );
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          "Impossible de charger les utilisateurs ou les thérapeutes",
        variant: "destructive",
      });
    }
  };

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    if (user && user.nom) return user.nom;
    return CIN;
  };

  const quickActions: QuickAction[] = [
    {
      title: "Nouveau Rendez-vous",
      description: "Planifier un rendez-vous patient",
      icon: Calendar,
      color: "bg-blue-500",
      modalKey: "appointment",
    },
    {
      title: "Ajouter Patient",
      description: "Enregistrer un nouveau patient",
      icon: Users,
      color: "bg-green-500",
      modalKey: "patient",
    },
    {
      title: "Nouveau Produit",
      description: "Ajouter un produit au catalogue",
      icon: Package,
      color: "bg-purple-500",
      modalKey: "product",
    },
    {
      title: "Nouveau Soin",
      description: "Créer un nouveau type de soin",
      icon: Stethoscope,
      color: "bg-orange-500",
      modalKey: "soin",
    },
    {
      title: "Nouvelle Facture",
      description: "Créer une nouvelle facture",
      icon: Receipt,
      color: "bg-teal-500",
      modalKey: "invoice",
    },
    {
      title: "Nouveau Document",
      description: "Créer un document patient",
      icon: FileText,
      color: "bg-indigo-500",
      modalKey: "document",
    },
    {
      title: "Template Document",
      description: "Créer un modèle de document",
      icon: FileType,
      color: "bg-pink-500",
      modalKey: "documentTemplate",
    },
  ];

  const openModal = (modalKey: string) => {
    setOpenModals((prev) => ({ ...prev, [modalKey]: true }));
  };

  const closeModal = (modalKey: string) => {
    setOpenModals((prev) => ({ ...prev, [modalKey]: false }));
  };

  // CRUD handlers
  const handleCreateAppointment = async (data: AppointmentFormData) => {
    try {
      setIsSubmitting((prev) => ({ ...prev, appointment: true }));
      await AppointmentsService.create(data);
      closeModal("appointment");
      toast({
        title: "Succès",
        description: "Le rendez-vous a été créé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le rendez-vous",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting((prev) => ({ ...prev, appointment: false }));
    }
  };

  const handleCreateClient = async (data: ClientFormData) => {
    try {
      setIsSubmitting((prev) => ({ ...prev, patient: true }));
      await ClientsService.create(data);
      closeModal("patient");
      toast({
        title: "Succès",
        description: "Le patient a été créé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le patient",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting((prev) => ({ ...prev, patient: false }));
    }
  };

  const handleCreateProduct = async (data: ProductFormData) => {
    try {
      setIsSubmitting((prev) => ({ ...prev, product: true }));
      await ProductsService.create(data);
      closeModal("product");
      toast({
        title: "Succès",
        description: "Le produit a été créé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le produit",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting((prev) => ({ ...prev, product: false }));
    }
  };

  const handleCreateSoin = async (data: SoinFormData) => {
    try {
      setIsSubmitting((prev) => ({ ...prev, soin: true }));
      await SoinsService.create(data);
      closeModal("soin");
      toast({
        title: "Succès",
        description: "Le soin a été créé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le soin",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting((prev) => ({ ...prev, soin: false }));
    }
  };

  const handleCreateInvoice = async (data: FactureFormData) => {
    try {
      setIsSubmitting((prev) => ({ ...prev, invoice: true }));
      await InvoicesService.create(data);
      closeModal("invoice");
      toast({
        title: "Succès",
        description: "La facture a été créée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la facture",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting((prev) => ({ ...prev, invoice: false }));
    }
  };

  const handleCreateDocument = async (data: DocumentFormData) => {
    try {
      setIsSubmitting((prev) => ({ ...prev, document: true }));
      await DocumentsService.create(data);
      closeModal("document");
      toast({
        title: "Succès",
        description: "Le document a été créé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le document",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting((prev) => ({ ...prev, document: false }));
    }
  };

  const handleCreateDocumentTemplate = async (
    data: DocumentTemplateFormData,
  ) => {
    try {
      setIsSubmitting((prev) => ({ ...prev, documentTemplate: true }));
      await DocumentTemplatesService.create(data);
      closeModal("documentTemplate");
      toast({
        title: "Succès",
        description: "Le modèle de document a été créé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le modèle de document",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting((prev) => ({ ...prev, documentTemplate: false }));
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Actions Rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-1">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 justify-start gap-3 hover:bg-accent w-full"
                onClick={() => openModal(action.modalKey)}
              >
                <div className={`rounded-lg p-2 ${action.color} text-white`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
                <Plus className="h-4 w-4 ml-auto" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Form Modals */}
      <AppointmentFormModal
        isOpen={openModals.appointment}
        onClose={() => closeModal("appointment")}
        onSubmit={handleCreateAppointment}
        isLoading={isSubmitting.appointment}
        users={users}
      />

      <ClientFormModal
        isOpen={openModals.patient}
        onClose={() => closeModal("patient")}
        onSubmit={handleCreateClient}
        isLoading={isSubmitting.patient}
        users={users}
      />

      <ProductFormModal
        isOpen={openModals.product}
        onClose={() => closeModal("product")}
        onSubmit={handleCreateProduct}
        isLoading={isSubmitting.product}
        users={users}
      />

      <SoinFormModal
        isOpen={openModals.soin}
        onClose={() => closeModal("soin")}
        onSubmit={handleCreateSoin}
        isLoading={isSubmitting.soin}
        users={users}
        therapeutes={therapeutes}
      />

      <InvoiceFormModal
        isOpen={openModals.invoice}
        onClose={() => closeModal("invoice")}
        onSubmit={handleCreateInvoice}
        isLoading={isSubmitting.invoice}
        users={users}
      />

      <DocumentFormModal
        isOpen={openModals.document}
        onClose={() => closeModal("document")}
        onSubmit={handleCreateDocument}
        isLoading={isSubmitting.document}
        patient={null}
        templates={documentTemplates}
        users={users}
      />

      <DocumentTemplateFormModal
        isOpen={openModals.documentTemplate}
        onClose={() => closeModal("documentTemplate")}
        onSubmit={handleCreateDocumentTemplate}
        isLoading={isSubmitting.documentTemplate}
        users={users}
      />
    </>
  );
}

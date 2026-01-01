import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  Clock,
  User,
  Settings,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  Stethoscope,
  AlertTriangle,
  Download,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import DocumentFormModal from "@/components/documents/DocumentFormModal";
import DocumentDetailsModal from "@/components/documents/DocumentDetailsModal";
import DeleteDocumentModal from "@/components/documents/DeleteDocumentModal";
import NewDocumentTypeModal from "@/components/documents/NewDocumentTypeModal";
import ScannedDocumentFormModal from "@/components/scannedDocuments/ScannedDocumentFormModal";
import ScannedDocumentViewerModal from "@/components/scannedDocuments/ScannedDocumentViewerModal";
import DeleteScannedDocumentModal from "@/components/scannedDocuments/DeleteScannedDocumentModal";
import {
  DocumentsService,
  Document,
  DocumentFormData,
  getFieldValue,
  computeFieldKey,
} from "@/services/documentsService";
import {
  DocumentTemplatesService,
  DocumentTemplate,
} from "@/services/documentTemplatesService";
import {
  ScannedDocumentsService,
  ScannedDocument,
  ScannedDocumentFormData,
} from "@/services/scannedDocumentsService";
import {
  ClientsService,
  Client,
  calculateAge,
  Utilisateur,
} from "@/services/clientsService";
import { UserService } from "@/services/userService";
import { EntrepriseService } from "@/services/entrepriseService";
import { buildCompanyHeaderHtml, buildCompanyFooterHtml, wrapPdfHtmlDocument } from "@/services/pdfTemplate";

export default function PatientDocuments() {
  const { cin } = useParams<{ cin: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("tous");
  const [creatorFilter, setCreatorFilter] = useState<string>("tous");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [users, setUsers] = useState<Utilisateur[]>([]);

  // Data state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [scannedDocs, setScannedDocs] = useState<ScannedDocument[]>([]);
  const [patient, setPatient] = useState<Client | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPatientLoading, setIsPatientLoading] = useState(true);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isScanFormOpen, setIsScanFormOpen] = useState(false);
  const [isScanViewerOpen, setIsScanViewerOpen] = useState(false);
  const [isScanDeleteOpen, setIsScanDeleteOpen] = useState(false);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [selectedScan, setSelectedScan] = useState<ScannedDocument | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Get unique creators and templates for filter dropdowns
  const creators = Array.from(
    new Set([
      ...documents.map((d) => d.Cree_par),
      ...scannedDocs.map((s) => s.Cree_par),
    ]),
  );

  // Load data on component mount
  useEffect(() => {
    if (cin) {
      loadPatientData();
      loadDocuments();
      loadScannedDocuments();
      loadTemplates();
    } else {
      navigate("/patients");
    }
  }, [cin, navigate]);

  // Add escape key handler to force close modals if stuck
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && event.ctrlKey) {
        forceCloseAllModals();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadPatientData = async () => {
    if (!cin) return;

    try {
      setIsPatientLoading(true);
      const clients = await ClientsService.getAll();
      const foundPatient = clients.find((client) => client.CIN === cin);
      setPatient(foundPatient || null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du patient",
        variant: "destructive",
      });
    } finally {
      setIsPatientLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!cin) return;

    try {
      setIsLoading(true);
      const data = await DocumentsService.getByPatientCIN(cin);
      setDocuments(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadScannedDocuments = async () => {
    if (!cin) return;
    try {
      setIsLoading(true);
      const scans = await ScannedDocumentsService.getByPatientCIN(cin);
      setScannedDocs(scans);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les documents scannés", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await DocumentTemplatesService.getAll();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await UserService.getCurrentAllUsers();
      setUsers(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    if (user && user.nom) return user.nom;
    return CIN;
  };

  // Filter and search logic (structured + scanned)
  type UnifiedItem = { kind: "structured" | "scanned"; createdAt: string; doc?: Document; scan?: ScannedDocument };
  const filteredItems = useMemo(() => {
    const structured: UnifiedItem[] = documents.map((d) => ({ kind: "structured", createdAt: d.created_at, doc: d }));
    const scanned: UnifiedItem[] = scannedDocs.map((s) => ({ kind: "scanned", createdAt: s.createdAt, scan: s }));
    const combined = [...structured, ...scanned];

    const q = searchTerm.toLowerCase();

    const byFilters = combined.filter((item) => {
      if (item.kind === "structured" && item.doc) {
        const t = templates.find((tt) => tt.id === item.doc.template_id);
        const templateName = t?.name || "";
        const matchesSearch = templateName.toLowerCase().includes(q) || JSON.stringify(item.doc.data_json).toLowerCase().includes(q);
        const matchesTemplate = templateFilter === "tous" || item.doc.template_id.toString() === templateFilter;
        const matchesCreator = creatorFilter === "tous" || item.doc.Cree_par === creatorFilter;
        return matchesSearch && matchesTemplate && matchesCreator;
      }
      if (item.kind === "scanned" && item.scan) {
        const s = item.scan;
        const matchesSearch = s.title.toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q) || s.filename.toLowerCase().includes(q);
        const matchesTemplate = templateFilter === "tous" || templateFilter === "scanned";
        const matchesCreator = creatorFilter === "tous" || s.Cree_par === creatorFilter;
        return matchesSearch && matchesTemplate && matchesCreator;
      }
      return false;
    });

    return byFilters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documents, scannedDocs, templates, searchTerm, templateFilter, creatorFilter]);

  // CRUD Operations
  const handleCreateDocument = async (data: DocumentFormData) => {
    try {
      setIsSubmitting(true);
      await DocumentsService.create(data);
      await Promise.all([loadDocuments(), loadScannedDocuments()]);
      closeFormModal();
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
      setIsSubmitting(false);
    }
  };

  const handleCreateScanned = async (data: ScannedDocumentFormData) => {
    try {
      setIsSubmitting(true);
      await ScannedDocumentsService.create(data);
      await Promise.all([loadDocuments(), loadScannedDocuments()]);
      setIsScanFormOpen(false);
      setSelectedScan(null);
      toast({ title: "Succès", description: "Le document scanné a été créé avec succès" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer le document scanné", variant: "destructive" });
      throw new Error("Create scanned failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDocument = async (data: DocumentFormData) => {
    if (!selectedDocument) return;

    try {
      setIsSubmitting(true);
      await DocumentsService.update(selectedDocument.id, data);
      await Promise.all([loadDocuments(), loadScannedDocuments()]);
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le document a été modifié avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le document",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateScanned = async (data: ScannedDocumentFormData) => {
    if (!selectedScan) return;
    try {
      setIsSubmitting(true);
      await ScannedDocumentsService.update(selectedScan.id, data);
      await Promise.all([loadDocuments(), loadScannedDocuments()]);
      setIsScanFormOpen(false);
      setSelectedScan(null);
      toast({ title: "Succès", description: "Le document scanné a été modifié avec succès" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de modifier le document scanné", variant: "destructive" });
      throw new Error("Update scanned failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    try {
      setIsSubmitting(true);
      await DocumentsService.delete(selectedDocument.id);
      await Promise.all([loadDocuments(), loadScannedDocuments()]);
      closeDeleteModal();
      toast({
        title: "Succès",
        description: "Le document a été supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteScanned = async () => {
    if (!selectedScan) return;
    try {
      setIsSubmitting(true);
      await ScannedDocumentsService.delete(selectedScan.id);
      await Promise.all([loadDocuments(), loadScannedDocuments()]);
      setIsScanDeleteOpen(false);
      setSelectedScan(null);
      toast({ title: "Succès", description: "Le document scanné a été supprimé avec succès" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer le document scanné", variant: "destructive" });
      throw new Error("Delete scanned failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setSelectedDocument(null);
    setIsFormModalOpen(true);
  };

  const openCreateScanned = () => {
    setSelectedScan(null);
    setIsScanFormOpen(true);
  };

  const openEditModal = (document: Document) => {
    closeModals();
    setTimeout(() => {
      setSelectedDocument(document);
      setIsFormModalOpen(true);
    }, 100);
  };

  const openEditScan = (scan: ScannedDocument) => {
    closeModals();
    setTimeout(() => {
      setSelectedScan(scan);
      setIsScanFormOpen(true);
    }, 100);
  };

  const openDetailsModal = (document: Document) => {
    closeModals();
    setTimeout(() => {
      setSelectedDocument(document);
      setIsDetailsModalOpen(true);
    }, 100);
  };

  const openScanViewer = (scan: ScannedDocument) => {
    closeModals();
    setTimeout(() => {
      setSelectedScan(scan);
      setIsScanViewerOpen(true);
    }, 100);
  };

  const openDeleteModal = (document: Document) => {
    closeModals();
    setTimeout(() => {
      setSelectedDocument(document);
      setIsDeleteModalOpen(true);
    }, 100);
  };

  const openDeleteScan = (scan: ScannedDocument) => {
    closeModals();
    setTimeout(() => {
      setSelectedScan(scan);
      setIsScanDeleteOpen(true);
    }, 100);
  };

  const generatePDF = async (document: Document) => {
    const template = templates.find((t) => t.id === document.template_id);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la fenêtre d'impression",
        variant: "destructive",
      });
      return;
    }

    const entreprise = await EntrepriseService.getEntreprise().catch(() => null);

    const headerHtml = buildCompanyHeaderHtml(entreprise, {
      title: template?.name || "Document Médical",
      subtitle: `Document ID: ${document.id}`,
    });

    const patientInfoHtml = `
      <div class="pdf-card pdf-section">
        <div class="pdf-section-title">Informations Patient</div>
        <div class="pdf-row"><span class="pdf-label">Nom:</span><span class="pdf-value">${patient?.prenom || ""} ${patient?.nom || ""}</span></div>
        <div class="pdf-row"><span class="pdf-label">CIN:</span><span class="pdf-value">${document.CIN}</span></div>
        <div class="pdf-row"><span class="pdf-label">Date de création:</span><span class="pdf-value">${formatDate(document.created_at)}</span></div>
        <div class="pdf-row"><span class="pdf-label">Créé par:</span><span class="pdf-value">${document.Cree_par}</span></div>
      </div>
    `;

    const sectionsHtml = template
      ? template.sections_json.sections
          .map((section, sIdx) => {
            const fieldsHtml = section.fields
              .map((field, fIdx) => {
                const key = computeFieldKey(document.template_id, sIdx, fIdx);
                const value = getFieldValue(document.data_json, key, field.name);
                let displayValue: any = value;
                if (value === null || value === undefined || value === "") {
                  displayValue = "Non renseigné";
                } else if (field.type === "checkbox") {
                  displayValue = value ? "Oui" : "Non";
                } else if (field.type === "date" && value) {
                  try {
                    displayValue = new Date(value).toLocaleDateString("fr-FR");
                  } catch {
                    displayValue = value;
                  }
                }
                return `<div class=\"pdf-row\"><span class=\"pdf-label\">${field.name}:</span><span class=\"pdf-value\">${displayValue}</span></div>`;
              })
              .join("");
            return `<div class=\"pdf-section\"><div class=\"pdf-section-title\">${section.title}</div>${fieldsHtml}</div>`;
          })
          .join("")
      : "";

    const footerHtml = buildCompanyFooterHtml(entreprise);

    const htmlContent = wrapPdfHtmlDocument(
      `Document ${document.id} - ${template?.name || "Document"}`,
      `${headerHtml}${patientInfoHtml}${sectionsHtml}${footerHtml}`,
    );

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    };

    toast({
      title: "PDF généré",
      description: "Le document a été ouvert pour impression/sauvegarde en PDF",
    });
  };

  // Force close all modals
  const forceCloseAllModals = () => {
    setIsFormModalOpen(false);
    setIsDetailsModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedDocument(null);
    setIsSubmitting(false);
  };

  const closeModals = () => {
    setTimeout(() => {
      setIsFormModalOpen(false);
      setIsDetailsModalOpen(false);
      setIsDeleteModalOpen(false);
      setIsScanFormOpen(false);
      setIsScanViewerOpen(false);
      setIsScanDeleteOpen(false);
      setIsTypePickerOpen(false);
      setSelectedDocument(null);
      setSelectedScan(null);
    }, 0);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedDocument(null);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedDocument(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedDocument(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getTemplateName = (templateId: number) => {
    const template = templates.find((t) => t.id === templateId);
    return template?.name || "Modèle inconnu";
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!cin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex gap-6 p-4 md:p-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/patients")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour aux patients
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Documents Patient
                </h1>
                <p className="text-muted-foreground">
                  {patient
                    ? `${patient.prenom} ${patient.nom} (${patient.CIN})`
                    : `CIN: ${cin}`}
                </p>
              </div>
            </div>
            <Button
              className="gap-2"
              onClick={() => setIsTypePickerOpen(true)}
              disabled={!patient}
            >
              <Plus className="h-4 w-4" />
              Nouveau Document
            </Button>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rechercher et Filtrer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Search */}
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher dans les documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Template Filter */}
                <Select
                  value={templateFilter}
                  onValueChange={setTemplateFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type de document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les types</SelectItem>
                    <SelectItem value="scanned">Documents scannés</SelectItem>
                {templates.map((template) => (
                  <SelectItem
                    key={template.id}
                    value={template.id.toString()}
                  >
                    {template.name}
                  </SelectItem>
                ))}
                  </SelectContent>
                </Select>

                {/* Creator Filter */}
                <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Créé par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les créateurs</SelectItem>
                    {creators.map((creator) => (
                      <SelectItem key={creator} value={creator}>
                        {getUserName(creator)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary and View Toggle */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Chargement..."
                : `${filteredItems.length} document(s) trouvé(s)`}
            </p>
            <div className="flex rounded-lg border border-border p-1">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 gap-2"
              >
                <TableIcon className="h-4 w-4" />
                Tableau
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="h-8 gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Cartes
              </Button>
            </div>
          </div>

          {/* Documents Display - Table or Cards */}
          {viewMode === "table" ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type de document</TableHead>
                        <TableHead>Créé par</TableHead>
                        <TableHead>Date de création</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length > 0 ? (
                        filteredItems.map((item) => {
                          if (item.kind === "structured" && item.doc) {
                            const document = item.doc;
                            return (
                              <TableRow key={`doc-${document.id}`} className="hover:bg-muted/50">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <div>
                                      <div className="font-medium">{getTemplateName(document.template_id)}</div>
                                      <div className="text-sm text-muted-foreground">ID: {document.id}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{getUserName(document.Cree_par)}</TableCell>
                                <TableCell>{formatDate(document.created_at)}</TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem className="gap-2" onClick={() => openDetailsModal(document)}>
                                        <Eye className="h-4 w-4" />
                                        Voir détails
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2" onClick={() => generatePDF(document)}>
                                        <Download className="h-4 w-4" />
                                        Télécharger PDF
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2" onClick={() => openEditModal(document)}>
                                        <Edit className="h-4 w-4" />
                                        Modifier
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2 text-red-600" onClick={() => openDeleteModal(document)}>
                                        <Trash2 className="h-4 w-4" />
                                        Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          }
                          if (item.kind === "scanned" && item.scan) {
                            const scan = item.scan;
                            return (
                              <TableRow key={`scan-${scan.id}`} className="bg-amber-50 dark:bg-amber-900/20">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <div>
                                      <div className="font-medium">Document scanné</div>
                                      <div className="text-sm text-muted-foreground">{scan.title} • ID: {scan.id}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{getUserName(scan.Cree_par)}</TableCell>
                                <TableCell>{formatDate(scan.createdAt)}</TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem className="gap-2" onClick={() => openScanViewer(scan)}>
                                        <Eye className="h-4 w-4" />
                                        Voir (PDF)
                                      </DropdownMenuItem>
                                      {scan.file_url && (
                                        <DropdownMenuItem className="gap-2" onClick={() => window.open(scan.file_url!, "_blank")}>
                                          <Download className="h-4 w-4" />
                                          Télécharger PDF
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem className="gap-2" onClick={() => openEditScan(scan)}>
                                        <Edit className="h-4 w-4" />
                                        Modifier
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2 text-red-600" onClick={() => openDeleteScan(scan)}>
                                        <Trash2 className="h-4 w-4" />
                                        Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          }
                          return null;
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                Aucun document trouvé pour ce patient
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Cards View */
            <div className="space-y-6">
              {filteredItems.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {filteredItems.map((item) => {
                    if (item.kind === "structured" && item.doc) {
                      const document = item.doc;
                      return (
                        <Card key={`doc-card-${document.id}`} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-primary" />
                                  {getTemplateName(document.template_id)}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">ID: {document.id}</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Créé par:</span>
                                <span>{getUserName(document.Cree_par)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Créé le:</span>
                                <span>{formatDate(document.created_at)}</span>
                              </div>
                            </div>

                            <div className="border-t pt-3">
                              <div className="flex items-center justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="gap-2" onClick={() => openDetailsModal(document)}>
                                      <Eye className="h-4 w-4" />
                                      Voir détails
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2" onClick={() => generatePDF(document)}>
                                      <Download className="h-4 w-4" />
                                      Télécharger PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2" onClick={() => openEditModal(document)}>
                                      <Edit className="h-4 w-4" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 text-red-600" onClick={() => openDeleteModal(document)}>
                                      <Trash2 className="h-4 w-4" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    if (item.kind === "scanned" && item.scan) {
                      const scan = item.scan;
                      return (
                        <Card key={`scan-card-${scan.id}`} className="hover:shadow-md transition-shadow border-amber-200">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-primary" />
                                  Document scanné — {scan.title}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">ID: {scan.id} • Fichier: {scan.filename}</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Créé par:</span>
                                <span>{getUserName(scan.Cree_par)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Créé le:</span>
                                <span>{formatDate(scan.createdAt)}</span>
                              </div>
                            </div>

                            <div className="border-t pt-3">
                              <div className="flex items-center justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="gap-2" onClick={() => openScanViewer(scan)}>
                                      <Eye className="h-4 w-4" />
                                      Voir (PDF)
                                    </DropdownMenuItem>
                                    {scan.file_url && (
                                      <DropdownMenuItem className="gap-2" onClick={() => window.open(scan.file_url!, "_blank")}>
                                        <Download className="h-4 w-4" />
                                        Télécharger PDF
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="gap-2" onClick={() => openEditScan(scan)}>
                                      <Edit className="h-4 w-4" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 text-red-600" onClick={() => openDeleteScan(scan)}>
                                      <Trash2 className="h-4 w-4" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    return null;
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-medium">
                          Aucun document trouvé
                        </h3>
                        <p className="text-muted-foreground">
                          Ce patient n'a pas encore de documents
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Patient Info Card - Right Side */}
        <div className="w-96 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations Patient
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPatientLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                </div>
              ) : patient ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-lg font-semibold">
                      {patient.prenom} {patient.nom}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      CIN: {patient.CIN}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Âge:</span>
                      <span>{calculateAge(patient.date_naissance)} ans</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Groupe sanguin:</span>
                      <Badge variant="outline">{patient.groupe_sanguin}</Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Téléphone:</span>
                      <span>{patient.numero_telephone}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      <span className="truncate">{patient.email}</span>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="font-medium">Adresse:</span>
                        <div className="text-muted-foreground mt-1">
                          {patient.adresse}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <Stethoscope className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="font-medium">Antécédents:</span>
                        <div className="text-muted-foreground mt-1">
                          {patient.antecedents || "Aucun"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="font-medium">Allergies:</span>
                        <div className="text-muted-foreground mt-1">
                          {patient.allergies || "Aucune"}
                        </div>
                      </div>
                    </div>

                    {patient.commentaire && (
                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="font-medium">Commentaires:</span>
                          <div className="text-muted-foreground mt-1">
                            {patient.commentaire}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="text-xs text-muted-foreground">
                    Patient créé par {patient.Cree_par} le{" "}
                    {formatDate(patient.created_at)}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Patient non trouvé</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Résumé des Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total documents:</span>
                  <Badge variant="secondary">{documents.length + scannedDocs.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Documents scannés:</span>
                  <Badge variant="outline">{scannedDocs.length}</Badge>
                </div>
                {templates.map((template) => {
                  const count = documents.filter(
                    (d) => d.template_id === template.id,
                  ).length;
                  if (count > 0) {
                    return (
                      <div
                        key={template.id}
                        className="flex justify-between text-sm"
                      >
                        <span className="truncate">{template.name}:</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modals */}
        <DocumentFormModal
          isOpen={isFormModalOpen}
          onClose={closeFormModal}
          onSubmit={
            selectedDocument ? handleUpdateDocument : handleCreateDocument
          }
          document={selectedDocument}
          patient={patient}
          templates={templates}
          isLoading={isSubmitting}
          users={users}
        />

        <ScannedDocumentFormModal
          isOpen={isScanFormOpen}
          onClose={() => { setIsScanFormOpen(false); setSelectedScan(null); }}
          onSubmit={selectedScan ? handleUpdateScanned : handleCreateScanned}
          document={selectedScan}
          users={users}
          isLoading={isSubmitting}
          defaultCIN={cin}
          defaultPatient={patient}
          lockPatient={true}
        />

        <DocumentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          document={selectedDocument}
          template={
            selectedDocument
              ? templates.find((t) => t.id === selectedDocument.template_id)
              : null
          }
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          users={users}
        />

        <NewDocumentTypeModal
          isOpen={isTypePickerOpen}
          onClose={() => setIsTypePickerOpen(false)}
          onChoose={(type) => {
            setIsTypePickerOpen(false);
            if (type === "normal") {
              openCreateModal();
            } else {
              openCreateScanned();
            }
          }}
        />

        <ScannedDocumentViewerModal
          isOpen={isScanViewerOpen}
          onClose={() => { setIsScanViewerOpen(false); setSelectedScan(null); }}
          document={selectedScan}
        />

        <DeleteDocumentModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteDocument}
          document={selectedDocument}
          template={
            selectedDocument
              ? templates.find((t) => t.id === selectedDocument.template_id)
              : null
          }
          isLoading={isSubmitting}
        />

        <DeleteScannedDocumentModal
          isOpen={isScanDeleteOpen}
          onClose={() => { setIsScanDeleteOpen(false); setSelectedScan(null); }}
          onConfirm={handleDeleteScanned}
          document={selectedScan}
          isLoading={isSubmitting}
        />
      </div>
    </DashboardLayout>
  );
}

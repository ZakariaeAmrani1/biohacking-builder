import { useEffect, useMemo, useState } from "react";
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
import { ClientsService, Client, Utilisateur } from "@/services/clientsService";
import { UserService } from "@/services/userService";
import { EntrepriseService } from "@/services/entrepriseService";
import {
  buildCompanyHeaderHtml,
  buildCompanyFooterHtml,
  wrapPdfHtmlDocument,
} from "@/services/pdfTemplate";
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
  Download,
} from "lucide-react";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("tous");
  const [creatorFilter, setCreatorFilter] = useState<string>("tous");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );

  // Scanned documents state
  const [scannedDocs, setScannedDocs] = useState<ScannedDocument[]>([]);
  const [isScanFormOpen, setIsScanFormOpen] = useState(false);
  const [isScanViewerOpen, setIsScanViewerOpen] = useState(false);
  const [isScanDeleteOpen, setIsScanDeleteOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScannedDocument | null>(
    null,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);

  const { toast } = useToast();

  const creators = Array.from(
    new Set([
      ...documents.map((d) => d.Cree_par),
      ...scannedDocs.map((s) => s.Cree_par),
    ]),
  );

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const [docs, scans, temps, cls, usrs] = await Promise.all([
        DocumentsService.getAll(),
        ScannedDocumentsService.getAll(),
        DocumentTemplatesService.getAll(),
        ClientsService.getAll(),
        UserService.getCurrentAllUsers(),
      ]);
      setDocuments(docs);
      setScannedDocs(scans);
      setTemplates(temps);
      setClients(cls);
      setUsers(usrs);
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

  const getUserName = (CIN: string) => {
    const user = users.find((u) => u.CIN === CIN);
    return user?.nom || CIN;
  };

  const getTemplateName = (templateId: number) => {
    const t = templates.find((tpl) => tpl.id === templateId);
    return t?.name || "Modèle inconnu";
  };

  const getClientByCIN = (cin: string) =>
    clients.find((c) => c.CIN === cin) || null;

  type UnifiedItem = {
    kind: "structured" | "scanned";
    createdAt: string;
    doc?: Document;
    scan?: ScannedDocument;
  };

  const filteredItems = useMemo(() => {
    const structured: UnifiedItem[] = documents.map((d) => ({
      kind: "structured",
      createdAt: d.created_at,
      doc: d,
    }));
    const scanned: UnifiedItem[] = scannedDocs.map((s) => ({
      kind: "scanned",
      createdAt: s.createdAt,
      scan: s,
    }));
    const combined = [...structured, ...scanned];

    const q = searchTerm.toLowerCase();

    const byFilters = combined.filter((item) => {
      if (item.kind === "structured" && item.doc) {
        const t = templates.find((tt) => tt.id === item.doc!.template_id);
        const templateName = t?.name || "";
        const creatorName = getUserName(item.doc!.Cree_par) || "";
        const client = getClientByCIN(item.doc!.CIN);
        const patientText = client
          ? `${client.prenom} ${client.nom} ${client.CIN}`
          : item.doc!.CIN;
        const matchesSearch =
          templateName.toLowerCase().includes(q) ||
          creatorName.toLowerCase().includes(q) ||
          patientText.toLowerCase().includes(q) ||
          JSON.stringify(item.doc!.data_json).toLowerCase().includes(q);
        const matchesTemplate =
          templateFilter === "tous" ||
          item.doc!.template_id.toString() === templateFilter;
        const matchesCreator =
          creatorFilter === "tous" || item.doc!.Cree_par === creatorFilter;
        return matchesSearch && matchesTemplate && matchesCreator;
      }
      if (item.kind === "scanned" && item.scan) {
        const s = item.scan;
        const creatorName = getUserName(s.Cree_par) || "";
        const client = getClientByCIN(s.CIN);
        const patientText = client
          ? `${client.prenom} ${client.nom} ${client.CIN}`
          : s.CIN;
        const matchesSearch =
          s.title.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q) ||
          s.filename.toLowerCase().includes(q) ||
          creatorName.toLowerCase().includes(q) ||
          patientText.toLowerCase().includes(q);
        const matchesTemplate =
          templateFilter === "tous" || templateFilter === "scanned";
        const matchesCreator =
          creatorFilter === "tous" || s.Cree_par === creatorFilter;
        return matchesSearch && matchesTemplate && matchesCreator;
      }
      return false;
    });

    return byFilters.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [
    documents,
    scannedDocs,
    templates,
    searchTerm,
    templateFilter,
    creatorFilter,
  ]);

  const openCreateStructured = () => {
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

  const closeModals = () => {
    setTimeout(() => {
      setIsFormModalOpen(false);
      setIsDetailsModalOpen(false);
      setIsDeleteModalOpen(false);
      setIsScanFormOpen(false);
      setIsScanViewerOpen(false);
      setIsScanDeleteOpen(false);
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

  const handleCreateDocument = async (data: DocumentFormData) => {
    try {
      setIsSubmitting(true);
      await DocumentsService.create(data);
      await loadAll();
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le document a été créé avec succès",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de créer le document",
        variant: "destructive",
      });
      throw new Error("Create failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateScanned = async (data: ScannedDocumentFormData) => {
    try {
      setIsSubmitting(true);
      await ScannedDocumentsService.create(data);
      await loadAll();
      setIsScanFormOpen(false);
      setSelectedScan(null);
      toast({
        title: "Succès",
        description: "Le document scanné a été créé avec succès",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de créer le document scanné",
        variant: "destructive",
      });
      throw new Error("Create scanned failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDocument = async (data: DocumentFormData) => {
    if (!selectedDocument) return;
    try {
      setIsSubmitting(true);
      console.log(data);
      await DocumentsService.update(selectedDocument.id, data);
      await loadAll();
      closeFormModal();
      toast({
        title: "Succès",
        description: "Le document a été modifié avec succès",
      });
    } catch (error) {
      console.log(error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le document",
        variant: "destructive",
      });
      throw new Error("Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateScanned = async (data: ScannedDocumentFormData) => {
    if (!selectedScan) return;
    try {
      setIsSubmitting(true);
      await ScannedDocumentsService.update(selectedScan.id, data);
      await loadAll();
      setIsScanFormOpen(false);
      setSelectedScan(null);
      toast({
        title: "Succès",
        description: "Le document scanné a été modifié avec succès",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le document scanné",
        variant: "destructive",
      });
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
      await loadAll();
      closeDeleteModal();
      toast({
        title: "Succès",
        description: "Le document a été supprimé avec succès",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
      throw new Error("Delete failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteScanned = async () => {
    if (!selectedScan) return;
    try {
      setIsSubmitting(true);
      await ScannedDocumentsService.delete(selectedScan.id);
      await loadAll();
      setIsScanDeleteOpen(false);
      setSelectedScan(null);
      toast({
        title: "Succès",
        description: "Le document scanné a été supprimé avec succès",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document scanné",
        variant: "destructive",
      });
      throw new Error("Delete scanned failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const generatePDF = async (document: Document) => {
    const template = templates.find((t) => t.id === document.template_id);
    const patient =
      getClientByCIN(document.CIN) ||
      (await ClientsService.getByCIN(document.CIN));

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la fenêtre d'impression",
        variant: "destructive",
      });
      return;
    }

    const entreprise = await EntrepriseService.getEntreprise().catch(
      () => null,
    );

    const headerHtml = buildCompanyHeaderHtml(entreprise, {
      title: template?.name || "Document Médical",
      subtitle: `Document ID: ${document.id}`,
    });

    const patientInfoHtml = `
      <div class="pdf-card pdf-section">
        <div class="pdf-section-title">Informations Patient</div>
        <div class="pdf-row"><span class="pdf-label">Nom:</span><span class="pdf-value">${patient ? `${patient.prenom} ${patient.nom}` : ""}</span></div>
        <div class="pdf-row"><span class="pdf-label">CIN:</span><span class="pdf-value">${document.CIN}</span></div>
        <div class="pdf-row"><span class="pdf-label">Date de création:</span><span class="pdf-value">${formatDate(document.created_at)}</span></div>
        <div class="pdf-row"><span class="pdf-label">Créé par:</span><span class="pdf-value">${getUserName(document.Cree_par)}</span></div>
      </div>
    `;

    const sectionsHtml = template
      ? template.sections_json.sections
          .map((section, sIdx) => {
            const fieldsHtml = section.fields
              .map((field, fIdx) => {
                const key = computeFieldKey(document.template_id, sIdx, fIdx);
                const value = getFieldValue(
                  document.data_json,
                  key,
                  field.name,
                );
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

  return (
    <DashboardLayout>
      <div className="flex-1 flex gap-6 p-4 md:p-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
              <p className="text-muted-foreground">
                Tous les documents de tous les patients
              </p>
            </div>
            <Button className="gap-2" onClick={() => setIsTypePickerOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouveau Document
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rechercher et Filtrer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher dans les documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

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

          {viewMode === "table" ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type de document</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>CIN</TableHead>
                        <TableHead>Créé par</TableHead>
                        <TableHead>Date de création</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length > 0 ? (
                        filteredItems.map((item, idx) => {
                          if (item.kind === "structured" && item.doc) {
                            const document = item.doc;
                            const client = getClientByCIN(document.CIN);
                            return (
                              <TableRow
                                key={`doc-${document.id}`}
                                className="hover:bg-muted/50"
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <div>
                                      <div className="font-medium">
                                        {getTemplateName(document.template_id)}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        ID: {document.id}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {client ? (
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span>
                                        {client.prenom} {client.nom}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-mono">
                                      {document.CIN}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="font-mono">
                                    {client ? client.CIN : document.CIN}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {getUserName(document.Cree_par)}
                                </TableCell>
                                <TableCell>
                                  {formatDate(document.created_at)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() =>
                                          openDetailsModal(document)
                                        }
                                      >
                                        <Eye className="h-4 w-4" />
                                        Voir détails
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => generatePDF(document)}
                                      >
                                        <Download className="h-4 w-4" />
                                        Télécharger PDF
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => openEditModal(document)}
                                      >
                                        <Edit className="h-4 w-4" />
                                        Modifier
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="gap-2 text-red-600"
                                        onClick={() =>
                                          openDeleteModal(document)
                                        }
                                      >
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
                            const client = getClientByCIN(scan.CIN);
                            return (
                              <TableRow
                                key={`scan-${scan.id}`}
                                className="bg-amber-50 dark:bg-amber-900/20"
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <div>
                                      <div className="font-medium">
                                        Document scanné
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {scan.title} • ID: {scan.id}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {client ? (
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span>
                                        {client.prenom} {client.nom}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-mono">
                                      {scan.CIN}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="font-mono">
                                    {client ? client.CIN : scan.CIN}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {getUserName(scan.Cree_par)}
                                </TableCell>
                                <TableCell>
                                  {formatDate(scan.createdAt)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => openScanViewer(scan)}
                                      >
                                        <Eye className="h-4 w-4" />
                                        Voir (PDF)
                                      </DropdownMenuItem>
                                      {scan.file_url && (
                                        <DropdownMenuItem
                                          className="gap-2"
                                          onClick={() =>
                                            window.open(
                                              scan.file_url!,
                                              "_blank",
                                            )
                                          }
                                        >
                                          <Download className="h-4 w-4" />
                                          Télécharger PDF
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => openEditScan(scan)}
                                      >
                                        <Edit className="h-4 w-4" />
                                        Modifier
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="gap-2 text-red-600"
                                        onClick={() => openDeleteScan(scan)}
                                      >
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
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                Aucun document trouvé
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
            <div className="space-y-6">
              {filteredItems.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {filteredItems.map((item) => {
                    if (item.kind === "structured" && item.doc) {
                      const document = item.doc;
                      const client = getClientByCIN(document.CIN);
                      return (
                        <Card
                          key={`doc-card-${document.id}`}
                          className="hover:shadow-md transition-shadow"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-primary" />
                                  {getTemplateName(document.template_id)}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  ID: {document.id}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Patient:</span>
                                {client ? (
                                  <span>
                                    {client.prenom} {client.nom} ({client.CIN})
                                  </span>
                                ) : (
                                  <span className="font-mono">
                                    {document.CIN}
                                  </span>
                                )}
                              </div>
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
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="gap-2"
                                      onClick={() => openDetailsModal(document)}
                                    >
                                      <Eye className="h-4 w-4" />
                                      Voir détails
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="gap-2"
                                      onClick={() => generatePDF(document)}
                                    >
                                      <Download className="h-4 w-4" />
                                      Télécharger PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="gap-2"
                                      onClick={() => openEditModal(document)}
                                    >
                                      <Edit className="h-4 w-4" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="gap-2 text-red-600"
                                      onClick={() => openDeleteModal(document)}
                                    >
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
                      const client = getClientByCIN(scan.CIN);
                      return (
                        <Card
                          key={`scan-card-${scan.id}`}
                          className="hover:shadow-md transition-shadow border-amber-200"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-primary" />
                                  Document scanné — {scan.title}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  ID: {scan.id} • Fichier: {scan.filename}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Patient:</span>
                                {client ? (
                                  <span>
                                    {client.prenom} {client.nom} ({client.CIN})
                                  </span>
                                ) : (
                                  <span className="font-mono">{scan.CIN}</span>
                                )}
                              </div>
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
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="gap-2"
                                      onClick={() => openScanViewer(scan)}
                                    >
                                      <Eye className="h-4 w-4" />
                                      Voir (PDF)
                                    </DropdownMenuItem>
                                    {scan.file_url && (
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() =>
                                          window.open(scan.file_url!, "_blank")
                                        }
                                      >
                                        <Download className="h-4 w-4" />
                                        Télécharger PDF
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      className="gap-2"
                                      onClick={() => openEditScan(scan)}
                                    >
                                      <Edit className="h-4 w-4" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="gap-2 text-red-600"
                                      onClick={() => openDeleteScan(scan)}
                                    >
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
                          Essayez d'ajuster les filtres ou la recherche
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DocumentFormModal
          isOpen={isFormModalOpen}
          onClose={closeFormModal}
          onSubmit={
            selectedDocument ? handleUpdateDocument : handleCreateDocument
          }
          document={selectedDocument}
          patient={null}
          templates={templates}
          isLoading={isSubmitting}
          users={users}
        />

        <ScannedDocumentFormModal
          isOpen={isScanFormOpen}
          onClose={() => {
            setIsScanFormOpen(false);
            setSelectedScan(null);
          }}
          onSubmit={selectedScan ? handleUpdateScanned : handleCreateScanned}
          document={selectedScan}
          users={users}
          isLoading={isSubmitting}
        />

        <DocumentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          document={selectedDocument}
          template={
            selectedDocument
              ? templates.find((t) => t.id === selectedDocument.template_id) ||
                null
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
              openCreateStructured();
            } else {
              openCreateScanned();
            }
          }}
        />

        <ScannedDocumentViewerModal
          isOpen={isScanViewerOpen}
          onClose={() => {
            setIsScanViewerOpen(false);
            setSelectedScan(null);
          }}
          document={selectedScan}
        />

        <DeleteDocumentModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteDocument}
          document={selectedDocument}
          template={
            selectedDocument
              ? templates.find((t) => t.id === selectedDocument.template_id) ||
                null
              : null
          }
          isLoading={isSubmitting}
        />

        <DeleteScannedDocumentModal
          isOpen={isScanDeleteOpen}
          onClose={() => {
            setIsScanDeleteOpen(false);
            setSelectedScan(null);
          }}
          onConfirm={handleDeleteScanned}
          document={selectedScan}
          isLoading={isSubmitting}
        />
      </div>
    </DashboardLayout>
  );
}

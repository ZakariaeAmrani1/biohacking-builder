import { useState, useEffect } from "react";
import {
  FileText,
  AlertTriangle,
  User,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  AlignLeft,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  DocumentFormData,
  Document,
  validateDocumentData,
  getAvailableDoctors,
  createEmptyDocumentData,
  getFieldValue,
  setFieldValue,
  computeFieldKey,
} from "@/services/documentsService";
import {
  DocumentTemplate,
  DocumentField,
} from "@/services/documentTemplatesService";
import {
  Client,
  ClientsService,
  Utilisateur,
  calculateAge,
} from "@/services/clientsService";
import { AuthService } from "@/services/authService";

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DocumentFormData) => Promise<void>;
  document?: Document | null;
  patient: Client | null;
  templates: DocumentTemplate[];
  isLoading?: boolean;
  users: Utilisateur[] | null;
}

export default function DocumentFormModal({
  isOpen,
  onClose,
  onSubmit,
  document,
  patient,
  templates,
  isLoading = false,
  users,
}: DocumentFormModalProps) {
  const [formData, setFormData] = useState<DocumentFormData>(
    createEmptyDocumentData(),
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const isEditMode = !!document;
  const availableDoctors = getAvailableDoctors();

  // Load clients for selection when patient is not preselected
  useEffect(() => {
    if (!patient && !isEditMode) {
      setIsClientsLoading(true);
      ClientsService.getAll()
        .then((list) => setClients(list))
        .catch(() => setClients([]))
        .finally(() => setIsClientsLoading(false));
    }
  }, [patient, isEditMode]);

  const filteredClients = clients.filter((client) => {
    const q = clientSearchQuery.toLowerCase();
    return (
      client.nom.toLowerCase().includes(q) ||
      client.prenom.toLowerCase().includes(q) ||
      client.CIN.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q)
    );
  });

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setFormData((prev) => ({ ...prev, CIN: client.CIN }));
    setIsClientSelectorOpen(false);
    setClientSearchQuery("");
    if (errors.length > 0) setErrors([]);
  };

  // Initialize form data when document or patient changes
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (document) {
      setFormData({
        template_id: document.template_id,
        CIN: document.CIN,
        data_json: document.data_json,
        Cree_par: user.CIN,
      });

      const template = templates.find((t) => t.id === document.template_id);
      setSelectedTemplate(template || null);

      const client = clients.find((client) => client.CIN === document.CIN);
      setSelectedClient(client);
    } else if (patient) {
      setFormData({
        template_id: 0,
        CIN: patient.CIN,
        data_json: {},
        Cree_par: user.CIN,
      });
      setSelectedTemplate(null);
    } else {
      setFormData(createEmptyDocumentData());
      setSelectedTemplate(null);
    }
    setErrors([]);
  }, [document, patient, templates, isOpen]);

  const handleTemplateChange = (templateId: string) => {
    const numericId = parseInt(templateId);
    const template = templates.find((t) => t.id === numericId);

    setSelectedTemplate(template || null);
    setFormData((prev) => ({
      ...prev,
      template_id: numericId,
      data_json: {},
    }));

    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleFieldChange = (
    fieldKey: string,
    value: any,
    fallbackName?: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      data_json: setFieldValue(prev.data_json, fieldKey, value, fallbackName),
    }));

    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleBasicFieldChange = (
    field: keyof DocumentFormData,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case "text":
        return <Type className="h-4 w-4" />;
      case "number":
        return <Hash className="h-4 w-4" />;
      case "textarea":
        return <AlignLeft className="h-4 w-4" />;
      case "date":
        return <Calendar className="h-4 w-4" />;
      case "select":
        return <List className="h-4 w-4" />;
      case "checkbox":
        return <CheckSquare className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  const renderField = (
    field: DocumentField,
    sectionIndex: number,
    fieldIndex: number,
  ) => {
    const fieldKey = computeFieldKey(
      formData.template_id,
      sectionIndex,
      fieldIndex,
    );
    const currentValue = getFieldValue(
      formData.data_json,
      fieldKey,
      field.name,
    );

    switch (field.type) {
      case "text":
        return (
          <Input
            value={currentValue || ""}
            onChange={(e) =>
              handleFieldChange(fieldKey, e.target.value, field.name)
            }
            disabled={isSubmitting}
            placeholder={`Saisir ${field.name.toLowerCase()}`}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={currentValue || ""}
            onChange={(e) =>
              handleFieldChange(
                fieldKey,
                e.target.value ? parseFloat(e.target.value) : "",
                field.name,
              )
            }
            disabled={isSubmitting}
            placeholder={`Saisir ${field.name.toLowerCase()}`}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={currentValue || ""}
            onChange={(e) =>
              handleFieldChange(fieldKey, e.target.value, field.name)
            }
            disabled={isSubmitting}
            placeholder={`Saisir ${field.name.toLowerCase()}`}
            rows={3}
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={currentValue || ""}
            onChange={(e) =>
              handleFieldChange(fieldKey, e.target.value, field.name)
            }
            disabled={isSubmitting}
          />
        );

      case "select":
        return (
          <Select
            value={currentValue || ""}
            onValueChange={(value) =>
              handleFieldChange(fieldKey, value, field.name)
            }
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={`Sélectionner ${field.name.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={currentValue === true}
              onCheckedChange={(checked) =>
                handleFieldChange(fieldKey, checked, field.name)
              }
              disabled={isSubmitting}
            />
            <Label className="text-sm">{field.name}</Label>
          </div>
        );

      default:
        return (
          <Input
            value={currentValue || ""}
            onChange={(e) =>
              handleFieldChange(fieldKey, e.target.value, field.name)
            }
            disabled={isSubmitting}
            placeholder={`Saisir ${field.name.toLowerCase()}`}
          />
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateDocumentData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Validate required fields from template
    if (selectedTemplate) {
      const templateErrors: string[] = [];

      selectedTemplate.sections_json.sections.forEach((section, sIdx) => {
        section.fields.forEach((field, fIdx) => {
          if (field.required) {
            const key = computeFieldKey(formData.template_id, sIdx, fIdx);
            const value = getFieldValue(formData.data_json, key, field.name);
            if (!value && value !== 0 && value !== false) {
              templateErrors.push(`Le champ \"${field.name}\" est obligatoire`);
            }
          }
        });
      });

      if (templateErrors.length > 0) {
        setErrors(templateErrors);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors(
        Array.isArray(error?.response?.data?.message) &&
          error.response.data.message.length > 0
          ? error.response.data.message
          : [
              error?.response?.data?.message ??
                "Une erreur s'est produite lors de l'enregistrement",
            ],
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditMode ? "Modifier le document" : "Nouveau document"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les données de ce document"
              : "Créez un nouveau document en remplissant les informations ci-dessous"}
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations de base</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_id">Type de document</Label>
                <Select
                  value={formData.template_id.toString()}
                  onValueChange={handleTemplateChange}
                  disabled={isSubmitting || isEditMode} // Can't change template in edit mode
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le type de document" />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="Cree_par">Créé par</Label>
                <Select
                  value={formData.Cree_par}
                  onValueChange={(value) =>
                    handleBasicFieldChange("Cree_par", value)
                  }
                  disabled={true}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le médecin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(users) && users.length > 0 ? (
                      users.map((user) => (
                        <SelectItem key={user.CIN} value={user.CIN}>
                          {user.nom}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500">
                        Aucun médecin trouvé
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Patient</Label>
              {patient ? (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      {`${patient.prenom} ${patient.nom}`}
                    </span>
                    <span className="text-muted-foreground">
                      ({formData.CIN})
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <Popover
                    open={isClientSelectorOpen}
                    onOpenChange={setIsClientSelectorOpen}
                    modal={true as any}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isClientSelectorOpen}
                        className="w-full justify-between"
                        disabled={isSubmitting}
                      >
                        {selectedClient ? (
                          <div className="flex items-center gap-2">
                            <span>
                              {selectedClient.prenom} {selectedClient.nom}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {selectedClient.CIN}
                            </Badge>
                          </div>
                        ) : (
                          "Rechercher et sélectionner un patient..."
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[500px] p-0 z-[60] shadow-lg border-2"
                      sideOffset={5}
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder="Rechercher par nom, prénom, CIN, email..."
                          value={clientSearchQuery}
                          onValueChange={setClientSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                          <CommandGroup>
                            {clients
                              .filter((c) => {
                                const q = clientSearchQuery.toLowerCase();
                                return (
                                  c.nom.toLowerCase().includes(q) ||
                                  c.prenom.toLowerCase().includes(q) ||
                                  c.CIN.toLowerCase().includes(q) ||
                                  c.email.toLowerCase().includes(q)
                                );
                              })
                              .map((c) => (
                                <CommandItem
                                  key={c.id}
                                  value={`${c.prenom} ${c.nom} ${c.CIN} ${c.email}`}
                                  onSelect={() => {
                                    setSelectedClient(c);
                                    setFormData((prev) => ({
                                      ...prev,
                                      CIN: c.CIN,
                                    }));
                                    setIsClientSelectorOpen(false);
                                    setClientSearchQuery("");
                                    if (errors.length > 0) setErrors([]);
                                  }}
                                  className="flex items-center justify-between p-3"
                                >
                                  <div className="flex flex-col">
                                    <div className="font-medium">
                                      {c.prenom} {c.nom}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {c.CIN} • Âge:{" "}
                                      {calculateAge(c.date_naissance)} ans •{" "}
                                      {c.email}
                                    </div>
                                  </div>
                                  <Badge variant="outline">
                                    {c.groupe_sanguin}
                                  </Badge>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedClient && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {selectedClient.prenom} {selectedClient.nom}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            CIN: {selectedClient.CIN} • Âge:{" "}
                            {calculateAge(selectedClient.date_naissance)} ans
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Email: {selectedClient.email} • Tél:{" "}
                            {selectedClient.numero_telephone}
                          </div>
                        </div>
                        <Badge variant="outline" className="gap-1">
                          {selectedClient.groupe_sanguin}
                        </Badge>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Template Fields */}
          {selectedTemplate && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Données du document</h3>

              {selectedTemplate.sections_json?.sections?.length > 0 ? (
                selectedTemplate.sections_json.sections.map(
                  (section, sectionIndex) => (
                    <Card key={sectionIndex}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          {section.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {section.fields?.map((field, fieldIndex) => (
                          <div key={fieldIndex} className="space-y-2">
                            <Label className="flex items-center gap-2">
                              {getFieldIcon(field.type)}
                              {field.name}
                              {field.required && (
                                <span className="text-red-500">*</span>
                              )}
                            </Label>
                            {renderField(field, sectionIndex, fieldIndex)}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ),
                )
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Ce modèle de document ne contient aucune section configurée.
                  </p>
                </div>
              )}
            </div>
          )}

          {!selectedTemplate && !isEditMode && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Sélectionnez un type de document pour commencer
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedTemplate || !formData.CIN}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isEditMode ? "Modification..." : "Création..."}
                </div>
              ) : isEditMode ? (
                "Modifier"
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

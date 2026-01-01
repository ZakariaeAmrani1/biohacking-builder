import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  Settings,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  AlignLeft,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DocumentTemplateFormData,
  DocumentTemplate,
  DocumentSection,
  DocumentField,
  validateTemplateData,
  getAvailableDoctors,
  getFieldTypes,
  createEmptyTemplate,
  createEmptySection,
  createEmptyField,
} from "@/services/documentTemplatesService";
import { Utilisateur } from "@/services/clientsService";
import { AuthService } from "@/services/authService";

interface DocumentTemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DocumentTemplateFormData) => Promise<void>;
  template?: DocumentTemplate | null;
  isLoading?: boolean;
  users: Utilisateur[] | null;
}

export default function DocumentTemplateFormModal({
  isOpen,
  onClose,
  onSubmit,
  template,
  isLoading = false,
  users,
}: DocumentTemplateFormModalProps) {
  const [formData, setFormData] = useState<DocumentTemplateFormData>(
    createEmptyTemplate(),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!template;
  const availableDoctors = getAvailableDoctors();
  const fieldTypes = getFieldTypes();

  // Initialize form data when template changes
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (template) {
      setFormData({
        name: template.name,
        sections_json: template.sections_json,
        Cree_par: template.Cree_par || user.CIN,
      });
    } else {
      setFormData(createEmptyTemplate(user.CIN));
    }
    setErrors([]);
  }, [template, isOpen]);

  const handleInputChange = (
    field: keyof DocumentTemplateFormData,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSectionChange = (
    sectionIndex: number,
    field: keyof DocumentSection,
    value: any,
  ) => {
    const newSections = [...formData.sections_json.sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      [field]: value,
    };
    handleInputChange("sections_json", { sections: newSections });
  };

  const handleFieldChange = (
    sectionIndex: number,
    fieldIndex: number,
    field: keyof DocumentField,
    value: any,
  ) => {
    const newSections = [...formData.sections_json.sections];
    const newFields = [...newSections[sectionIndex].fields];
    newFields[fieldIndex] = { ...newFields[fieldIndex], [field]: value };
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      fields: newFields,
    };
    handleInputChange("sections_json", { sections: newSections });
  };

  const addSection = () => {
    const newSections = [
      ...formData.sections_json.sections,
      createEmptySection(),
    ];
    handleInputChange("sections_json", { sections: newSections });
  };

  const removeSection = (sectionIndex: number) => {
    const newSections = formData.sections_json.sections.filter(
      (_, index) => index !== sectionIndex,
    );
    handleInputChange("sections_json", { sections: newSections });
  };

  const addField = (sectionIndex: number) => {
    const newSections = [...formData.sections_json.sections];
    newSections[sectionIndex].fields.push(createEmptyField());
    handleInputChange("sections_json", { sections: newSections });
  };

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    const newSections = [...formData.sections_json.sections];
    newSections[sectionIndex].fields = newSections[sectionIndex].fields.filter(
      (_, index) => index !== fieldIndex,
    );
    handleInputChange("sections_json", { sections: newSections });
  };

  const handleFieldOptionsChange = (
    sectionIndex: number,
    fieldIndex: number,
    options: string,
  ) => {
    const optionsArray = options
      .split("\n")
      .map((option) => option.trim())
      .filter((option) => option);
    handleFieldChange(sectionIndex, fieldIndex, "options", optionsArray);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateTemplateData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditMode ? "Modifier le modèle" : "Nouveau modèle de document"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez la structure de votre modèle de document"
              : "Créez un nouveau modèle de document avec des sections et des champs personnalisés"}
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
                <Label htmlFor="name">Nom du modèle</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Ex: Consultation médicale"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="Cree_par">Créé par</Label>
                <Select
                  value={formData.Cree_par}
                  onValueChange={(value) =>
                    handleInputChange("Cree_par", value)
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
          </div>

          <Separator />

          {/* Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sections du document</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSection}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter une section
              </Button>
            </div>

            {formData.sections_json.sections.map((section, sectionIndex) => (
              <Card key={sectionIndex}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Section {sectionIndex + 1}
                    </CardTitle>
                    {formData.sections_json.sections.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSection(sectionIndex)}
                        disabled={isSubmitting}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Section Title */}
                  <div className="space-y-2">
                    <Label>Titre de la section</Label>
                    <Input
                      value={section.title}
                      onChange={(e) =>
                        handleSectionChange(
                          sectionIndex,
                          "title",
                          e.target.value,
                        )
                      }
                      placeholder="Ex: Informations générales"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Fields */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Champs</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addField(sectionIndex)}
                        disabled={isSubmitting}
                        className="gap-2"
                      >
                        <Plus className="h-3 w-3" />
                        Ajouter un champ
                      </Button>
                    </div>

                    {section.fields.map((field, fieldIndex) => (
                      <div
                        key={fieldIndex}
                        className="p-3 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="gap-1">
                            {getFieldIcon(field.type)}
                            Champ {fieldIndex + 1}
                          </Badge>
                          {section.fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeField(sectionIndex, fieldIndex)
                              }
                              disabled={isSubmitting}
                              className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Field Name */}
                          <div className="space-y-1">
                            <Label className="text-xs">Nom du champ</Label>
                            <Input
                              value={field.name}
                              onChange={(e) =>
                                handleFieldChange(
                                  sectionIndex,
                                  fieldIndex,
                                  "name",
                                  e.target.value,
                                )
                              }
                              placeholder="Ex: Nom"
                              disabled={isSubmitting}
                              className="h-8 text-sm"
                            />
                          </div>

                          {/* Field Type */}
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value) =>
                                handleFieldChange(
                                  sectionIndex,
                                  fieldIndex,
                                  "type",
                                  value,
                                )
                              }
                              disabled={isSubmitting}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldTypes.map((type) => (
                                  <SelectItem
                                    key={type.value}
                                    value={type.value}
                                  >
                                    <div className="flex items-center gap-2">
                                      {getFieldIcon(type.value)}
                                      {type.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Required Checkbox */}
                          <div className="space-y-1">
                            <Label className="text-xs">Obligatoire</Label>
                            <div className="flex items-center space-x-2 h-8">
                              <Checkbox
                                checked={field.required || false}
                                onCheckedChange={(checked) =>
                                  handleFieldChange(
                                    sectionIndex,
                                    fieldIndex,
                                    "required",
                                    checked,
                                  )
                                }
                                disabled={isSubmitting}
                              />
                              <Label className="text-xs">Requis</Label>
                            </div>
                          </div>
                        </div>

                        {/* Options for select fields */}
                        {field.type === "select" && (
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Options (une par ligne)
                            </Label>
                            <Textarea
                              value={(field.options || []).join("\n")}
                              onChange={(e) =>
                                handleFieldOptionsChange(
                                  sectionIndex,
                                  fieldIndex,
                                  e.target.value,
                                )
                              }
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                              disabled={isSubmitting}
                              rows={3}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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
              disabled={isSubmitting}
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

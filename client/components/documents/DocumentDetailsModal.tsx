import {
  FileText,
  User,
  Calendar,
  Edit,
  Trash2,
  Type,
  Hash,
  AlignLeft,
  List,
  CheckSquare,
  Clock,
  Check,
  X,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Document,
  formatDocumentData,
  getFieldValue,
  computeFieldKey,
} from "@/services/documentsService";
import {
  DocumentTemplate,
  DocumentField,
} from "@/services/documentTemplatesService";
import { Utilisateur } from "@/services/clientsService";

interface DocumentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  template: DocumentTemplate | null;
  onEdit: (document: Document) => void;
  onDelete: (document: Document) => void;
  users: Utilisateur[] | null;
}

export default function DocumentDetailsModal({
  isOpen,
  onClose,
  document,
  template,
  onEdit,
  onDelete,
  users,
}: DocumentDetailsModalProps) {
  if (!document) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    return user.nom || CIN;
  };

  const formatFieldValue = (
    field: DocumentField,
    value: any,
  ): string | JSX.Element => {
    if (value === null || value === undefined || value === "") {
      return (
        <span className="text-muted-foreground italic">Non renseigné</span>
      );
    }

    switch (field.type) {
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            {value ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-red-600" />
            )}
            <span>{value ? "Oui" : "Non"}</span>
          </div>
        );

      case "date":
        try {
          const date = new Date(value);
          return date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        } catch {
          return value.toString();
        }

      case "number":
        return typeof value === "number" ? value.toString() : value;

      case "textarea":
        return (
          <div className="whitespace-pre-wrap text-sm">{value.toString()}</div>
        );

      default:
        return value.toString();
    }
  };

  const renderSectionData = (
    section: any,
    sectionData: Record<string, any>,
    sectionIndex: number,
  ) => {
    if (!section.fields || section.fields.length === 0) {
      return (
        <p className="text-muted-foreground italic">
          Aucun champ dans cette section
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {section.fields.map((field: DocumentField, fieldIndex: number) => {
          const key = computeFieldKey(
            document.template_id,
            sectionIndex,
            fieldIndex,
          );
          const value = getFieldValue(sectionData, key, field.name);

          return (
            <div
              key={fieldIndex}
              className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {getFieldIcon(field.type)}
                <span>{field.name}</span>
                {field.required && (
                  <Badge variant="destructive" className="text-xs px-1 py-0">
                    Requis
                  </Badge>
                )}
              </div>
              <div className="md:col-span-2 text-sm">
                {formatFieldValue(field, value)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const documentData = formatDocumentData(document.data_json);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Détails du document
          </DialogTitle>
          <DialogDescription>
            Consultez les informations complètes de ce document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations générales</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Type de document
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">
                    {template?.name || "Modèle inconnu"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Patient (CIN)
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-mono">{document.CIN}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Créé par
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {getUserName(document.Cree_par)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Date de création
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatDate(document.created_at)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  ID du document
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  <span className="font-mono">#{document.id}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Document Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Données du document</h3>

            {template ? (
              template.sections_json.sections.map((section, sectionIndex) => (
                <Card key={sectionIndex}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderSectionData(
                      section,
                      document.data_json,
                      sectionIndex,
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              // Fallback if template is not available
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Données brutes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {documentData.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-3 gap-2"
                      >
                        <div className="text-sm font-medium">{item.key}</div>
                        <div className="md:col-span-2 text-sm">
                          {typeof item.value === "boolean" ? (
                            <div className="flex items-center gap-2">
                              {item.value ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-red-600" />
                              )}
                              <span>{item.value ? "Oui" : "Non"}</span>
                            </div>
                          ) : item.value === null ||
                            item.value === undefined ||
                            item.value === "" ? (
                            <span className="text-muted-foreground italic">
                              Non renseigné
                            </span>
                          ) : (
                            item.value.toString()
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Template Information */}
          {template && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">À propos du modèle</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">Modèle:</span> {template.name}
                  </div>
                  <div>
                    <span className="font-medium">Créé par:</span>{" "}
                    {getUserName(template.Cree_par)}
                  </div>
                  <div>
                    <span className="font-medium">Structure:</span>{" "}
                    {template.sections_json.sections.length} section(s),{" "}
                    {template.sections_json.sections.reduce(
                      (total, section) => total + section.fields.length,
                      0,
                    )}{" "}
                    champ(s)
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit(document)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(document)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

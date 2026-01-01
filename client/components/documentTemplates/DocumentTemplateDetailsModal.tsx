import {
  FileText,
  User,
  Calendar,
  Settings,
  Edit,
  Trash2,
  Type,
  Hash,
  AlignLeft,
  List,
  CheckSquare,
  Clock,
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
  DocumentTemplate,
  DocumentField,
} from "@/services/documentTemplatesService";
import { Utilisateur } from "@/services/clientsService";

interface DocumentTemplateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate | null;
  onEdit: (template: DocumentTemplate) => void;
  onDelete: (template: DocumentTemplate) => void;
  users: Utilisateur[] | null;
}

export default function DocumentTemplateDetailsModal({
  isOpen,
  onClose,
  template,
  onEdit,
  onDelete,
  users,
}: DocumentTemplateDetailsModalProps) {
  if (!template) return null;

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

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case "text":
        return "Texte";
      case "number":
        return "Nombre";
      case "textarea":
        return "Zone de texte";
      case "date":
        return "Date";
      case "select":
        return "Liste déroulante";
      case "checkbox":
        return "Case à cocher";
      default:
        return type;
    }
  };

  const getUserName = (CIN: string) => {
    const user = users.find((user) => user.CIN === CIN);
    return user.nom || CIN;
  };

  const renderFieldDetails = (field: DocumentField) => (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getFieldIcon(field.type)}
          <span className="font-medium">{field.name}</span>
          {field.required && (
            <Badge variant="destructive" className="text-xs px-1 py-0">
              Requis
            </Badge>
          )}
        </div>
        <Badge variant="outline" className="text-xs">
          {getFieldTypeLabel(field.type)}
        </Badge>
      </div>

      {field.type === "select" && field.options && field.options.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Options:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {field.options.map((option, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {option}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const totalFields = template.sections_json.sections.reduce(
    (total, section) => total + section.fields.length,
    0,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Détails du modèle
          </DialogTitle>
          <DialogDescription>
            Visualisez la structure complète de votre modèle de document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations générales</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Nom du modèle
                </div>
                <div className="text-lg font-medium">{template.name}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Créé par
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {getUserName(template.Cree_par)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Date de création
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatDate(template.created_at)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Statistiques
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {template.sections_json.sections.length} section(s)
                  </Badge>
                  <Badge variant="outline">{totalFields} champ(s)</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sections */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Structure du document</h3>

            {template.sections_json.sections.map((section, sectionIndex) => (
              <Card key={sectionIndex}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {section.title}
                    <Badge variant="outline" className="ml-auto">
                      {section.fields.length} champ(s)
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex}>{renderFieldDetails(field)}</div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit(template)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(template)}
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

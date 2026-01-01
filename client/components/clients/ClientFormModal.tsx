import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Users,
  User,
  FileText,
  Clock,
  Mail,
  Phone,
  MapPin,
  Heart,
  Stethoscope,
  AlertTriangle,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ClientFormData,
  Client,
  Utilisateur,
  validateClientData,
  getAvailableDoctors,
  getBloodGroups,
} from "@/services/clientsService";
import { AuthService } from "@/services/authService";

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => Promise<void>;
  client?: Client | null;
  isLoading?: boolean;
  users: Utilisateur[] | null;
}

export default function ClientFormModal({
  isOpen,
  onClose,
  onSubmit,
  client,
  isLoading = false,
  users,
}: ClientFormModalProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    CIN: "",
    nom: "",
    prenom: "",
    date_naissance: "",
    adresse: "",
    numero_telephone: "",
    email: "",
    groupe_sanguin: "",
    antecedents: "",
    allergies: "",
    commentaire: "",
    Cree_par: "",
  });
  const { toast } = useToast();

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!client;
  const availableDoctors = getAvailableDoctors();
  const bloodGroups = getBloodGroups();

  // Initialize form data when client changes
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (client) {
      const birthDate = client.date_naissance
        ? new Date(client.date_naissance).toISOString().slice(0, 10)
        : "";

      setFormData({
        CIN: client.CIN || "",
        nom: client.nom || "",
        prenom: client.prenom || "",
        date_naissance: birthDate,
        adresse: client.adresse || "",
        numero_telephone: client.numero_telephone || "",
        email: client.email || "",
        groupe_sanguin: client.groupe_sanguin || "",
        antecedents: client.antecedents || "",
        allergies: client.allergies || "",
        commentaire: client.commentaire || "",
        Cree_par: client.Cree_par || user.CIN,
      });
    } else {
      // Reset form for new client
      setFormData({
        CIN: "",
        nom: "",
        prenom: "",
        date_naissance: "",
        adresse: "",
        numero_telephone: "",
        email: "",
        groupe_sanguin: "",
        antecedents: "",
        allergies: "",
        commentaire: "",
        Cree_par: user.CIN,
      });
    }
    setErrors([]);
  }, [client, isOpen]);

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.date_naissance === "") formData.date_naissance = "2000-01-01";
    // Validate form data
    const validationErrors = validateClientData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast({
        title: "Erreur",
        description: "Impossible de créer le patient",
        variant: "destructive",
      });
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
      // Reset form and errors when closing
      setErrors([]);
      onClose();
    }
  };

  const generateRandomCIN = (): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    let digits = "";
    for (let i = 0; i < bytes.length; i++) {
      digits += String(bytes[i] % 10);
    }
    return `BH${digits}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isEditMode ? "Modifier le patient" : "Nouveau patient"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les informations du patient"
              : "Créez un nouveau patient en remplissant les informations ci-dessous"}
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
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations Personnelles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CIN */}
              <div className="space-y-2">
                <Label htmlFor="CIN" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  CIN
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="CIN"
                    value={formData.CIN}
                    onChange={(e) =>
                      handleInputChange("CIN", e.target.value.toUpperCase())
                    }
                    placeholder="BH123456"
                    disabled={isEditMode ? true : isSubmitting}
                    className="font-mono"
                  />
                  {!isEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleInputChange("CIN", generateRandomCIN())
                      }
                      disabled={isSubmitting}
                    >
                      Générer
                    </Button>
                  )}
                </div>
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => handleInputChange("nom", e.target.value)}
                  placeholder="Nom de famille"
                  disabled={isSubmitting}
                />
              </div>

              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => handleInputChange("prenom", e.target.value)}
                  placeholder="Prénom"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Birth Date */}
              <div className="space-y-2">
                <Label
                  htmlFor="date_naissance"
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Date de naissance
                </Label>
                <Input
                  id="date_naissance"
                  type="date"
                  value={formData.date_naissance}
                  onChange={(e) =>
                    handleInputChange("date_naissance", e.target.value)
                  }
                  disabled={isSubmitting}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>

              {/* Blood Group */}
              <div className="space-y-2">
                <Label
                  htmlFor="groupe_sanguin"
                  className="flex items-center gap-2"
                >
                  <Heart className="h-4 w-4" />
                  Groupe sanguin
                </Label>
                <Select
                  value={formData.groupe_sanguin}
                  onValueChange={(value) =>
                    handleInputChange("groupe_sanguin", value)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le groupe sanguin" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Informations de Contact
            </h3>

            <div className="space-y-4">
              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="adresse" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Adresse
                </Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => handleInputChange("adresse", e.target.value)}
                  placeholder="Adresse complète"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="numero_telephone">Téléphone</Label>
                  <Input
                    id="numero_telephone"
                    value={formData.numero_telephone}
                    onChange={(e) =>
                      handleInputChange("numero_telephone", e.target.value)
                    }
                    placeholder="+212 6 123 45 676"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="email@exemple.com"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Informations Médicales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Medical History */}
              <div className="space-y-2">
                <Label htmlFor="antecedents">Antécédents médicaux</Label>
                <Textarea
                  id="antecedents"
                  value={formData.antecedents}
                  onChange={(e) =>
                    handleInputChange("antecedents", e.target.value)
                  }
                  placeholder="Historique médical du patient..."
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>

              {/* Allergies */}
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) =>
                    handleInputChange("allergies", e.target.value)
                  }
                  placeholder="Allergies connues..."
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="commentaire">Commentaires</Label>
              <Textarea
                id="commentaire"
                value={formData.commentaire}
                onChange={(e) =>
                  handleInputChange("commentaire", e.target.value)
                }
                placeholder="Notes supplémentaires..."
                disabled={isSubmitting}
                rows={2}
              />
            </div>
          </div>

          {/* Administrative */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Administration</h3>

            <div className="space-y-2">
              <Label htmlFor="Cree_par" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Créé par
              </Label>
              <Select
                value={formData.Cree_par}
                onValueChange={(value) => handleInputChange("Cree_par", value)}
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
              className="min-w-[100px]"
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

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  User,
  Palette,
  Shield,
  Bell,
  Download,
  Upload,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Check,
  Monitor,
  Sun,
  Moon,
  Type,
  Zap,
  Globe,
  HardDrive,
  DollarSign,
  Building2,
  List,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User as UserType,
  UserFormData,
  PasswordChangeData,
  UserService,
} from "@/services/userService";
import { AppSettings, AppSettingsService } from "@/services/appSettingsService";
import { OptionsService, OptionLists } from "@/services/optionsService";
import {
  Entreprise,
  EntrepriseFormData,
  EntrepriseService,
} from "@/services/entrepriseService";

export default function Settings() {
  const { toast } = useToast();

  // User profile state
  const [user, setUser] = useState<UserType | null>(null);
  const [userFormData, setUserFormData] = useState<UserFormData>({
    CIN: "",
    nom: "",
    prenom: "",
    date_naissance: "",
    adresse: "",
    numero_telephone: "",
    email: "",
    role: "doctor",
  });
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // App settings state
  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: "system",
    fontSize: "medium",
    compactMode: false,
    showAnimations: true,
    language: "fr",
    currency: "DH",
    autoSave: true,
    notifications: {
      desktop: true,
      sound: false,
      email: true,
    },
  });

  // Entreprise state
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [entrepriseFormData, setEntrepriseFormData] =
    useState<EntrepriseFormData>({
      ICE: "",
      CNSS: "",
      RC: "",
      IF: "",
      RIB: "",
      patente: "",
      adresse: "",
      email: "",
      numero_telephone: "",
    });
  const [entrepriseErrors, setEntrepriseErrors] = useState<string[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileErrors, setProfileErrors] = useState<string[]>([]);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");

  // Options (types) state
  const [options, setOptions] = useState<OptionLists>({
    bankNames: [],
    appointmentTypes: [],
    soinTypes: [],
  });
  const [isSavingOptions, setIsSavingOptions] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadUserProfile();
    loadAppSettings();
    loadEntrepriseData();
  }, []);

  useEffect(() => {
    OptionsService.getAll()
      .then(setOptions)
      .catch(() =>
        setOptions({ bankNames: [], appointmentTypes: [], soinTypes: [] }),
      );
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsInitialLoading(true);
      const userData = await UserService.getCurrentUser();
      setUser(userData);
      setUserFormData({
        CIN: userData.CIN,
        nom: userData.nom,
        prenom: userData.prenom,
        date_naissance: userData.date_naissance.split("T")[0],
        adresse: userData.adresse,
        numero_telephone: userData.numero_telephone,
        email: userData.email,
        role: userData.role,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil utilisateur",
        variant: "destructive",
      });
    }
  };

  const loadAppSettings = async () => {
    try {
      const settings = await AppSettingsService.getSettings();
      setAppSettings(settings);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsInitialLoading(false);
    }
  };

  const loadEntrepriseData = async () => {
    try {
      const entrepriseData = await EntrepriseService.getEntreprise();
      setEntreprise(entrepriseData);
      if (entrepriseData) {
        setEntrepriseFormData({
          ICE: entrepriseData.ICE.toString(),
          CNSS: entrepriseData.CNSS.toString(),
          RC: entrepriseData.RC.toString(),
          IF: entrepriseData.IF.toString(),
          RIB: entrepriseData.RIB.toString(),
          patente: entrepriseData.patente.toString(),
          adresse: entrepriseData.adresse,
          email: entrepriseData.email || "",
          numero_telephone: entrepriseData.numero_telephone || "",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations de l'entreprise",
        variant: "destructive",
      });
    }
  };

  const handleUserFormChange = (field: keyof UserFormData, value: string) => {
    setUserFormData((prev) => ({ ...prev, [field]: value }));
    if (profileErrors.length > 0) {
      setProfileErrors([]);
    }
  };

  const handlePasswordChange = (
    field: keyof PasswordChangeData,
    value: string,
  ) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAppSettingChange = async (
    setting: keyof AppSettings,
    value: any,
  ) => {
    try {
      const newSettings = { ...appSettings, [setting]: value };
      setAppSettings(newSettings);
      await AppSettingsService.updateSettings({ [setting]: value });

      toast({
        title: "Paramètre mis à jour",
        description: "Le paramètre a été sauvegardé automatiquement",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le paramètre",
        variant: "destructive",
      });
    }
  };

  const handleEntrepriseFormChange = (
    field: keyof EntrepriseFormData,
    value: string,
  ) => {
    setEntrepriseFormData((prev) => ({ ...prev, [field]: value }));
    if (entrepriseErrors.length > 0) {
      setEntrepriseErrors([]);
    }
  };

  const handleSaveEntreprise = async () => {
    const errors = EntrepriseService.validateEntrepriseData(entrepriseFormData);
    if (errors.length > 0) {
      setEntrepriseErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const updatedEntreprise =
        await EntrepriseService.saveEntreprise(entrepriseFormData);
      setEntreprise(updatedEntreprise);
      toast({
        title: "Informations de l'entreprise mises à jour",
        description: "Les informations ont été sauvegardées avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          "Impossible de sauvegarder les informations de l'entreprise",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = async (
    key: keyof AppSettings["notifications"],
    value: boolean,
  ) => {
    try {
      const newNotifications = { ...appSettings.notifications, [key]: value };
      const newSettings = { ...appSettings, notifications: newNotifications };
      setAppSettings(newSettings);
      await AppSettingsService.updateSettings({
        notifications: newNotifications,
      });

      toast({
        title: "Paramètre de notification mis à jour",
        description: "Le paramètre a été sauvegardé automatiquement",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le paramètre de notification",
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = async () => {
    const errors = UserService.validateUserData(userFormData);
    if (errors.length > 0) {
      setProfileErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const updatedUser = await UserService.updateProfile(userFormData);
      setUser(updatedUser);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setIsLoading(true);
    try {
      await UserService.changePassword(passwordData);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsPasswordDialogOpen(false);
      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été mis à jour avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le mot de passe",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSettings = async () => {
    setIsLoading(true);
    try {
      const defaultSettings = await AppSettingsService.resetToDefaults();
      setAppSettings(defaultSettings);
      setIsResetDialogOpen(false);
      toast({
        title: "Paramètres réinitialisés",
        description:
          "Tous les paramètres ont été remis à leurs valeurs par défaut",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportSettings = async () => {
    try {
      const settingsJson = await AppSettingsService.exportSettings();
      const blob = new Blob([settingsJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "biohacking-clinic-settings.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Paramètres exportés",
        description: "Le fichier de paramètres a été téléchargé",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les paramètres",
        variant: "destructive",
      });
    }
  };

  const handleImportSettings = async () => {
    setIsLoading(true);
    try {
      const newSettings = await AppSettingsService.importSettings(importData);
      setAppSettings(newSettings);
      setImportData("");
      setIsImportDialogOpen(false);
      toast({
        title: "Paramètres importés",
        description: "Les paramètres ont été importés avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur d'importation",
        description: error.message || "Impossible d'importer les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getThemeIcon = (theme: AppSettings["theme"]) => {
    switch (theme) {
      case "light":
        return Sun;
      case "dark":
        return Moon;
      case "system":
        return Monitor;
      default:
        return Monitor;
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground">
            Gérez votre profil et les paramètres de l'application
          </p>
        </div>

        {isInitialLoading ? (
          <div className="space-y-6">
            <div className="grid w-full grid-cols-4 h-10 gap-2">
              <Skeleton className="h-full" />
              <Skeleton className="h-full" />
              <Skeleton className="h-full" />
              <Skeleton className="h-full" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className={`grid w-full ${isAdmin ? "grid-cols-6" : "grid-cols-1"}`}>
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profil
              </TabsTrigger>
              {isAdmin && (
                <>
                  <TabsTrigger value="entreprise" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Entreprise
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="gap-2">
                    <Palette className="h-4 w-4" />
                    Apparence
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="gap-2">
                    <SettingsIcon className="h-4 w-4" />
                    Avancé
                  </TabsTrigger>
                  <TabsTrigger value="options" className="gap-2">
                    <List className="h-4 w-4" />
                    Options
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informations personnelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profileErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {profileErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="CIN">CIN</Label>
                      <Input
                        id="CIN"
                        value={userFormData.CIN}
                        onChange={(e) =>
                          handleUserFormChange("CIN", e.target.value)
                        }
                        placeholder="Num��ro CIN"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Rôle</Label>
                      <Select
                        value={userFormData.role}
                        onValueChange={(value) =>
                          handleUserFormChange(
                            "role",
                            value as UserType["role"],
                          )
                        }
                      >
                        <SelectTrigger disabled>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UserService.getAvailableRoles().map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom</Label>
                      <Input
                        id="prenom"
                        value={userFormData.prenom}
                        onChange={(e) =>
                          handleUserFormChange("prenom", e.target.value)
                        }
                        placeholder="Votre prénom"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom</Label>
                      <Input
                        id="nom"
                        value={userFormData.nom}
                        onChange={(e) =>
                          handleUserFormChange("nom", e.target.value)
                        }
                        placeholder="Votre nom"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date_naissance">Date de naissance</Label>
                      <Input
                        id="date_naissance"
                        type="date"
                        value={userFormData.date_naissance}
                        onChange={(e) =>
                          handleUserFormChange("date_naissance", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userFormData.email}
                        onChange={(e) =>
                          handleUserFormChange("email", e.target.value)
                        }
                        placeholder="votre@email.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numero_telephone">Téléphone</Label>
                      <Input
                        id="numero_telephone"
                        value={userFormData.numero_telephone}
                        onChange={(e) =>
                          handleUserFormChange(
                            "numero_telephone",
                            e.target.value,
                          )
                        }
                        placeholder="+212 6 123 45 676"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adresse">Adresse</Label>
                    <Textarea
                      id="adresse"
                      value={userFormData.adresse}
                      onChange={(e) =>
                        handleUserFormChange("adresse", e.target.value)
                      }
                      placeholder="Votre adresse complète"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? "Sauvegarde..." : "Sauvegarder le profil"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsPasswordDialogOpen(true)}
                      className="gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Changer le mot de passe
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {user && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informations du compte</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">ID utilisateur:</span>{" "}
                        {user.id}
                      </div>
                      <div>
                        <span className="font-medium">Rôle:</span>{" "}
                        <Badge variant="secondary">
                          {UserService.getRoleDisplayName(user.role)}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Membre depuis:</span>{" "}
                        {new Date(user.created_at).toLocaleDateString("fr-FR")}
                      </div>
                      <div>
                        <span className="font-medium">Nom d'affichage:</span>{" "}
                        {UserService.getDisplayName(user)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Entreprise Tab */}
            <TabsContent value="entreprise" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Informations de l'entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {entrepriseErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {entrepriseErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ICE">ICE</Label>
                      <Input
                        id="ICE"
                        type="number"
                        value={entrepriseFormData.ICE}
                        onChange={(e) =>
                          handleEntrepriseFormChange("ICE", e.target.value)
                        }
                        placeholder="Identifiant Commun de l'Entreprise"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="CNSS">CNSS</Label>
                      <Input
                        id="CNSS"
                        type="number"
                        value={entrepriseFormData.CNSS}
                        onChange={(e) =>
                          handleEntrepriseFormChange("CNSS", e.target.value)
                        }
                        placeholder="Caisse Nationale de Sécurité Sociale"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="RC">RC</Label>
                      <Input
                        id="RC"
                        type="number"
                        value={entrepriseFormData.RC}
                        onChange={(e) =>
                          handleEntrepriseFormChange("RC", e.target.value)
                        }
                        placeholder="Registre de Commerce"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="IF">IF</Label>
                      <Input
                        id="IF"
                        type="number"
                        value={entrepriseFormData.IF}
                        onChange={(e) =>
                          handleEntrepriseFormChange("IF", e.target.value)
                        }
                        placeholder="Identifiant Fiscal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="RIB">RIB</Label>
                      <Input
                        id="RIB"
                        type="number"
                        value={entrepriseFormData.RIB}
                        onChange={(e) =>
                          handleEntrepriseFormChange("RIB", e.target.value)
                        }
                        placeholder="Relevé d'Identité Bancaire"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="patente">Patente</Label>
                      <Input
                        id="patente"
                        type="number"
                        value={entrepriseFormData.patente}
                        onChange={(e) =>
                          handleEntrepriseFormChange("patente", e.target.value)
                        }
                        placeholder="Numéro de patente"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="entreprise-email">
                        Email (optionnel)
                      </Label>
                      <Input
                        id="entreprise-email"
                        type="email"
                        value={entrepriseFormData.email || ""}
                        onChange={(e) =>
                          handleEntrepriseFormChange("email", e.target.value)
                        }
                        placeholder="email@entreprise.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="entreprise-telephone">
                        Téléphone (optionnel)
                      </Label>
                      <Input
                        id="entreprise-telephone"
                        value={entrepriseFormData.numero_telephone || ""}
                        onChange={(e) =>
                          handleEntrepriseFormChange(
                            "numero_telephone",
                            e.target.value,
                          )
                        }
                        placeholder="+212 6 123 45 676"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entreprise-adresse">Adresse</Label>
                    <Textarea
                      id="entreprise-adresse"
                      value={entrepriseFormData.adresse}
                      onChange={(e) =>
                        handleEntrepriseFormChange("adresse", e.target.value)
                      }
                      placeholder="Adresse complète de l'entreprise"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleSaveEntreprise}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isLoading
                        ? "Sauvegarde..."
                        : "Sauvegarder les informations"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {entreprise && (
                <Card>
                  <CardHeader>
                    <CardTitle>Récapitulatif de l'entreprise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">ID:</span> {entreprise.id}
                      </div>
                      <div>
                        <span className="font-medium">ICE:</span>{" "}
                        {entreprise.ICE}
                      </div>
                      <div>
                        <span className="font-medium">CNSS:</span>{" "}
                        {entreprise.CNSS}
                      </div>
                      <div>
                        <span className="font-medium">RC:</span> {entreprise.RC}
                      </div>
                      <div>
                        <span className="font-medium">IF:</span> {entreprise.IF}
                      </div>
                      <div>
                        <span className="font-medium">RIB:</span>{" "}
                        {entreprise.RIB}
                      </div>
                      <div>
                        <span className="font-medium">Patente:</span>{" "}
                        {entreprise.patente}
                      </div>
                      <div>
                        <span className="font-medium">Créé le:</span>{" "}
                        {new Date(entreprise.created_at).toLocaleDateString(
                          "fr-FR",
                        )}
                      </div>
                      {entreprise.email && (
                        <div>
                          <span className="font-medium">Email:</span>{" "}
                          {entreprise.email}
                        </div>
                      )}
                      {entreprise.numero_telephone && (
                        <div>
                          <span className="font-medium">Téléphone:</span>{" "}
                          {entreprise.numero_telephone}
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <span className="font-medium">Adresse:</span>
                      <div className="mt-1 text-muted-foreground">
                        {entreprise.adresse}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Thème et apparence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Thème</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Choisissez l'apparence de l'interface utilisateur
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {AppSettingsService.getThemeOptions().map((option) => {
                          const Icon = getThemeIcon(option.value);
                          return (
                            <div
                              key={option.value}
                              className={`relative rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors ${
                                appSettings.theme === option.value
                                  ? "border-primary bg-accent"
                                  : "border-border"
                              }`}
                              onClick={() =>
                                handleAppSettingChange("theme", option.value)
                              }
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5" />
                                <div>
                                  <div className="font-medium">
                                    {option.label}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {option.description}
                                  </div>
                                </div>
                              </div>
                              {appSettings.theme === option.value && (
                                <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-base font-medium">
                        Taille de police
                      </Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Ajustez la taille du texte pour améliorer la lisibilité
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {AppSettingsService.getFontSizeOptions().map(
                          (option) => (
                            <div
                              key={option.value}
                              className={`relative rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors ${
                                appSettings.fontSize === option.value
                                  ? "border-primary bg-accent"
                                  : "border-border"
                              }`}
                              onClick={() =>
                                handleAppSettingChange("fontSize", option.value)
                              }
                            >
                              <div className="flex items-center gap-3">
                                <Type className="h-5 w-5" />
                                <div>
                                  <div className="font-medium">
                                    {option.label}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {option.description}
                                  </div>
                                </div>
                              </div>
                              {appSettings.fontSize === option.value && (
                                <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">
                            Mode compact
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Réduit l'espacement pour afficher plus de contenu
                          </p>
                        </div>
                        <Switch
                          checked={appSettings.compactMode}
                          onCheckedChange={(checked) =>
                            handleAppSettingChange("compactMode", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">
                            Animations
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Active les animations et transitions
                          </p>
                        </div>
                        <Switch
                          checked={appSettings.showAnimations}
                          onCheckedChange={(checked) =>
                            handleAppSettingChange("showAnimations", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">
                            Sauvegarde automatique
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Sauvegarde automatiquement vos modifications
                          </p>
                        </div>
                        <Switch
                          checked={appSettings.autoSave}
                          onCheckedChange={(checked) =>
                            handleAppSettingChange("autoSave", checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Devise et format
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Devise</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choisissez la devise utilisée dans l'application
                    </p>
                    <Select
                      value={appSettings.currency}
                      onValueChange={(value) =>
                        handleAppSettingChange("currency", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AppSettingsService.getCurrencyOptions().map(
                          (currency) => (
                            <SelectItem
                              key={currency.value}
                              value={currency.value}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold">
                                  {currency.symbol}
                                </span>
                                <span>{currency.label}</span>
                              </div>
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>

                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">Aperçu:</span>
                        <div className="mt-1 space-y-1">
                          <div>
                            Prix:{" "}
                            <span className="font-mono">
                              1 234,56{" "}
                              {AppSettingsService.getCurrentCurrencySymbol()}
                            </span>
                          </div>
                          <div>
                            Total:{" "}
                            <span className="font-mono">
                              15 678,90{" "}
                              {AppSettingsService.getCurrentCurrencySymbol()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Paramètres de notification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">
                        Notifications bureau
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Affiche des notifications sur votre bureau
                      </p>
                    </div>
                    <Switch
                      checked={appSettings.notifications.desktop}
                      onCheckedChange={(checked) =>
                        handleNotificationChange("desktop", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">
                        Sons de notification
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Joue un son lors des notifications
                      </p>
                    </div>
                    <Switch
                      checked={appSettings.notifications.sound}
                      onCheckedChange={(checked) =>
                        handleNotificationChange("sound", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">
                        Notifications email
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Reçoit des notifications par email
                      </p>
                    </div>
                    <Switch
                      checked={appSettings.notifications.email}
                      onCheckedChange={(checked) =>
                        handleNotificationChange("email", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Options Tab */}
            <TabsContent value="options" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Options des listes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Appointment Types */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Types de rendez-vous
                      </Label>
                      <div className="space-y-2">
                        {options.appointmentTypes.map((type, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              value={type}
                              onChange={(e) => {
                                const next = [...options.appointmentTypes];
                                next[idx] = e.target.value;
                                setOptions({
                                  ...options,
                                  appointmentTypes: next,
                                });
                              }}
                            />
                            <Button
                              variant="outline"
                              onClick={() => {
                                const next = options.appointmentTypes.filter(
                                  (_, i) => i !== idx,
                                );
                                setOptions({
                                  ...options,
                                  appointmentTypes: next,
                                });
                              }}
                            >
                              Supprimer
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ajouter un type..."
                            value={""}
                            onChange={() => {}}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            onClick={() =>
                              setOptions({
                                ...options,
                                appointmentTypes: [
                                  ...options.appointmentTypes,
                                  "",
                                ],
                              })
                            }
                          >
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Bank Names for cheques */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Noms de banques (chèques)
                      </Label>
                      <div className="space-y-2">
                        {options.bankNames.map((name, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              value={name}
                              onChange={(e) => {
                                const next = [...options.bankNames];
                                next[idx] = e.target.value;
                                setOptions({ ...options, bankNames: next });
                              }}
                            />
                            <Button
                              variant="outline"
                              onClick={() => {
                                const next = options.bankNames.filter(
                                  (_, i) => i !== idx,
                                );
                                setOptions({ ...options, bankNames: next });
                              }}
                            >
                              Supprimer
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setOptions({
                                ...options,
                                bankNames: [...options.bankNames, ""],
                              })
                            }
                          >
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Soin Types */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Types de soin
                      </Label>
                      <div className="space-y-2">
                        {options.soinTypes.map((type, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              value={type}
                              onChange={(e) => {
                                const next = [...options.soinTypes];
                                next[idx] = e.target.value;
                                setOptions({ ...options, soinTypes: next });
                              }}
                            />
                            <Button
                              variant="outline"
                              onClick={() => {
                                const next = options.soinTypes.filter(
                                  (_, i) => i !== idx,
                                );
                                setOptions({ ...options, soinTypes: next });
                              }}
                            >
                              Supprimer
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setOptions({
                                ...options,
                                soinTypes: [...options.soinTypes, ""],
                              })
                            }
                          >
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={async () => {
                        try {
                          setIsSavingOptions(true);
                          const cleaned = {
                            bankNames: options.bankNames.filter(
                              (v) => v.trim().length > 0,
                            ),
                            appointmentTypes: options.appointmentTypes.filter(
                              (v) => v.trim().length > 0,
                            ),
                            soinTypes: options.soinTypes.filter(
                              (v) => v.trim().length > 0,
                            ),
                          };
                          const updated = await OptionsService.update(cleaned);
                          setOptions(updated);
                          toast({
                            title: "Options sauvegardées",
                            description: "Les listes ont été mises à jour",
                          });
                        } catch (e) {
                          toast({
                            title: "Erreur",
                            description:
                              "Impossible de sauvegarder les options",
                            variant: "destructive",
                          });
                        } finally {
                          setIsSavingOptions(false);
                        }
                      }}
                      disabled={isSavingOptions}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSavingOptions ? "Sauvegarde..." : "Sauvegarder"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Paramètres avancés
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={handleExportSettings}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exporter les paramètres
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsImportDialogOpen(true)}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Importer les paramètres
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsResetDialogOpen(true)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Réinitialiser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Password Change Dialog */}
        <Dialog
          open={isPasswordDialogOpen}
          onOpenChange={setIsPasswordDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Changer le mot de passe</DialogTitle>
              <DialogDescription>
                Entrez votre mot de passe actuel et choisissez un nouveau mot de
                passe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      handlePasswordChange("currentPassword", e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      handlePasswordChange("newPassword", e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirmer le nouveau mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      handlePasswordChange("confirmPassword", e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={handleChangePassword} disabled={isLoading}>
                {isLoading ? "Modification..." : "Changer le mot de passe"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Confirmation Dialog */}
        <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Réinitialiser les paramètres</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir réinitialiser tous les paramètres à
                leurs valeurs par défaut ? Cette action ne peut pas être
                annulée.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsResetDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleResetSettings}
                disabled={isLoading}
              >
                {isLoading ? "Réinitialisation..." : "Réinitialiser"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Settings Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importer les paramètres</DialogTitle>
              <DialogDescription>
                Collez le contenu du fichier de paramètres JSON ci-dessous
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Collez le contenu JSON ici..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleImportSettings}
                disabled={isLoading || !importData.trim()}
              >
                {isLoading ? "Importation..." : "Importer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

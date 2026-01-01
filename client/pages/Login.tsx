import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Heart,
  AlertCircle,
  User,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { AuthService, LoginCredentials } from "@/services/authService";
import { useTheme } from "@/hooks/use-theme";

export default function Login() {
  const { login } = useAuth();
  const { isDark } = useTheme();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const defaultCredentials = AuthService.getDefaultCredentials();

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: string[] = [];

    if (!formData.email.trim()) {
      newErrors.push("L'email est obligatoire");
    }

    if (!formData.password) {
      newErrors.push("Le mot de passe est obligatoire");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await login(formData);
      // Navigation will be handled by App.tsx after auth state changes
    } catch (error: any) {
      setErrors([error.message || "Erreur de connexion"]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: "admin" | "doctor") => {
    const credentials = defaultCredentials[role];
    setFormData(credentials);
    setIsLoading(true);
    try {
      await login(credentials);
    } catch (error: any) {
      setErrors([error.message || "Erreur de connexion"]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 relative">
      {/* Logo centered at top */}
      <div className="flex justify-center">
        <div className="flex h-40 w-80 items-center justify-center">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F16493a39c179465f9ca598ede9454dc8%2Fcceedcfad29a48b9a90d85058157ec8d?format=webp&width=800"
            alt="BioHacking Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          {/* Title */}
          <div className="text-center space-y-4">
            <div>
              <p className="text-muted-foreground mt-2 text-center">
                Connectez-vous à votre compte pour accéder au système de gestion
              </p>
            </div>
          </div>

          {/* Demo Credentials */}
          <Card className="bg-muted/30 border-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-center">
                Comptes de démonstration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin("admin")}
                  disabled={isLoading}
                  className="justify-start gap-2"
                >
                  <Shield className="h-4 w-4" />
                  <span>Administrateur</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Demo
                  </Badge>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin("doctor")}
                  disabled={isLoading}
                  className="justify-start gap-2"
                >
                  <User className="h-4 w-4" />
                  <span>Médecin</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Demo
                  </Badge>
                </Button>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Cliquez sur un rôle pour vous connecter automatiquement
              </div>
            </CardContent>
          </Card>

          {/* Login Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Connexion</CardTitle>
            </CardHeader>
            <CardContent>
              {errors.length > 0 && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Votre mot de passe"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className="pl-10 pr-10"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Connexion...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Se connecter
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Pas encore de compte ?{" "}
                  <Link
                    to="/register"
                    className="font-medium text-primary hover:underline"
                  >
                    Créer un compte
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground">
            <p>© 2024 Biohacking Clinic. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

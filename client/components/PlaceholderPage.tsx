import { Construction, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function PlaceholderPage({
  title,
  description,
  icon: Icon = Construction,
}: PlaceholderPageProps) {
  return (
    <DashboardLayout>
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Icon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{title}</h1>
                <p className="text-muted-foreground mt-2">{description}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Cette page est en cours de développement. Continuez à me donner
                des instructions pour que je crée les fonctionnalités
                spécifiques dont vous avez besoin pour cette section.
              </div>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" />
                  Retour au Tableau de Bord
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

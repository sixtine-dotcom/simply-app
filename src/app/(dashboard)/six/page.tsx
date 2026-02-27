import { Card, CardContent } from "@/components/ui/card";
import { Bot } from "lucide-react";

export default function SixPage() {
  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider">
          SIX AI
        </h1>
        <p className="mt-2 text-muted-foreground">
          Jouw persoonlijke assistent
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-xl tracking-wider">BINNENKORT BESCHIKBAAR</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            SIX AI wordt gebouwd in Milestone 7.
            Hier kun je straks vragen stellen en krijg je antwoorden gebaseerd op de Simply content.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type CommunityExperienceFormData = {
  introTitle: string;
  introBody: string;
  flowTitle: string;
  flowBody: string;
  flowStep1Title: string;
  flowStep1Body: string;
  flowStep2Title: string;
  flowStep2Body: string;
  flowStep3Title: string;
  flowStep3Body: string;
};

export function CommunityExperienceForm({
  initialValues,
}: {
  initialValues: CommunityExperienceFormData;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<CommunityExperienceFormData>(initialValues);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/admin/community/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not save the community experience.");
      }

      toast({
        title: "Community updated",
        description: "The client-facing community intro and flow are live.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Could not save the community experience.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="app-halo">
      <CardHeader>
        <CardTitle>Client community experience</CardTitle>
        <CardDescription>
          Edit the intro block and the community flow that members see in their own environment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="introTitle">Intro title</Label>
              <Input
                id="introTitle"
                value={form.introTitle}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, introTitle: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flowTitle">Flow title</Label>
              <Input
                id="flowTitle"
                value={form.flowTitle}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, flowTitle: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="introBody">Intro text</Label>
              <Textarea
                id="introBody"
                value={form.introBody}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, introBody: event.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flowBody">Flow intro</Label>
              <Textarea
                id="flowBody"
                value={form.flowBody}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, flowBody: event.target.value }))
                }
                rows={4}
              />
            </div>
          </div>

          {[1, 2, 3].map((step) => (
            <div key={step} className="grid gap-4 rounded-[1.5rem] border border-border/70 bg-muted/20 p-4 xl:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`flowStep${step}Title`}>Step {step} title</Label>
                <Input
                  id={`flowStep${step}Title`}
                  value={form[`flowStep${step}Title` as keyof CommunityExperienceFormData]}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [`flowStep${step}Title`]: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`flowStep${step}Body`}>Step {step} text</Label>
                <Textarea
                  id={`flowStep${step}Body`}
                  value={form[`flowStep${step}Body` as keyof CommunityExperienceFormData]}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [`flowStep${step}Body`]: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save community experience
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

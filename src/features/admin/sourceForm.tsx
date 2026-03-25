"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api.js";
import { Id } from "@convex/_generated/dataModel.js";
import { FunctionReference } from "convex/server";
import { useAction } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type SourceFormMode = "create" | "edit";

interface SourceFormValues {
  name: string;
  url: string;
  robotsRules?: string | null;
}

interface SourceFormProps {
  mode: SourceFormMode;
  storeId?: Id<"stores">;
  initialValues?: SourceFormValues;
  onCancel: () => void;
  onSuccess: () => void;
}

export function SourceForm({ mode, storeId, initialValues, onCancel, onSuccess }: SourceFormProps) {
  const queryClient = useQueryClient();
  const createStore = useConvexMutation(api.admin.sources.createStore);
  const updateStore = useConvexMutation(api.admin.sources.updateStore);
  const previewRobots = useAction(
    api.admin.sources.previewRobots as unknown as FunctionReference<
      "action",
      "public",
      { url: string },
      { rules: string; error?: string }
    >,
  );

  const [name, setName] = useState(initialValues?.name ?? "");
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [robotsPreview, setRobotsPreview] = useState(initialValues?.robotsRules ?? "");

  useEffect(() => {
    if (!previewUrl) {
      setRobotsPreview(initialValues?.robotsRules ?? "");
    }
  }, [initialValues?.robotsRules, previewUrl]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewHint = useMemo(() => {
    if (isPreviewLoading) {
      return "Fetching robots.txt preview...";
    }

    if (previewError) {
      return previewError;
    }

    if (!robotsPreview) {
      return "No rules detected. Blur the URL field to refresh.";
    }

    return "Robots preview updates when you leave the URL field.";
  }, [isPreviewLoading, previewError, robotsPreview]);

  const handleUrlBlur = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setPreviewUrl(null);
      setPreviewError(null);
      return;
    }
    setPreviewUrl(trimmed);
    void (async () => {
      setIsPreviewLoading(true);
      try {
        const result = await previewRobots({ url: trimmed });
        setRobotsPreview(result.rules ?? "");
        setPreviewError(result.error ?? null);
      } catch (error) {
        const message =
          typeof error === "object" && error && "message" in error
            ? String(error.message)
            : "Unable to fetch robots.txt";
        setRobotsPreview("");
        setPreviewError(message);
      } finally {
        setIsPreviewLoading(false);
      }
    })();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedUrl = url.trim();

    if (!trimmedName || !trimmedUrl) {
      setFormError("Name and URL are required.");
      return;
    }

    try {
      setIsSaving(true);

      if (mode === "create") {
        await createStore({ name: trimmedName, url: trimmedUrl });
      } else if (storeId) {
        await updateStore({ storeId, name: trimmedName, url: trimmedUrl });
      }

      await queryClient.invalidateQueries({ queryKey: ["convex", "admin.sources.listStores"] });

      if (storeId) {
        await queryClient.invalidateQueries({ queryKey: ["convex", "admin.sources.getStore"] });
      }

      onSuccess();
    } catch (error) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "Failed to save source.";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="source-name">Source name</Label>
        <Input
          id="source-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Example Store"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="source-url">Source URL</Label>
        <Input
          id="source-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="robots-preview">Robots preview</Label>
        <Textarea
          id="robots-preview"
          readOnly
          value={robotsPreview}
          placeholder="Robots rules will appear here"
          rows={6}
          className="font-mono text-xs"
        />
        <p className={previewError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {previewHint}
        </p>
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : mode === "create" ? "Add Source" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

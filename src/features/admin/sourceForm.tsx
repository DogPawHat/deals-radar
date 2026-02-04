"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api.js";
import { Id } from "@convex/_generated/dataModel.js";
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

  const [name, setName] = useState(initialValues?.name ?? "");
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [robotsPreview, setRobotsPreview] = useState(initialValues?.robotsRules ?? "");

  const previewQuery = useQuery({
    ...convexQuery(api.admin.sources.previewRobots, { url: previewUrl ?? "" }),
    enabled: false,
  });

  useEffect(() => {
    if (!previewUrl) {
      setRobotsPreview(initialValues?.robotsRules ?? "");
    }
  }, [initialValues?.robotsRules, previewUrl]);

  useEffect(() => {
    if (previewUrl) {
      void previewQuery.refetch();
    }
  }, [previewQuery, previewUrl]);

  useEffect(() => {
    if (previewQuery.data) {
      setRobotsPreview(previewQuery.data.rules ?? "");
    }
  }, [previewQuery.data]);

  const previewError = previewUrl ? (previewQuery.data?.error ?? null) : null;
  const previewHint = useMemo(() => {
    if (previewQuery.isFetching) {
      return "Fetching robots.txt preview...";
    }

    if (previewError) {
      return previewError;
    }

    if (!robotsPreview) {
      return "No rules detected. Blur the URL field to refresh.";
    }

    return "Robots preview updates when you leave the URL field.";
  }, [previewError, previewQuery.isFetching, robotsPreview]);

  const handleUrlBlur = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setPreviewUrl(null);
      return;
    }
    if (previewUrl === trimmed) {
      void previewQuery.refetch();
      return;
    }
    setPreviewUrl(trimmed);
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

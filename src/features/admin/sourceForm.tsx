"use client";

import { type SubmitEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api.js";
import { Id } from "@convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SourceFormMode = "create" | "edit";

interface SourceFormValues {
  name: string;
  url: string;
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

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
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
          placeholder="https://example.com"
        />
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

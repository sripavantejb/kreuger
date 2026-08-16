"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateProductColourImage, clearProductColourImage } from "@/lib/actions-master-data";
import { Upload, X } from "lucide-react";

type Colour = { id: string; name: string; hexCode: string };
type ColourImage = { colourId: string; imagePath: string };

const MAX_FILE_BYTES = 3 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Tile({
  productId,
  colour,
  imagePath,
  readOnly,
}: {
  productId: string;
  colour: Colour;
  imagePath: string;
  readOnly: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      setError("Choose a PNG, JPEG or WebP file — not SVG.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Image must be under 3MB.");
      return;
    }
    startTransition(async () => {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        await updateProductColourImage({ productId, colourId: colour.id, imageDataUrl: dataUrl });
        toast.success(`${colour.name} image updated`);
      } catch {
        setError("Could not save the image.");
      }
    });
  }

  return (
    <div className="w-40 space-y-2">
      <div
        className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-border bg-secondary"
        style={!imagePath ? { backgroundColor: colour.hexCode } : undefined}
      >
        {imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePath} alt={colour.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-medium text-white/80 mix-blend-difference">No image</span>
        )}
      </div>
      <div className="text-center text-xs font-medium">{colour.name}</div>
      {!readOnly && (
        <div className="flex items-center justify-center gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="size-3.5" /> {pending ? "Uploading…" : imagePath ? "Replace" : "Upload"}
          </Button>
          {imagePath && (
            <Button
              size="icon-sm"
              variant="ghost"
              title="Remove image"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await clearProductColourImage({ productId, colourId: colour.id });
                  toast.success(`${colour.name} image removed`);
                })
              }
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      )}
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ProductColourImagesForm({
  productId,
  colours,
  colourImages,
  readOnly = false,
}: {
  productId: string;
  colours: Colour[];
  colourImages: ColourImage[];
  readOnly?: boolean;
}) {
  const imageByColour = new Map(colourImages.map((ci) => [ci.colourId, ci.imagePath]));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Uploaded here, these photos appear on the quotation preview and the exported PDF for this product.
        Colours without an upload fall back to a plain colour swatch.
      </p>
      <div className="flex flex-wrap gap-4">
        {colours.map((c) => (
          <Tile
            key={c.id}
            productId={productId}
            colour={c}
            imagePath={imageByColour.get(c.id) ?? ""}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

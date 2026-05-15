/**
 * PNR-based entry point into the IRCTC eCatering aggregator.
 *
 * Single 10-digit PNR input + Search. On submit we build the redirect URL
 * (including base64 user handoff when available) and navigate the *top-level*
 * window to IRCTC. There is no API call here; this is a pure redirect.
 */

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildPnrRedirectUrl } from "../redirectBuilder";
import { useRedirectUser } from "../useRedirectUser";

const PNR_REGEX = /^\d{10}$/;

interface IrctcPnrSearchFormProps {
  /** Allow tests / parent components to intercept the redirect. */
  onRedirect?: (url: string) => void;
  className?: string;
}

export function IrctcPnrSearchForm({ onRedirect, className }: IrctcPnrSearchFormProps) {
  const [pnr, setPnr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const user = useRedirectUser();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = pnr.trim();
    if (!PNR_REGEX.test(trimmed)) {
      setError("Please enter a valid 10-digit PNR.");
      return;
    }
    setError(null);
    try {
      const url = buildPnrRedirectUrl(trimmed, user);
      if (onRedirect) {
        onRedirect(url);
      } else {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build redirect URL.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-3 ${className ?? ""}`}
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="irctc-pnr-input" className="text-sm font-medium text-blue-700">
          PNR Number
        </Label>
        <Input
          id="irctc-pnr-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          placeholder="Enter 10-digit PNR"
          value={pnr}
          onChange={(e) => {
            // Only allow digits while typing.
            const next = e.target.value.replace(/\D/g, "").slice(0, 10);
            setPnr(next);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "irctc-pnr-error" : undefined}
          className="h-10"
        />
        {error && (
          <p id="irctc-pnr-error" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
      >
        <Search className="size-4" />
        Search Food
      </Button>
    </form>
  );
}

export default IrctcPnrSearchForm;

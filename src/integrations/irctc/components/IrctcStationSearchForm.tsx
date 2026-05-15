/**
 * Station-only entry point — quickest path for "I just want to see what's
 * available at NDLS / BCT / etc." Uppercases on input and validates 2-5 chars.
 */

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildStationRedirectUrl } from "../redirectBuilder";
import { useRedirectUser } from "../useRedirectUser";

const STATION_REGEX = /^[A-Z]{2,5}$/;

interface IrctcStationSearchFormProps {
  onRedirect?: (url: string) => void;
  className?: string;
}

export function IrctcStationSearchForm({ onRedirect, className }: IrctcStationSearchFormProps) {
  const [station, setStation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const user = useRedirectUser();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = station.trim().toUpperCase();
    if (!STATION_REGEX.test(code)) {
      setError("Station code must be 2-5 uppercase letters.");
      return;
    }
    setError(null);
    try {
      const url = buildStationRedirectUrl(code, user);
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
        <Label htmlFor="irctc-station-code" className="text-sm font-medium text-blue-700">
          Station Code
        </Label>
        <Input
          id="irctc-station-code"
          autoComplete="off"
          maxLength={5}
          placeholder="e.g. NDLS"
          value={station}
          onChange={(e) => {
            setStation(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5));
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "irctc-station-error" : undefined}
          className="h-10 uppercase"
        />
        {error && (
          <p id="irctc-station-error" className="text-sm text-red-600">
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

export default IrctcStationSearchForm;

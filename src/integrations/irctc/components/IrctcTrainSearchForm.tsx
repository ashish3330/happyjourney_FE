/**
 * Train + boarding-station + boarding-date entry point.
 *
 * Mirrors the second tab of the PDF Appendix C screenshot. The boarding
 * station is a plain station-code text input (e.g. "BRC"). For Wave 2 we may
 * replace it with the existing station autocomplete used in OrderFood.
 */

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildTrainRedirectUrl } from "../redirectBuilder";
import { useRedirectUser } from "../useRedirectUser";

const TRAIN_REGEX = /^\d{5}$/;
const STATION_REGEX = /^[A-Z]{2,5}$/;

interface IrctcTrainSearchFormProps {
  onRedirect?: (url: string) => void;
  className?: string;
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function IrctcTrainSearchForm({ onRedirect, className }: IrctcTrainSearchFormProps) {
  const [trainNo, setTrainNo] = useState("");
  const [station, setStation] = useState("");
  const [date, setDate] = useState<Date | null>(new Date());
  const [errors, setErrors] = useState<{ trainNo?: string; station?: string; date?: string }>({});
  const user = useRedirectUser();

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!TRAIN_REGEX.test(trainNo.trim())) {
      next.trainNo = "Train number must be 5 digits.";
    }
    if (!STATION_REGEX.test(station.trim().toUpperCase())) {
      next.station = "Station code must be 2-5 uppercase letters.";
    }
    if (!date) {
      next.date = "Please pick a boarding date.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate() || !date) return;
    try {
      const url = buildTrainRedirectUrl(
        trainNo.trim(),
        station.trim().toUpperCase(),
        formatDate(date),
        user
      );
      if (onRedirect) {
        onRedirect(url);
      } else {
        window.location.href = url;
      }
    } catch (err) {
      setErrors({
        trainNo:
          err instanceof Error ? err.message : "Failed to build redirect URL.",
      });
    }
  };

  // Don't let the user pick a date in the past.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-3 ${className ?? ""}`}
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="irctc-train-no" className="text-sm font-medium text-blue-700">
          Train Number
        </Label>
        <Input
          id="irctc-train-no"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          placeholder="e.g. 12951"
          value={trainNo}
          onChange={(e) => {
            setTrainNo(e.target.value.replace(/\D/g, "").slice(0, 5));
            if (errors.trainNo) setErrors((p) => ({ ...p, trainNo: undefined }));
          }}
          aria-invalid={errors.trainNo ? true : undefined}
          className="h-10"
        />
        {errors.trainNo && <p className="text-sm text-red-600">{errors.trainNo}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="irctc-boarding-station" className="text-sm font-medium text-blue-700">
          Boarding Station
        </Label>
        <Input
          id="irctc-boarding-station"
          autoComplete="off"
          maxLength={5}
          placeholder="e.g. BRC"
          value={station}
          onChange={(e) => {
            setStation(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5));
            if (errors.station) setErrors((p) => ({ ...p, station: undefined }));
          }}
          aria-invalid={errors.station ? true : undefined}
          className="h-10 uppercase"
        />
        {errors.station && <p className="text-sm text-red-600">{errors.station}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="irctc-boarding-date" className="text-sm font-medium text-blue-700">
          Boarding Date
        </Label>
        <DatePicker
          id="irctc-boarding-date"
          selected={date}
          onChange={(d: Date | null) => {
            setDate(d);
            if (errors.date) setErrors((p) => ({ ...p, date: undefined }));
          }}
          minDate={today}
          dateFormat="yyyy-MM-dd"
          placeholderText="Select boarding date"
          showYearDropdown
          showMonthDropdown
          dropdownMode="select"
          popperPlacement="bottom-start"
          wrapperClassName="w-full"
          className="w-full text-sm border border-blue-300 focus:border-blue-500 focus:ring-blue-500 rounded-md h-10 px-3"
        />
        {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
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

export default IrctcTrainSearchForm;

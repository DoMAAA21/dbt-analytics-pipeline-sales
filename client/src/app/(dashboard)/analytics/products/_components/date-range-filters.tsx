import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDays, defaultDateRange, formatIsoDate, utcToday } from "@/lib/format";

type DateRangeFiltersProps = {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
};

const PRESETS = [
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
] as const;

export function DateRangeFilters({ from, to, onChange }: DateRangeFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="from">From</Label>
        <Input
          id="from"
          type="date"
          value={from}
          max={to}
          onChange={(event) => onChange({ from: event.target.value, to })}
          className="w-[11.5rem]"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          type="date"
          value={to}
          min={from}
          max={formatIsoDate(utcToday())}
          onChange={(event) => onChange({ from, to: event.target.value })}
          className="w-[11.5rem]"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const end = utcToday();
              onChange({
                from: formatIsoDate(addDays(end, -(preset.days - 1))),
                to: formatIsoDate(end),
              });
            }}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(defaultDateRange(60))}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

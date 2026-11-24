import { Pencil, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useData } from "../../context/DataContext";
import { formatHours } from "../../lib/dates";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Field";
import { ProgressBar } from "../ui/Progress";

export function WeeklyTarget() {
  const { data, setWeeklyTarget } = useData();

  const progress = data.weeklyProgress;

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    String(progress?.weeklyTargetHours ?? 40)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing && progress) {
      setValue(String(progress.weeklyTargetHours));
    }
  }, [progress?.weeklyTargetHours, editing]);

  if (!progress) {
    return (
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Loading weekly progress...
        </p>
      </Card>
    );
  }

  const save = async (e) => {
    e.preventDefault();

    const hours = Number(value);

    if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
      setError("Enter a whole number between 1 and 168.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await setWeeklyTarget(hours);
      setEditing(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update weekly target."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <TrendingUp className="size-4.5" aria-hidden="true" />
          </span>

          <div>
            <h2 className="font-semibold">Weekly target</h2>

            <p className="text-sm text-muted">
              <span className="font-semibold text-fg tabular-nums">
                {formatHours(progress.completedMinutes)}
              </span>{" "}
              of {progress.weeklyTargetHours}h completed ·{" "}
              {progress.progressPercentage}%
            </p>
          </div>
        </div>

        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setValue(String(progress.weeklyTargetHours));
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Button>
        )}
      </div>

      {editing && (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <label htmlFor="weekly-target" className="sr-only">
            Weekly target in hours
          </label>

          <Input
            id="weekly-target"
            type="number"
            inputMode="numeric"
            min={1}
            max={168}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-9 w-24"
            autoFocus
          />

          <span className="text-sm text-muted">hours / week</span>

          <Button
            type="submit"
            size="sm"
            className="ml-auto"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            Cancel
          </Button>
        </form>
      )}

      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}

      <ProgressBar
        value={progress.completedMinutes}
        max={progress.targetMinutes}
        label="Weekly target progress"
      />

      <p className="text-xs text-muted">
        {formatHours(progress.plannedMinutes)} planned this week ·{" "}
        {formatHours(progress.remainingMinutes)} completed hours remaining
      </p>
    </Card>
  );
}
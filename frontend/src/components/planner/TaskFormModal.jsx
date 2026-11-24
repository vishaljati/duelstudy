
import { useEffect, useState } from "react";
import { useData } from "../../context/DataContext";
import { PRIORITIES } from "../../lib/constants";
import { Button } from "../ui/Button";
import { Field, Input, Select } from "../ui/Field";
import { Modal } from "../ui/Modal";

const createEmptyTask = (date, subject) => ({
  title: "",
  subject,
  scheduledDate: date,
  scheduledTime: "",
  durationMinutes: 60,
  priority: "medium",
  description: "",
});

const getDateValue = (date) => {
  if (!date) return "";
  return String(date).slice(0, 10);
};

function validate(form) {
  const errors = {};

  if (!form.title.trim() || form.title.trim().length < 2) {
    errors.title = "Give the task a short title.";
  }

  if (!form.scheduledDate) {
    errors.scheduledDate = "Pick a date.";
  }

  const duration = Number(form.durationMinutes);

  if (!Number.isFinite(duration) || duration < 5 || duration > 720) {
    errors.durationMinutes =
      "Duration must be between 5 and 720 minutes.";
  }

  if (
    form.scheduledTime &&
    !/^([01]\d|2[0-3]):([0-5]\d)$/.test(form.scheduledTime)
  ) {
    errors.scheduledTime = "Enter a valid time.";
  }

  return errors;
}

export function TaskFormModal({
  open,
  onClose,
  task,
  defaultDate,
}) {
  const { goal, addTask, updateTask } = useData();

  const [form, setForm] = useState(
    createEmptyTask(defaultDate, goal.subjects[0])
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (task) {
      setForm({
        title: task.title || "",
        subject: task.subject || "",
        scheduledDate: getDateValue(task.scheduledDate),
        scheduledTime: task.scheduledTime || "",
        durationMinutes: task.durationMinutes ?? 60,
        priority: task.priority || "medium",
        description: task.description || "",
      });
    } else {
      setForm(createEmptyTask(defaultDate, goal.subjects[0]));
    }

    setErrors({});
  }, [open, task, defaultDate, goal.subjects]);

  const set = (field) => (e) => {
    setForm((current) => ({
      ...current,
      [field]: e.target.value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const foundErrors = validate(form);

    if (Object.keys(foundErrors).length) {
      setErrors(foundErrors);
      return;
    }

    const payload = {
      title: form.title.trim(),
      subject: form.subject,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime || null,
      durationMinutes: Math.round(Number(form.durationMinutes)),
      priority: form.priority,
      description: form.description.trim(),
    };

    try {
      setSubmitting(true);

      if (task) {
        await updateTask(task._id, payload);
      } else {
        await addTask(payload);
      }

      onClose();
    } catch (error) {
      setErrors({
        form:
          error.response?.data?.message ||
          error.message ||
          "Unable to save task. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "New study task"}
      description="Completed tasks count toward your study hours."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            form="task-form"
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : task
                ? "Save changes"
                : "Add task"}
          </Button>
        </>
      }
    >
      <form
        id="task-form"
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        {errors.form && (
          <p className="text-sm text-danger">{errors.form}</p>
        )}

        <Field label="Title" error={errors.title}>
          {(props) => (
            <Input
              {...props}
              autoFocus
              placeholder="e.g. Rotational motion — PYQs"
              value={form.title}
              onChange={set("title")}
              maxLength={100}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject">
            {(props) => (
              <Select
                {...props}
                value={form.subject}
                onChange={set("subject")}
              >
                {goal.subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Priority">
            {(props) => (
              <Select
                {...props}
                value={form.priority}
                onChange={set("priority")}
              >
                {PRIORITIES.map((priority) => (
                  <option
                    key={priority.id}
                    value={priority.id}
                  >
                    {priority.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field
            label="Date"
            error={errors.scheduledDate}
            className="col-span-2 sm:col-span-1"
          >
            {(props) => (
              <Input
                {...props}
                type="date"
                value={form.scheduledDate}
                onChange={set("scheduledDate")}
              />
            )}
          </Field>

          <Field label="Time (optional)" error={errors.scheduledTime}>
            {(props) => (
              <Input
                {...props}
                type="time"
                value={form.scheduledTime}
                onChange={set("scheduledTime")}
              />
            )}
          </Field>

          <Field
            label="Minutes"
            error={errors.durationMinutes}
          >
            {(props) => (
              <Input
                {...props}
                type="number"
                inputMode="numeric"
                min={5}
                max={720}
                step={5}
                value={form.durationMinutes}
                onChange={set("durationMinutes")}
              />
            )}
          </Field>
        </div>

        <Field label="Description (optional)">
          {(props) => (
            <textarea
              {...props}
              rows={2}
              maxLength={500}
              value={form.description}
              onChange={set("description")}
              placeholder="Chapters, resources, goals…"
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}

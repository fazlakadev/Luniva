"use client";

/*
 * EventCalendar — adapted for Luniva from mors-component-library.
 * Original author: Murad — MIT License. Styles, Arabic copy and theme tokens
 * were reworked to match the Luniva design system.
 */
import { useMemo, useState, type FormEvent, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "@/components/ui/event-calendar-utils/ui";
import type { Tone } from "@/components/ui/event-calendar-utils/types";
import {
  addMonths,
  dateKey,
  isSameDay,
  isSameMonth,
  monthGrid,
  startOfDay,
  startOfMonth,
  weekdayNames,
} from "@/components/ui/event-calendar-utils/date";
import { useControllableState } from "@/components/ui/event-calendar-utils/use-controllable-state";
import { Button, Card, Icon, IconButton, Swatch, SwatchGroup, TextField } from "@/components/ui/event-calendar-utils/ui";

export type EventTone = Extract<Tone, "accent" | "success" | "warning" | "danger" | "info" | "neutral">;

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  /** Optional clock time, displayed as-is (e.g. `09:30`). */
  time?: string;
  description?: string;
  tone?: EventTone;
}

export interface EventCalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  events?: CalendarEvent[];
  defaultEvents?: CalendarEvent[];
  onEventsChange?: (events: CalendarEvent[]) => void;
  onEventAdd?: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventRemove?: (id: string) => void;
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  selectedDate?: Date;
  defaultSelectedDate?: Date;
  onSelectedDateChange?: (date: Date) => void;
  locale?: string;
  weekStartsOn?: 0 | 1 | 6;
  readOnly?: boolean;
  /** Extra badges (customer, invoice, kind) shown under each event in the day panel. */
  renderEventExtra?: (event: CalendarEvent) => ReactNode;
}

const EMPTY_EVENTS: CalendarEvent[] = [];

function createId(): string {
  return `luniva-evt-${Math.random().toString(36).slice(2, 9)}`;
}

function byDay(events: readonly CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dateKey(event.date);
    const list = map.get(key);
    if (list) list.push(event);
    else map.set(key, [event]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title, "ar"));
  }
  return map;
}

export default function EventCalendar({
  events,
  defaultEvents = EMPTY_EVENTS,
  onEventsChange,
  onEventAdd,
  onEventUpdate,
  onEventRemove,
  month,
  defaultMonth,
  onMonthChange,
  selectedDate,
  defaultSelectedDate,
  onSelectedDateChange,
  locale = "ar-EG",
  weekStartsOn = 6,
  readOnly = false,
  renderEventExtra,
  className,
  ...rest
}: EventCalendarProps) {
  const [items, setItems] = useControllableState(events, defaultEvents, onEventsChange);
  const [visibleMonth, setVisibleMonth] = useControllableState(
    month,
    startOfMonth(defaultMonth ?? selectedDate ?? defaultSelectedDate ?? new Date()),
    onMonthChange,
  );
  const [selected, setSelected] = useControllableState(
    selectedDate,
    startOfDay(defaultSelectedDate ?? new Date()),
    onSelectedDateChange,
  );
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [draftTone, setDraftTone] = useState<EventTone>("accent");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const today = startOfDay(new Date());
  const days = monthGrid(visibleMonth, weekStartsOn);
  const weekdays = weekdayNames(locale, weekStartsOn);
  const grouped = useMemo(() => byDay(items), [items]);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(visibleMonth);
  const dayHeading = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(selected);
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: "full" });
  const selectedEvents = grouped.get(dateKey(selected)) ?? [];

  const addEvent = (event: FormEvent) => {
    event.preventDefault();
    const title = draftTitle.trim();
    if (!title) return;
    const next: CalendarEvent = {
      id: createId(),
      title,
      date: startOfDay(selected),
      time: draftTime.trim() || undefined,
      description: draftDescription.trim() || undefined,
      tone: draftTone,
    };
    setItems([...items, next]);
    onEventAdd?.(next);
    setDraftTitle("");
    setDraftDescription("");
    setDraftTime("");
  };

  const beginEdit = (entry: CalendarEvent) => {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditDescription(entry.description ?? "");
  };

  const saveEdit = (id: string) => {
    const title = editTitle.trim();
    if (!title) return;
    let updated: CalendarEvent | undefined;
    setItems(
      items.map((entry) => {
        if (entry.id !== id) return entry;
        updated = { ...entry, title, description: editDescription.trim() || undefined };
        return updated;
      }),
    );
    if (updated) onEventUpdate?.(updated);
    setEditingId(null);
  };

  const removeEvent = (id: string) => {
    setItems(items.filter((entry) => entry.id !== id));
    onEventRemove?.(id);
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className={cx("mors-event-calendar", className)} {...rest}>
      <style href="mors-event-calendar" precedence="default">
        {css}
      </style>

      <div className="mors-event-calendar-toolbar">
        <IconButton
          label="الشهر السابق"
          icon={<Icon name="chevron-left" />}
          variant="outline"
          size="sm"
          onClick={() => setVisibleMonth(startOfMonth(addMonths(visibleMonth, -1)))}
        />
        <h2 className="mors-event-calendar-title">{monthLabel}</h2>
        <IconButton
          label="الشهر التالي"
          icon={<Icon name="chevron-right" />}
          variant="outline"
          size="sm"
          onClick={() => setVisibleMonth(startOfMonth(addMonths(visibleMonth, 1)))}
        />
        <Button
          size="sm"
          variant="ghost"
          className="mors-event-calendar-today"
          onClick={() => {
            const now = startOfDay(new Date());
            setVisibleMonth(startOfMonth(now));
            setSelected(now);
          }}
        >
          اليوم
        </Button>
      </div>

      <div className="mors-event-calendar-layout">
        <div className="mors-event-calendar-month">
          <div className="mors-event-calendar-weekdays">
            {weekdays.map((day) => (
              <span key={day.long} className="mors-event-calendar-weekday">
                {day.short}
              </span>
            ))}
          </div>
          <div className="mors-event-calendar-grid">
            {days.map((date) => {
              const key = dateKey(date);
              const dayEvents = grouped.get(key) ?? [];
              const overflow = Math.max(0, dayEvents.length - 3);
              const visible = dayEvents.slice(0, overflow > 0 ? 2 : 3);
              const outside = !isSameMonth(date, visibleMonth);
              const isSelected = isSameDay(date, selected);
              const isToday = isSameDay(date, today);

              return (
                <button
                  key={key}
                  type="button"
                  className={cx(
                    "mors-event-calendar-cell",
                    outside && "mors-event-calendar-cell--outside",
                    isSelected && "mors-event-calendar-cell--selected",
                    isToday && "mors-event-calendar-cell--today",
                  )}
                  aria-pressed={isSelected}
                  aria-label={`${fullDate.format(date)}${dayEvents.length ? `، ${dayEvents.length} موعد` : ""}`}
                  data-has-events={dayEvents.length > 0 ? "true" : undefined}
                  onClick={() => {
                    setSelected(startOfDay(date));
                    if (!isSameMonth(date, visibleMonth)) setVisibleMonth(startOfMonth(date));
                  }}
                >
                  <span className="mors-event-calendar-date">{date.getDate()}</span>
                  <span className="mors-event-calendar-chips">
                    {visible.map((entry) => (
                      <span
                        key={entry.id}
                        className={cx(
                          "mors-event-calendar-chip",
                          `mors-event-calendar-chip--${entry.tone ?? "accent"}`,
                        )}
                      >
                        {entry.time ? `${entry.time} ` : ""}
                        {entry.title}
                      </span>
                    ))}
                    {overflow > 0 && <span className="mors-event-calendar-more">+{overflow + 1} أخرى</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <section className="mors-event-calendar-panel" aria-label={dayHeading}>
          <header className="mors-event-calendar-panel-head">
            <h3 className="mors-event-calendar-panel-title">{dayHeading}</h3>
            <p className="mors-event-calendar-panel-count">
              {selectedEvents.length === 0 ? "لا توجد مواعيد" : `${selectedEvents.length} موعد`}
            </p>
          </header>

          <ul className="mors-event-calendar-list">
            {selectedEvents.map((entry) => (
              <li key={entry.id}>
                <Card elevation="raised" padding="sm" className="mors-event-calendar-item">
                  {editingId === entry.id ? (
                    <form
                      className="mors-event-calendar-edit"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveEdit(entry.id);
                      }}
                    >
                      <div className="mors-event-calendar-item-row">
                        <Swatch tone={entry.tone ?? "accent"} size="sm" />
                        {entry.time && <span className="mors-event-calendar-time">{entry.time}</span>}
                      </div>
                      <TextField
                        label="العنوان"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.currentTarget.value)}
                        size="sm"
                        required
                      />
                      <TextField
                        label="الوصف"
                        placeholder="ملاحظة اختيارية"
                        value={editDescription}
                        onChange={(event) => setEditDescription(event.currentTarget.value)}
                        size="sm"
                      />
                      <div className="mors-event-calendar-edit-actions">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          startIcon={<Icon name="trash" />}
                          aria-label={`حذف ${entry.title}`}
                          onClick={() => removeEvent(entry.id)}
                        >
                          حذف
                        </Button>
                        <Button type="submit" size="sm">
                          حفظ
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="mors-event-calendar-item-row">
                      <Swatch tone={entry.tone ?? "accent"} size="sm" />
                      <div className="mors-event-calendar-item-body">
                        {entry.time && <span className="mors-event-calendar-time">{entry.time}</span>}
                        <span className="mors-event-calendar-item-title">{entry.title}</span>
                        {entry.description && <span className="mors-event-calendar-item-note">{entry.description}</span>}
                        {renderEventExtra?.(entry)}
                      </div>
                      {!readOnly && (
                        <IconButton
                          label={`تعديل ${entry.title}`}
                          icon={<Icon name="edit" />}
                          size="sm"
                          variant="ghost"
                          onClick={() => beginEdit(entry)}
                        />
                      )}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>

          {!readOnly && (
            <form className="mors-event-calendar-composer" onSubmit={addEvent}>
              <TextField
                label="العنوان"
                placeholder="عنوان الموعد"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.currentTarget.value)}
                size="sm"
                required
              />
              <TextField
                label="الوصف"
                placeholder="ملاحظة اختيارية"
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.currentTarget.value)}
                size="sm"
              />
              <div className="mors-event-calendar-composer-row">
                <TextField
                  label="الوقت"
                  type="time"
                  value={draftTime}
                  onChange={(event) => setDraftTime(event.currentTarget.value)}
                  size="sm"
                />
                <SwatchGroup label="اللون" size="sm" value={draftTone} onChange={setDraftTone} />
              </div>
              <Button type="submit" size="sm" block startIcon={<Icon name="plus" />}>
                إضافة
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

const css = /* css */ `
.mors-event-calendar {
  display: grid;
  gap: 14px;
  min-width: 0;
  color: var(--ink);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}
.mors-event-calendar *,
.mors-event-calendar *::before,
.mors-event-calendar *::after { box-sizing: border-box; }

.mors-event-calendar-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mors-event-calendar-title { flex: 1; min-width: 0; margin: 0; font-size: 1rem; font-weight: 800; text-align: center; }
.mors-event-calendar-today { margin-inline-start: auto; }

.mors-event-calendar-layout { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 1024px) {
  .mors-event-calendar-layout { grid-template-columns: minmax(0, 1fr) 320px; }
}

.mors-event-calendar-month { min-width: 0; }
.mors-event-calendar-weekdays,
.mors-event-calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.mors-event-calendar-weekday {
  padding: 6px 2px;
  text-align: center;
  font-size: 10px;
  font-weight: 800;
  color: var(--muted-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mors-event-calendar-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  min-height: 84px;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.mors-event-calendar-cell:hover { border-color: var(--brand); background: var(--surface-2); }
.mors-event-calendar-cell--outside { opacity: 0.45; }
.mors-event-calendar-cell--selected {
  border-color: var(--brand);
  background: var(--brand-soft);
  box-shadow: 0 0 0 3px var(--brand-ring);
}
.mors-event-calendar-cell--today .mors-event-calendar-date { background: var(--brand); color: #fff; }
.mors-event-calendar-date {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: var(--ink);
}
.mors-event-calendar-chips { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mors-event-calendar-chip {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 6px;
  padding: 2px 4px;
  font-size: 9px;
  font-weight: 700;
}
.mors-event-calendar-chip--accent { background: var(--brand-soft); color: var(--brand-strong); }
.mors-event-calendar-chip--success { background: var(--success-soft); color: var(--success); }
.mors-event-calendar-chip--warning { background: var(--warning-soft); color: var(--warning); }
.mors-event-calendar-chip--danger { background: var(--danger-soft); color: var(--danger); }
.mors-event-calendar-chip--info { background: var(--lav-soft); color: var(--lav-strong); }
.mors-event-calendar-chip--neutral { background: var(--surface-3); color: var(--muted); }
.mors-event-calendar-more { font-size: 9px; font-weight: 700; color: var(--muted-2); }

.mors-event-calendar-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface-2);
  padding: 12px;
}
.mors-event-calendar-panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.mors-event-calendar-panel-title { margin: 0; font-size: 13px; font-weight: 800; color: var(--ink); }
.mors-event-calendar-panel-count { margin: 0; font-size: 10px; color: var(--muted-2); white-space: nowrap; }
.mors-event-calendar-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.mors-event-calendar-item { min-width: 0; }
.mors-event-calendar-item-row { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.mors-event-calendar-item-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.mors-event-calendar-time { font-size: 10px; font-weight: 800; color: var(--brand-strong); direction: ltr; }
.mors-event-calendar-item-title { font-size: 12px; font-weight: 800; color: var(--ink); overflow-wrap: anywhere; }
.mors-event-calendar-item-note { font-size: 10px; color: var(--muted); overflow-wrap: anywhere; }

.mors-event-calendar-composer { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--line); padding-top: 10px; }
.mors-event-calendar-composer-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: end; }
.mors-event-calendar-edit { display: flex; flex-direction: column; gap: 8px; }
.mors-event-calendar-edit-actions { display: flex; justify-content: space-between; gap: 8px; }

.mors-card { min-width: 0; border-radius: 12px; background: var(--surface); }
.mors-card--flat { border: 1px solid var(--line); }
.mors-card--raised { border: 1px solid var(--line); box-shadow: var(--shadow-sm); }
.mors-card--sm { padding: 8px; }
.mors-card--md { padding: 12px; }

.mors-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-family: inherit;
  font-weight: 800;
  cursor: pointer;
  transition: transform 150ms ease, background-color 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease;
}
.mors-btn--sm { padding: 6px 10px; font-size: 11px; }
.mors-btn--md { padding: 9px 14px; font-size: 12px; }
.mors-btn--primary { background: linear-gradient(135deg, var(--brand), var(--brand-strong)); color: #fff; }
.mors-btn--primary:hover { transform: translateY(-1px); }
.mors-btn--ghost { background: transparent; color: var(--ink-soft); }
.mors-btn--ghost:hover { background: var(--surface-3); }
.mors-btn--outline { background: var(--surface); border-color: var(--line); color: var(--ink-soft); }
.mors-btn--outline:hover { border-color: var(--brand); color: var(--brand-strong); }
.mors-btn--block { width: 100%; }
.mors-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

.mors-icon-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-soft);
  cursor: pointer;
  transition: border-color 150ms ease, color 150ms ease, background-color 150ms ease;
}
.mors-icon-btn--sm { width: 28px; height: 28px; }
.mors-icon-btn--md { width: 34px; height: 34px; }
.mors-icon-btn--ghost { background: transparent; border-color: transparent; }
.mors-icon-btn:hover { border-color: var(--brand); color: var(--brand-strong); background: var(--surface-2); }

.mors-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.mors-field-label { font-size: 10px; font-weight: 800; color: var(--muted-2); }
.mors-input {
  width: 100%;
  min-width: 0;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  padding: 8px 10px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.mors-input::placeholder { color: var(--muted-2); }
.mors-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-ring); }
.mors-input--sm { padding: 6px 8px; font-size: 11px; }

.mors-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 999px; flex: none; }
.mors-swatch--sm { width: 10px; height: 10px; }
.mors-swatch--accent { background: var(--brand); }
.mors-swatch--success { background: var(--success); }
.mors-swatch--warning { background: var(--warning); }
.mors-swatch--danger { background: var(--danger); }
.mors-swatch--info { background: var(--lav); }
.mors-swatch--neutral { background: var(--muted); }

.mors-swatch-group { display: flex; flex-wrap: wrap; gap: 6px; }
.mors-swatch-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 2px solid transparent;
  background: var(--surface);
  cursor: pointer;
  transition: border-color 150ms ease, transform 150ms ease;
}
.mors-swatch-btn[data-active] { border-color: var(--ink); }
.mors-swatch-btn[data-active] .mors-swatch { transform: scale(0.82); }
.mors-swatch-btn:hover { transform: scale(1.06); }

@media (max-width: 640px) {
  .mors-event-calendar-cell { min-height: 46px; padding: 3px; border-radius: 9px; gap: 1px; }
  .mors-event-calendar-chips { display: none; }
  .mors-event-calendar-date { width: 20px; height: 20px; font-size: 10px; }
  .mors-event-calendar-cell[data-has-events="true"]::after {
    content: "";
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: var(--brand);
  }
  .mors-event-calendar-weekday { font-size: 9px; padding: 4px 0; }
  .mors-event-calendar-composer-row { grid-template-columns: minmax(0, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .mors-event-calendar *,
  .mors-event-calendar *::before,
  .mors-event-calendar *::after { transition: none !important; animation: none !important; }
}
`;

import * as React from "react"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { addDays, addMonths, formatIso, monthGrid, parseIso, sameDay, today, type Day } from "@/lib/calendar"
import { cn } from "@/lib/utils"

const nav = "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground [&_svg]:size-4"
const action = "rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"

type DatePickerProps = {
  id?: string
  /** A day as YYYY-MM-DD, or empty */
  value: string
  onChange: (value: string) => void
  "aria-invalid"?: boolean
}

/** A date field that takes a typed YYYY-MM-DD and opens a calendar of the app instead of the one of the system. */
function DatePicker({ id, value, onChange, "aria-invalid": invalid }: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [focus, setFocus] = React.useState<Day>(() => parseIso(value) ?? today())
  const grid = React.useRef<HTMLDivElement>(null)
  const chosen = parseIso(value)
  const now = today()
  const locale = i18n.language.startsWith("zh") ? "zh-TW" : "en"

  const names = React.useMemo(() => {
    // 2023-01-01 was a Sunday
    const weekday = new Intl.DateTimeFormat(locale, { weekday: locale === "zh-TW" ? "narrow" : "short", timeZone: "UTC" })
    return Array.from({ length: 7 }, (_, index) => weekday.format(new Date(Date.UTC(2023, 0, 1 + index))))
  }, [locale])
  const title = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(focus.year, focus.month - 1, 1)))
  const full = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" })

  // The focused day is the one that takes the keys, it follows the arrows across the months
  const focusDay = React.useCallback(() => grid.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus(), [])
  React.useEffect(() => {
    if (open) focusDay()
  }, [open, focus, focusDay])

  function show(next: boolean) {
    if (next) setFocus(chosen ?? now)
    setOpen(next)
  }

  function choose(day: Day) {
    onChange(formatIso(day))
    setOpen(false)
  }

  function keys(event: React.KeyboardEvent) {
    const move = (next: Day) => {
      event.preventDefault()
      setFocus(next)
    }
    const weekday = new Date(Date.UTC(focus.year, focus.month - 1, focus.day)).getUTCDay()
    if (event.key === "ArrowLeft") move(addDays(focus, -1))
    else if (event.key === "ArrowRight") move(addDays(focus, 1))
    else if (event.key === "ArrowUp") move(addDays(focus, -7))
    else if (event.key === "ArrowDown") move(addDays(focus, 7))
    else if (event.key === "Home") move(addDays(focus, -weekday))
    else if (event.key === "End") move(addDays(focus, 6 - weekday))
    else if (event.key === "PageUp") move(addMonths(focus, event.shiftKey ? -12 : -1))
    else if (event.key === "PageDown") move(addMonths(focus, event.shiftKey ? 12 : 1))
  }

  return (
    <Popover open={open} onOpenChange={show}>
      <div className="relative">
        <Input id={id} value={value} placeholder="YYYY-MM-DD" inputMode="numeric" autoComplete="off" aria-invalid={invalid} className="pr-9" onChange={(event) => onChange(event.target.value)} />
        <PopoverTrigger asChild>
          <button type="button" aria-label={t("date.open")} className={cn(nav, "absolute top-0.5 right-0.5")}>
            <CalendarIcon aria-hidden="true" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        className="w-[17.5rem]"
        onOpenAutoFocus={(event) => {
          // The popover would focus itself, the day is the better place
          event.preventDefault()
          focusDay()
        }}
      >
        <div className="mb-2 flex items-center gap-0.5">
          <button type="button" className={nav} aria-label={t("date.previousYear")} onClick={() => setFocus(addMonths(focus, -12))}>
            <ChevronsLeftIcon aria-hidden="true" />
          </button>
          <button type="button" className={nav} aria-label={t("date.previousMonth")} onClick={() => setFocus(addMonths(focus, -1))}>
            <ChevronLeftIcon aria-hidden="true" />
          </button>
          <p className="min-w-0 flex-1 text-center text-sm font-medium" aria-live="polite">
            {title}
          </p>
          <button type="button" className={nav} aria-label={t("date.nextMonth")} onClick={() => setFocus(addMonths(focus, 1))}>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          <button type="button" className={nav} aria-label={t("date.nextYear")} onClick={() => setFocus(addMonths(focus, 12))}>
            <ChevronsRightIcon aria-hidden="true" />
          </button>
        </div>
        <div ref={grid} role="grid" aria-label={title} onKeyDown={keys}>
          <div role="row" className="grid grid-cols-7">
            {names.map((name, index) => (
              <div key={index} role="columnheader" className="py-1 text-center text-xs text-muted-foreground">
                {name}
              </div>
            ))}
          </div>
          {monthGrid(focus.year, focus.month).map((week, row) => (
            <div key={row} role="row" className="grid grid-cols-7">
              {week.map(({ day, inMonth }) => {
                const picked = sameDay(day, chosen)
                return (
                  <div key={formatIso(day)} role="gridcell" aria-selected={picked} className="flex justify-center py-0.5">
                    <button
                      type="button"
                      tabIndex={sameDay(day, focus) ? 0 : -1}
                      aria-label={full.format(new Date(Date.UTC(day.year, day.month - 1, day.day)))}
                      aria-current={sameDay(day, now) ? "date" : undefined}
                      onClick={() => choose(day)}
                      className={cn(
                        "size-8 rounded-md border border-transparent text-sm tabular-nums transition-colors outline-none hover:bg-muted focus-visible:border-foreground",
                        !inMonth && "text-muted-foreground/50",
                        sameDay(day, now) && !picked && "border-border",
                        picked && "bg-foreground text-background hover:bg-foreground/90"
                      )}
                    >
                      {day.day}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <button type="button" className={action} onClick={() => choose(now)}>
            {t("date.today")}
          </button>
          <button
            type="button"
            className={action}
            onClick={() => {
              onChange("")
              setOpen(false)
            }}
          >
            {t("date.clear")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }

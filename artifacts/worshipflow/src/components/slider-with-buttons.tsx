import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Minus, Plus } from "lucide-react";

type SliderProps = React.ComponentProps<typeof Slider>;

export function SliderWithButtons(props: SliderProps) {
  const {
    min = 0,
    max = 100,
    step = 1,
    value,
    onValueChange,
    className,
    ...rest
  } = props;

  const cur = Array.isArray(value) && typeof value[0] === "number" ? value[0] : min;
  const atMin = cur <= min;
  const atMax = cur >= max;

  const dec = () => {
    if (atMin) return;
    onValueChange?.([Math.max(min, cur - step)]);
  };
  const inc = () => {
    if (atMax) return;
    onValueChange?.([Math.min(max, cur + step)]);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <button
        type="button"
        onClick={dec}
        disabled={atMin}
        aria-label="Decrease"
        className="h-7 w-7 shrink-0 rounded border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <Slider
        {...rest}
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onValueChange}
        className="flex-1"
      />
      <button
        type="button"
        onClick={inc}
        disabled={atMax}
        aria-label="Increase"
        className="h-7 w-7 shrink-0 rounded border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

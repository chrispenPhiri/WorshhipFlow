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
    defaultValue,
    onValueChange,
    disabled,
    className,
    ...rest
  } = props;

  const source = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : undefined;
  const cur = source && typeof source[0] === "number" ? source[0] : min;
  const isMulti = !!source && source.length > 1;
  const atMin = cur <= min;
  const atMax = cur >= max;
  // Disable +/- in multi-thumb (range) mode to avoid collapsing thumbs.
  const disableButtons = !!disabled || isMulti;

  const dec = () => {
    if (disableButtons || atMin) return;
    onValueChange?.([Math.max(min, cur - step)]);
  };
  const inc = () => {
    if (disableButtons || atMax) return;
    onValueChange?.([Math.min(max, cur + step)]);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <button
        type="button"
        onClick={dec}
        disabled={disableButtons || atMin}
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
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        className="flex-1"
      />
      <button
        type="button"
        onClick={inc}
        disabled={disableButtons || atMax}
        aria-label="Increase"
        className="h-7 w-7 shrink-0 rounded border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

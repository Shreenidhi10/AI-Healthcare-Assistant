import * as React from "react";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef(
  (
    {
      className,
      checked = false,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [isChecked, setIsChecked] = React.useState(
      checked || defaultChecked
    );

    React.useEffect(() => {
      setIsChecked(checked);
    }, [checked]);

    const toggle = () => {
      if (disabled) return;

      const next = !isChecked;
      setIsChecked(next);

      if (onCheckedChange) {
        onCheckedChange(next);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          isChecked ? "bg-primary" : "bg-muted",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
            isChecked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  error?: string;
  inputClassName?: string;
  label?: string;
  labelAddon?: ReactNode;
  labelClassName?: string;
  wrapperClassName?: string;
};

function PasswordInput({
  className,
  disabled,
  error,
  id,
  inputClassName,
  label = "Password",
  labelAddon,
  labelClassName,
  wrapperClassName,
  "aria-invalid": ariaInvalid,
  ...props
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn(wrapperClassName)}>
      {/* <div className="flex items-center justify-between gap-3">
        <Label htmlFor={inputId} className={labelClassName}>
          {label}
        </Label>
        {labelAddon}
      </div> */}
      <div className="relative">
        <Input
          id={inputId}
          type={showPassword ? "text" : "password"}
          disabled={disabled}
          aria-invalid={Boolean(error) || ariaInvalid}
          className={cn("bg-background pr-12", inputClassName, className)}
          {...props}
        />
        <Button
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute top-0 right-0 h-full w-auto px-3 transition-none! hover:bg-transparent! active:translate-y-0!"
          disabled={disabled}
          onClick={() => setShowPassword((current) => !current)}
          size="icon"
          type="button"
          variant="ghost"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

export { PasswordInput };

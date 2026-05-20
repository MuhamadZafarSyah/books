"use client";

import {
  Group as GroupPrimitive,
  Panel as PanelPrimitive,
  Separator as SeparatorPrimitive,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from "react-resizable-panels";

import { cn } from "@/lib/utils";

/**
 * Wrapper shadcn untuk `react-resizable-panels` v4.x.
 *
 * Berbeda dari template shadcn lama yang menargetkan v2.x (`PanelGroup` /
 * `PanelResizeHandle` / prop `direction`), v4 mengekspor `Group`,
 * `Panel`, dan `Separator` plus prop `orientation`. Wrapper ini
 * menormalkannya ke nama "ResizablePanelGroup / ResizablePanel /
 * ResizableHandle" agar konsumen tidak perlu tahu detail rilis.
 */

function ResizablePanelGroup({ className, ...props }: GroupProps) {
  return (
    <GroupPrimitive
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function ResizablePanel(props: PanelProps) {
  return <PanelPrimitive data-slot="resizable-panel" {...props} />;
}

type ResizableHandleProps = SeparatorProps & {
  /** Tampilkan grip kecil di tengah handle. */
  withHandle?: boolean;
};

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizableHandleProps) {
  return (
    <SeparatorPrimitive
      data-slot="resizable-handle"
      className={cn(
        "relative flex w-1 items-center justify-center bg-border ring-offset-background transition-colors data-[orientation=vertical]:h-1 data-[orientation=vertical]:w-full focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring hover:bg-primary/40",
        className,
      )}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-6 w-1 shrink-0 rounded-full bg-foreground/30 group-hover:bg-foreground/60" />
      ) : null}
    </SeparatorPrimitive>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };

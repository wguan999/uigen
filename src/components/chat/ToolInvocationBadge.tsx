"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "partial-call" | "result";
}

function getFilename(path: unknown): string {
  if (typeof path !== "string" || !path) return "";
  return path.split("/").pop() || path;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const filename = getFilename(args.path);

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return filename ? `Creating ${filename}` : "Creating file";
      case "str_replace":
      case "insert":
        return filename ? `Editing ${filename}` : "Editing file";
      case "view":
        return filename ? `Reading ${filename}` : "Reading file";
      case "undo_edit":
        return filename ? `Undoing edit in ${filename}` : "Undoing edit";
      default:
        return filename ? `Editing ${filename}` : "Editing file";
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "delete":
        return filename ? `Deleting ${filename}` : "Deleting file";
      case "rename":
        return filename ? `Renaming ${filename}` : "Renaming file";
      default:
        return filename ? `Managing ${filename}` : "Managing file";
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolName, args, state }: ToolInvocationBadgeProps) {
  const done = state === "result";
  const label = getLabel(toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

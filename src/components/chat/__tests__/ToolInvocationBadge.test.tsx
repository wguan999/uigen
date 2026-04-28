import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

test("str_replace_editor create shows Creating filename", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("str_replace_editor str_replace shows Editing filename", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/components/Button.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("str_replace_editor insert shows Editing filename", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/src/components/Button.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("str_replace_editor view shows Reading filename", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/src/lib/utils.ts" }}
      state="call"
    />
  );
  expect(screen.getByText("Reading utils.ts")).toBeDefined();
});

test("str_replace_editor undo_edit shows Undoing edit in filename", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "undo_edit", path: "/src/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Undoing edit in App.jsx")).toBeDefined();
});

test("file_manager delete shows Deleting filename", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/src/components/Card.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Deleting Card.tsx")).toBeDefined();
});

test("file_manager rename shows Renaming filename", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/src/components/Card.tsx", new_path: "/src/components/CardV2.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Renaming Card.tsx")).toBeDefined();
});

test("unknown tool name falls back to raw toolName", () => {
  render(
    <ToolInvocationBadge
      toolName="some_unknown_tool"
      args={{}}
      state="call"
    />
  );
  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

test("state result renders green dot", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/App.jsx" }}
      state="result"
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("state call renders spinner", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/App.jsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

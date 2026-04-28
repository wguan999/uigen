import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAnonWorkData).mockReturnValue(null);
  vi.mocked(getProjects).mockResolvedValue([]);
  vi.mocked(createProject).mockResolvedValue({ id: "new-project-id" } as any);
});

describe("useAuth — initial state", () => {
  test("isLoading starts false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

describe("useAuth — signIn", () => {
  test("sets isLoading true while in flight, false after", async () => {
    let resolveAction!: (v: any) => void;
    vi.mocked(signInAction).mockReturnValue(
      new Promise((res) => { resolveAction = res; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.signIn("a@b.com", "pw"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveAction({ success: false, error: "bad" }); });
    expect(result.current.isLoading).toBe(false);
  });

  test("calls signInAction with provided credentials", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "x" });
    const { result } = renderHook(() => useAuth());

    await act(async () => { await result.current.signIn("user@test.com", "secret"); });

    expect(signInAction).toHaveBeenCalledWith("user@test.com", "secret");
  });

  test("returns the action result", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });
    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => { returnValue = await result.current.signIn("a@b.com", "wrong"); });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("sets isLoading false even if signInAction throws", async () => {
    vi.mocked(signInAction).mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "pw").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not call handlePostSignIn on failure", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "bad" });
    const { result } = renderHook(() => useAuth());

    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(getProjects).not.toHaveBeenCalled();
    expect(createProject).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("useAuth — signUp", () => {
  test("calls signUpAction with provided credentials", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "exists" });
    const { result } = renderHook(() => useAuth());

    await act(async () => { await result.current.signUp("new@test.com", "pass123"); });

    expect(signUpAction).toHaveBeenCalledWith("new@test.com", "pass123");
  });

  test("returns the action result", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });
    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => { returnValue = await result.current.signUp("a@b.com", "pw"); });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
  });

  test("sets isLoading false even if signUpAction throws", async () => {
    vi.mocked(signUpAction).mockRejectedValue(new Error("db error"));
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("a@b.com", "pw").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth — handlePostSignIn: anon work present", () => {
  const anonWork = {
    messages: [{ role: "user", content: "hello" }],
    fileSystemData: { "/App.jsx": "export default () => <div/>" },
  };

  beforeEach(() => {
    vi.mocked(getAnonWorkData).mockReturnValue(anonWork);
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(createProject).mockResolvedValue({ id: "anon-project-id" } as any);
  });

  test("creates a project with anon work data", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      })
    );
  });

  test("project name includes current time", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    const call = vi.mocked(createProject).mock.calls[0][0];
    expect(call.name).toMatch(/^Design from /);
  });

  test("clears anon work after creating project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(clearAnonWork).toHaveBeenCalled();
  });

  test("redirects to the created project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
  });

  test("does not call getProjects when anon work exists", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(getProjects).not.toHaveBeenCalled();
  });
});

describe("useAuth — handlePostSignIn: no anon work, existing projects", () => {
  beforeEach(() => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getProjects).mockResolvedValue([
      { id: "proj-1" },
      { id: "proj-2" },
    ] as any);
  });

  test("redirects to the most recent project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(mockPush).toHaveBeenCalledWith("/proj-1");
  });

  test("does not create a new project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(createProject).not.toHaveBeenCalled();
  });
});

describe("useAuth — handlePostSignIn: no anon work, no projects", () => {
  beforeEach(() => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "fresh-project-id" } as any);
  });

  test("creates a new empty project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
  });

  test("new project name matches 'New Design #<number>'", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    const call = vi.mocked(createProject).mock.calls[0][0];
    expect(call.name).toMatch(/^New Design #\d+$/);
  });

  test("redirects to the new project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(mockPush).toHaveBeenCalledWith("/fresh-project-id");
  });

  test("same flow applies for signUp", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@test.com", "pw"); });

    expect(createProject).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/fresh-project-id");
  });
});

describe("useAuth — handlePostSignIn: anon work with empty messages", () => {
  test("treats empty messages array as no anon work", async () => {
    vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getProjects).mockResolvedValue([{ id: "existing-id" }] as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(createProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-id");
  });
});

// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

// Mock server-only so it doesn't throw in test env
vi.mock("server-only", () => ({}));

// Mock next/headers cookies
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockCookieStore = { set: mockSet, get: mockGet };
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

// Import after mocks are set up
const { createSession, getSession } = await import("@/lib/auth");

const SECRET = new TextEncoder().encode("development-secret-key");

async function mintToken(payload: Record<string, unknown>, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession sets an httpOnly cookie named auth-token", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockSet).toHaveBeenCalledOnce();
  const [cookieName, , options] = mockSet.mock.calls[0];
  expect(cookieName).toBe("auth-token");
  expect(options.httpOnly).toBe(true);
});

test("createSession cookie expires in ~7 days", async () => {
  const before = Date.now();
  await createSession("user-123", "test@example.com");
  const after = Date.now();

  const [, , options] = mockSet.mock.calls[0];
  const expires: Date = options.expires;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession sets sameSite lax and path /", async () => {
  await createSession("user-123", "test@example.com");

  const [, , options] = mockSet.mock.calls[0];
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession token is a valid JWT containing userId and email", async () => {
  await createSession("user-123", "test@example.com");

  const [, token] = mockSet.mock.calls[0];
  const secret = new TextEncoder().encode("development-secret-key");
  const { payload } = await jwtVerify(token, secret);

  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("test@example.com");
});

// getSession tests

test("getSession returns null when no cookie is present", async () => {
  mockGet.mockReturnValue(undefined);

  const result = await getSession();
  expect(result).toBeNull();
});

test("getSession returns null for an invalid token", async () => {
  mockGet.mockReturnValue({ value: "not.a.valid.jwt" });

  const result = await getSession();
  expect(result).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  // Mint a token that expired 1 second ago
  const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
    .sign(SECRET);
  mockGet.mockReturnValue({ value: token });

  const result = await getSession();
  expect(result).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const token = await mintToken({ userId: "user-123", email: "test@example.com" });
  mockGet.mockReturnValue({ value: token });

  const result = await getSession();
  expect(result).not.toBeNull();
  expect(result?.userId).toBe("user-123");
  expect(result?.email).toBe("test@example.com");
});

// createSession JWT expiry test

test("createSession JWT expires in 7 days", async () => {
  const before = Math.floor(Date.now() / 1000);
  await createSession("user-123", "test@example.com");
  const after = Math.floor(Date.now() / 1000);

  const [, token] = mockSet.mock.calls[0];
  const secret = new TextEncoder().encode("development-secret-key");
  const { payload } = await jwtVerify(token, secret);

  const sevenDaysSec = 7 * 24 * 60 * 60;
  expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDaysSec - 5);
  expect(payload.exp).toBeLessThanOrEqual(after + sevenDaysSec + 5);
});

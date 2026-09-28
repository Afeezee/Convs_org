import { describe, expect, it } from "vitest";
import { policies, scrub } from "./policies";
import type { Session } from "./auth";

const alice: Session = {
  userId: "u1",
  clerkUserId: "clerk1",
  email: "alice@example.com",
  role: "user",
  fullName: "Alice",
};
const bob: Session = { ...alice, userId: "u2", clerkUserId: "clerk2", email: "bob@example.com", fullName: "Bob" };
const admin: Session = { ...alice, role: "admin", email: "admin@example.com" };
const mod: Session = { ...alice, role: "moderator", email: "mod@example.com" };

describe("Conv policy", () => {
  const p = policies.Conv;
  const pub = { author_email: "alice@example.com", status: "published" };
  const draft = { author_email: "alice@example.com", status: "draft" };
  it("anyone reads published", () => {
    expect(p.canRead(pub, null)).toBe(true);
    expect(p.canRead(pub, bob)).toBe(true);
  });
  it("only author + staff read draft", () => {
    expect(p.canRead(draft, null)).toBe(false);
    expect(p.canRead(draft, bob)).toBe(false);
    expect(p.canRead(draft, alice)).toBe(true);
    expect(p.canRead(draft, mod)).toBe(true);
    expect(p.canRead(draft, admin)).toBe(true);
  });
  it("author or staff can update / delete", () => {
    expect(p.canUpdate(pub, alice)).toBe(true);
    expect(p.canUpdate(pub, bob)).toBe(false);
    expect(p.canDelete(pub, mod)).toBe(true);
  });
});

describe("Bookmark policy", () => {
  const p = policies.Bookmark;
  const row = { user_email: "alice@example.com" };
  it("owner-only read/write", () => {
    expect(p.canRead(row, null)).toBe(false);
    expect(p.canRead(row, alice)).toBe(true);
    expect(p.canRead(row, bob)).toBe(false);
    expect(p.canRead(row, admin)).toBe(false); // admin isn't a special case here
  });
});

describe("Notification policy", () => {
  const p = policies.Notification;
  it("clients cannot create", () => {
    expect(p.canCreate({}, alice)).toBe(false);
  });
});

describe("Report policy", () => {
  const p = policies.Report;
  it("only staff read", () => {
    expect(p.canRead({}, alice)).toBe(false);
    expect(p.canRead({}, mod)).toBe(true);
    expect(p.canRead({}, admin)).toBe(true);
  });
  it("any signed-in user can create", () => {
    expect(p.canCreate({}, null)).toBe(false);
    expect(p.canCreate({}, alice)).toBe(true);
  });
});

describe("Follow policy", () => {
  const p = policies.Follow;
  const row = { follower_email: "alice@example.com" };
  it("only follower or admin reads", () => {
    expect(p.canRead(row, alice)).toBe(true);
    expect(p.canRead(row, bob)).toBe(false);
    expect(p.canRead(row, admin)).toBe(true);
  });
});

describe("scrub", () => {
  it("drops server-owned fields and forces session-owned ones on create", () => {
    const out = scrub(
      "Comment",
      {
        conv_id: "c1",
        stance: "support",
        content: "yes",
        // Attempts at forgery — all should disappear or be overwritten
        author_email: "villain@example.com",
        author_name: "Villain",
        constructiveness_score: 1,
        status: "published",
        id: "forged",
        created_by: "villain",
      },
      alice,
      "create"
    );
    expect(out.author_email).toBe("alice@example.com");
    expect(out.author_name).toBe("Alice");
    expect(out.constructiveness_score).toBeUndefined();
    expect(out.status).toBeUndefined();
    expect(out.id).toBeUndefined();
    expect(out.created_by).toBe("alice@example.com");
  });
  it("update strips writable-only and adds updated_date", () => {
    const out = scrub("Conv", { title: "new", quality_score: 99 }, alice, "update");
    expect(out.title).toBe("new");
    expect(out.quality_score).toBeUndefined();
    expect(out.updated_date).toBeInstanceOf(Date);
  });
});

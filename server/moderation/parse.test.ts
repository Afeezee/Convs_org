import { describe, expect, it } from "vitest";
import { extractJsonObject, stripReasoning } from "./parse";

describe("stripReasoning", () => {
  it("removes <think> blocks", () => {
    const out = stripReasoning("<think>plan</think>{\"a\":1}");
    expect(out).toBe('{"a":1}');
  });
  it("removes fenced code", () => {
    expect(stripReasoning("```json\n{\"a\":1}\n```")).toBe('{"a":1}');
    expect(stripReasoning("```\n{\"a\":1}\n```")).toBe('{"a":1}');
  });
  it("case-insensitive think tags", () => {
    expect(stripReasoning("<THINK>x</THINK>{}")).toBe("{}");
  });
});

describe("extractJsonObject", () => {
  it("extracts the first balanced object with trailing prose", () => {
    const out = extractJsonObject('some noise {"a":1} and more');
    expect(out).toEqual({ a: 1 });
  });
  it("handles nested braces", () => {
    const out = extractJsonObject('{"a":{"b":2},"c":3}');
    expect(out).toEqual({ a: { b: 2 }, c: 3 });
  });
  it("ignores braces inside strings", () => {
    const out = extractJsonObject('{"a":"}{ still string","b":1}');
    expect(out).toEqual({ a: "}{ still string", b: 1 });
  });
  it("handles escaped quotes inside strings", () => {
    const out = extractJsonObject('{"a":"he said \\"hi\\""}');
    expect(out).toEqual({ a: 'he said "hi"' });
  });
  it("throws when no object is present", () => {
    expect(() => extractJsonObject("no json here")).toThrow();
  });
  it("survives combined <think> + fences + trailing prose", () => {
    const raw = '<think>hmm</think>```json\n{"toxicity_score":0.1}\n``` end';
    expect(extractJsonObject(raw)).toEqual({ toxicity_score: 0.1 });
  });
});

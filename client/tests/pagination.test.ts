import { describe, it, expect } from "vitest";
import { getPageItems } from "../src/utils/pagination";

describe("getPageItems", () => {
  it("returns every page when there are few enough of them", () => {
    expect(getPageItems(1, 3)).toEqual([1, 2, 3]);
    expect(getPageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses far-away pages into a single ellipsis on each side", () => {
    expect(getPageItems(50, 100)).toEqual([1, "ellipsis", 49, 50, 51, "ellipsis", 100]);
  });

  it("only shows one ellipsis when the current page is near an edge", () => {
    expect(getPageItems(1, 100)).toEqual([1, 2, "ellipsis", 100]);
    expect(getPageItems(100, 100)).toEqual([1, "ellipsis", 99, 100]);
  });
});

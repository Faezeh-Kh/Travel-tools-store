import {describe, expect, it} from "vitest";
import {getPaginationRange} from "./getPaginationRange";

describe("getPaginationRange", () => {
    it("returns an empty range when there is only one page (or none)", () => {
        expect(getPaginationRange(0, 1)).toEqual([]);
        expect(getPaginationRange(0, 0)).toEqual([]);
    });

    it("shows every page with no ellipsis when the total is small enough to fit the window", () => {
        expect(getPaginationRange(2, 5)).toEqual([0, 1, 2, 3, 4]);
    });

    it("shows a leading ellipsis and hides the trailing one near the end of a large range", () => {
        expect(getPaginationRange(9, 10)).toEqual([0, "ellipsis", 8, 9]);
    });

    it("shows a trailing ellipsis and hides the leading one near the start of a large range", () => {
        expect(getPaginationRange(0, 10)).toEqual([0, 1, "ellipsis", 9]);
    });

    it("shows ellipsis on both sides when the current page is in the middle of a large range", () => {
        expect(getPaginationRange(5, 10)).toEqual([0, "ellipsis", 4, 5, 6, "ellipsis", 9]);
    });
});

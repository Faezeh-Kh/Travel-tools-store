import {afterEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {PrintButton} from "./PrintButton";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("PrintButton", () => {
    it("opens the browser's print dialog, which also offers saving as PDF", () => {
        const print = vi.spyOn(window, "print").mockImplementation(() => {});
        render(<PrintButton />);

        fireEvent.click(screen.getByRole("button", {name: "چاپ / ذخیره PDF"}));

        expect(print).toHaveBeenCalledOnce();
    });
});

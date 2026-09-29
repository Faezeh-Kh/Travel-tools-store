import {describe, expect, it} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {HERO_SLIDES, HeroBanner} from "./HeroBanner";

const LAST = HERO_SLIDES.length - 1;

function expectSlideShown(index: number) {
    expect(screen.getByText(HERO_SLIDES[index].subtitle)).toBeInTheDocument();
    const dot = screen.getByRole("button", {name: `تصویر ${(index + 1).toLocaleString("fa-IR")}`});
    expect(dot).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByRole("button", {current: true})).toEqual([dot]);
}

describe("HeroBanner", () => {
    it("starts on the first slide under a fixed page heading, with one dot per slide", () => {
        render(<HeroBanner />);

        expect(screen.getByRole("heading", {level: 1, name: "تجهیزات سفر برای هر ماجراجویی"})).toBeInTheDocument();
        expect(screen.getAllByRole("button", {name: /^تصویر [۰-۹]+$/})).toHaveLength(HERO_SLIDES.length);
        expectSlideShown(0);
    });

    it("moves forward and back with the next and previous buttons", () => {
        render(<HeroBanner />);

        fireEvent.click(screen.getByRole("button", {name: "تصویر بعدی"}));
        expectSlideShown(1);

        fireEvent.click(screen.getByRole("button", {name: "تصویر قبلی"}));
        expectSlideShown(0);
    });

    it("wraps from the first slide to the last and from the last back to the first", () => {
        render(<HeroBanner />);

        fireEvent.click(screen.getByRole("button", {name: "تصویر قبلی"}));
        expectSlideShown(LAST);

        fireEvent.click(screen.getByRole("button", {name: "تصویر بعدی"}));
        expectSlideShown(0);
    });

    it("jumps directly to a slide when its dot is clicked", () => {
        render(<HeroBanner />);

        fireEvent.click(screen.getByRole("button", {name: `تصویر ${(4).toLocaleString("fa-IR")}`}));
        expectSlideShown(3);
    });
});

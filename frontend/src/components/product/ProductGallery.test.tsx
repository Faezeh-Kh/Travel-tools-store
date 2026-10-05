import {describe, expect, it} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {ProductGallery} from "./ProductGallery";

const name = "چادر کوهنوردی ۳ نفره";
const images = ["/images/products/TNT-1.1.webp", "/images/products/TNT-1.2.webp", "/images/products/TNT-1.3.webp"];

const mainImage = () => screen.getByAltText(name);
const button = (label: string) => screen.getByRole("button", {name: label});

describe("ProductGallery", () => {
    it("shows a single photo without thumbnails", () => {
        render(<ProductGallery images={[images[0]]} name={name} />);

        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[0]));
        // Neither thumbnails nor previous/next arrows.
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows the placeholder and no thumbnails when there are no photos", () => {
        render(<ProductGallery images={[]} name={name} />);

        expect(screen.getByText("بدون تصویر")).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("starts on the first photo with a thumbnail button per photo", () => {
        render(<ProductGallery images={images} name={name} />);

        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[0]));
        expect(screen.getAllByRole("button", {name: /^نمایش تصویر/})).toHaveLength(3);
        expect(button("نمایش تصویر ۱ از ۳")).toHaveAttribute("aria-current", "true");
    });

    it("switches the main photo and the current thumbnail when a thumbnail is chosen", () => {
        render(<ProductGallery images={images} name={name} />);

        fireEvent.click(button("نمایش تصویر ۳ از ۳"));

        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[2]));
        expect(button("نمایش تصویر ۳ از ۳")).toHaveAttribute("aria-current", "true");
        expect(button("نمایش تصویر ۱ از ۳")).toHaveAttribute("aria-current", "false");
    });

    it("shows the placeholder for a broken photo but still shows the other photos", () => {
        render(<ProductGallery images={images} name={name} />);

        fireEvent.error(mainImage());
        expect(screen.getByText("بدون تصویر")).toBeInTheDocument();

        fireEvent.click(button("نمایش تصویر ۲ از ۳"));
        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[1]));
        expect(screen.queryByText("بدون تصویر")).not.toBeInTheDocument();
    });

    it("steps to the next photo and wraps from the last photo to the first", () => {
        render(<ProductGallery images={images} name={name} />);

        fireEvent.click(button("تصویر بعدی"));
        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[1]));

        fireEvent.click(button("تصویر بعدی"));
        fireEvent.click(button("تصویر بعدی"));
        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[0]));
    });

    it("steps to the previous photo and wraps from the first photo to the last", () => {
        render(<ProductGallery images={images} name={name} />);

        fireEvent.click(button("تصویر قبلی"));
        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[2]));

        fireEvent.click(button("تصویر قبلی"));
        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[1]));
    });

    it("moves the current thumbnail along with the arrows", () => {
        render(<ProductGallery images={images} name={name} />);

        fireEvent.click(button("تصویر بعدی"));

        expect(button("نمایش تصویر ۲ از ۳")).toHaveAttribute("aria-current", "true");
        expect(button("نمایش تصویر ۱ از ۳")).toHaveAttribute("aria-current", "false");
    });

    it("keeps the arrows on a broken photo so the shopper can move past it", () => {
        render(<ProductGallery images={images} name={name} />);

        fireEvent.error(mainImage());
        fireEvent.click(button("تصویر بعدی"));

        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[1]));
    });
});

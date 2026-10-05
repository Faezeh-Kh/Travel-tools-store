import {describe, expect, it} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {ProductImage} from "./ProductImage";

const name = "چادر کوهنوردی ۳ نفره";
const images = ["/images/products/TNT-1.1.webp", "/images/products/TNT-1.2.webp", "/images/products/TNT-1.3.webp"];

const mainImage = () => screen.getByAltText(name);
const thumbnail = (label: string) => screen.getByRole("button", {name: label});

describe("ProductImage", () => {
    it("shows a single photo without thumbnails", () => {
        render(<ProductImage images={[images[0]]} name={name} />);

        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[0]));
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows the placeholder and no thumbnails when there are no photos", () => {
        render(<ProductImage images={[]} name={name} />);

        expect(screen.getByText("بدون تصویر")).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("starts on the first photo with a thumbnail button per photo", () => {
        render(<ProductImage images={images} name={name} />);

        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[0]));
        expect(screen.getAllByRole("button")).toHaveLength(3);
        expect(thumbnail("نمایش تصویر ۱ از ۳")).toHaveAttribute("aria-current", "true");
    });

    it("switches the main photo and the current thumbnail when a thumbnail is chosen", () => {
        render(<ProductImage images={images} name={name} />);

        fireEvent.click(thumbnail("نمایش تصویر ۳ از ۳"));

        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[2]));
        expect(thumbnail("نمایش تصویر ۳ از ۳")).toHaveAttribute("aria-current", "true");
        expect(thumbnail("نمایش تصویر ۱ از ۳")).toHaveAttribute("aria-current", "false");
    });

    it("shows the placeholder for a broken photo but still shows the other photos", () => {
        render(<ProductImage images={images} name={name} />);

        fireEvent.error(mainImage());
        expect(screen.getByText("بدون تصویر")).toBeInTheDocument();

        fireEvent.click(thumbnail("نمایش تصویر ۲ از ۳"));
        expect(mainImage()).toHaveAttribute("src", expect.stringContaining(images[1]));
        expect(screen.queryByText("بدون تصویر")).not.toBeInTheDocument();
    });
});

import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {ProductSearchForm} from "./ProductSearchForm";

describe("ProductSearchForm", () => {
    it("renders a labeled search box and an accessible submit button", () => {
        render(<ProductSearchForm />);

        expect(screen.getByRole("searchbox", {name: "جستجوی محصولات"})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "جستجو"})).toBeInTheDocument();
    });

    it("pre-fills the search box from the current search value", () => {
        render(<ProductSearchForm defaultValue="چادر" />);

        expect(screen.getByRole("searchbox", {name: "جستجوی محصولات"})).toHaveValue("چادر");
    });

    it("submits the form when the box is cleared, but not while typing", () => {
        const {container} = render(<ProductSearchForm defaultValue="چادر" />);
        const searchbox = screen.getByRole("searchbox", {name: "جستجوی محصولات"});
        const onSubmit = vi.fn((event: Event) => event.preventDefault());
        container.querySelector("form")!.addEventListener("submit", onSubmit);

        fireEvent.change(searchbox, {target: {value: "چادر کوهنوردی"}});
        expect(onSubmit).not.toHaveBeenCalled();

        fireEvent.change(searchbox, {target: {value: ""}});
        expect(onSubmit).toHaveBeenCalledOnce();
    });
});

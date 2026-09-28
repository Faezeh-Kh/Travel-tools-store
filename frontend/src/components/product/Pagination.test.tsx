import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {Pagination} from "./Pagination";

describe("Pagination", () => {
    it("renders nothing when there is only one page", () => {
        const {container} = render(<Pagination currentPage={0} totalPages={1} searchParams={{}} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("renders page links that preserve the current filters, with the current page marked", () => {
        render(<Pagination currentPage={1} totalPages={3} searchParams={{search: "چادر", inStock: true}} />);

        const pageTwo = screen.getByRole("link", {name: "2"});
        expect(pageTwo).toHaveAttribute("aria-current", "page");
        expect(pageTwo).toHaveAttribute(
            "href",
            "/products?search=%DA%86%D8%A7%D8%AF%D8%B1&inStock=true&page=1",
        );
        expect(screen.getByRole("link", {name: "1"})).toHaveAttribute(
            "href",
            "/products?search=%DA%86%D8%A7%D8%AF%D8%B1&inStock=true&page=0",
        );
    });

    it("builds hrefs under a custom basePath when given one", () => {
        render(<Pagination currentPage={0} totalPages={3} searchParams={{}} basePath="/categories/camping-shelter" />);

        expect(screen.getByRole("link", {name: "2"})).toHaveAttribute("href", "/categories/camping-shelter?page=1");
    });

    it("omits the previous link on the first page and the next link on the last page", () => {
        const {rerender} = render(<Pagination currentPage={0} totalPages={3} searchParams={{}} />);
        expect(screen.queryByRole("link", {name: "صفحه قبل"})).not.toBeInTheDocument();
        expect(screen.getByRole("link", {name: "صفحه بعد"})).toBeInTheDocument();

        rerender(<Pagination currentPage={2} totalPages={3} searchParams={{}} />);
        expect(screen.getByRole("link", {name: "صفحه قبل"})).toBeInTheDocument();
        expect(screen.queryByRole("link", {name: "صفحه بعد"})).not.toBeInTheDocument();
    });

    it("shows an ellipsis when the range is truncated", () => {
        render(<Pagination currentPage={5} totalPages={10} searchParams={{}} />);

        expect(screen.getAllByText("…")).toHaveLength(2);
    });
});

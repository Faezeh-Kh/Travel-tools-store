import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {ProductDetailsPanel} from "./ProductDetailsPanel";

const specifications = {"وزن": "۲.۸ کیلوگرم", "ظرفیت": "۳ نفر"};
const description = "چادری سبک و ضدآب برای کوهنوردی و کمپینگ سه نفره.";

describe("ProductDetailsPanel", () => {
    it("shows the description and specifications, each with their own heading", () => {
        render(<ProductDetailsPanel description={description} specifications={specifications} />);

        expect(screen.getByRole("region", {name: "توضیحات"})).toHaveTextContent(description);
        const specsRegion = screen.getByRole("region", {name: "مشخصات"});
        expect(specsRegion).toHaveTextContent("وزن۲.۸ کیلوگرم");
        expect(specsRegion).toHaveTextContent("ظرفیت۳ نفر");
    });

    it("shows only the parts that the product has", () => {
        render(<ProductDetailsPanel description={description} specifications={{}} />);

        expect(screen.getByRole("region", {name: "توضیحات"})).toBeInTheDocument();
        expect(screen.queryByRole("region", {name: "مشخصات"})).not.toBeInTheDocument();
    });

    it("renders nothing when the product has neither a description nor specifications", () => {
        const {container} = render(<ProductDetailsPanel description="" specifications={{}} />);

        expect(container).toBeEmptyDOMElement();
    });
});

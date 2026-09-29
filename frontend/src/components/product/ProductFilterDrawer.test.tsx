import {beforeAll, describe, expect, it} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {ProductFilterDrawer} from "./ProductFilterDrawer";

// jsdom does not implement the modal dialog methods; these stand-ins only toggle the `open` state they control.
beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.open = true;
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event("close"));
    };
});

function renderDrawer(activeFilterCount = 0) {
    return render(
        <ProductFilterDrawer activeFilterCount={activeFilterCount}>
            <form onSubmit={(event) => event.preventDefault()}>
                <label>
                    <input type="checkbox" name="inStock" value="true" />
                    فقط کالاهای موجود
                </label>
                <button type="submit">مشاهده نتایج</button>
            </form>
        </ProductFilterDrawer>,
    );
}

function dialogOf(container: HTMLElement): HTMLDialogElement {
    return container.querySelector("dialog")!;
}

describe("ProductFilterDrawer", () => {
    it("labels the button with the number of active filters, if any", () => {
        const {unmount} = renderDrawer(0);
        expect(screen.getByRole("button", {name: "فیلترها"})).toBeInTheDocument();
        unmount();

        renderDrawer(2);
        expect(screen.getByRole("button", {name: "فیلترها (۲)"})).toBeInTheDocument();
    });

    it("starts closed and opens the drawer when the button is clicked", () => {
        const {container} = renderDrawer();
        expect(dialogOf(container).open).toBe(false);

        fireEvent.click(screen.getByRole("button", {name: "فیلترها"}));
        expect(dialogOf(container).open).toBe(true);
    });

    it("closes with the close button", () => {
        const {container} = renderDrawer();
        fireEvent.click(screen.getByRole("button", {name: "فیلترها"}));

        fireEvent.click(screen.getByRole("button", {name: "بستن"}));
        expect(dialogOf(container).open).toBe(false);
    });

    it("closes when the filter form inside it is submitted", () => {
        const {container} = renderDrawer();
        fireEvent.click(screen.getByRole("button", {name: "فیلترها"}));

        fireEvent.click(screen.getByRole("button", {name: "مشاهده نتایج"}));
        expect(dialogOf(container).open).toBe(false);
    });

    it("discards unapplied choices when closed without applying", () => {
        renderDrawer();
        fireEvent.click(screen.getByRole("button", {name: "فیلترها"}));
        fireEvent.click(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"}));
        expect(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"})).toBeChecked();

        fireEvent.click(screen.getByRole("button", {name: "بستن"}));
        fireEvent.click(screen.getByRole("button", {name: "فیلترها"}));

        expect(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"})).not.toBeChecked();
    });
});

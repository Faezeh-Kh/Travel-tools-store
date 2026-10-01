import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import ContactPage from "./page";

describe("ContactPage", () => {
    it("shows the shop address", () => {
        render(<ContactPage />);

        expect(screen.getByText("سمنان، شاهرود، میدان امام، پاساژ ونوس، طبقه سوم")).toBeInTheDocument();
    });

    it("links the phone card to a call", () => {
        render(<ContactPage />);

        expect(screen.getByRole("link", {name: /تلفن تماس/})).toHaveAttribute("href", "tel:+989307350368");
    });

    it("links the email card to a new email", () => {
        render(<ContactPage />);

        expect(screen.getByRole("link", {name: /ایمیل/})).toHaveAttribute("href", "mailto:khorram.faezeh@gmail.com");
    });

    it("opens the Telegram card in a new tab without giving it access to this page", () => {
        render(<ContactPage />);
        const telegram = screen.getByRole("link", {name: /تلگرام/});

        expect(telegram).toHaveAttribute("href", "https://t.me/abzarsafar62");
        expect(telegram).toHaveAttribute("target", "_blank");
        expect(telegram).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("keeps the call and email cards in the same tab", () => {
        render(<ContactPage />);

        expect(screen.getByRole("link", {name: /تلفن تماس/})).not.toHaveAttribute("target");
        expect(screen.getByRole("link", {name: /ایمیل/})).not.toHaveAttribute("target");
    });

    it("embeds an OpenStreetMap map with a marker on the shop's location", () => {
        render(<ContactPage />);
        const map = screen.getByTitle("نقشه موقعیت فروشگاه");
        const url = new URL(map.getAttribute("src")!);

        expect(url.origin + url.pathname).toBe("https://www.openstreetmap.org/export/embed.html");
        expect(url.searchParams.get("marker")).toBe("36.4238444873952,54.96796526934596");
        const [minLon, minLat, maxLon, maxLat] = url.searchParams.get("bbox")!.split(",").map(Number);
        expect(minLon).toBeLessThan(54.96796526934596);
        expect(maxLon).toBeGreaterThan(54.96796526934596);
        expect(minLat).toBeLessThan(36.4238444873952);
        expect(maxLat).toBeGreaterThan(36.4238444873952);
    });

    it("links to the shop in Neshan for directions, in a new tab", () => {
        render(<ContactPage />);
        const neshan = screen.getByRole("link", {name: "مسیریابی با نشان"});

        expect(neshan).toHaveAttribute("href", "https://nshn.ir/ae_b1wwMyGy3PV");
        expect(neshan).toHaveAttribute("target", "_blank");
        expect(neshan).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("lists the opening days, with no Friday morning shift, and the opening hours", () => {
        render(<ContactPage />);
        const hours = screen.getByRole("region", {name: "ساعات کاری"});

        expect(hours).toHaveTextContent("هر روز به جز تعطیلات رسمی");
        expect(hours).toHaveTextContent("صبح:۹:۳۰ تا ۱۳:۰۰ (به جز جمعه‌ها)");
        expect(hours).toHaveTextContent("عصر:۱۷:۰۰ تا ۲۱:۰۰");
    });
});

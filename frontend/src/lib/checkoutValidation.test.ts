import {describe, expect, it} from "vitest";
import type {PlaceOrderRequest} from "@/lib/api/types";
import {
    MAX_LENGTHS,
    normalizeDigits,
    PHONE_NUMBER_MESSAGE,
    POSTAL_CODE_MESSAGE,
    SERVER_REJECTION_MESSAGES,
    validateCheckout,
} from "./checkoutValidation";

const validValues: PlaceOrderRequest = {
    firstName: "سارا",
    lastName: "محمدی",
    phoneNumber: "09121234567",
    address: "خیابان آزادی، پلاک ۱۰",
    city: "تهران",
    postalCode: "1234567890",
    notes: "",
};

describe("normalizeDigits", () => {
    it("converts Persian and Arabic digits and drops spaces and hyphens", () => {
        expect(normalizeDigits("۰۹۱۲ ۱۲۳-۴۵۶۷")).toBe("09121234567");
        expect(normalizeDigits("٠٩١٢١٢٣٤٥٦٧")).toBe("09121234567");
    });

    it("leaves other characters in place so they still fail validation", () => {
        expect(normalizeDigits("0912abc")).toBe("0912abc");
    });
});

describe("validateCheckout", () => {
    it("accepts complete, well-formed details with empty notes", () => {
        expect(validateCheckout(validValues)).toEqual({});
    });

    it("accepts a phone number and postal code typed with Persian digits and separators", () => {
        const errors = validateCheckout({...validValues, phoneNumber: "۰۹۱۲ ۱۲۳ ۴۵۶۷", postalCode: "۱۲۳۴۵-۶۷۸۹۰"});

        expect(errors).toEqual({});
    });

    it("reports every required field that is empty or only whitespace, but not notes", () => {
        const errors = validateCheckout({
            firstName: "",
            lastName: "   ",
            phoneNumber: "",
            address: "",
            city: "",
            postalCode: "",
            notes: "",
        });

        expect(Object.keys(errors).sort()).toEqual(
            ["address", "city", "firstName", "lastName", "phoneNumber", "postalCode"],
        );
        expect(errors.phoneNumber).toBe("لطفاً شماره موبایل را وارد کنید.");
    });

    it.each([
        ["too short", "0912123456"],
        ["too long", "091212345678"],
        ["not starting with 09", "08121234567"],
        ["containing letters", "0912123456a"],
    ])("rejects a phone number that is %s", (_, phoneNumber) => {
        expect(validateCheckout({...validValues, phoneNumber})).toEqual({phoneNumber: PHONE_NUMBER_MESSAGE});
    });

    it.each([
        ["9 digits", "123456789"],
        ["11 digits", "12345678901"],
        ["containing letters", "12345abcde"],
    ])("rejects a postal code of %s", (_, postalCode) => {
        expect(validateCheckout({...validValues, postalCode})).toEqual({postalCode: POSTAL_CODE_MESSAGE});
    });
    // Persian and English letters, a combining mark (the shadda in "محمّد"), spaces between words, and the
    // zero-width non-joiner inside a Persian word. Surrounding spaces are ignored, as the backend strips them.
    it.each(["محمّد", "Ali", "بندر انزلی", "عبدالله\u200Cزاده", " علی "])(
        "accepts %s as a first name, last name, and city",
        (value) => {
            expect(validateCheckout({...validValues, firstName: value, lastName: value, city: value})).toEqual({});
        },
    );

    it.each(["علی2", "علی۲", "Ali!", "علی-رضا", "<b>Ali</b>", "Ali_1"])(
        "rejects %s as a first name, last name, or city",
        (value) => {
            expect(validateCheckout({...validValues, firstName: value, lastName: value, city: value})).toEqual({
                firstName: "نام فقط می‌تواند شامل حروف باشد.",
                lastName: "نام خانوادگی فقط می‌تواند شامل حروف باشد.",
                city: "نام شهر فقط می‌تواند شامل حروف باشد.",
            });
        },
    );

    it("reports an empty name as missing, not as containing non-letters", () => {
        expect(validateCheckout({...validValues, firstName: "  "})).toEqual({firstName: "لطفاً نام را وارد کنید."});
    });

    it("accepts digits and punctuation in the address", () => {
        expect(validateCheckout({...validValues, address: "خیابان آزادی، پلاک ۱۰، واحد 3-B"})).toEqual({});
    });
});

describe("SERVER_REJECTION_MESSAGES", () => {
    it.each(["firstName", "lastName", "address", "city", "notes"] as const)(
        "states the %s length limit from MAX_LENGTHS",
        (field) => {
            expect(SERVER_REJECTION_MESSAGES[field]).toContain(MAX_LENGTHS[field].toLocaleString("fa-IR"));
        },
    );

    it.each(["firstName", "lastName", "city"] as const)("says %s may only contain letters", (field) => {
        expect(SERVER_REJECTION_MESSAGES[field]).toContain("فقط با حروف");
    });

    it("describes phone number and postal code by their format, as the client-side check does", () => {
        expect(SERVER_REJECTION_MESSAGES.phoneNumber).toBe(PHONE_NUMBER_MESSAGE);
        expect(SERVER_REJECTION_MESSAGES.postalCode).toBe(POSTAL_CODE_MESSAGE);
    });
});

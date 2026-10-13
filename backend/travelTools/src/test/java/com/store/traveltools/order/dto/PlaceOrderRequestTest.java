package com.store.traveltools.order.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

// The request's own rules: input normalization (compact constructor) and Bean Validation, checked directly
// with a Validator. OrderControllerTest only checks that the endpoint applies them and how a 400 looks.
class PlaceOrderRequestTest {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    private static PlaceOrderRequest valid() {
        return new PlaceOrderRequest("علی", "رضایی", "09121234567", "خیابان آزادی، پلاک ۱۰", "تهران",
                "1234567890", "زنگ نزنید");
    }

    // A valid request with one field replaced, so each test can only fail on the field it targets.
    private static PlaceOrderRequest validWith(String field, String value) {
        PlaceOrderRequest r = valid();
        return switch (field) {
            case "firstName" -> new PlaceOrderRequest(value, r.lastName(), r.phoneNumber(), r.address(), r.city(),
                    r.postalCode(), r.notes());
            case "lastName" -> new PlaceOrderRequest(r.firstName(), value, r.phoneNumber(), r.address(), r.city(),
                    r.postalCode(), r.notes());
            case "phoneNumber" -> new PlaceOrderRequest(r.firstName(), r.lastName(), value, r.address(), r.city(),
                    r.postalCode(), r.notes());
            case "address" -> new PlaceOrderRequest(r.firstName(), r.lastName(), r.phoneNumber(), value, r.city(),
                    r.postalCode(), r.notes());
            case "city" -> new PlaceOrderRequest(r.firstName(), r.lastName(), r.phoneNumber(), r.address(), value,
                    r.postalCode(), r.notes());
            case "postalCode" -> new PlaceOrderRequest(r.firstName(), r.lastName(), r.phoneNumber(), r.address(),
                    r.city(), value, r.notes());
            case "notes" -> new PlaceOrderRequest(r.firstName(), r.lastName(), r.phoneNumber(), r.address(),
                    r.city(), r.postalCode(), value);
            default -> throw new IllegalArgumentException(field);
        };
    }

    private static Set<String> invalidFields(PlaceOrderRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    @Test
    void validRequest_hasNoViolations() {
        assertThat(invalidFields(valid())).isEmpty();
    }

    @Test
    void textFields_areStrippedOfSurroundingWhitespace() {
        PlaceOrderRequest request = new PlaceOrderRequest("  علی ", "\tرضایی", "09121234567", " آدرس \n", " تهران ",
                "1234567890", "  زنگ نزنید  ");

        assertThat(request.firstName()).isEqualTo("علی");
        assertThat(request.lastName()).isEqualTo("رضایی");
        assertThat(request.address()).isEqualTo("آدرس");
        assertThat(request.city()).isEqualTo("تهران");
        assertThat(request.notes()).isEqualTo("زنگ نزنید");
    }

    @Test
    void phoneNumberAndPostalCode_acceptPersianAndArabicDigitsSpacesAndHyphens() {
        // Persian digits with spaces in the phone number; Arabic-Indic digits with a hyphen in the postal code.
        PlaceOrderRequest request = validWith("phoneNumber", " ۰۹۱۲ ۱۲۳ ۴۵۶۷ ");
        PlaceOrderRequest withPostalCode = validWith("postalCode", "١٢٣٤٥-٦٧٨٩٠");

        assertThat(request.phoneNumber()).isEqualTo("09121234567");
        assertThat(withPostalCode.postalCode()).isEqualTo("1234567890");
        assertThat(invalidFields(request)).isEmpty();
        assertThat(invalidFields(withPostalCode)).isEmpty();
    }

    @Test
    void missingFields_stayNullAndOnlyNotesMayBeMissing() {
        PlaceOrderRequest request = new PlaceOrderRequest(null, null, null, null, null, null, null);

        assertThat(request.notes()).isNull();
        assertThat(invalidFields(request))
                .containsExactlyInAnyOrder("firstName", "lastName", "phoneNumber", "address", "city", "postalCode");
    }

    @ParameterizedTest
    @ValueSource(strings = {"firstName", "lastName", "phoneNumber", "address", "city", "postalCode"})
    void blankRequiredField_isInvalid(String field) {
        assertThat(invalidFields(validWith(field, "   "))).containsExactly(field);
    }

    @ParameterizedTest
    @ValueSource(strings = {"9121234567", "0912123456", "091212345678", "08121234567", "0912abc4567", "+989121234567"})
    void phoneNumberThatIsNotAnIranianMobileNumber_isInvalid(String phoneNumber) {
        assertThat(invalidFields(validWith("phoneNumber", phoneNumber))).containsExactly("phoneNumber");
    }

    @ParameterizedTest
    @ValueSource(strings = {"123456789", "12345678901", "12345abcde"})
    void postalCodeThatIsNotTenDigits_isInvalid(String postalCode) {
        assertThat(invalidFields(validWith("postalCode", postalCode))).containsExactly("postalCode");
    }

    // Each limit matches its V6 column: exactly the limit passes, one character more fails.
    @ParameterizedTest
    @CsvSource({"firstName, 100", "lastName, 100", "address, 500", "city, 100", "notes, 1000"})
    void textField_acceptsItsMaximumLengthAndRejectsOneMore(String field, int maxLength) {
        assertThat(invalidFields(validWith(field, "a".repeat(maxLength)))).isEmpty();
        assertThat(invalidFields(validWith(field, "a".repeat(maxLength + 1)))).containsExactly(field);
    }
}

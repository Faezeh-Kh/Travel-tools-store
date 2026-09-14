package com.store.traveltools.common;

import java.time.Instant;
import java.util.List;

import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.store.traveltools.common.dto.ErrorResponse;
import com.store.traveltools.common.exception.NotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Object> handleNotFound(NotFoundException ex) {
        ErrorResponse body = new ErrorResponse(Instant.now(), 404, "NOT_FOUND", ex.getMessage(), List.of());
        return ResponseEntity.status(404).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpected(Exception ex) {
        ErrorResponse body = new ErrorResponse(
                Instant.now(), 500, "INTERNAL_ERROR", "An unexpected error occurred.", List.of());
        return ResponseEntity.status(500).body(body);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, @Nullable Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now(), statusCode.value(), "REQUEST_ERROR", "The request could not be processed.", List.of());
        return super.handleExceptionInternal(ex, errorResponse, headers, statusCode, request);
    }
}

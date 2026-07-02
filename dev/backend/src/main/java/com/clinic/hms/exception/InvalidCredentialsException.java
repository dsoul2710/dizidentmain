package com.clinic.hms.exception;

public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
        super("Invalid mobile or password");
    }
}

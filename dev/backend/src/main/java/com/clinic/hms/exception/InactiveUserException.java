package com.clinic.hms.exception;

public class InactiveUserException extends RuntimeException {
    public InactiveUserException() {
        super("User is inactive");
    }
}

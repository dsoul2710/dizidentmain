// src/main/java/com/clinic/hms/util/TimeFormatUtil.java
package com.clinic.hms.utill;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class TimeFormatUtil {

    private static final DateTimeFormatter FORMAT_12 =
            DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);

    public static LocalTime parseSlot(String slot) {
        return LocalTime.parse(slot.toUpperCase(Locale.ENGLISH), FORMAT_12);
    }

    public static String formatSlot(LocalTime time) {
        return time.format(FORMAT_12);
    }
}

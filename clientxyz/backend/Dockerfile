# Multi-stage build for Spring Boot
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

# Copy gradle files
COPY gradle ./gradle
COPY gradlew ./
COPY gradlew.bat ./
COPY build.gradle ./
COPY settings.gradle ./

# Download dependencies
RUN ./gradlew dependencies --no-daemon || true

# Copy source code
COPY src ./src

# Build the application
RUN ./gradlew bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the built jar
COPY --from=builder /app/build/libs/*.jar app.jar

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

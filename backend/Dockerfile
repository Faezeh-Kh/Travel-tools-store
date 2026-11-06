# Stage 1: Build the application
FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

# Copy Maven configuration first
COPY pom.xml mvnw ./
COPY .mvn/ .mvn/

# Ensure the Maven Wrapper is executable
RUN chmod +x mvnw

# Download dependencies in a cacheable layer
RUN ./mvnw dependency:go-offline -B

# Copy application source code
COPY src/ src/

# Compile and package the application
RUN ./mvnw package -DskipTests -B

# Stage 2: Run the application
FROM eclipse-temurin:21-jre

WORKDIR /app

# Create a non-root group and user
RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --no-create-home appuser

# Copy the compiled application from Stage 1
COPY --from=build /app/target/*.jar app.jar

# Switch to the non-root user
USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

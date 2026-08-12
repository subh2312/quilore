# ── Build stage ───────────────────────────────────────────────
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
# Pi/VPS builds often need a longer wrapper download window than the default 10s.
ENV GRADLE_OPTS="-Dorg.gradle.internal.http.connectionTimeout=120000 -Dorg.gradle.internal.http.socketTimeout=120000"
COPY . .
RUN ./gradlew bootJar --no-daemon

# ── Runtime stage ────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

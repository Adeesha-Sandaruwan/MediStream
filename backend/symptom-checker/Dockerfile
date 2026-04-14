FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY . .
RUN mvn -DskipTests clean package
RUN JAR_FILE=$(ls target/*.jar | grep -v 'original' | head -n 1) && cp "$JAR_FILE" app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/app.jar app.jar

EXPOSE 8088
ENTRYPOINT ["java", "-jar", "app.jar"]

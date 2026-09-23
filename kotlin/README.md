# Kotlin Multiplatform Open Location Code library

This is a Kotlin Multiplatform (KMP) port of the [Java implementation](../java) of the
Open Location Code (Plus Codes) library. It converts locations to and from short,
~10 character Plus Codes, offline.

The API mirrors the Java port: the [OpenLocationCode](src/commonMain/kotlin/com/google/openlocationcode/OpenLocationCode.kt)
class with the same constructors, `encode`, `decode`, `shorten`, `recover`, `contains` and
validity methods. Tests are ported from the Java implementation as well, with the
`test_data/*.csv` vectors embedded directly so they run on every target.

## Targets

- JVM (Java 21)
- JavaScript (Node.js and browsers)
- Native: Linux x64/arm64, macOS arm64, Windows MinGW x64

## Usage

Add this in your root `build.gradle` at the end of the repositories section:

```kotlin
allprojects {
    repositories {
        ...
        maven("https://jitpack.io")
    }
}
```

Now actually add the dependency:

```kotlin
dependencies {
    implementation("com.github.google:open-location-code:LATEST_GIT_HASH")
}
```

For other build tools have a look at [JitPack](https://jitpack.io/#google/open-location-code).

## Building and testing

From the `kotlin` folder, run:

```
$ ./gradlew build
```

This compiles the library for all enabled targets and runs the tests. To run the tests for a
single target, e.g. the JVM:

```
$ ./gradlew jvmTest
```

## Publishing locally

```
$ ./gradlew publishToMavenLocal
```

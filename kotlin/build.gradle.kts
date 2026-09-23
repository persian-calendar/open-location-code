import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.targets.js.testing.KotlinJsTest

plugins {
    kotlin("multiplatform") version "2.4.20"
    `maven-publish`
}

group = (findProperty("group") as? String) ?: "com.google.openlocationcode"
version = (findProperty("version") as? String) ?: "1.0.4"

repositories {
    mavenCentral()
}

kotlin {
    jvmToolchain(21)

    jvm {
        compilerOptions {
            jvmTarget = JvmTarget.JVM_21
        }
    }

    js {
        nodejs()
        browser()
    }

    wasmJs {
        browser()
    }

    linuxArm64()
    linuxX64()
    macosArm64()
    mingwX64()

    iosArm64()
    iosSimulatorArm64()
    tvosArm64()
    tvosSimulatorArm64()
    watchosArm64()
    watchosDeviceArm64()
    watchosSimulatorArm64()

    sourceSets {
        commonTest.dependencies {
            implementation(kotlin("test"))
        }
    }
}

tasks.withType<org.gradle.api.tasks.testing.AbstractTestTask>().configureEach {
    testLogging {
        showStandardStreams = true
    }
}

// The benchmark test loops a million times, which on JS easily exceeds Mocha's
// default 2 second timeout.
tasks.withType<KotlinJsTest>().configureEach {
    useMocha {
        timeout = "300s"
    }
}

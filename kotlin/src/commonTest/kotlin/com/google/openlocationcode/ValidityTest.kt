package com.google.openlocationcode

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Tests methods [OpenLocationCode.isValidCode], [OpenLocationCode.isShortCode] and
 * [OpenLocationCode.isFullCode] of Open Location Code.
 */
class ValidityTest {

    private class TestData(line: String) {
        val code: String
        val isValid: Boolean
        val isShort: Boolean
        val isFull: Boolean

        init {
            val parts = line.split(",")
            require(parts.size == 4) { "Wrong format of testing data." }
            code = parts[0]
            isValid = parts[1].toBoolean()
            isShort = parts[2].toBoolean()
            isFull = parts[3].toBoolean()
        }
    }

    private val testDataList =
        VALIDITY_TEST_DATA.lines().filter { !it.startsWith("#") }.map { TestData(it) }

    @Test
    fun testIsValid() {
        for (testData in testDataList) {
            assertEquals(
                testData.isValid,
                OpenLocationCode.isValidCode(testData.code),
                "Validity of code ${testData.code} is wrong.",
            )
        }
    }

    @Test
    fun testIsShort() {
        for (testData in testDataList) {
            assertEquals(
                testData.isShort,
                OpenLocationCode.isShortCode(testData.code),
                "Shortness of code ${testData.code} is wrong.",
            )
        }
    }

    @Test
    fun testIsFull() {
        for (testData in testDataList) {
            assertEquals(
                testData.isFull,
                OpenLocationCode.isFullCode(testData.code),
                "Fullness of code ${testData.code} is wrong.",
            )
        }
    }
}

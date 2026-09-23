package com.google.openlocationcode

import kotlin.test.Test
import kotlin.test.assertEquals

/** Tests shortening functionality of Open Location Code. */
class ShorteningTest {

    private class TestData(line: String) {
        val code: String
        val referenceLatitude: Double
        val referenceLongitude: Double
        val shortCode: String
        val testType: String

        init {
            val parts = line.split(",")
            require(parts.size == 5) { "Wrong format of testing data." }
            code = parts[0]
            referenceLatitude = parts[1].toDouble()
            referenceLongitude = parts[2].toDouble()
            shortCode = parts[3]
            testType = parts[4]
        }
    }

    private val testDataList =
        SHORTENING_TEST_DATA.lines().filter { !it.startsWith("#") }.map { TestData(it) }

    @Test
    fun testShortening() {
        for (testData in testDataList) {
            if (testData.testType != "B" && testData.testType != "S") {
                continue
            }
            val olc = OpenLocationCode(testData.code)
            val shortened = olc.shorten(testData.referenceLatitude, testData.referenceLongitude)
            assertEquals(
                testData.shortCode,
                shortened.code,
                "Wrong shortening of code ${testData.code}",
            )
        }
    }

    @Test
    fun testRecovering() {
        for (testData in testDataList) {
            if (testData.testType != "B" && testData.testType != "R") {
                continue
            }
            val olc = OpenLocationCode(testData.shortCode)
            val recovered = olc.recover(testData.referenceLatitude, testData.referenceLongitude)
            assertEquals(testData.code, recovered.code)
        }
    }
}

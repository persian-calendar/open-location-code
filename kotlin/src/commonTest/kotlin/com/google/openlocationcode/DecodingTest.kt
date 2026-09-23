package com.google.openlocationcode

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Tests encoding and decoding between Open Location Code and latitude/longitude pair. */
class DecodingTest {

    private class TestData(line: String) {
        val code: String
        val length: Int
        val decodedLatitudeLo: Double
        val decodedLongitudeLo: Double
        val decodedLatitudeHi: Double
        val decodedLongitudeHi: Double

        init {
            val parts = line.split(",")
            require(parts.size == 6) { "Wrong format of testing data." }
            code = parts[0]
            length = parts[1].toInt()
            decodedLatitudeLo = parts[2].toDouble()
            decodedLongitudeLo = parts[3].toDouble()
            decodedLatitudeHi = parts[4].toDouble()
            decodedLongitudeHi = parts[5].toDouble()
        }
    }

    private val testDataList =
        DECODING_TEST_DATA.lines().filter { !it.startsWith("#") }.map { TestData(it) }

    @Test
    fun testDecode() {
        for (testData in testDataList) {
            val decoded = OpenLocationCode(testData.code).decode()

            assertEquals(
                testData.length,
                decoded.length,
                "Wrong length for code ${testData.code}",
            )
            assertEquals(
                testData.decodedLatitudeLo,
                decoded.southLatitude,
                PRECISION,
                "Wrong low latitude for code ${testData.code}",
            )
            assertEquals(
                testData.decodedLatitudeHi,
                decoded.northLatitude,
                PRECISION,
                "Wrong high latitude for code ${testData.code}",
            )
            assertEquals(
                testData.decodedLongitudeLo,
                decoded.westLongitude,
                PRECISION,
                "Wrong low longitude for code ${testData.code}",
            )
            assertEquals(
                testData.decodedLongitudeHi,
                decoded.eastLongitude,
                PRECISION,
                "Wrong high longitude for code ${testData.code}",
            )
        }
    }

    @Test
    fun testContains() {
        for (testData in testDataList) {
            val olc = OpenLocationCode(testData.code)
            val decoded = olc.decode()
            assertTrue(
                olc.contains(decoded.centerLatitude, decoded.centerLongitude),
                "Containment relation is broken for the decoded middle point of code ${testData.code}",
            )
            assertTrue(
                olc.contains(decoded.southLatitude, decoded.westLongitude),
                "Containment relation is broken for the decoded bottom left corner of code ${testData.code}",
            )
            assertFalse(
                olc.contains(decoded.northLatitude, decoded.eastLongitude),
                "Containment relation is broken for the decoded top right corner of code ${testData.code}",
            )
            assertFalse(
                olc.contains(decoded.southLatitude, decoded.eastLongitude),
                "Containment relation is broken for the decoded bottom right corner of code ${testData.code}",
            )
            assertFalse(
                olc.contains(decoded.northLatitude, decoded.westLongitude),
                "Containment relation is broken for the decoded top left corner of code ${testData.code}",
            )
        }
    }

    companion object {
        private const val PRECISION = 1e-10
    }
}

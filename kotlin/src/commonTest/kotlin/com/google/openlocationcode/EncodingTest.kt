package com.google.openlocationcode

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Tests encoding and decoding between Open Location Code and latitude/longitude pair. */
class EncodingTest {

    private class TestData(line: String) {
        val latitudeDegrees: Double
        val longitudeDegrees: Double
        val latitudeInteger: Long
        val longitudeInteger: Long
        val length: Int
        val code: String

        init {
            val parts = line.split(",")
            require(parts.size == 6) { "Wrong format of testing data." }
            latitudeDegrees = parts[0].toDouble()
            longitudeDegrees = parts[1].toDouble()
            latitudeInteger = parts[2].toLong()
            longitudeInteger = parts[3].toLong()
            length = parts[4].toInt()
            code = parts[5]
        }
    }

    private val testDataList =
        ENCODING_TEST_DATA.lines()
            .filter { !it.startsWith("#") && it.isNotEmpty() }
            .map { TestData(it) }

    @Test
    fun testEncodeFromDegrees() {
        val allowedErrorRate = 0.05
        var failedEncodings = 0
        for (testData in testDataList) {
            val got =
                OpenLocationCode.encode(
                    testData.latitudeDegrees,
                    testData.longitudeDegrees,
                    testData.length,
                )
            if (testData.code != got) {
                failedEncodings++
                println(
                    "ENCODING DIFFERENCE: encode(" +
                        "${testData.latitudeDegrees},${testData.longitudeDegrees}," +
                        "${testData.length}) got $got, want ${testData.code}",
                )
            }
        }
        val gotRate = failedEncodings.toDouble() / testDataList.size.toDouble()
        assertTrue(
            gotRate <= allowedErrorRate,
            "Too many encoding errors (actual rate $gotRate, allowed rate $allowedErrorRate), " +
                "see ENCODING DIFFERENCE lines",
        )
    }

    @Test
    fun testDegreesToIntegers() {
        for (testData in testDataList) {
            val got =
                OpenLocationCode.degreesToIntegers(
                    testData.latitudeDegrees,
                    testData.longitudeDegrees,
                )
            assertTrue(
                got[0] == testData.latitudeInteger || got[0] == testData.latitudeInteger - 1,
                "degreesToIntegers(${testData.latitudeDegrees}, ${testData.longitudeDegrees}) " +
                    "returned latitude ${got[0]}, expected ${testData.latitudeInteger}",
            )
            assertTrue(
                got[1] == testData.longitudeInteger || got[1] == testData.longitudeInteger - 1,
                "degreesToIntegers(${testData.latitudeDegrees}, ${testData.longitudeDegrees}) " +
                    "returned longitude ${got[1]}, expected ${testData.longitudeInteger}",
            )
        }
    }

    @Test
    fun testEncodeFromIntegers() {
        for (testData in testDataList) {
            assertEquals(
                testData.code,
                OpenLocationCode.encodeIntegers(
                    testData.latitudeInteger,
                    testData.longitudeInteger,
                    testData.length,
                ),
                "Latitude ${testData.latitudeInteger}, longitude ${testData.longitudeInteger} " +
                    "and length ${testData.length} were wrongly encoded.",
            )
        }
    }
}

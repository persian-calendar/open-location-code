package com.google.openlocationcode

import kotlin.random.Random
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.time.measureTime

/** Benchmark the encode and decode methods. */
class BenchmarkTest {

    private class TestData(generator: Random) {
        val latitude: Double
        val longitude: Double
        val length: Int
        val code: String

        init {
            latitude = generator.nextDouble() * 180 - 90
            longitude = generator.nextDouble() * 360 - 180
            var length = generator.nextInt(11) + 4
            if (length < 10 && length % 2 == 1) {
                length += 1
            }
            this.length = length
            code = OpenLocationCode.encode(latitude, longitude, length)
        }
    }

    private val testDataList = mutableListOf<TestData>()

    @BeforeTest
    fun setUp() {
        testDataList.clear()
        repeat(LOOPS) { testDataList.add(TestData(generator)) }
    }

    @Test
    fun benchmarkEncode() {
        val elapsed = measureTime {
            for (testData in testDataList) {
                OpenLocationCode.encode(testData.latitude, testData.longitude, testData.length)
            }
        }
        val microsecs = elapsed.inWholeMicroseconds
        println(
            "Encode $LOOPS loops in $microsecs usecs, ${microsecs.toDouble() / LOOPS} usec per call",
        )
    }

    @Test
    fun benchmarkDecode() {
        val elapsed = measureTime {
            for (testData in testDataList) {
                OpenLocationCode.decode(testData.code)
            }
        }
        val microsecs = elapsed.inWholeMicroseconds
        println(
            "Decode $LOOPS loops in $microsecs usecs, ${microsecs.toDouble() / LOOPS} usec per call",
        )
    }

    companion object {
        private const val LOOPS = 1000000
        private val generator = Random.Default
    }
}

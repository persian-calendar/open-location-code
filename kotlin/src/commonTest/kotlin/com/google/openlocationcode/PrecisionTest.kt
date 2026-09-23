package com.google.openlocationcode

import kotlin.test.Test
import kotlin.test.assertEquals

/** Tests size of rectangles defined by Plus Codes of various size. */
class PrecisionTest {

    @Test
    fun testWidthInDegrees() {
        assertEquals(OpenLocationCode("67000000+").decode().longitudeWidth, 20.0, EPSILON)
        assertEquals(OpenLocationCode("67890000+").decode().longitudeWidth, 1.0, EPSILON)
        assertEquals(OpenLocationCode("6789CF00+").decode().longitudeWidth, 0.05, EPSILON)
        assertEquals(OpenLocationCode("6789CFGH+").decode().longitudeWidth, 0.0025, EPSILON)
        assertEquals(OpenLocationCode("6789CFGH+JM").decode().longitudeWidth, 0.000125, EPSILON)
        assertEquals(OpenLocationCode("6789CFGH+JMP").decode().longitudeWidth, 0.00003125, EPSILON)
    }

    @Test
    fun testHeightInDegrees() {
        assertEquals(OpenLocationCode("67000000+").decode().latitudeHeight, 20.0, EPSILON)
        assertEquals(OpenLocationCode("67890000+").decode().latitudeHeight, 1.0, EPSILON)
        assertEquals(OpenLocationCode("6789CF00+").decode().latitudeHeight, 0.05, EPSILON)
        assertEquals(OpenLocationCode("6789CFGH+").decode().latitudeHeight, 0.0025, EPSILON)
        assertEquals(OpenLocationCode("6789CFGH+JM").decode().latitudeHeight, 0.000125, EPSILON)
        assertEquals(OpenLocationCode("6789CFGH+JMP").decode().latitudeHeight, 0.000025, EPSILON)
    }

    companion object {
        private const val EPSILON = 1e-10
    }
}

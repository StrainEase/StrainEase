package ai.strainease.app.data

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM unit tests for the request-side wire conversion
 * ([JsonElement.toWire]) that [LiveStrainAPI] uses before handing a
 * payload to the Firebase Functions SDK. The SDK's `Serializer`
 * rejects kotlinx JsonElement trees with "Object cannot be encoded
 * in JSON", so every Cloud Function call must convert to plain
 * Map / List / String / Number / Boolean values first.
 */
class LiveStrainAPIWireTest {

    @Test
    fun convertsScalarTypesToPlainValues() {
        val wire = buildJsonObject {
            put("name", "Blue Dream")
            put("inKnowledgeBase", true)
            put("intensity", 5)
            put("rating", 4.5)
        }.toWire()

        assertEquals("Blue Dream", wire["name"])
        assertEquals(true, wire["inKnowledgeBase"])
        assertEquals(5, wire["intensity"])
        assertEquals(4.5, wire["rating"])
    }

    @Test
    fun convertsNestedObjectsAndArraysToMapsAndLists() {
        val wire = buildJsonObject {
            put("strain", buildJsonObject {
                put("name", "Blue Dream")
                put("effects", buildJsonArray {
                    add(buildJsonObject {
                        put("name", "Relaxed")
                        put("intensity", 3)
                    })
                })
            })
        }.toWire()

        val strain = wire["strain"] as Map<*, *>
        assertEquals("Blue Dream", strain["name"])
        val effects = strain["effects"] as List<*>
        val first = effects[0] as Map<*, *>
        assertEquals("Relaxed", first["name"])
        assertEquals(3, first["intensity"])
    }

    @Test
    fun convertsNullAndNumbersPrecisely() {
        val wire = buildJsonObject {
            put("nothing", JsonNull)
            put("big", 1_000_000_000)
        }.toWire()

        assertNull(wire["nothing"])
        assertEquals(1_000_000_000, wire["big"])
    }

    @Test
    fun resultIsSdkFriendlyShape() {
        // Everything the SDK's Serializer accepts: Map / List / String /
        // Number / Boolean / null — nothing else.
        val wire = buildJsonObject {
            put("name", "Blue Dream")
        }.toWire()
        assertTrue(wire is Map<*, *>)
        assertTrue(wire!!.values.all { it == null || it is Map<*, *> || it is List<*> || it is String || it is Number || it is Boolean })
    }
}
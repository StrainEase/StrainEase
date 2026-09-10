package ai.strainease.app.util

/**
 * String helpers shared across screens. Kept in a tiny file so
 * the formatting rules can stay in one place: iOS + web already
 * render Title Case ("Chronic Pain" instead of "Chronic pain")
 * for symptoms, effects, and medication names, so Android needs
 * the same treatment to keep the three surfaces in lockstep.
 */

/**
 * Title Case this string. The first letter of every whitespace-
 * separated word is upper-cased, the rest of each word is
 * lower-cased. Empty strings and single-character words are
 * returned as-is.
 *
 *  - "insomnia"               -> "Insomnia"
 *  - "chronic pain"           -> "Chronic Pain"
 *  - "dry mouth"              -> "Dry Mouth"
 *  - "THC 17-23%"             -> "Thc 17-23%"   (acronyms aren't
 *    smart-detected; callers that need acronym preservation
 *    should special-case the input)
 *  - "Relaxed"                -> "Relaxed"      (idempotent)
 *  - ""                       -> ""
 *
 * Used at the display layer for symptoms, effects, side effects,
 * medication names, and ailment labels. Backend payloads stay
 * untouched; we only re-case what the user actually sees.
 */
fun String.toTitleCase(): String =
    split(' ').joinToString(" ") { word ->
        if (word.isEmpty()) {
            word
        } else {
            word.first().uppercaseChar() + word.drop(1).lowercase()
        }
    }

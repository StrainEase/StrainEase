package com.strainwise.app.models

import kotlinx.serialization.Serializable

/**
 * A Reddit thread cited by the AI callables. The wire format
 * matches the iOS `RedditSource` exactly:
 *
 *  - `url`           — old.reddit.com thread URL
 *  - `subreddit`     — bare subreddit name (e.g. "trees")
 *  - `title`         — thread title
 *  - `snippet`       — top-voted reply or OP, trimmed
 *  - `score`         — thread score, can be Int or Double
 *
 * `id` is the URL so the same thread is always the same row in a
 * Compose list, and `link` resolves the URL into a real
 * [android.net.Uri] for the system browser / Reddit app
 * intent.
 */
@Serializable
data class RedditSource(
    val url: String,
    val subreddit: String,
    val title: String,
    val snippet: String? = null,
    val score: Int? = null,
) {
    val id: String get() = url

    /** Caption used in the Reddit threads row, e.g.
     *  "r/trees · 412 pts". */
    val caption: String
        get() = buildString {
            append("r/").append(subreddit)
            if (score != null && score > 0) append(" · ").append(score).append(" pts")
        }
}

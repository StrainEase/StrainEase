package com.strainwise.app.services

import android.content.Context
import coil.ImageLoader
import coil.annotation.ExperimentalCoilApi
import coil.disk.DiskCache
import coil.memory.MemoryCache
import coil.request.CachePolicy
import coil.util.DebugLogger

/**
 * On-device cache for strain images. Direct port of the iOS
 * `StrainImageCache.swift` so the Home rail posters, the strain
 * detail hero, and the `CompareTrayBar` thumbnails render
 * instantly on repeat visits — no Firebase round-trip, no Leafly
 * round-trip — and across app launches.
 *
 * Coil is the Android equivalent of `URLSession + AsyncImage`:
 *  - Coil's memory cache maps to the iOS `URLCache.memoryCapacity`
 *  - Coil's disk cache maps to `URLCache.diskCapacity`
 *  - HTTP `Cache-Control` from Leafly / Firebase Storage is honored
 *    automatically — fresh responses get a 304, stale ones get
 *    conditional revalidation
 *  - The disk cache survives app relaunches because Coil writes to
 *    `cacheDir/image_cache/` by default
 *
 * Memory + disk sizes match the iOS source:
 *  - 32 MB memory
 *  - 256 MB disk (more than enough for the full strain catalog —
 *    most posters are 50-200 KB)
 */
object ImageCache {
    const val MEMORY_BYTES = 32L * 1024 * 1024
    const val DISK_BYTES = 256L * 1024 * 1024
    const val DISK_DIR = "strain_image_cache"

    @Volatile
    private var imageLoader: ImageLoader? = null

    /** Returns the process-wide [ImageLoader] with the StrainEase
     *  cache sizes applied. Idempotent — first call builds the
     *  loader, subsequent calls return the same instance. */
    fun get(context: Context): ImageLoader = imageLoader ?: synchronized(this) {
        imageLoader ?: build(context.applicationContext).also { imageLoader = it }
    }

    /** Wipe the on-device image cache. Useful for tests and for a
     *  future "reset" affordance; not wired into the UI today. */
    @OptIn(ExperimentalCoilApi::class)
    fun clear(context: Context) {
        get(context).diskCache?.clear()
        get(context).memoryCache?.clear()
    }

    @OptIn(ExperimentalCoilApi::class)
    private fun build(appContext: Context): ImageLoader =
        ImageLoader.Builder(appContext)
            .memoryCache {
                MemoryCache.Builder(appContext)
                    .maxSizeBytes(MEMORY_BYTES.toInt())
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(appContext.cacheDir.resolve(DISK_DIR))
                    .maxSizeBytes(DISK_BYTES)
                    .build()
            }
            .memoryCachePolicy(CachePolicy.ENABLED)
            .diskCachePolicy(CachePolicy.ENABLED)
            .networkCachePolicy(CachePolicy.ENABLED)
            .respectCacheHeaders(true)
            .crossfade(true)
            .apply {
                if (com.strainwise.app.BuildConfig.DEBUG) {
                    logger(DebugLogger())
                }
            }
            .build()
}

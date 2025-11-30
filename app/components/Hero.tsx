"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-muted-foreground">AI-Powered Lunar Analysis</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight text-balance">
            Explore the Moon Like <span className="text-amber-400">Never Before</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed text-pretty">
            Advanced AI technology for analyzing lunar terrain, identifying features, and unlocking the secrets of
            Earth&apos;s celestial companion through intelligent scene recognition.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-8 py-4 text-lg font-medium text-black hover:bg-amber-400 transition-colors"
            >
              Start Analyzing
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center rounded-md border border-border bg-transparent px-8 py-4 text-lg font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Learn More
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-border max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground"> - </div>
              <div className="text-sm text-muted-foreground mt-1">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground"> - </div>
              <div className="text-sm text-muted-foreground mt-1">Images Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground"> - </div>
              <div className="text-sm text-muted-foreground mt-1">Avg Response</div>
            </div>
          </div>
        </div>

        {/* Lunar visualization */}
        <div className="mt-20 relative">
          <div className="aspect-video max-w-4xl mx-auto rounded-2xl border border-border bg-card overflow-hidden relative">
            <Image
              src="/terrain_with_craters.jpg"
              alt="Lunar surface analysis preview"
              fill
              className="object-cover opacity-80"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-card/90 backdrop-blur-sm rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-sm text-muted-foreground">Analyzing lunar terrain features...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

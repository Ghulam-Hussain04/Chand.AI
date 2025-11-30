"use client"

import { ArrowRight, Moon } from "lucide-react"
import Link from "next/link"

export default function CTA() {
  return (
    <section className="py-20 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl bg-card border border-border overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative z-10 py-16 md:py-24 px-6 md:px-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-8">
              <Moon className="h-8 w-8 text-amber-400" />
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 max-w-3xl mx-auto text-balance">
              Ready to Explore the Lunar Surface?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Start analyzing lunar images today with our AI-powered platform. Upload your images or explore our curated
              collection.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-8 py-4 text-lg font-medium text-black hover:bg-amber-400 transition-colors"
              >
                Launch Analyzer
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-md border border-border bg-transparent px-8 py-4 text-lg font-medium text-foreground hover:bg-secondary transition-colors"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

"use client";

import { Check } from "lucide-react";
import Image from "next/image";

const capabilities = [
  "Advanced crater detection and classification",
  "Geological feature mapping and analysis",
  "Surface composition identification",
  "Elevation and terrain modeling",
  "Historical landing site recognition",
  "Scientific data export capabilities",
];

export default function About() {
  return (
    <section id="about" className="py-20 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image Side */}
          <div className="relative">
            <div className="aspect-square rounded-2xl overflow-hidden border border-border bg-card">
              <Image
                src="/lunar_surface_img.jpeg"
                alt="Lunar terrain analysis"
                fill
                className="object-cover"
              />
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -right-6 bg-card border border-border rounded-xl p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Check className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Analysis Complete
                  </div>
                  <div className="text-xs text-muted-foreground">
                    23 features detected
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Side */}
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
              Pioneering Lunar Science
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              LunarVision combines state-of-the-art computer vision with deep
              learning models trained on thousands of lunar images. Our platform
              enables researchers, educators, and space enthusiasts to explore
              and understand the Moon&apos;s surface like never before.
            </p>

            {/* Capabilities List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {capabilities.map((capability, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-amber-400" />
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {capability}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

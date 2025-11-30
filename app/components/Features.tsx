"use client"

import { Scan, MessageSquare, Layers, Zap, Globe, Shield } from "lucide-react"

const features = [
  {
    icon: Scan,
    title: "Terrain Recognition",
    description: "Identify craters, maria, highlands, and other lunar geological features with precision.",
  },
  {
    icon: MessageSquare,
    title: "Interactive Chat",
    description: "Ask questions about lunar images and receive detailed AI-powered explanations.",
  },
  {
    icon: Layers,
    title: "Multi-layer Analysis",
    description: "Analyze surface composition, elevation data, and thermal properties simultaneously.",
  },
  {
    icon: Zap,
    title: "Real-time Processing",
    description: "Get instant results with our optimized neural network architecture.",
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Access analysis data for any region of the lunar surface.",
  },
  {
    icon: Shield,
    title: "Research Grade",
    description: "Trusted by researchers and space agencies for accurate scientific data.",
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            Powerful Analysis Capabilities
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Everything you need to understand and analyze lunar terrain with cutting-edge AI technology.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-card border border-border hover:border-accent/50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/30 transition-colors">
                <feature.icon className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

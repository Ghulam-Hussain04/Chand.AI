"use client"

import Navbar from "./components/Navbar"
import Hero from "./components/Hero"
import Features from "./components/Features"
import About from "./components/About"
import Developers from "./components/Developers"
import CTA from "./components/CTA"
import Footer from "./components/Footer"
import { create, all } from "mathjs"

// CRREATING A MATH INSTANCE
const math = create(all)

export default function Home() {
  return (
    <div className="font-sans bg-background text-foreground min-h-screen scroll-smooth relative overflow-hidden">
      {/* Starfield background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-foreground/60 rounded-full animate-twinkle"
            style={{
              left: `${math.random() * 100}%`,
              top: `${math.random() * 100}%`,
              animationDelay: `${math.random() * 3}s`,
              animationDuration: `${2 + math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Features />
        <About />
        <Developers />
        <CTA />
        <Footer />
      </div>
    </div>
  )
}

"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans text-gray-800 scroll-smooth">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-white shadow-md z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-2xl font-bold">
            <a href="#hero">Dr. Terra</a>
          </h1>

          <div className="hidden md:flex gap-8">
            <a href="#features" className="hover:text-blue-600">
              Features
            </a>
            <a href="#about" className="hover:text-blue-600">
              About
            </a>
            <Link
              href="/chat"
              className="px-5 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
            >
              Launch Bot
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section
        id="hero"
        className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
      >
        <h2 className="text-5xl md:text-6xl font-bold mb-4">
          Welcome to Dr. Terra
        </h2>
        <p className="text-lg md:text-xl max-w-2xl mb-8">
          Advanced AI-powered soil analysis & lunar surface exploration. Upload
          images and get instant insights.
        </p>

        <Link
          href="/chat"
          className="px-8 py-3 bg-white text-indigo-600 font-bold rounded-full text-lg hover:scale-105 transition-transform"
        >
          Get Started Now
        </Link>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-gray-100 mt-16 scroll-mt-24">
        <h2 className="text-4xl font-bold text-center mb-12">Our Features</h2>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-6">
          {[
            {
              icon: "🌱",
              title: "Soil Analysis",
              desc: "Upload soil images to get detailed nutrient insights, pH, and recommendations.",
            },
            {
              icon: "🌙",
              title: "Lunar Surface Wander",
              desc: "Explore lunar terrain with AI-based crater, mineral and geological detection.",
            },
            {
              icon: "⚡",
              title: "Instant Results",
              desc: "Real-time, highly accurate AI analysis and actionable suggestions.",
            },
            {
              icon: "📊",
              title: "Detailed Reports",
              desc: "Visual charts, analysis history, and downloadable reports.",
            },
            {
              icon: "🔒",
              title: "Secure & Private",
              desc: "Your images and data are encrypted. Privacy-first approach.",
            },
            {
              icon: "🤖",
              title: "AI Powered",
              desc: "Built using cutting-edge machine learning models trained on huge datasets.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white shadow-lg rounded-xl p-8 text-center hover:shadow-xl transition"
            >
              <div className="text-5xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 px-6 text-center scroll-mt-24">
        <h2 className="text-4xl font-bold mb-6">About Dr. Terra</h2>
        <p className="max-w-3xl mx-auto text-lg leading-relaxed text-gray-700">
          Dr. Terra merges cutting-edge artificial intelligence with
          environmental science to deliver precise soil and lunar surface
          analysis. Whether you’re a researcher, farmer, or enthusiast, our
          tools empower you to make smart, data-driven decisions with
          confidence.
        </p>
      </section>

      {/* CTA */}
      <section className="py-24 bg-blue-600 text-white text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-lg mb-8">
          Join thousands of users analyzing soil & exploring the Moon.
        </p>
        <Link
          href="/chat"
          className="px-10 py-3 bg-white text-blue-600 rounded-full font-bold text-lg hover:scale-105 transition"
        >
          Launch Application
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white text-center py-6">
        <p>© 2025 Dr. Terra. All rights reserved.</p>
      </footer>
    </div>
  );
}

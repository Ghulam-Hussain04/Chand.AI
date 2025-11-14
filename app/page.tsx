"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  // enable smooth scrolling on the document element
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  const sectionAnchorOffset = { scrollMarginTop: 88 };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#333" }}>
      {/* Navigation Bar */}  
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 50px",
          background: "#fff",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>
          <a href="" style={{ textDecoration: "none", color: "#333" }}>
            Dr. Terra
          </a>
        </h1>
        <div style={{ display: "flex", gap: "30px", alignItems: "center" }}>
          <a href="#features" style={{ textDecoration: "none", color: "#333" }}>
            Features
          </a>
          <a href="#about" style={{ textDecoration: "none", color: "#333" }}>
            About
          </a>
          <Link
            href="/chat"
            style={{
              padding: "10px 25px",
              background: "#007bff",
              color: "white",
              borderRadius: "25px",
              textDecoration: "none",
              fontWeight: "bold",
              transition: "background 0.3s",
            }}
          >
            Launch Bot
          </Link>
        </div>
      </nav>

      <section
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "100px 50px",
          textAlign: "center",
          minHeight: "500px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          ...sectionAnchorOffset,
        }}
      >
        <h2
          style={{ fontSize: "48px", marginBottom: "20px", fontWeight: "bold" }}
        >
          Welcome to Dr. Terra
        </h2>
        <p
          style={{ fontSize: "20px", marginBottom: "30px", maxWidth: "600px" }}
        >
          Advanced AI-powered soil analysis and lunar surface exploration tools.
          Upload images and get instant insights.
        </p>
        <Link
          href="/chat"
          style={{
            padding: "15px 40px",
            background: "white",
            color: "#667eea",
            borderRadius: "30px",
            textDecoration: "none",
            fontWeight: "bold",
            fontSize: "16px",
            transition: "transform 0.3s",
            cursor: "pointer",
            display: "inline-block",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
        >
          Get Started Now
        </Link>
      </section>

      {/* Features Section */}
      <section
        id="features"
        style={{
          padding: "80px 50px",
          background: "#f8f9fa",
          ...sectionAnchorOffset,
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "36px",
            marginBottom: "60px",
          }}
        >
          Our Features
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "30px",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {/* Feature cards (unchanged) */}
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "15px" }}>🌱</div>
            <h3>Soil Analysis</h3>
            <p>
              Upload soil images and receive detailed analysis including
              nutrient content, pH levels, and recommendations for optimal plant
              growth.
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "15px" }}>🌙</div>
            <h3>Lunar Surface Wander</h3>
            <p>
              Explore lunar surface images with AI-powered analysis. Identify
              crater formations, mineral compositions, and geological features.
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "15px" }}>⚡</div>
            <h3>Instant Results</h3>
            <p>
              Get real-time AI analysis with detailed reports. Our advanced
              algorithms provide accurate and actionable insights instantly.
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "15px" }}>📊</div>
            <h3>Detailed Reports</h3>
            <p>
              Comprehensive analysis reports with visual data representation,
              recommendations, and historical tracking.
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "15px" }}>🔒</div>
            <h3>Secure & Private</h3>
            <p>
              Your data is encrypted and stored securely. We prioritize your
              privacy and data protection.
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "15px" }}>🤖</div>
            <h3>AI Powered</h3>
            <p>
              Built on cutting-edge machine learning models trained on millions
              of soil and lunar samples.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        style={{
          padding: "80px 50px",
          background: "white",
          textAlign: "center",
          ...sectionAnchorOffset,
        }}
      >
        <h2 style={{ fontSize: "36px", marginBottom: "30px" }}>
          About Dr. Terra
        </h2>
        <p
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            fontSize: "16px",
            lineHeight: "1.8",
          }}
        >
          Dr. Terra is a revolutionary platform combining advanced AI technology
          with scientific expertise to provide unparalleled soil and lunar
          surface analysis. Whether you're an agricultural scientist,
          researcher, or enthusiast, our tools help you make informed decisions
          based on accurate, real-time data analysis.
        </p>
      </section>

      {/* CTA Section */}
      <section
        style={{
          background: "#007bff",
          color: "white",
          padding: "60px 50px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "36px", marginBottom: "20px" }}>
          Ready to Get Started?
        </h2>
        <p style={{ fontSize: "18px", marginBottom: "30px" }}>
          Join thousands of users analyzing soil and exploring lunar surfaces.
        </p>
        <Link
          href="/chat"
          style={{
            padding: "15px 40px",
            background: "white",
            color: "#007bff",
            borderRadius: "30px",
            textDecoration: "none",
            fontWeight: "bold",
            fontSize: "16px",
            display: "inline-block",
          }}
        >
          Launch Application
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "#222",
          color: "white",
          padding: "30px 50px",
          textAlign: "center",
        }}
      >
        <p>&copy; 2025 Dr. Terra. All rights reserved.</p>
      </footer>
    </div>
  );
}

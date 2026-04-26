"use client";

import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import About from "./components/About";
import Developers from "./components/Developers";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function Home() {
  const [stars, setStars] = useState<any[]>([]);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [smoothMouse, setSmoothMouse] = useState({ x: 0, y: 0 });
  const [shootingStars, setShootingStars] = useState<any[]>([]);

  //  Generate stars on client only
  useEffect(() => {
    const generated = [...Array(80)].map(() => {
      const depth = Math.random() * 3 + 1;
      return {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        depth,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 3,
      };
    });
    setStars(generated);
  }, []);

  //  Track mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setMouse({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  //  Smooth easing (important for premium feel)
  useEffect(() => {
    let frame: number;

    const animate = () => {
      setSmoothMouse((prev) => ({
        x: prev.x + (mouse.x - prev.x) * 0.05,
        y: prev.y + (mouse.y - prev.y) * 0.05,
      }));
      frame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frame);
  }, [mouse]);

  useEffect(() => {
    const interval = setInterval(
      () => {
        const id = Date.now();

        const newStar = {
          id,
          startX: Math.random() * window.innerWidth + 0.5,
          startY: Math.random() * window.innerHeight * 0.8, // upper half
          length: Math.random() * 120 + 80,
          angle: Math.random() * 20 + 20, // diagonal angle
          duration: Math.random() * 800 + 1000, // ms
        };

        setShootingStars((prev) => [...prev, newStar]);

        // Remove after animation ends
        setTimeout(() => {
          setShootingStars((prev) => prev.filter((s) => s.id !== id));
        }, newStar.duration);
      },
      500 + Math.random() * 1000,
    ); // random interval

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-sans bg-background text-foreground min-h-screen scroll-smooth relative overflow-hidden">
      {/*  Starfield Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {stars.map((star, i) => {
          const movement = star.depth * 6;

          const translateX = smoothMouse.x * movement;
          const translateY = smoothMouse.y * movement;

          return (
            <div
              key={i}
              className="absolute rounded-full bg-foreground/70 animate-twinkle"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                left: `${star.x}%`,
                top: `${star.y}%`,
                transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          );
        })}
        {shootingStars.map((star) => (
          <div
            key={star.id}
            className="absolute pointer-events-none"
            style={{
              left: star.startX,
              top: star.startY,
              width: `${star.length}px`,
              height: "2px",
              background:
                "linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0))",
              transform: `rotate(${star.angle}deg)`,
              animation: `shoot ${star.duration}ms linear forwards`,
            }}
          />
        ))}
      </div>

      {/* 🌐 Main Content */}
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
  );
}

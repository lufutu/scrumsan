'use client'
import Image from "next/image";
import { useRef, useState } from 'react';

const testimonials = [
  {
    image: "https://mainline-nextjs-template.vercel.app/testimonials/amy-chase.webp",
    quote: "ScrumSan keeps our team on track and focused.",
    name: "Amy Chase, PM",
    company: "Mercury Finance",
  },
  {
    image: "https://mainline-nextjs-template.vercel.app/testimonials/jonas-kotara.webp",
    quote: "I was able to replace 80% of my team with ScrumSan bots.",
    name: "Jonas Kotara, Lead Engineer",
    company: "Mercury Finance",
  },
  {
    image: "https://mainline-nextjs-template.vercel.app/testimonials/kevin-yam.webp",
    quote: "Founder Mode is hard enough without having a really nice PM app.",
    name: "Kevin Yam, Founder",
    company: "Mercury Finance",
  },
  {
    image: "https://mainline-nextjs-template.vercel.app/testimonials/amy-chase.webp",
    quote: "ScrumSan made onboarding new team members a breeze!",
    name: "Linda Tran, Scrum Master",
    company: "BetaSoft",
  },
  {
    image: "https://mainline-nextjs-template.vercel.app/testimonials/jonas-kotara.webp",
    quote: "The best tool for agile teams! Highly recommended.",
    name: "Chris Evans, Developer",
    company: "Acme Inc.",
  },
];

export default function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);
  const cardsToShow = 3;
  const maxIndex = testimonials.length - cardsToShow;
  const scrollRef = useRef(null);

  const handlePrev = () => {
    setIndex((prev) => Math.max(prev - 1, 0));
  };
  const handleNext = () => {
    setIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold mb-8 text-center text-primary-foreground">What our users say</h2>
      <div className="relative">
        <div className="flex items-center">
          <button
            aria-label="Previous testimonials"
            onClick={handlePrev}
            disabled={index === 0}
            className={`rounded-full border border-primary bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center mr-4 shadow transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="sr-only">Previous</span>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div
            ref={scrollRef}
            className="overflow-hidden flex-1"
          >
            <div
              className="flex transition-transform duration-500"
              style={{ transform: `translateX(-${index * (100 / cardsToShow)}%)` }}
            >
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="bg-card text-card-foreground border rounded-xl shadow-sm flex flex-col overflow-hidden mx-2 min-w-[320px] max-w-[350px] w-full"
                  style={{ flex: `0 0 ${100 / cardsToShow}%` }}
                >
                  <Image src={t.image} alt={t.name} width={400} height={250} className="w-full h-56 object-cover" />
                  <div className="p-6 flex flex-col flex-1">
                    <p className="text-lg font-medium mb-4 text-card-foreground">"{t.quote}"</p>
                    <div className="mt-auto">
                      <span className="font-semibold text-card-foreground">{t.name}</span>
                      <div className="text-muted-foreground text-sm">{t.company}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            aria-label="Next testimonials"
            onClick={handleNext}
            disabled={index === maxIndex}
            className={`rounded-full border border-primary bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center ml-4 shadow transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="sr-only">Next</span>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="flex justify-center mt-4 gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2.5 h-2.5 rounded-full ${i === index ? 'bg-primary' : 'bg-muted'}`}
              aria-label={`Go to testimonials group ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
} 
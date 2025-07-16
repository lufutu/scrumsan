'use client'

import HeroSection from "@/components/landing/HeroSection";
import TrustedBySection from "@/components/landing/TrustedBySection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ProductPreviewSection from "@/components/landing/ProductPreviewSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import TestimonialsCarousel from "@/components/landing/TestimonialsCarousel";
import FooterSection from "@/components/landing/FooterSection";

export default function LandingPage() {
    return (
        <div className="bg-gradient-to-b from-[#f8f7f3] to-white min-h-screen flex flex-col">
            <HeroSection />
            <TrustedBySection />
            <FeaturesSection />
            <ProductPreviewSection />
            <PricingSection />
            <FAQSection />
            <TestimonialsCarousel />
            <FooterSection />
        </div>
    )
}

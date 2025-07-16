import Image from "next/image";

export default function TrustedBySection() {
  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
      <p className="uppercase text-xs tracking-widest text-primary-500 mb-4">Trusted by modern teams</p>
      <div className="flex flex-wrap justify-center gap-8 opacity-80">
        <Image src="https://mainline-nextjs-template.vercel.app/logos/mercury.svg" alt="Logo1" width={80} height={32} />
        <Image src="https://mainline-nextjs-template.vercel.app/logos/watershed.svg" alt="Logo2" width={80} height={32} />
        <Image src="https://mainline-nextjs-template.vercel.app/logos/ramp.svg" alt="Logo3" width={80} height={32} />
        <Image src="https://mainline-nextjs-template.vercel.app/logos/arc.svg" alt="Logo4" width={80} height={32} />
      </div>
    </section>
  );
} 
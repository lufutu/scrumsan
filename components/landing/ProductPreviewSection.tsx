import Image from "next/image";

export default function ProductPreviewSection() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-12 flex flex-col items-center">
      <Image src="https://cdn.dribbble.com/userupload/6007751/file/original-0614de7e6897751090f706e95377f3fa.jpg?resize=1024x829&vertical=center" alt="ScrumSan Board Screenshot" width={1000} height={500} className="rounded-xl shadow-lg" />
    </section>
  );
} 
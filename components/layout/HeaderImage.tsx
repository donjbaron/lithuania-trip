"use client";

import { useState, useEffect } from "react";

const IMAGES = [
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Gedo_pr_by_Augustas_Didzgalvis.jpg/1280px-Gedo_pr_by_Augustas_Didzgalvis.jpg", alt: "Gediminas Avenue, Vilnius" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Trakai_castle_2016.jpg/1280px-Trakai_castle_2016.jpg", alt: "Trakai Island Castle" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Palanga_by_Augustas_Didzgalvis.jpg/1280px-Palanga_by_Augustas_Didzgalvis.jpg", alt: "Palanga, Lithuania" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Laisvonas_by_Augustas_Didzgalvis.jpg/1280px-Laisvonas_by_Augustas_Didzgalvis.jpg", alt: "Laisvės Alėja, Kaunas" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Uzupis_2020_by_Augustas_Didzgalvis.jpg/1280px-Uzupis_2020_by_Augustas_Didzgalvis.jpg", alt: "Užupis, Vilnius" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/8/88/Neman_river.jpg", alt: "Nemunas River" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Vingio_parkas_by_Augustas_Didzgalvis.jpg/1280px-Vingio_parkas_by_Augustas_Didzgalvis.jpg", alt: "Vingis Park, Vilnius" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ti%C5%A1kevi%C4%8Diai_Palace_at_dusk%2C_Palanga%2C_Lithuania_-_Diliff.jpg/1280px-Ti%C5%A1kevi%C4%8Diai_Palace_at_dusk%2C_Palanga%2C_Lithuania_-_Diliff.jpg", alt: "Palanga Botanical Park at dusk" },
];

export default function HeaderImage() {
  const [img, setImg] = useState<typeof IMAGES[0] | null>(null);

  useEffect(() => {
    setImg(IMAGES[Math.floor(Math.random() * IMAGES.length)]);
  }, []);

  if (!img) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Image on the right half, fading to transparent on the left */}
      <div
        className="absolute inset-y-0 right-0 w-2/3"
        style={{
          backgroundImage: `url(${img.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.22,
          maskImage: "linear-gradient(to right, transparent 0%, black 40%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 40%)",
        }}
        aria-label={img.alt}
      />
    </div>
  );
}

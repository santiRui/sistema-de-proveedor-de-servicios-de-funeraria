"use client"

import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

interface ImageCarouselProps {
  images: string[]
  alt: string
}

export function ImageCarousel({ images, alt }: ImageCarouselProps) {
  if (!images || images.length === 0) return null

  return (
    <div className="w-full">
      <Carousel opts={{ loop: images.length > 1 }} className="w-full">
        <CarouselContent>
          {images.map((url, idx) => (
            <CarouselItem key={`${url}-${idx}`}>
              <div className="relative w-full h-64 sm:h-80 rounded-lg overflow-hidden bg-gray-100">
                <Image src={url} alt={alt} fill className="object-cover" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious className="left-3" />
            <CarouselNext className="right-3" />
          </>
        )}
      </Carousel>
    </div>
  )
}

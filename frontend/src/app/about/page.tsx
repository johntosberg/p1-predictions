import Link from 'next/link'
import { Card } from '@/components/ui/card'

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-extrabold uppercase tracking-widest text-[#F5F5F5] mb-8 text-center">
        About <span className="text-[#E10600]">P1</span> Predictions
      </h1>
      <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-8">
        <p className="text-[#F5F5F5] leading-relaxed mb-6">
          This app was inspired by the weekly predictions segment on the P1 with Matt and Tommy
          podcast — the world&apos;s biggest F1 podcast, hosted by Matt Gallagher and Tom Bellingham.
          Every race weekend, Matt and Tommy go head-to-head across categories like Good Surprise,
          Big Flop, Pole Position, Top 3, and a Crazy Prediction. We just made it multiplayer.
        </p>
        <p className="text-[#9A9A9A] mb-4">
          Find the podcast on Spotify, Apple Podcasts, or wherever you get your pods.
        </p>
        <Link
          href="https://mattp1tommy.com"
          target="_blank"
          className="inline-block text-[#E10600] hover:underline font-semibold"
        >
          mattp1tommy.com &rarr;
        </Link>
      </Card>
    </div>
  )
}

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <h1 className="text-5xl font-extrabold uppercase tracking-widest mb-2">
        <span className="text-[#E10600]">P1</span> Predictions
      </h1>
      <p className="text-[#9A9A9A] text-lg mb-8 max-w-md">
        Predict the grid. Compete with friends. Inspired by the P1 with Matt and Tommy podcast.
      </p>
      <div className="flex gap-4">
        <Link href="/register">
          <Button className="bg-[#E10600] hover:bg-[#C10500] text-white px-8 py-3 text-lg">
            Get Started
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" className="border-[#E10600] text-[#E10600] hover:bg-[#E10600] hover:text-white px-8 py-3 text-lg">
            Log In
          </Button>
        </Link>
      </div>
    </div>
  )
}

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.08)] bg-[#15151E] mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center">
        <p className="text-xs text-[#9A9A9A]">
          Inspired by the{' '}
          <Link href="https://mattp1tommy.com" target="_blank" className="text-[#E10600] hover:underline">
            P1 with Matt and Tommy
          </Link>{' '}
          podcast.{' '}
          <Link href="/about" className="text-[#9A9A9A] hover:text-[#F5F5F5] underline">
            About
          </Link>
        </p>
      </div>
    </footer>
  )
}

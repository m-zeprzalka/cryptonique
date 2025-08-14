import { SiteHeader } from "@/components/site/header"
import { Hero } from "@/components/site/hero"
import { ClientHome } from "@/app/sections/client-home"

export default function Home() {
  return (
    <div className="min-h-dvh grid grid-rows-[auto_1fr]">
      <SiteHeader />
      <main>
        <Hero />
        <ClientHome />
      </main>
    </div>
  )
}

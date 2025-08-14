"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "./theme-toggle"

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="w-full sticky top-0 z-40 border-b bg-background/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="outline" size="icon" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>cryptonique</SheetTitle>
              </SheetHeader>
              <nav className="m-4 grid gap-2">
                <Link
                  href="#"
                  className="text-sm hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="#"
                  className="text-sm hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Rynek
                </Link>
                <Link
                  href="#"
                  className="text-sm hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Predykcje
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <Link
            href="/"
            className="font-semibold tracking-tight text-base sm:text-lg"
          >
            cryptonique
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink href="#" className="text-sm">
                  Dashboard
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#" className="text-sm">
                  Rynek
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#" className="text-sm">
                  Predykcje
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-28 xs:w-40 sm:w-64 md:w-80">
            <Search className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Szukaj krypto..." className="pl-8 h-9" />
          </div>
          <Select defaultValue="change-desc">
            <SelectTrigger className="h-9 w-[120px] hidden lg:inline-flex">
              <SelectValue placeholder="Sortowanie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="change-desc">Zmiana ⬇</SelectItem>
              <SelectItem value="change-asc">Zmiana ⬆</SelectItem>
              <SelectItem value="pred-desc">Predykcja ⬇</SelectItem>
              <SelectItem value="pred-asc">Predykcja ⬆</SelectItem>
            </SelectContent>
          </Select>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

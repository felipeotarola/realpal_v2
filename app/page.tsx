import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Building, Search, BarChart2, MapPin, Clock, Sparkles } from "lucide-react"
import Image from "next/image"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-4">
                  Smartare <span className="text-blue-600">fastighetsanalys</span> för bättre beslut
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
                  RealPal hjälper dig analysera, jämföra och hitta fastigheter som verkligen matchar dina behov och
                  önskemål.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="text-md px-8 py-6" asChild>
                  <Link href="/signup">
                    Kom igång <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-md px-8 py-6" asChild>
                  <Link href="/login">Logga in</Link>
                </Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                <Image
                  src="/modern-home-exterior.jpg"
                  alt="Modern fastighetsanalys"
                  width={600}
                  height={600}
                  className="rounded-xl shadow-2xl object-cover"
                  priority
                />
                <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-lg shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 p-2 rounded-full">
                      <BarChart2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Matchning</p>
                      <p className="text-green-600 font-bold">92%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-blue-100 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-green-100 rounded-full filter blur-3xl opacity-20"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Fördelar med RealPal</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Vi kombinerar avancerad analys och data för att ge dig de verktyg du behöver för att fatta smarta
              fastighetsbeslut.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-100 p-3 rounded-lg inline-block mb-4">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Djupgående analys</h3>
              <p className="text-gray-600">
                Få detaljerad information om varje fastighet på sekunder, inklusive dolda fördelar och potentiella
                nackdelar.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-green-100 p-3 rounded-lg inline-block mb-4">
                <BarChart2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Objektiva jämförelser</h3>
              <p className="text-gray-600">
                Jämför fastigheter sida vid sida med objektiva mätvärden för att se vilken som verkligen passar dina
                behov.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-purple-100 p-3 rounded-lg inline-block mb-4">
                <Building className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Skräddarsydd matchning</h3>
              <p className="text-gray-600">
                Ange dina specifika önskemål och få en personlig matchningspoäng för varje fastighet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="relative">
                <div className="bg-white rounded-xl shadow-xl p-6 max-w-md">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold">Fastighetsanalys</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Boyta</span>
                      <span className="font-medium">120 m²</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Pris</span>
                      <span className="font-medium">4 250 000 kr</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Driftskostnad</span>
                      <span className="font-medium">3 800 kr/mån</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Energiklass</span>
                      <span className="font-medium">B</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Byggår</span>
                      <span className="font-medium">2018</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Matchningspoäng</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">87%</span>
                        <Sparkles className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-lg shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Närhet till centrum</p>
                      <p className="text-blue-600">12 min</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-6 text-center lg:text-left">
              <h2 className="text-3xl md:text-4xl font-bold">Detaljerad insikt i varje fastighet</h2>
              <p className="text-xl text-gray-600">
                RealPal analyserar varje aspekt av fastigheten och presenterar informationen på ett tydligt och
                lättförståeligt sätt.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="bg-green-100 p-1 rounded-full mt-1">
                    <Clock className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Spara tid på research</p>
                    <p className="text-gray-600">Få all viktig information samlad och analyserad på ett ställe.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-green-100 p-1 rounded-full mt-1">
                    <BarChart2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Objektiv bedömning</p>
                    <p className="text-gray-600">Få en opartisk analys baserad på data, inte känslor.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-green-100 p-1 rounded-full mt-1">
                    <Sparkles className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Personlig matchning</p>
                    <p className="text-gray-600">Se hur väl varje fastighet matchar just dina specifika behov.</p>
                  </div>
                </li>
              </ul>
              <div>
                <Button size="lg" className="mt-4" asChild>
                  <Link href="/signup">Prova RealPal</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Så här fungerar det</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tre enkla steg för att hitta din perfekta bostad med RealPal
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold mb-2">Skapa din profil</h3>
              <p className="text-gray-600">
                Registrera dig och ange dina bostadspreferenser för en personlig sökupplevelse.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold mb-2">Analysera objekt</h3>
              <p className="text-gray-600">
                Lägg till fastigheter du är intresserad av och få detaljerade analyser direkt.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold mb-2">Jämför och besluta</h3>
              <p className="text-gray-600">Jämför objekt, se matchningspoäng och fatta välgrundade beslut.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Vad våra användare säger</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Upptäck hur RealPal har hjälpt andra att hitta sitt drömboende
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "RealPal hjälpte mig att hitta ett hus som verkligen passade mina behov. Jämförelsefunktionen var
                ovärderlig när jag skulle välja mellan flera alternativ."
              </p>
              <div className="flex items-center">
                <div className="mr-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-blue-600">MJ</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium">Maria Johansson</p>
                  <p className="text-gray-500 text-sm">Stockholm</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "Som förstagångsköpare var jag nervös, men RealPal gjorde processen mycket enklare. Analyserna hjälpte
                mig att förstå vad jag verkligen behövde prioritera."
              </p>
              <div className="flex items-center">
                <div className="mr-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-green-600">AL</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium">Anders Lindberg</p>
                  <p className="text-gray-500 text-sm">Göteborg</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "Vi letade efter ett hus i över ett år innan vi hittade RealPal. Verktyget hjälpte oss att snabbt hitta
                rätt objekt och spara massor av tid på visningar."
              </p>
              <div className="flex items-center">
                <div className="mr-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-purple-600">KS</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium">Karin & Stefan</p>
                  <p className="text-gray-500 text-sm">Malmö</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Redo att hitta ditt drömboende?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Gå med i RealPal idag och revolutionera ditt sätt att söka efter fastigheter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-blue-700 px-8" asChild>
              <Link href="/signup">Skapa konto</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-blue-500 px-8" asChild>
              <Link href="/login">Logga in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Vanliga frågor</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Svar på de vanligaste frågorna om RealPal</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">Vad kostar RealPal?</h3>
              <p className="text-gray-600">
                RealPal erbjuder en gratis grundversion med begränsade analyser. För fullständig tillgång till alla
                funktioner erbjuder vi olika prenumerationsalternativ som passar olika behov.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">Hur exakta är analyserna?</h3>
              <p className="text-gray-600">
                Våra analyser baseras på omfattande data och avancerade algoritmer. Vi strävar efter högsta möjliga
                precision, men rekommenderar alltid att komplettera med personliga besök och professionell rådgivning.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">Vilka fastighetstyper stöds?</h3>
              <p className="text-gray-600">
                RealPal stödjer analys av villor, bostadsrätter, radhus och tomter. Vi arbetar kontinuerligt med att
                utöka vårt stöd för fler fastighetstyper.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">Kan jag dela mina analyser med andra?</h3>
              <p className="text-gray-600">
                Ja, du kan enkelt dela dina analyser och jämförelser med familj, vänner eller rådgivare genom vår
                delningsfunktion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">RealPal</h3>
              <p className="text-gray-400">Din smarta assistent för fastighetsköp och analys.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Funktioner</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="hover:text-white">
                    Fastighetsanalys
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Jämförelser
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Preferenser
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Rådgivning
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Företag</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="hover:text-white">
                    Om oss
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Kontakt
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Karriär
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Blogg
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Juridiskt</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="hover:text-white">
                    Integritetspolicy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Användarvillkor
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Cookies
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} RealPal. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

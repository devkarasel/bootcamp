export default function Header() {
  return (
<header class="bg-[#d1d5db] sticky top-0 z-40">
    <div class="max-w-4xl mx-auto flex items-stretch justify-between px-6 py-4">
      <div class="text-5xl ml-6 relative z-10 self-center">
        <a href="/" class="bg-red-600 text-white uppercase px-6 py-1 no-underline font-black skew-x-[-10deg] inline-block">
          Sick Fits
        </a>
      </div>
      <nav id="main-nav" class="flex flex-wrap justify-end text-2xl font-black uppercase"></nav>
    </div>
</header>

  );
}
export default function NotFound() {
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-8 bg-void px-6 text-center">
      <p className="font-serif text-4xl text-paper italic">This star doesn&apos;t exist… yet.</p>
      <a href="/intro" className="font-grotesk text-xs tracking-[0.3em] text-lavender uppercase">
        Return to the beginning
      </a>
    </div>
  );
}

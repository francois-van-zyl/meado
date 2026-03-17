import Link from 'next/link'

export default function ConfirmPage() {
  return (
    <div className="bg-card border border-border rounded-2xl px-8 py-10 shadow-sm text-center">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-lora text-4xl text-primary mb-2">Meado</h1>
        <p className="font-nunito text-muted text-sm tracking-wide">
          Tend to yourself, every day.
        </p>
      </div>

      {/* Message */}
      <div className="space-y-3 mb-8">
        <h2 className="font-lora text-2xl text-foreground">Check your inbox</h2>
        <p className="font-nunito text-sm text-foreground leading-relaxed">
          We&apos;ve sent a confirmation link to your email.
          <br />
          Click it to activate your account and begin tending.
        </p>
        <p className="font-nunito text-xs text-muted pt-1">
          Can&apos;t find it? Check your spam folder.
        </p>
      </div>

      <Link
        href="/login"
        className="font-nunito text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
      >
        Back to sign in
      </Link>
    </div>
  )
}

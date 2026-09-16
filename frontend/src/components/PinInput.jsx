import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function PinInput({ value, onChange, onComplete, autoFocus = true, testid = "pin-input", length = 4 }) {
  return (
    <InputOTP
      maxLength={length}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      autoFocus={autoFocus}
      containerClassName="justify-center gap-3"
      data-testid={testid}
      inputMode="numeric"
    >
      <InputOTPGroup className="gap-3">
        {Array.from({ length }).map((_, i) => (
          <InputOTPSlot
            key={i}
            index={i}
            data-testid={`${testid}-slot-${i}`}
            className="w-12 h-14 sm:w-14 sm:h-16 text-2xl font-mono rounded-xl border border-slate-300 bg-slate-50 text-slate-900 first:rounded-xl last:rounded-xl data-[active=true]:ring-2 data-[active=true]:ring-blue-500/40 data-[active=true]:border-blue-500"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

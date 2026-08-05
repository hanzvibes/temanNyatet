import { Button } from '@/components/ui/button';

type SettingsDetailSection = 'name' | 'password' | 'phone' | 'feedback';

interface SettingsDetailFormProps {
  section: SettingsDetailSection;
  value: string;
  confirmValue?: string;
  onChange: (value: string) => void;
  onConfirmChange?: (value: string) => void;
  onSubmit: () => void;
  saving: boolean;
}

const INP =
  'w-full bg-secondary border border-border rounded-xl outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 font-bold text-foreground transition-all py-3 px-4 text-sm';

export default function SettingsDetailForm({
  section,
  value,
  confirmValue = '',
  onChange,
  onConfirmChange,
  onSubmit,
  saving,
}: SettingsDetailFormProps) {
  if (section === 'feedback') {
    return (
      <div className="space-y-[clamp(1rem,3vw,1.5rem)] pt-[clamp(0.25rem,1vw,0.5rem)]">
        <div>
          <label className="mb-[clamp(0.25rem,1vw,0.5rem)] block text-[clamp(0.625rem,2vw,0.75rem)] font-bold uppercase tracking-widest text-muted-foreground">
            Laporkan Bug / Saran
          </label>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Jelaskan bug yang kamu temui atau saran kamu di sini..."
            className={`${INP} min-h-[8rem] resize-none`}
            autoFocus
          />
        </div>
        <Button onClick={onSubmit} className="w-full" size="lg">
          Kirim Feedback
        </Button>
        <p className="text-center text-[clamp(0.75rem,2.5vw,1rem)] text-muted-foreground">
          Akan membuka aplikasi email dengan alamat tujuan{' '}
          <strong className="text-foreground">rhn.rmdhniii@gmail.com</strong>.
        </p>
      </div>
    );
  }

  const isPassword = section === 'password';
  const label = section === 'name'
    ? 'Nama Baru'
    : section === 'phone'
      ? 'Nomor HP'
      : 'Password Baru';
  const placeholder = section === 'name'
    ? 'Masukkan nama kamu'
    : section === 'phone'
      ? 'Contoh: 08123456789'
      : 'Minimal 6 karakter';
  const buttonLabel = section === 'name'
    ? 'Simpan Nama'
    : section === 'phone'
      ? 'Simpan Nomor HP'
      : 'Simpan Password';

  return (
    <div className="space-y-[clamp(1rem,3vw,1.5rem)] pt-[clamp(0.25rem,1vw,0.5rem)]">
      <div>
        <label className="mb-[clamp(0.25rem,1vw,0.5rem)] block text-[clamp(0.625rem,2vw,0.75rem)] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </label>
        <input
          type={isPassword ? 'password' : section === 'phone' ? 'tel' : 'text'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={INP}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !isPassword) onSubmit();
          }}
        />
      </div>

      {isPassword && (
        <div>
          <label className="mb-[clamp(0.25rem,1vw,0.5rem)] block text-[clamp(0.625rem,2vw,0.75rem)] font-bold uppercase tracking-widest text-muted-foreground">
            Konfirmasi Password
          </label>
          <input
            type="password"
            value={confirmValue}
            onChange={(event) => onConfirmChange?.(event.target.value)}
            placeholder="Ulangi password baru"
            className={INP}
            onKeyDown={(event) => event.key === 'Enter' && onSubmit()}
          />
        </div>
      )}

      <Button onClick={onSubmit} disabled={saving} className="w-full" size="lg">
        {saving ? 'Menyimpan...' : buttonLabel}
      </Button>
    </div>
  );
}
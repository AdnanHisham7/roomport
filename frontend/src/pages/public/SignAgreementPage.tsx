import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { FileSignature, PenLine, ShieldCheck, Download, CheckCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Avatar';
import { AgreementViewer } from '@/components/agreement/AgreementViewer';
import { resolvePdfUrl } from '@/utils/pdfUrl';
import { useViewAgreementByTokenQuery, useInitiateSigningMutation, useVerifySigningOtpMutation } from '@/store/api/agreementApi';
import { formatCurrency, formatDate } from '@/utils/format';

export default function SignAgreementPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<'view' | 'sign' | 'otp' | 'done'>('view');
  const [signature, setSignature] = useState('');
  const [otp, setOtp] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data, isLoading } = useViewAgreementByTokenQuery(token!, { skip: !token });
  const [initiateSigning, { isLoading: initiating }] = useInitiateSigningMutation();
  const [verifyOtp, { isLoading: verifying }] = useVerifySigningOtpMutation();

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Spinner className="size-8 text-crimson-400" /></div>;
  const a = data?.data;
  if (!a) return <div className="flex min-h-screen items-center justify-center text-ink-soft">Agreement not found or link has expired.</div>;

  const onSign = async () => {
    if (!signature.trim()) { toast.error('Type your full name to sign.'); return; }
    try {
      await initiateSigning({ token: token!, typedSignatureName: signature }).unwrap();
      setStep('otp');
      toast.success('A verification code was sent to your email.');
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not initiate signing.');
    }
  };

  const onVerify = async () => {
    try {
      const res = await verifyOtp({ token: token!, otp }).unwrap();
      setPdfUrl(res.finalPdfUrl);
      setStep('done');
      toast.success('Agreement signed successfully!');
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Invalid code. Try again.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-paper px-4 py-12 sm:px-6">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-center">
          <FileSignature className="size-5 text-crimson-500" />
          <span className="font-display text-lg font-semibold text-ink">Lease Agreement</span>
        </div>

        <Card padding="lg" className="mb-5">
          <h1 className="font-display text-xl font-semibold text-ink">{a.title}</h1>
          <div className="mt-2 mb-4 flex flex-wrap gap-4 text-sm text-ink-soft">
            <span>{formatDate(a.startDate)} – {formatDate(a.endDate)}</span>
            <span className="font-medium text-crimson-600">{formatCurrency(a.monthlyRent)}/mo</span>
          </div>
          <AgreementViewer body={a.body} terms={a.terms} maxHeight="360px" />
        </Card>

        <AnimatePresence mode="wait">
          {step === 'view' && (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button size="lg" className="w-full justify-center" icon={<PenLine className="size-4.5" />} onClick={() => setStep('sign')}>
                Proceed to sign
              </Button>
            </motion.div>
          )}

          {step === 'sign' && (
            <motion.div key="sign" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card padding="lg">
                <h2 className="mb-1 font-display text-base font-semibold text-ink">Type your signature</h2>
                <p className="mb-4 text-sm text-ink-soft">By signing, you agree to all terms in this agreement.</p>
                <Input
                  label="Full legal name"
                  placeholder="e.g. Jordan Rivera"
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  className="font-display text-xl italic"
                />
                {signature && (
                  <div className="mt-3 rounded-xl border border-line bg-paper-dim px-4 py-3">
                    <p className="text-xs font-medium text-ink-faint mb-1">Signature preview</p>
                    <p className="font-display text-2xl italic text-ink">{signature}</p>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" onClick={() => setStep('view')}>Back</Button>
                  <Button className="flex-1 justify-center" loading={initiating} icon={<ShieldCheck className="size-4" />} onClick={onSign}>
                    Sign & send verification code
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card padding="lg">
                <h2 className="mb-1 font-display text-base font-semibold text-ink">Verify your identity</h2>
                <p className="mb-4 text-sm text-ink-soft">Enter the 6-digit code we sent to your email to complete the signing.</p>
                <Input
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-xl tracking-[0.5em]"
                />
                <Button className="mt-4 w-full justify-center" loading={verifying} disabled={otp.length !== 6} onClick={onVerify} icon={<CheckCircle className="size-4" />}>
                  Verify and complete signing
                </Button>
              </Card>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card padding="lg" className="text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-sage-50 text-sage-500 mx-auto">
                  <CheckCircle className="size-8" />
                </div>
                <h2 className="font-display text-xl font-semibold text-ink">Agreement signed!</h2>
                <p className="mt-2 text-sm text-ink-soft">A signed copy has been sent to your email and the property manager has been notified.</p>
                {pdfUrl && (
                  <Button className="mt-5 justify-center" icon={<Download className="size-4" />} onClick={() => window.open(resolvePdfUrl(pdfUrl), '_blank')}>
                    Download signed PDF
                  </Button>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

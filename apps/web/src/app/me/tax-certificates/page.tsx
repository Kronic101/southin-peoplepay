import { redirect } from 'next/navigation';

export default function OldTaxCertificatesRedirectPage() {
  redirect('/me/statutory-certificates');
}
import { TermOfServiceContent } from "@/components/landing/TermOfServiceContent";

export const metadata = {
  title: "이용약관",
  description: "TeleMon 이용약관",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-app-bg bg-grid px-4 py-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl prose prose-sm prose-invert">
        <h1 className="text-3xl font-bold text-app-text mb-8">이용약관</h1>
        <TermOfServiceContent />
      </div>
    </div>
  );
}

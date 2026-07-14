import { PrivacyPolicyContent } from "@/components/landing/PrivacyPolicyContent";

export const metadata = {
  title: "개인정보처리방침",
  description: "TeleMon 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-app-bg bg-grid px-4 py-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl prose prose-sm prose-invert">
        <h1 className="text-3xl font-bold text-app-text mb-8">개인정보처리방침</h1>
        <PrivacyPolicyContent />
      </div>
    </div>
  );
}

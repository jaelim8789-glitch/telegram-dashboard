import { ApiError } from "@/lib/api";

const BILLING_KEYWORDS = ["결제", "요금제", "API 키가 필요", "API키가 필요", "한도"];

export interface BillingErrorInfo {
  isBillingError: boolean;
  message: string;
  /** /pricing 으로 이동해야 하는 요금제 관련 에러인지 */
  requiresPlanUpgrade: boolean;
  /** API 키 설정이 필요한 에러인지 */
  requiresApiKey: boolean;
}

export function classifyError(err: unknown): BillingErrorInfo {
  const message =
    err instanceof ApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : "알 수 없는 오류가 발생했습니다.";

  const status = err instanceof ApiError ? err.status : undefined;
  const is403or401 = status === 403 || status === 401;

  const contains = (kw: string) => message.includes(kw);

  const isBillingError =
    is403or401 &&
    BILLING_KEYWORDS.some((kw) => contains(kw));

  const requiresPlanUpgrade =
    isBillingError &&
    (contains("요금제") || contains("결제") || contains("한도"));

  const requiresApiKey =
    isBillingError &&
    (contains("API 키가 필요") || contains("API키가 필요"));

  return { isBillingError, message, requiresPlanUpgrade, requiresApiKey };
}

export function handleBillingError(
  err: unknown,
  onUpgradePlan?: () => void,
  onSetApiKey?: () => void,
): string {
  const info = classifyError(err);
  if (info.requiresPlanUpgrade) {
    onUpgradePlan?.();
  } else if (info.requiresApiKey) {
    onSetApiKey?.();
  }
  return info.message;
}

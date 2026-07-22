// 고급 폼 유효성 검사 기능
export interface ValidationRule {
  name: string;
  validator: (value: any, formData?: any) => boolean | Promise<boolean>;
  message: string;
  condition?: (formData: any) => boolean; // 조건부 유효성 검사
}

export interface FieldValidationConfig {
  required?: boolean;
  requiredMessage?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  customRules?: ValidationRule[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  asyncValidator?: (value: any) => Promise<boolean>;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

export interface FormValidatorOptions {
  debounceMs?: number;
  realtimeValidation?: boolean;
  validationDelay?: number;
}

class FormValidator {
  private validators: Map<string, FieldValidationConfig> = new Map();
  private options: FormValidatorOptions;
  private listeners: Array<(result: FormValidationResult) => void> = [];
  private debouncedValidations: Map<string, NodeJS.Timeout> = new Map();

  constructor(options: FormValidatorOptions = {}) {
    this.options = {
      debounceMs: 300,
      realtimeValidation: true,
      validationDelay: 0,
      ...options
    };
  }

  // 이벤트 리스너 등록
  subscribe(listener: (result: FormValidationResult) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 이벤트 알림
  private notifyListeners(result: FormValidationResult): void {
    this.listeners.forEach(listener => listener(result));
  }

  // 필드 유효성 검사기 등록
  addField(fieldName: string, config: FieldValidationConfig): void {
    this.validators.set(fieldName, config);
  }

  // 필드 유효성 검사기 제거
  removeField(fieldName: string): boolean {
    return this.validators.delete(fieldName);
  }

  // 폼 유효성 검사
  async validate(formData: any): Promise<FormValidationResult> {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    for (const [fieldName, config] of this.validators.entries()) {
      const value = this.getFieldValue(formData, fieldName);
      const fieldErrors: string[] = [];
      const fieldWarnings: string[] = [];

      // 필수 필드 검사
      if (config.required && this.isEmpty(value)) {
        fieldErrors.push(config.requiredMessage || `${fieldName}은(는) 필수 입력 항목입니다.`);
      }

      // 조건부 유효성 검사
      if (config.customRules) {
        for (const rule of config.customRules) {
          // 조건이 있는 경우에만 검사
          if (!rule.condition || rule.condition(formData)) {
            const isValid = await Promise.resolve(rule.validator(value, formData));
            if (!isValid) {
              fieldErrors.push(rule.message);
            }
          }
        }
      }

      // 최소 길이 검사
      if (config.minLength !== undefined && typeof value === 'string' && value.length < config.minLength) {
        fieldErrors.push(`${fieldName}은(는) 최소 ${config.minLength}자 이상이어야 합니다.`);
      }

      // 최대 길이 검사
      if (config.maxLength !== undefined && typeof value === 'string' && value.length > config.maxLength) {
        fieldErrors.push(`${fieldName}은(는) 최대 ${config.maxLength}자를 넘을 수 없습니다.`);
      }

      // 패턴 검사
      if (config.pattern && typeof value === 'string' && !config.pattern.test(value)) {
        fieldErrors.push(config.patternMessage || `${fieldName} 형식이 올바르지 않습니다.`);
      }

      // 비동기 유효성 검사
      if (config.asyncValidator) {
        try {
          const isValid = await config.asyncValidator(value);
          if (!isValid) {
            fieldErrors.push(`${fieldName} 값이 유효하지 않습니다.`);
          }
        } catch (error) {
          fieldErrors.push(`${fieldName} 값을 검증하는 중 오류가 발생했습니다.`);
        }
      }

      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
      }

      if (fieldWarnings.length > 0) {
        warnings[fieldName] = fieldWarnings;
      }
    }

    const result: FormValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings: Object.keys(warnings).length > 0 ? warnings : undefined
    };

    this.notifyListeners(result);
    return result;
  }

  // 실시간 필드 유효성 검사
  async validateField(fieldName: string, value: any, formData: any): Promise<string[]> {
    const config = this.validators.get(fieldName);
    if (!config) {
      return [];
    }

    const errors: string[] = [];

    // 필수 필드 검사
    if (config.required && this.isEmpty(value)) {
      errors.push(config.requiredMessage || `${fieldName}은(는) 필수 입력 항목입니다.`);
    }

    // 조건부 유효성 검사
    if (config.customRules) {
      for (const rule of config.customRules) {
        if (!rule.condition || rule.condition(formData)) {
          const isValid = await Promise.resolve(rule.validator(value, formData));
          if (!isValid) {
            errors.push(rule.message);
          }
        }
      }
    }

    // 최소 길이 검사
    if (config.minLength !== undefined && typeof value === 'string' && value.length < config.minLength) {
      errors.push(`${fieldName}은(는) 최소 ${config.minLength}자 이상이어야 합니다.`);
    }

    // 최대 길이 검사
    if (config.maxLength !== undefined && typeof value === 'string' && value.length > config.maxLength) {
      errors.push(`${fieldName}은(는) 최대 ${config.maxLength}자를 넘을 수 없습니다.`);
    }

    // 패턴 검사
    if (config.pattern && typeof value === 'string' && !config.pattern.test(value)) {
      errors.push(config.patternMessage || `${fieldName} 형식이 올바르지 않습니다.`);
    }

    return errors;
  }

  // 필드 값 가져오기 (중첩된 객체 지원)
  private getFieldValue(formData: any, fieldName: string): any {
    return fieldName.split('.').reduce((obj, key) => obj?.[key], formData);
  }

  // 값이 비어있는지 확인
  private isEmpty(value: any): boolean {
    return value === null || 
           value === undefined || 
           (typeof value === 'string' && value.trim() === '') ||
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && value.constructor === Object && Object.keys(value).length === 0);
  }

  // 기본 유효성 검사 규칙들
  static getBuiltInRules() {
    return {
      email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      phone: (value: string) => /^(\+?82-?|0)\d{1,3}-?\d{3,4}-?\d{4}$/.test(value),
      url: (value: string) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      minLength: (min: number) => (value: string) => typeof value === 'string' && value.length >= min,
      maxLength: (max: number) => (value: string) => typeof value === 'string' && value.length <= max,
      min: (min: number) => (value: number) => typeof value === 'number' && value >= min,
      max: (max: number) => (value: number) => typeof value === 'number' && value <= max,
      pattern: (regex: RegExp) => (value: string) => typeof value === 'string' && regex.test(value),
      equalTo: (otherFieldName: string) => (value: any, formData: any) => {
        const otherValue = otherFieldName.split('.').reduce((obj, key) => obj?.[key], formData);
        return value === otherValue;
      },
      notEqualTo: (otherFieldName: string) => (value: any, formData: any) => {
        const otherValue = otherFieldName.split('.').reduce((obj, key) => obj?.[key], formData);
        return value !== otherValue;
      }
    };
  }

  // 빠른 필드 설정
  addRequiredField(fieldName: string, message?: string): FormValidator {
    this.addField(fieldName, {
      required: true,
      requiredMessage: message
    });
    return this;
  }

  addEmailField(fieldName: string, required: boolean = false): FormValidator {
    this.addField(fieldName, {
      required,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: '유효한 이메일 주소를 입력해주세요.',
      ...(required && { requiredMessage: '이메일 주소는 필수 입력 항목입니다.' })
    });
    return this;
  }

  addPasswordField(fieldName: string, minLength: number = 8, required: boolean = true): FormValidator {
    this.addField(fieldName, {
      required,
      minLength,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      patternMessage: '비밀번호는 최소 8자 이상이며, 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.',
      ...(required && { requiredMessage: '비밀번호는 필수 입력 항목입니다.' })
    });
    return this;
  }

  addPhoneField(fieldName: string, required: boolean = false): FormValidator {
    this.addField(fieldName, {
      required,
      pattern: /^(\+?82-?|0)\d{1,3}-?\d{3,4}-?\d{4}$/,
      patternMessage: '유효한 전화번호 형식을 입력해주세요.',
      ...(required && { requiredMessage: '전화번호는 필수 입력 항목입니다.' })
    });
    return this;
  }

  // 조건부 필드 유효성 검사 추가
  addConditionalField(fieldName: string, condition: (formData: any) => boolean, config: FieldValidationConfig): FormValidator {
    const conditionalConfig = {
      ...config,
      condition
    };
    this.addField(fieldName, conditionalConfig);
    return this;
  }

  // 유효성 검사 결과 캐시
  private validationCache: Map<string, FormValidationResult> = new Map();

  async validateWithCache(formData: any, cacheKey: string): Promise<FormValidationResult> {
    // 캐시 확인
    const cached = this.validationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.validate(formData);
    
    // 캐시 저장 (간단한 구현)
    this.validationCache.set(cacheKey, result);
    
    // 일정 시간 후 캐시 삭제
    setTimeout(() => {
      this.validationCache.delete(cacheKey);
    }, 5000);

    return result;
  }

  // 폼 초기화
  reset(): void {
    this.validators.clear();
    this.validationCache.clear();
    
    // 디바운스 타이머 정리
    for (const timer of this.debouncedValidations.values()) {
      clearTimeout(timer);
    }
    this.debouncedValidations.clear();
  }

  // 현재 설정된 유효성 검사기 가져오기
  getConfig(): Map<string, FieldValidationConfig> {
    return new Map(this.validators);
  }

  // 필드별 유효성 상태 가져오기
  getFieldStatus(fieldName: string, value: any, formData: any): {
    isValid: boolean;
    errors: string[];
    isDirty: boolean;
    isValidating: boolean;
  } {
    // 간단한 상태 정보 반환 (실제 구현에서는 더 복잡한 상태 추적 필요)
    return {
      isValid: true,
      errors: [],
      isDirty: false,
      isValidating: false
    };
  }
}

// 전역 폼 유효성 검사기 인스턴스
export const formValidator = new FormValidator();

// React 훅 형태
export function useFormValidation(initialData: any = {}, options: FormValidatorOptions = {}) {
  const [formData, setFormData] = useState(initialData);
  const [validationResult, setValidationResult] = useState<FormValidationResult>({
    isValid: true,
    errors: {},
    warnings: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<Record<string, {
    isValid: boolean;
    errors: string[];
    isDirty: boolean;
    isValidating: boolean;
  }>>({});

  const validator = useMemo(() => new FormValidator(options), [options]);

  // 폼 데이터 업데이트
  const updateField = useCallback((fieldName: string, value: any) => {
    setFormData(prev => {
      // 중첩된 필드 처리
      const newFormData = { ...prev };
      const fieldParts = fieldName.split('.');
      let current: any = newFormData;
      
      for (let i = 0; i < fieldParts.length - 1; i++) {
        if (!current[fieldParts[i]]) {
          current[fieldParts[i]] = {};
        }
        current = current[fieldParts[i]];
      }
      
      current[fieldParts[fieldParts.length - 1]] = value;
      return newFormData;
    });
  }, []);

  // 폼 유효성 검사
  const validateForm = useCallback(async () => {
    const result = await validator.validate(formData);
    setValidationResult(result);
    return result;
  }, [validator, formData]);

  // 필드별 유효성 검사
  const validateField = useCallback(async (fieldName: string) => {
    const value = fieldName.split('.').reduce((obj, key) => obj?.[key], formData);
    const errors = await validator.validateField(fieldName, value, formData);
    
    setFieldStatus(prev => ({
      ...prev,
      [fieldName]: {
        isValid: errors.length === 0,
        errors,
        isDirty: true,
        isValidating: false
      }
    }));
    
    return errors;
  }, [validator, formData]);

  // 폼 제출
  const submitForm = useCallback(async (onSubmit: (data: any) => Promise<void> | void) => {
    setIsSubmitting(true);
    try {
      const result = await validateForm();
      if (result.isValid) {
        await onSubmit(formData);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, formData]);

  // 폼 초기화
  const resetForm = useCallback(() => {
    setFormData(initialData);
    setValidationResult({
      isValid: true,
      errors: {},
      warnings: {}
    });
    setFieldStatus({});
    validator.reset();
  }, [initialData, validator]);

  return {
    formData,
    validationResult,
    isSubmitting,
    fieldStatus,
    updateField,
    validateForm,
    validateField,
    submitForm,
    resetForm
  };
}

// 유효성 검사 훅 (필드 단위)
export function useFieldValidation(fieldName: string, config: FieldValidationConfig, initialValue?: any) {
  const [value, setValue] = useState(initialValue || '');
  const [errors, setErrors] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const validator = useMemo(() => new FormValidator(), []);

  // 필드 설정
  useEffect(() => {
    validator.addField(fieldName, config);
  }, [fieldName, config, validator]);

  // 값 변경 시 유효성 검사
  const handleChange = useCallback((newValue: any) => {
    setValue(newValue);
    setIsDirty(true);
  }, []);

  const validate = useCallback(async () => {
    setIsValidating(true);
    try {
      const fieldErrors = await validator.validateField(fieldName, value, { [fieldName]: value });
      setErrors(fieldErrors);
      return fieldErrors.length === 0;
    } finally {
      setIsValidating(false);
    }
  }, [validator, fieldName, value]);

  // 실시간 유효성 검사
  useEffect(() => {
    if (isDirty && config.validateOnChange) {
      const timeoutId = setTimeout(() => {
        validate();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [value, isDirty, config.validateOnChange, validate]);

  return {
    value,
    errors,
    isDirty,
    isValidating,
    handleChange,
    validate,
    setValue
  };
}

// 유효성 검사 빌더
export class ValidationRuleBuilder {
  private rules: ValidationRule[] = [];

  addRule(name: string, validator: (value: any, formData?: any) => boolean | Promise<boolean>, message: string) {
    this.rules.push({ name, validator, message });
    return this;
  }

  addCondition(condition: (formData: any) => boolean) {
    // 마지막에 추가된 규칙에 조건 추가
    if (this.rules.length > 0) {
      const lastRule = this.rules[this.rules.length - 1];
      this.rules[this.rules.length - 1] = {
        ...lastRule,
        condition
      };
    }
    return this;
  }

  build(): ValidationRule[] {
    return [...this.rules];
  }

  reset() {
    this.rules = [];
    return this;
  }
}

// 자주 사용하는 유효성 검사 템플릿
export const ValidationTemplates = {
  // 계정 등록 폼
  accountRegistration: () => {
    return new ValidationRuleBuilder()
      .addRule(
        'unique-email',
        async (value: string) => {
          // 실제 API 호출을 통해 이메일 중복 확인
          // const response = await api.checkEmailUnique(value);
          // return response.isUnique;
          return true; // 더미 값
        },
        '이미 사용 중인 이메일입니다.'
      )
      .addRule(
        'password-strength',
        (value: string) => {
          return value.length >= 8 && 
                 /[A-Z]/.test(value) && 
                 /[a-z]/.test(value) && 
                 /\d/.test(value) && 
                 /[@$!%*?&]/.test(value);
        },
        '비밀번호는 최소 8자 이상이며, 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.'
      )
      .build();
  },

  // 메시지 발송 폼
  messageSending: () => {
    return new ValidationRuleBuilder()
      .addRule(
        'message-length',
        (value: string) => value.length <= 4096,
        '메시지는 최대 4096자까지 입력할 수 있습니다.'
      )
      .addRule(
        'message-empty',
        (value: string) => value.trim() !== '',
        '메시지를 입력해주세요.'
      )
      .build();
  },

  // 그룹 선택 폼
  groupSelection: () => {
    return new ValidationRuleBuilder()
      .addRule(
        'at-least-one-group',
        (value: string[]) => Array.isArray(value) && value.length > 0,
        '최소 하나 이상의 그룹을 선택해주세요.'
      )
      .build();
  },

  // 자동 응답 설정 폼
  autoReplySetting: () => {
    return new ValidationRuleBuilder()
      .addRule(
        'keyword-not-empty',
        (value: string) => value.trim() !== '',
        '키워드를 입력해주세요.'
      )
      .addRule(
        'response-not-empty',
        (value: string, formData: any) => {
          // 키워드와 응답 중 하나 이상이 있어야 함
          return formData.keyword?.trim() !== '' || value.trim() !== '';
        },
        '응답 내용을 입력해주세요.'
      )
      .build();
  }
};

// 유효성 검사 유틸리티 함수들
export const validationUtils = {
  // 이메일 형식 검사
  isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  // 전화번호 형식 검사
  isValidPhone: (phone: string) => /^(\+?82-?|0)\d{1,3}-?\d{3,4}-?\d{4}$/.test(phone),

  // URL 형식 검사
  isValidUrl: (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // 비밀번호 강도 검사
  getPasswordStrength: (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    return {
      score,
      strength: score < 3 ? 'week' : score < 5 ? 'medium' : 'strong'
    };
  },

  // 문자열 길이 검사
  checkLength: (value: string, min?: number, max?: number) => {
    if (min !== undefined && value.length < min) return false;
    if (max !== undefined && value.length > max) return false;
    return true;
  },

  // 숫자 범위 검사
  checkRange: (value: number, min?: number, max?: number) => {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  }
};
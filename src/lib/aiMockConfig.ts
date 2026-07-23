// AI Mock 모드 설정
// MOCK_AI=true 환경변수로 실제 API 호출 없이 빠른 개발 가능

export const isAIMockEnabled = (): boolean => {
  return typeof window !== 'undefined' 
    ? localStorage.getItem('MOCK_AI') === 'true' || 
      sessionStorage.getItem('MOCK_AI') === 'true'
    : process.env.MOCK_AI === 'true' ||
      process.env.NEXT_PUBLIC_MOCK_AI === 'true';
};

// Mock 데이터 생성 함수들
export const generateMockAIResponse = (input: string): string => {
  if (!isAIMockEnabled()) {
    throw new Error('AI Mock mode not enabled');
  }
  
  // 간단한 규칙 기반 모킹
  if (input.toLowerCase().includes('hello') || input.toLowerCase().includes('hi')) {
    return 'Hello! This is a mocked AI response for development.';
  }
  
  if (input.toLowerCase().includes('broadcast') || input.toLowerCase().includes('send')) {
    return 'Broadcast message created successfully. This is a mocked response for development.';
  }
  
  if (input.toLowerCase().includes('analyze') || input.toLowerCase().includes('analysis')) {
    return 'Analysis complete: 85% engagement rate predicted. This is a mocked response for development.';
  }
  
  return `Mocked AI response for: "${input}". This simulates actual AI processing during development.`;
};

export const generateMockAIBroadcast = (message: string, recipients: number): any => {
  if (!isAIMockEnabled()) {
    throw new Error('AI Mock mode not enabled');
  }
  
  return {
    id: `mock_${Date.now()}`,
    message,
    recipients,
    status: 'completed',
    stats: {
      sent: recipients,
      delivered: Math.floor(recipients * 0.95),
      opened: Math.floor(recipients * 0.85),
      clicked: Math.floor(recipients * 0.3),
      engagementRate: '85%',
    },
    createdAt: new Date().toISOString(),
    completedAt: new Date(Date.now() + 5000).toISOString(), // 5초 후 완료
  };
};

// Mock 비용: 실제 API 호출 비용 절감
export const getMockAICostEstimate = (input: string): number => {
  if (!isAIMockEnabled()) {
    throw new Error('AI Mock mode not enabled');
  }
  
  // 실제 API 비용을 모킹 - 실제 비용은 0.001~0.03 달러
  return 0.0; // Mock 모드에서는 무료
};
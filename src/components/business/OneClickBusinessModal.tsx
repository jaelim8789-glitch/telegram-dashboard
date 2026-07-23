"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/business-templates";
import { generateBusinessPackage, BusinessPackage } from "@/lib/ai/business-generator";
import { useDashboardStore } from "@/store/useDashboardStore";

interface OneClickBusinessModalProps {
  open?: boolean;
  onClose?: () => void;
}

export default function OneClickBusinessModal({ open, onClose }: OneClickBusinessModalProps) {
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [userInput, setUserInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [businessPackage, setBusinessPackage] = useState<BusinessPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(5);

  // Use store state for modal visibility
  const storeOpen = useDashboardStore((state) => state.showBusinessModal);
  const setShowBusinessModal = useDashboardStore((state) => state.setShowBusinessModal);

  // Determine if modal should be open based on props or store
  const isOpen = open !== undefined ? open : storeOpen;

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setUserInput("");
      setSelectedCategory("");
      setBusinessPackage(null);
      setError(null);
      setTimer(5);
    }
  }, [isOpen]);

  // Timer for loading screen
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (step === "loading") {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setShowBusinessModal(false);
    }
  };

  const handleGenerate = async () => {
    if (!userInput.trim()) return;
    
    setStep("loading");
    setError(null);
    setTimer(5);
    
    try {
      const result = await generateBusinessPackage(userInput, selectedCategory || undefined);
      setBusinessPackage(result);
      setStep("result");
    } catch (err) {
      setError("비즈니스 패키지 생성에 실패했습니다. 다시 시도해주세요.");
      console.error("Error generating business package:", err);
    }
  };

  const handleApply = () => {
    // 여기에 실제 적용 로직을 구현해야 합니다
    // FAQ → 자동응답 규칙에 등록
    // 프로필 → 계정 프로필에 저장
    // 예약문자 → 템플릿에 등록
    console.log("Applying business package:", businessPackage);
    handleClose();
  };

  const handleEditField = (field: keyof BusinessPackage, value: any) => {
    if (!businessPackage) return;
    
    setBusinessPackage({
      ...businessPackage,
      [field]: value
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-app-card rounded-2xl shadow-2xl flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-app-border">
              <h2 className="text-xl font-bold text-app-text">
                {step === "input" && "비즈니스 시작하기"}
                {step === "loading" && "AI가 비즈니스 패키지를 생성 중입니다..."}
                {step === "result" && "생성된 비즈니스 패키지"}
              </h2>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {step === "input" && (
                  <motion.div
                    key="input"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-app-text mb-2">
                        어떤 비즈니스를 시작하시겠어요?
                      </h3>
                      <p className="text-sm text-app-text-muted">
                        예: "부동산 회사 하나 만들어", "카페 오픈 준비 중이에요"
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="비즈니스에 대해 자유롭게 입력해주세요..."
                        className="text-lg py-6"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                      />

                      <div>
                        <Label className="text-sm text-app-text-muted mb-2 block">
                          카테고리 선택 (선택)
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {BUSINESS_CATEGORIES.map((category) => (
                            <Badge
                              key={category}
                              variant={selectedCategory === category ? "default" : "outline"}
                              className={`cursor-pointer ${selectedCategory === category ? 'bg-app-primary hover:bg-app-primary' : ''}`}
                              onClick={() => setSelectedCategory(selectedCategory === category ? "" : category)}
                            >
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button 
                        className="w-full py-6 text-lg" 
                        onClick={handleGenerate}
                        disabled={!userInput.trim()}
                      >
                        AI로 비즈니스 패키지 생성
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === "loading" && (
                  <motion.div
                    key="loading"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <div className="relative mb-6">
                      <Loader2 className="h-16 w-16 animate-spin text-app-primary" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-app-primary">{timer}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-medium text-app-text mb-2">
                      AI가 비즈니스 패키지를 생성 중입니다...
                    </h3>
                    <p className="text-app-text-muted text-center max-w-md">
                      소개문, FAQ, 자동응답 규칙, 홍보문, 프로필, 공지사항, 예약문자 템플릿을
                      <br />
                      동시에 생성하고 있습니다.
                    </p>
                    
                    <div className="mt-8 w-full max-w-md space-y-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-app-text">비즈니스 소개문 생성 중...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-app-text">FAQ 5~10개 생성 중...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-app-text">자동응답 규칙 생성 중...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-app-text">홍보문 생성 중...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === "result" && businessPackage && (
                  <motion.div
                    key="result"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="space-y-6"
                  >
                    {error ? (
                      <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="text-red-500">{error}</span>
                      </div>
                    ) : (
                      <>
                        <div className="bg-app-card-hover rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-app-text">{businessPackage.businessName}</h3>
                              <p className="text-sm text-app-text-muted">{businessPackage.category} | 생성됨</p>
                            </div>
                            <Badge variant="secondary">{businessPackage.category}</Badge>
                          </div>
                        </div>

                        <Tabs defaultValue="introduction" className="w-full">
                          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
                            <TabsTrigger value="introduction">소개문</TabsTrigger>
                            <TabsTrigger value="faq">FAQ</TabsTrigger>
                            <TabsTrigger value="autoReplies">자동응답</TabsTrigger>
                            <TabsTrigger value="promotions">홍보문</TabsTrigger>
                            <TabsTrigger value="profile">프로필</TabsTrigger>
                          </TabsList>

                          <TabsContent value="introduction" className="mt-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>비즈니스 소개문</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Textarea
                                  value={businessPackage.introduction}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleEditField('introduction', e.target.value)}
                                  rows={4}
                                />
                              </CardContent>
                            </Card>
                          </TabsContent>

                          <TabsContent value="faq" className="mt-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>FAQ ({businessPackage.faq.length})</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  {businessPackage.faq.map((item, index) => (
                                    <div key={item.q} className="space-y-2 p-3 border border-app-border rounded-lg">
                                      <Label>질문 {index + 1}</Label>
                                      <Input
                                        value={item.q}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                          const newFaq = [...businessPackage.faq];
                                          newFaq[index].q = e.target.value;
                                          handleEditField('faq', newFaq);
                                        }}
                                      />
                                      <Label>답변</Label>
                                      <Textarea
                                        value={item.a}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                          const newFaq = [...businessPackage.faq];
                                          newFaq[index].a = e.target.value;
                                          handleEditField('faq', newFaq);
                                        }}
                                        rows={2}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </TabsContent>

                          <TabsContent value="autoReplies" className="mt-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>자동응답 규칙 ({businessPackage.autoReplies.length})</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  {businessPackage.autoReplies.map((item, index) => (
                                    <div key={item.keyword} className="space-y-2 p-3 border border-app-border rounded-lg">
                                      <Label>키워드</Label>
                                      <Input
                                        value={item.keyword}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                          const newAutoReplies = [...businessPackage.autoReplies];
                                          newAutoReplies[index].keyword = e.target.value;
                                          handleEditField('autoReplies', newAutoReplies);
                                        }}
                                      />
                                      <Label>응답</Label>
                                      <Textarea
                                        value={item.response}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                          const newAutoReplies = [...businessPackage.autoReplies];
                                          newAutoReplies[index].response = e.target.value;
                                          handleEditField('autoReplies', newAutoReplies);
                                        }}
                                        rows={2}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </TabsContent>

                          <TabsContent value="promotions" className="mt-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>홍보문</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div>
                                    <Label>짧은 버전</Label>
                                    <Textarea
                                      value={businessPackage.promotions.short}
                                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                        handleEditField('promotions', {
                                          ...businessPackage.promotions,
                                          short: e.target.value
                                        });
                                      }}
                                      rows={2}
                                    />
                                  </div>
                                  <div>
                                    <Label>긴 버전</Label>
                                    <Textarea
                                      value={businessPackage.promotions.long}
                                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                        handleEditField('promotions', {
                                          ...businessPackage.promotions,
                                          long: e.target.value
                                        });
                                      }}
                                      rows={4}
                                    />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </TabsContent>

                          <TabsContent value="profile" className="mt-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>비즈니스 프로필</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div>
                                    <Label>이름</Label>
                                    <Input
                                      value={businessPackage.profile.name}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        handleEditField('profile', {
                                          ...businessPackage.profile,
                                          name: e.target.value
                                        });
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label>설명</Label>
                                    <Textarea
                                      value={businessPackage.profile.desc}
                                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                        handleEditField('profile', {
                                          ...businessPackage.profile,
                                          desc: e.target.value
                                        });
                                      }}
                                      rows={2}
                                    />
                                  </div>
                                  <div>
                                    <Label>연락처</Label>
                                    <Input
                                      value={businessPackage.profile.contact}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        handleEditField('profile', {
                                          ...businessPackage.profile,
                                          contact: e.target.value
                                        });
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label>주소 (선택)</Label>
                                    <Input
                                      value={businessPackage.profile.address || ""}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        handleEditField('profile', {
                                          ...businessPackage.profile,
                                          address: e.target.value || undefined
                                        });
                                      }}
                                    />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </TabsContent>
                        </Tabs>

                        {/* Additional sections */}
                        <Card>
                          <CardHeader>
                            <CardTitle>공지사항 ({businessPackage.notices.length})</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {businessPackage.notices.map((notice, index) => (
                                <div key={notice.title} className="space-y-2 p-3 border border-app-border rounded-lg">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label>제목</Label>
                                      <Input
                                        value={notice.title}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                          const newNotices = [...businessPackage.notices];
                                          newNotices[index].title = e.target.value;
                                          handleEditField('notices', newNotices);
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label>내용</Label>
                                      <Input
                                        value={notice.content}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                          const newNotices = [...businessPackage.notices];
                                          newNotices[index].content = e.target.value;
                                          handleEditField('notices', newNotices);
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>예약문자 템플릿</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Textarea
                              value={businessPackage.reservationTemplate}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleEditField('reservationTemplate', e.target.value)}
                              rows={4}
                            />
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-app-border">
              {step === "result" && businessPackage && !error && (
                <Button variant="primary" onClick={handleApply}>
                  적용하기
                </Button>
              )}
              <Button variant="outline" onClick={handleClose}>
                닫기
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
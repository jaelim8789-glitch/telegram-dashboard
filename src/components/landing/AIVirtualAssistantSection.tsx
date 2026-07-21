'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualAssistant {
  id: number;
  name: string;
  gender: 'female' | 'male';
  position: string;
  description: string;
  avatar: string;
}

const AIVirtualAssistantSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 8명의 AI 비서 정보 (여성 4명, 남성 4명)
  const virtualAssistants: VirtualAssistant[] = [
    {
      id: 1,
      name: '에이린',
      gender: 'female',
      position: 'AI 비서',
      description: '고객 응대 및 일정 관리를 전문으로 하는 AI 비서입니다.',
      avatar: '/avatars/female-assistant-1.jpg'
    },
    {
      id: 2,
      name: '제이슨',
      gender: 'male',
      position: 'AI 비서',
      description: '문서 작성 및 번역을 전문으로 하는 AI 비서입니다.',
      avatar: '/avatars/male-assistant-1.jpg'
    },
    {
      id: 3,
      name: '소피아',
      gender: 'female',
      position: 'AI 비서',
      description: '이메일 관리 및 회의 준비를 전문으로 하는 AI 비서입니다.',
      avatar: '/avatars/female-assistant-2.jpg'
    },
    {
      id: 4,
      name: '마이클',
      gender: 'male',
      position: 'AI 비서',
      description: '데이터 분석 및 보고서 작성 전문 AI 비서입니다.',
      avatar: '/avatars/male-assistant-2.jpg'
    },
    {
      id: 5,
      name: '에밀리',
      gender: 'female',
      position: 'AI 비서',
      description: 'SNS 관리 및 콘텐츠 제작을 전문으로 하는 AI 비서입니다.',
      avatar: '/avatars/female-assistant-3.jpg'
    },
    {
      id: 6,
      name: '데이빗',
      gender: 'male',
      position: 'AI 비서',
      description: '재무 관리 및 세무 처리를 전문으로 하는 AI 비서입니다.',
      avatar: '/avatars/male-assistant-3.jpg'
    },
    {
      id: 7,
      name: '클레어',
      gender: 'female',
      position: 'AI 비서',
      description: '계약 관리 및 법률 자문을 전문으로 하는 AI 비서입니다.',
      avatar: '/avatars/female-assistant-4.jpg'
    },
    {
      id: 8,
      name: '톰',
      gender: 'male',
      position: 'AI 비서',
      description: '고객 분석 및 마케팅 전략을 전문으로 하는 AI 비서입니다.',
      avatar: '/avatars/male-assistant-4.jpg'
    }
  ];

  const assistantsPerPage = 4;
  const totalPages = Math.ceil(virtualAssistants.length / assistantsPerPage);

  const displayedAssistants = virtualAssistants.slice(
    currentIndex * assistantsPerPage,
    (currentIndex + 1) * assistantsPerPage
  );

  const goToPreviousPage = () => {
    setCurrentIndex(prev => (prev === 0 ? totalPages - 1 : prev - 1));
  };

  const goToNextPage = () => {
    setCurrentIndex(prev => (prev === totalPages - 1 ? 0 : prev + 1));
  };

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            AI 가상 비서 팀
          </motion.h2>
          <motion.p 
            className="text-lg text-gray-600 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            TeleMon의 AI 가상 비서들이 당신의 업무를 도와드립니다. 
            고객 응대부터 문서 작성, 일정 관리까지 전문적인 도움을 드립니다.
          </motion.p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayedAssistants.map((assistant, index) => (
              <motion.div
                key={assistant.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="p-6">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                        <img 
                          src={assistant.avatar} 
                          alt={assistant.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // 이미지 로드 실패 시 기본 이미지 표시
                            const target = e.target as HTMLImageElement;
                            target.src = `https://placehold.co/150x150/${
                              assistant.gender === 'female' ? 'ffcce6' : 'cce6ff'
                            }/333?text=${assistant.name.charAt(0)}`
                          }}
                        />
                      </div>
                      <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white ${
                        assistant.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'
                      }`}></div>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900">{assistant.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{assistant.position}</p>
                    <p className="text-sm text-gray-600 text-center">{assistant.description}</p>
                    
                    <div className="mt-4 flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        assistant.gender === 'female' 
                          ? 'bg-pink-100 text-pink-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {assistant.gender === 'female' ? '여성' : '남성'}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        AI 비서
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 페이징 컨트롤 */}
          <div className="flex justify-center items-center mt-12 gap-4">
            <button
              onClick={goToPreviousPage}
              className="p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="flex gap-2">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full ${
                    currentIndex === index ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={goToNextPage}
              className="p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <motion.div
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full font-medium"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            AI 비서와 함께 일하는 스마트한 방식
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AIVirtualAssistantSection;
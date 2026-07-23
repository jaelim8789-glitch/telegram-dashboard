'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, MessageCircle, Settings, Phone, Filter, Heart, Star, Power, Activity, TrendingUp, Users, Target, CheckCircle, Clock, AlertTriangle, Plus, Users as UsersIcon, Workflow, Zap } from 'lucide-react';
import LandingImage from '@/components/LandingImage';

interface VirtualAssistant {
  id: number;
  name: string;
  gender: 'female' | 'male';
  position: string;
  description: string;
  avatar: string;
  specialty: string[];
  personality: string;
  experience: string;
  availability: string;
  contactMethods: string[];
  rating: number;
  isActive: boolean;
  performance: {
    efficiency: number;
    satisfaction: number;
    tasksCompleted: number;
    responseTime: number; // ì´??¨ì
  };
}

interface UserPreferences {
  preferredGender: 'all' | 'female' | 'male';
  preferredRoles: string[];
  preferredPersonality: string;
}

interface Team {
  id: string;
  name: string;
  members: number[]; // assistant IDs
  purpose: string;
}

interface Workflow {
  id: string;
  name: string;
  steps: {
    assistantId: number;
    task: string;
    order: number;
  }[];
  description: string;
}

const AIVirtualAssistantSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAssistant, setSelectedAssistant] = useState<VirtualAssistant | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    preferredGender: 'all',
    preferredRoles: [],
    preferredPersonality: ''
  });
  const [filteredAssistants, setFilteredAssistants] = useState<VirtualAssistant[]>([]);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showWorkflows, setShowWorkflows] = useState(false);
  const [teams, setTeams] = useState<Team[]>([
    {
      id: 'team-1',
      name: 'ê³ ê° ?ë? ?',
      members: [1, 5], // ?ì´ë¦? ?ë?ë¦?
      purpose: 'ê³ ê° ë¬¸ì ?ë? ë°?ì§??
    },
    {
      id: 'team-2',
      name: 'ë¬¸ì ì²ë¦¬ ?',
      members: [2, 4], // ?ì´?? ë§ì´??
      purpose: 'ë¬¸ì ?ì± ë°??°ì´??ë¶ì'
    },
    {
      id: 'team-3',
      name: '?¬ë¬´ ?ê³ ?',
      members: [6, 7], // ?°ì´ë¹? ?´ë ??
      purpose: '?¬ë¬´ ê´ë¦?ë°?ê³ì½ ì²ë¦¬'
    }
  ]);
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 'wf-1',
      name: 'ê³ ê° ë¬¸ì ì²ë¦¬',
      description: 'ê³ ê° ë¬¸ìë¥?ë°ê³  ?´ê²°?ë ?ë?ë ?í¬?ë¡??,
      steps: [
        { assistantId: 1, task: 'ë¬¸ì ?ì ë°?ë¶ë¥', order: 1 },
        { assistantId: 5, task: 'SNS ì±ë ?ëµ', order: 2 },
        { assistantId: 7, task: 'ë²ì  ê²???ì ???ë¬', order: 3 }
      ]
    },
    {
      id: 'wf-2',
      name: 'ë³´ê³ ???ì±',
      description: 'ì£¼ê° ë³´ê³ ?ë? ?ë?¼ë¡ ?ì±?ë ?í¬?ë¡??,
      steps: [
        { assistantId: 4, task: '?°ì´???ì§ ë°?ë¶ì', order: 1 },
        { assistantId: 2, task: 'ë¬¸ì ?ì±', order: 2 },
        { assistantId: 3, task: 'ìµì¢ ê²??ë°?ë°°í¬', order: 3 }
      ]
    }
  ]);
  const [newTeam, setNewTeam] = useState({ name: '', purpose: '', members: [] as number[] });
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '', steps: [] as { assistantId: number; task: string; order: number }[] });
  const [editingWorkflowStep, setEditingWorkflowStep] = useState<{ workflowId: string; stepIndex: number } | null>(null);
  
  // 8ëªì AI ë¹ì ?ë³´ (?¬ì± 4ëª? ?¨ì± 4ëª?
  const [virtualAssistants, setVirtualAssistants] = useState<VirtualAssistant[]>([
    {
      id: 1,
      name: '?ì´ë¦?,
      gender: 'female',
      position: 'AI ë¹ì',
      description: 'ê³ ê° ?ë? ë°??¼ì  ê´ë¦¬ë? ?ë¬¸?¼ë¡ ?ë AI ë¹ì?ë??',
      avatar: '/avatars/female-assistant-1.jpg',
      specialty: ['ê³ ê° ?ë?', '?¼ì  ê´ë¦?, 'ë¬¸ì ?ë¦¬'],
      personality: 'ì¹ì ?ê³  ê¼¼ê¼¼??,
      experience: 'ê³ ê° ?ë¹??5??ê²½í',
      availability: '24?ê° ê°??,
      contactMethods: ['ì±í', '?ì±'],
      rating: 4.8,
      isActive: true,
      performance: {
        efficiency: 95,
        satisfaction: 97,
        tasksCompleted: 1240,
        responseTime: 2.3
      }
    },
    {
      id: 2,
      name: '?ì´??,
      gender: 'male',
      position: 'AI ë¹ì',
      description: 'ë¬¸ì ?ì± ë°?ë²ì­???ë¬¸?¼ë¡ ?ë AI ë¹ì?ë??',
      avatar: '/avatars/male-assistant-1.jpg',
      specialty: ['ë¬¸ì ?ì±', 'ë²ì­', 'ë¦¬ìì¹?],
      personality: '?¼ë¦¬?ì´ê³??í??,
      experience: 'ë¬¸ì ì²ë¦¬ 4??ê²½í',
      availability: '?ì¼ 09:00-18:00',
      contactMethods: ['?´ë©??, 'ì±í'],
      rating: 4.6,
      isActive: true,
      performance: {
        efficiency: 92,
        satisfaction: 94,
        tasksCompleted: 980,
        responseTime: 3.1
      }
    },
    {
      id: 3,
      name: '?í¼??,
      gender: 'female',
      position: 'AI ë¹ì',
      description: '?´ë©??ê´ë¦?ë°??ì ì¤ë¹ë? ?ë¬¸?¼ë¡ ?ë AI ë¹ì?ë??',
      avatar: '/avatars/female-assistant-2.jpg',
      specialty: ['?´ë©??ê´ë¦?, '?ì ì¤ë¹?, '?ë¬´ ?ë¦¬'],
      personality: '?¨ì¨?ì´ê³?? ì??,
      experience: '?¬ë¬´ ê´ë¦?6??ê²½í',
      availability: '24?ê° ê°??,
      contactMethods: ['?´ë©??, 'ì±í', '?ì±'],
      rating: 4.9,
      isActive: true,
      performance: {
        efficiency: 98,
        satisfaction: 99,
        tasksCompleted: 1560,
        responseTime: 1.8
      }
    },
    {
      id: 4,
      name: 'ë§ì´??,
      gender: 'male',
      position: 'AI ë¹ì',
      description: '?°ì´??ë¶ì ë°?ë³´ê³ ???ì± ?ë¬¸ AI ë¹ì?ë??',
      avatar: '/avatars/male-assistant-2.jpg',
      specialty: ['?°ì´??ë¶ì', 'ë³´ê³ ???ì±', '?µê³'],
      personality: 'ë¶ì?ì´ê³?ì²´ê³?ì',
      experience: '?°ì´??ë¶ì 5??ê²½í',
      availability: '?ì¼ 08:00-20:00',
      contactMethods: ['ì±í', '?´ë©??],
      rating: 4.7,
      isActive: true,
      performance: {
        efficiency: 90,
        satisfaction: 93,
        tasksCompleted: 820,
        responseTime: 4.2
      }
    },
    {
      id: 5,
      name: '?ë?ë¦?,
      gender: 'female',
      position: 'AI ë¹ì',
      description: 'SNS ê´ë¦?ë°?ì½íì¸??ì???ë¬¸?¼ë¡ ?ë AI ë¹ì?ë??',
      avatar: '/avatars/female-assistant-3.jpg',
      specialty: ['SNS ê´ë¦?, 'ì½íì¸??ì', 'ë§ì???],
      personality: 'ì°½ì?ì´ê³?ê°ê°?ì',
      experience: '?ì???ë§ì???4??ê²½í',
      availability: '24?ê° ê°??,
      contactMethods: ['ì±í', '?´ë©??],
      rating: 4.5,
      isActive: true,
      performance: {
        efficiency: 88,
        satisfaction: 91,
        tasksCompleted: 750,
        responseTime: 2.7
      }
    },
    {
      id: 6,
      name: '?°ì´ë¹?,
      gender: 'male',
      position: 'AI ë¹ì',
      description: '?¬ë¬´ ê´ë¦?ë°??¸ë¬´ ì²ë¦¬ë¥??ë¬¸?¼ë¡ ?ë AI ë¹ì?ë??',
      avatar: '/avatars/male-assistant-3.jpg',
      specialty: ['?¬ë¬´ ê´ë¦?, '?¸ë¬´ ì²ë¦¬', '?ê³'],
      personality: '?í?ê³  ? ë¢°?????ì',
      experience: '?¬ë¬´ ?ê³ 7??ê²½í',
      availability: '?ì¼ 09:00-17:00',
      contactMethods: ['?´ë©??, 'ì±í'],
      rating: 4.9,
      isActive: true,
      performance: {
        efficiency: 96,
        satisfaction: 98,
        tasksCompleted: 1100,
        responseTime: 3.5
      }
    },
    {
      id: 7,
      name: '?´ë ??,
      gender: 'female',
      position: 'AI ë¹ì',
      description: 'ê³ì½ ê´ë¦?ë°?ë²ë¥  ?ë¬¸???ë¬¸?¼ë¡ ?ë AI ë¹ì?ë??',
      avatar: '/avatars/female-assistant-4.jpg',
      specialty: ['ê³ì½ ê´ë¦?, 'ë²ë¥  ?ë¬¸', 'ë¬¸ì ê²??],
      personality: '? ì¤?ê³  ?ë¬¸?ì',
      experience: 'ë²ë¥  ?ë¬¸ 6??ê²½í',
      availability: '?ì¼ 10:00-18:00',
      contactMethods: ['?´ë©??, 'ì±í'],
      rating: 4.8,
      isActive: true,
      performance: {
        efficiency: 94,
        satisfaction: 96,
        tasksCompleted: 890,
        responseTime: 5.1
      }
    },
    {
      id: 8,
      name: '??,
      gender: 'male',
      position: 'AI ë¹ì',
      description: 'ê³ ê° ë¶ì ë°?ë§ì????ëµ???ë¬¸?¼ë¡ ?ë AI ë¹ì?ë??',
      avatar: '/avatars/male-assistant-4.jpg',
      specialty: ['ê³ ê° ë¶ì', 'ë§ì????ëµ', '?ì¥ ì¡°ì¬'],
      personality: '?ëµ?ì´ê³??µì°°???ì',
      experience: 'ë§ì????ëµ 5??ê²½í',
      availability: '24?ê° ê°??,
      contactMethods: ['ì±í', '?´ë©??, '?ì±'],
      rating: 4.7,
      isActive: true,
      performance: {
        efficiency: 91,
        satisfaction: 94,
        tasksCompleted: 720,
        responseTime: 3.8
      }
    }
  ]);

  // ?¬ì©??? í¸?ì ?°ë¼ AI ì§ì ?í°ë§?
  useEffect(() => {
    let filtered = [...virtualAssistants];

    // ?ì±???í ?í°ë§?
    filtered = filtered.filter(assistant => assistant.isActive);

    // ?±ë³ ?í°ë§?
    if (preferences.preferredGender !== 'all') {
      filtered = filtered.filter(assistant => assistant.gender === preferences.preferredGender);
    }

    // ??  ?í°ë§?
    if (preferences.preferredRoles.length > 0) {
      filtered = filtered.filter(assistant =>
        assistant.specialty.some(specialty =>
          preferences.preferredRoles.includes(specialty)
        )
      );
    }

    // ?±ê²© ?í°ë§?
    if (preferences.preferredPersonality) {
      filtered = filtered.filter(assistant =>
        assistant.personality.toLowerCase().includes(preferences.preferredPersonality.toLowerCase())
      );
    }

    setFilteredAssistants(filtered);
  }, [preferences, virtualAssistants]);

  // ?í°ë§ë ê²°ê³¼???°ë¼ ?ì´ì§ ?¸ë±??ì¡°ì 
  useEffect(() => {
    setCurrentIndex(0);
  }, [filteredAssistants]);

  const assistantsPerPage = 4;
  const totalPages = Math.ceil(filteredAssistants.length / assistantsPerPage);

  const displayedAssistants = filteredAssistants.slice(
    currentIndex * assistantsPerPage,
    (currentIndex + 1) * assistantsPerPage
  );

  const goToPreviousPage = () => {
    setCurrentIndex(prev => (prev === 0 ? totalPages - 1 : prev - 1));
  };

  const goToNextPage = () => {
    setCurrentIndex(prev => (prev === totalPages - 1 ? 0 : prev + 1));
  };

  const openAssistantModal = (assistant: VirtualAssistant) => {
    setSelectedAssistant(assistant);
  };

  const closeAssistantModal = () => {
    setSelectedAssistant(null);
  };

  const updatePreferences = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleRolePreference = (role: string) => {
    setPreferences(prev => {
      const newRoles = prev.preferredRoles.includes(role)
        ? prev.preferredRoles.filter(r => r !== role)
        : [...prev.preferredRoles, role];
      return { ...prev, preferredRoles: newRoles };
    });
  };

  // ì§ì ?ì±??ë¹í?±í ? ê?
  const toggleAssistantStatus = (id: number) => {
    setVirtualAssistants(prev => 
      prev.map(assistant => 
        assistant.id === id 
          ? { ...assistant, isActive: !assistant.isActive } 
          : assistant
      )
    );
  };

  // ???ë©¤ë² ì¶ê?/?ê±°
  const toggleTeamMember = (teamId: string, assistantId: number) => {
    setTeams(prev => 
      prev.map(team => 
        team.id === teamId
          ? {
              ...team,
              members: team.members.includes(assistantId)
                ? team.members.filter(id => id !== assistantId)
                : [...team.members, assistantId]
            }
          : team
      )
    );
  };

  // ??? ?ì±
  const createTeam = () => {
    if (newTeam.name && newTeam.purpose && newTeam.members.length > 0) {
      const team: Team = {
        id: `team-${Date.now()}`,
        name: newTeam.name,
        members: newTeam.members,
        purpose: newTeam.purpose
      };
      setTeams(prev => [...prev, team]);
      setNewTeam({ name: '', purpose: '', members: [] });
    }
  };

  // ?í¬?ë¡?°ì ?¨ê³ ì¶ê?
  const addWorkflowStep = (assistantId: number, task: string) => {
    if (task.trim()) {
      const newStep = {
        assistantId,
        task,
        order: newWorkflow.steps.length > 0 
          ? Math.max(...newWorkflow.steps.map(s => s.order)) + 1 
          : 1
      };
      setNewWorkflow(prev => ({
        ...prev,
        steps: [...prev.steps, newStep]
      }));
    }
  };

  // ?í¬?ë¡???ì±
  const createWorkflow = () => {
    if (newWorkflow.name && newWorkflow.description && newWorkflow.steps.length > 0) {
      const workflow: Workflow = {
        id: `wf-${Date.now()}`,
        name: newWorkflow.name,
        description: newWorkflow.description,
        steps: [...newWorkflow.steps].sort((a, b) => a.order - b.order)
      };
      setWorkflows(prev => [...prev, workflow]);
      setNewWorkflow({ name: '', description: '', steps: [] });
    }
  };

  // ?í¬?ë¡???¨ê³ ?ì 
  const updateWorkflowStep = (workflowId: string, stepIndex: number, newTask: string) => {
    setWorkflows(prev => 
      prev.map(wf => 
        wf.id === workflowId
          ? {
              ...wf,
              steps: wf.steps.map((step, idx) => 
                idx === stepIndex ? { ...step, task: newTask } : step
              )
            }
          : wf
      )
    );
    setEditingWorkflowStep(null);
  };

  // ëª¨ë  ??  ëª©ë¡ ì¶ì¶
  const allRoles = Array.from(
    new Set(virtualAssistants.flatMap(assistant => assistant.specialty))
  );

  // ?±ë¥ ?ì½ ?°ì´??ê³ì°
  const performanceSummary = {
    totalActive: virtualAssistants.filter(a => a.isActive).length,
    avgEfficiency: Math.round(virtualAssistants.reduce((sum, a) => sum + a.performance.efficiency, 0) / virtualAssistants.length),
    avgSatisfaction: Math.round(virtualAssistants.reduce((sum, a) => sum + a.performance.satisfaction, 0) / virtualAssistants.length),
    totalTasks: virtualAssistants.reduce((sum, a) => sum + a.performance.tasksCompleted, 0),
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
            AI ê°??ë¹ì ?
          </motion.h2>
          <motion.p 
            className="text-lg text-gray-600 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            TeleMon??AI ê°??ë¹ì?¤ì´ ?¹ì ???ë¬´ë¥??ì??ë¦½?ë¤. 
            ê³ ê° ?ë?ë¶??ë¬¸ì ?ì±, ?¼ì  ê´ë¦¬ê¹ì§ ?ë¬¸?ì¸ ?ì????ë¦½?ë¤.
          </motion.p>
          
          {/* ?±ë¥ ?ì½ ì¹´ë */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm text-gray-600">?ì±??/span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{performanceSummary.totalActive}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">?¨ì¨??/span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{performanceSummary.avgEfficiency}%</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-600">ë§ì¡±??/span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{performanceSummary.avgSatisfaction}%</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Target className="h-5 w-5 text-purple-500 mr-2" />
                <span className="text-sm text-gray-600">ì´??ì</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{performanceSummary.totalTasks.toLocaleString()}</p>
            </div>
          </div>
          
          {/* ?í° ë°?ê´ë¦??¹ì */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              ?í° ?¤ì 
            </button>
            <button
              onClick={() => setShowPerformance(!showPerformance)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              ?±ë¥ ë³´ê¸°
            </button>
            <button
              onClick={() => setShowTeams(!showTeams)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UsersIcon className="h-4 w-4" />
              ? êµ¬ì±
            </button>
            <button
              onClick={() => setShowWorkflows(!showWorkflows)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Workflow className="h-4 w-4" />
              ?í¬?ë¡??
            </button>
          </div>
          
          {/* ?í° ?µì */}
          {showFilter && (
            <motion.div 
              className="mt-6 p-6 bg-white rounded-xl shadow-md border border-gray-200 max-w-4xl mx-auto"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">?±ë³</h3>
                  <div className="space-y-2">
                    {(['all', 'female', 'male'] as const).map(option => (
                      <label key={option} className="flex items-center">
                        <input
                          type="radio"
                          name="gender"
                          checked={preferences.preferredGender === option}
                          onChange={() => updatePreferences('preferredGender', option)}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {option === 'all' ? '?ì²´' : option === 'female' ? '?¬ì±' : '?¨ì±'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">?ë¬¸ ë¶ì¼</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {allRoles.map(role => (
                      <label key={role} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={preferences.preferredRoles.includes(role)}
                          onChange={() => toggleRolePreference(role)}
                          className="mr-2"
                        />
                        <span className="text-sm">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">?±ê²©</h3>
                  <select
                    value={preferences.preferredPersonality}
                    onChange={(e) => updatePreferences('preferredPersonality', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">?ì²´</option>
                    <option value="ì¹ì ?ê³  ê¼¼ê¼¼??>ì¹ì ?ê³  ê¼¼ê¼¼??/option>
                    <option value="?¼ë¦¬?ì´ê³??í??>?¼ë¦¬?ì´ê³??í??/option>
                    <option value="?¨ì¨?ì´ê³?? ì??>?¨ì¨?ì´ê³?? ì??/option>
                    <option value="ë¶ì?ì´ê³?ì²´ê³?ì">ë¶ì?ì´ê³?ì²´ê³?ì</option>
                    <option value="ì°½ì?ì´ê³?ê°ê°?ì">ì°½ì?ì´ê³?ê°ê°?ì</option>
                    <option value="?í?ê³  ? ë¢°?????ì">?í?ê³  ? ë¢°?????ì</option>
                    <option value="? ì¤?ê³  ?ë¬¸?ì">? ì¤?ê³  ?ë¬¸?ì</option>
                    <option value="?ëµ?ì´ê³??µì°°???ì">?ëµ?ì´ê³??µì°°???ì</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 text-right">
                <p className="text-sm text-gray-600">
                  {filteredAssistants.length}ëªì AI ë¹ìê° ì¡°ê±´??ë§ìµ?ë¤
                </p>
              </div>
            </motion.div>
          )}
          
          {/* ?±ë¥ ??ë³´??*/}
          {showPerformance && (
            <motion.div 
              className="mt-6 p-6 bg-white rounded-xl shadow-md border border-gray-200 max-w-4xl mx-auto"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="font-medium text-gray-800 mb-4">AI ë¹ì ?±ë¥ ??ë³´??/h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">?´ë¦</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">?¨ì¨??/th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ë§ì¡±??/th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">?ì ?ë£</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">?ëµ ?ê°</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">?í</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {virtualAssistants.map(assistant => (
                      <tr key={assistant.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{assistant.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${assistant.performance.efficiency}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{assistant.performance.efficiency}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${assistant.performance.satisfaction}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{assistant.performance.satisfaction}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {assistant.performance.tasksCompleted.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {assistant.performance.responseTime}s
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => toggleAssistantStatus(assistant.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                              assistant.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            <Power className={`h-3 w-3 ${assistant.isActive ? 'text-green-500' : 'text-red-500'}`} />
                            {assistant.isActive ? '?ì±' : 'ë¹í??}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
          
          {/* ? êµ¬ì± ?¹ì */}
          {showTeams && (
            <motion.div 
              className="mt-6 p-6 bg-white rounded-xl shadow-md border border-gray-200 max-w-4xl mx-auto"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-800">AI ë¹ì ? êµ¬ì±</h3>
                <button className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                  <Plus className="h-4 w-4" />
                  ? ?ì±
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                  placeholder="? ?´ë¦"
                  className="p-2 border border-gray-300 rounded-md text-sm"
                />
                <input
                  type="text"
                  value={newTeam.purpose}
                  onChange={(e) => setNewTeam({...newTeam, purpose: e.target.value})}
                  placeholder="? ëª©ì "
                  className="p-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">???? í</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {virtualAssistants.filter(a => a.isActive).map(assistant => (
                    <div 
                      key={assistant.id}
                      className={`p-3 rounded-lg border cursor-pointer flex flex-col items-center ${
                        newTeam.members.includes(assistant.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                      onClick={() => {
                        setNewTeam(prev => ({
                          ...prev,
                          members: prev.members.includes(assistant.id)
                            ? prev.members.filter(id => id !== assistant.id)
                            : [...prev.members, assistant.id]
                        }));
                      }}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden mb-2">
                        <LandingImage 
                          src={assistant.avatar} 
                          alt={assistant.name}
                          className="w-full h-full rounded-full"
                        />
                      </div>
                      <span className="text-sm">{assistant.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={createTeam}
                disabled={!newTeam.name || !newTeam.purpose || newTeam.members.length === 0}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ? ?ì±
              </button>
              
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-3">ê¸°ì¡´ ?</h4>
                <div className="space-y-4">
                  {teams.map(team => (
                    <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold text-gray-900">{team.name}</h5>
                          <p className="text-sm text-gray-600">{team.purpose}</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {team.members.length}ëª?
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {team.members.map(memberId => {
                          const member = virtualAssistants.find(a => a.id === memberId);
                          return member ? (
                            <div key={memberId} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm">
                              <div className="w-6 h-6 rounded-full overflow-hidden">
                                <LandingImage 
                                  src={member.avatar} 
                                  alt={member.name}
                                  className="w-full h-full rounded-full"
                                />
                              </div>
                              {member.name}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* ?í¬?ë¡???¹ì */}
          {showWorkflows && (
            <motion.div 
              className="mt-6 p-6 bg-white rounded-xl shadow-md border border-gray-200 max-w-4xl mx-auto"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-800">?í¬?ë¡???ë??/h3>
                <button className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                  <Zap className="h-4 w-4" />
                  ?í¬?ë¡???ì±
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4 mb-6">
                <input
                  type="text"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})}
                  placeholder="?í¬?ë¡???´ë¦"
                  className="p-2 border border-gray-300 rounded-md text-sm"
                />
                <textarea
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({...newWorkflow, description: e.target.value})}
                  placeholder="?í¬?ë¡???¤ëª"
                  className="p-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                />
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">?í¬?ë¡???¨ê³ ì¶ê?</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    className="p-2 border border-gray-300 rounded-md text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>AI ë¹ì ? í</option>
                    {virtualAssistants.filter(a => a.isActive).map(assistant => (
                      <option key={assistant.id} value={assistant.id}>
                        {assistant.name} - {assistant.specialty.join(', ')}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="?í???ì"
                      className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button className="px-3 bg-blue-600 text-white rounded-md text-sm">
                      ì¶ê?
                    </button>
                  </div>
                </div>
                
                {newWorkflow.steps.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-700 mb-2">ì¶ê????¨ê³</h5>
                    <div className="space-y-2">
                      {newWorkflow.steps.map((step, index) => {
                        const assistant = virtualAssistants.find(a => a.id === step.assistantId);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                {step.order}
                              </span>
                              <div>
                                <div className="font-medium text-sm">{assistant?.name}</div>
                                <div className="text-xs text-gray-600">{step.task}</div>
                              </div>
                            </div>
                            <button className="text-red-500 hover:text-red-700">
                              ?? 
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={createWorkflow}
                disabled={!newWorkflow.name || !newWorkflow.description || newWorkflow.steps.length === 0}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ?í¬?ë¡???ì±
              </button>
              
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-3">ê¸°ì¡´ ?í¬?ë¡??/h4>
                <div className="space-y-4">
                  {workflows.map(workflow => (
                    <div key={workflow.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Workflow className="h-4 w-4" />
                            {workflow.name}
                          </h5>
                          <p className="text-sm text-gray-600">{workflow.description}</p>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          ?¤í
                        </button>
                      </div>
                      <div className="mt-3">
                        <h6 className="font-medium text-gray-700 mb-2">?í¬?ë¡???¨ê³:</h6>
                        <div className="space-y-2">
                          {workflow.steps.sort((a, b) => a.order - b.order).map((step, index) => {
                            const assistant = virtualAssistants.find(a => a.id === step.assistantId);
                            return (
                              <div 
                                key={index} 
                                className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                              >
                                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                  {step.order}
                                </span>
                                <div className="w-8 h-8 rounded-full overflow-hidden">
                                  <LandingImage 
                                    src={assistant?.avatar || ''} 
                                    alt={assistant?.name || ''}
                                    className="w-full h-full rounded-full"
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{assistant?.name}</div>
                                  {editingWorkflowStep?.workflowId === workflow.id && editingWorkflowStep.stepIndex === index ? (
                                    <div className="flex gap-2 mt-1">
                                      <input
                                        type="text"
                                        defaultValue={step.task}
                                        className="flex-1 p-1 border border-gray-300 rounded text-sm"
                                        onBlur={(e) => updateWorkflowStep(workflow.id, index, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            updateWorkflowStep(workflow.id, index, (e.target as HTMLInputElement).value);
                                          }
                                        }}
                                      />
                                      <button 
                                        onClick={() => setEditingWorkflowStep(null)}
                                        className="text-xs text-gray-500"
                                      >
                                        ì·¨ì
                                      </button>
                                    </div>
                                  ) : (
                                    <div 
                                      className="text-xs text-gray-600 cursor-pointer hover:underline"
                                      onClick={() => setEditingWorkflowStep({ workflowId: workflow.id, stepIndex: index })}
                                    >
                                      {step.task}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayedAssistants.map((assistant, index) => (
              <motion.div
                key={assistant.id}
                className={`bg-white rounded-xl shadow-lg overflow-hidden border ${
                  assistant.isActive ? 'border-gray-100' : 'border-red-200 bg-red-50'
                } hover:shadow-xl transition-all duration-300 cursor-pointer relative`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => openAssistantModal(assistant)}
              >
                {!assistant.isActive && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center z-10">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      ë¹í?±í??
                    </span>
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                        <LandingImage 
                          src={assistant.avatar} 
                          alt={assistant.name}
                          className="w-full h-full rounded-full"
                        />
                      </div>
                      <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white ${
                        assistant.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'
                      }`}></div>
                      
                      {/* ?ì±??ë¹í?±í ? ê? ë²í¼ */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAssistantStatus(assistant.id);
                        }}
                        className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                          assistant.isActive ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                        }`}
                      >
                        <Power className="h-4 w-4" />
                      </button>
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
                        {assistant.gender === 'female' ? '?¬ì±' : '?¨ì±'}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        AI ë¹ì
                      </span>
                    </div>
                    
                    <div className="mt-3 flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm text-gray-600">{assistant.rating}</span>
                    </div>
                    
                    {/* ?±ë¥ ì§??*/}
                    <div className="mt-4 w-full">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>?¨ì¨??/span>
                        <span>{assistant.performance.efficiency}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full" 
                          style={{ width: `${assistant.performance.efficiency}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-500 mt-2 mb-1">
                        <span>ë§ì¡±??/span>
                        <span>{assistant.performance.satisfaction}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-green-600 h-1.5 rounded-full" 
                          style={{ width: `${assistant.performance.satisfaction}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ?ì´ì§?ì»¨í¸ë¡?*/}
          <div className="flex justify-center items-center mt-12 gap-4">
            <button
              onClick={goToPreviousPage}
              className="p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
              disabled={currentIndex === 0 || totalPages <= 1}
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
              disabled={currentIndex === totalPages - 1 || totalPages <= 1}
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
            AI ë¹ì? ?¨ê» ?¼í???¤ë§?¸í ë°©ì
          </motion.div>
        </div>
      </div>

      {/* AI ì§ì ?ì¸ ?ë³´ ëª¨ë¬ */}
      {selectedAssistant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{selectedAssistant.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAssistantStatus(selectedAssistant.id);
                    }}
                    className={`p-2 rounded-full ${
                      selectedAssistant.isActive 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                  >
                    <Power className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={closeAssistantModal}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md">
                    <LandingImage 
                      src={selectedAssistant.avatar} 
                      alt={selectedAssistant.name}
                      className="w-full h-full rounded-full"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      selectedAssistant.gender === 'female' 
                        ? 'bg-pink-100 text-pink-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedAssistant.gender === 'female' ? '?¬ì±' : '?¨ì±'}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">{selectedAssistant.position}</h4>
                    <p className="text-gray-600">{selectedAssistant.description}</p>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-5 w-5 ${i < Math.floor(selectedAssistant.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                      />
                    ))}
                    <span className="ml-2 text-gray-600">{selectedAssistant.rating}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-1">?±ê²©</h5>
                      <p className="text-gray-600">{selectedAssistant.personality}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 mb-1">ê²½í</h5>
                      <p className="text-gray-600">{selectedAssistant.experience}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 mb-1">ê°???ê°</h5>
                      <p className="text-gray-600">{selectedAssistant.availability}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 mb-1">?°ë½ ë°©ë²</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedAssistant.contactMethods.map((method, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* ?±ë¥ ì§??*/}
                  <div className="mb-6">
                    <h5 className="font-medium text-gray-800 mb-3">?±ë¥ ì§??/h5>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>?ì ?ë£ ??/span>
                          <span className="font-medium">{selectedAssistant.performance.tasksCompleted.toLocaleString()}ê°?/span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, selectedAssistant.performance.tasksCompleted / 20)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>?ëµ ?ê°</span>
                          <span className="font-medium">{selectedAssistant.performance.responseTime}ì´?/span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.max(10, 100 - selectedAssistant.performance.responseTime * 10)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h5 className="font-medium text-gray-800 mb-2">?ë¬¸ ë¶ì¼</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedAssistant.specialty.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                      <MessageCircle className="h-4 w-4" />
                      ì±í ?ì
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                      <Settings className="h-4 w-4" />
                      ?¤ì 
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                      <Phone className="h-4 w-4" />
                      ?ì±
                    </button>
                  </div>
                  
                  <div className="mt-4 flex justify-between">
                    <button className="flex items-center gap-1 text-red-500 hover:text-red-700">
                      <Heart className="h-4 w-4" />
                      ì¦ê²¨ì°¾ê¸°
                    </button>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedAssistant.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedAssistant.isActive ? '?ì±?ë¨' : 'ë¹í?±í??}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
};

export default AIVirtualAssistantSection;

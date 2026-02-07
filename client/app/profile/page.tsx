'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Loader2,
  Save,
  Upload,
  User,
  Briefcase,
  GraduationCap,
  Link2,
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface Education {
  institution: string;
  degree: string;
  year: string;
}

interface WorkHistory {
  company: string;
  role: string;
  duration: string;
  description: string;
}

interface ProfileData {
  _id: string;
  name: string;
  email: string;
  profile: {
    phone: string;
    location: string;
    bio: string;
    skills: string[];
    experience: string;
    education: Education[];
    workHistory: WorkHistory[];
    links: {
      linkedin: string;
      github: string;
      portfolio: string;
    };
    resume: {
      fileName: string;
      fileSize: number;
      uploadedAt: string;
      parsedData: any;
    } | null;
    profileComplete: boolean;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState<Education[]>([]);
  const [workHistory, setWorkHistory] = useState<WorkHistory[]>([]);
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [resume, setResume] = useState<ProfileData['profile']['resume']>(null);

  const [activeTab, setActiveTab] = useState<'basic' | 'experience' | 'resume'>('basic');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (parsed.role !== 'candidate') {
      router.push('/dashboard');
      return;
    }
    fetchProfile();
  }, [router]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      const data = res.data.profile;
      setName(data.name || '');
      setPhone(data.profile?.phone || '');
      setLocation(data.profile?.location || '');
      setBio(data.profile?.bio || '');
      setSkills(data.profile?.skills || []);
      setExperience(data.profile?.experience || '');
      setEducation(data.profile?.education || []);
      setWorkHistory(data.profile?.workHistory || []);
      setLinkedin(data.profile?.links?.linkedin || '');
      setGithub(data.profile?.links?.github || '');
      setPortfolio(data.profile?.links?.portfolio || '');
      setResume(data.profile?.resume || null);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      await api.put('/profile', {
        name,
        phone,
        location,
        bio,
        skills,
        experience,
        education,
        workHistory,
        links: { linkedin, github, portfolio },
      });
      setSuccess('Profile saved successfully');
      // Update name in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.name = name;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await api.post('/profile/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data;
      setResume(data.profile?.profile?.resume || null);
      // Auto-fill skills from parsed resume if empty
      if (data.parsedData?.skills?.length && skills.length === 0) {
        setSkills(data.parsedData.skills);
      }
      if (data.parsedData?.experience && !experience) {
        setExperience(data.parsedData.experience);
      }
      if (data.parsedData?.summary && !bio) {
        setBio(data.parsedData.summary);
      }
      if (data.parsedData?.phone && !phone) {
        setPhone(data.parsedData.phone);
      }
      setSuccess('Resume uploaded successfully');
      setTimeout(() => setSuccess(''), 3000);
      // Refetch to get latest data
      fetchProfile();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const addSkill = () => {
    const trimmed = skillsInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillsInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const addEducation = () => {
    setEducation([...education, { institution: '', degree: '', year: '' }]);
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const addWork = () => {
    setWorkHistory([...workHistory, { company: '', role: '', duration: '', description: '' }]);
  };

  const updateWork = (index: number, field: keyof WorkHistory, value: string) => {
    const updated = [...workHistory];
    updated[index] = { ...updated[index], [field]: value };
    setWorkHistory(updated);
  };

  const removeWork = (index: number) => {
    setWorkHistory(workHistory.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#4a9eff]" />
        <span className="ml-2 text-sm text-[#a3a3a3]">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Nav */}
      <nav className="border-b border-[#2a2a2a] sticky top-0 z-20 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-[#4a9eff]" />
            <h1 className="text-sm font-semibold text-[#e5e5e5]">My Profile</h1>
          </div>
          <button
            onClick={() => router.push('/jobs')}
            className="flex items-center gap-1 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Jobs
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Success message */}
        {success && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            <span className="text-xs text-[#10b981]">{success}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#121212] border border-[#2a2a2a] rounded-lg p-1">
          {(['basic', 'experience', 'resume'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[#1a1a1a] text-[#e5e5e5]'
                  : 'text-[#a3a3a3] hover:text-[#e5e5e5]'
              }`}
            >
              {tab === 'basic' && 'Basic Info'}
              {tab === 'experience' && 'Experience'}
              {tab === 'resume' && 'Resume'}
            </button>
          ))}
        </div>

        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-[#4a9eff]" />
                <h2 className="text-sm font-semibold text-[#e5e5e5]">Personal Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#a3a3a3] block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#e5e5e5] focus:border-[#4a9eff] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#a3a3a3] block mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#a3a3a3] block mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#a3a3a3] block mb-1">Experience Level</label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#e5e5e5] focus:border-[#4a9eff] focus:outline-none transition-colors"
                  >
                    <option value="">Select</option>
                    <option value="Fresher">Fresher</option>
                    <option value="Junior">Junior</option>
                    <option value="Mid">Mid</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs text-[#a3a3a3] block mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Brief professional summary..."
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Skills */}
            <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-5">
              <h2 className="text-sm font-semibold text-[#e5e5e5] mb-3">Skills</h2>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill..."
                  className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                />
                <button
                  onClick={addSkill}
                  className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-[#a3a3a3]"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="text-[#a3a3a3] hover:text-[#ef4444] transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {skills.length === 0 && (
                  <span className="text-xs text-[#3a3a3a]">No skills added yet</span>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4 text-[#4a9eff]" />
                <h2 className="text-sm font-semibold text-[#e5e5e5]">Links</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#a3a3a3] block mb-1">LinkedIn</label>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#a3a3a3] block mb-1">GitHub</label>
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#a3a3a3] block mb-1">Portfolio</label>
                  <input
                    type="url"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Experience Tab */}
        {activeTab === 'experience' && (
          <div className="space-y-4">
            {/* Education */}
            <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#4a9eff]" />
                  <h2 className="text-sm font-semibold text-[#e5e5e5]">Education</h2>
                </div>
                <button
                  onClick={addEducation}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] bg-[#1a1a1a] border border-[#2a2a2a] rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {education.length === 0 ? (
                <p className="text-xs text-[#3a3a3a]">No education entries added</p>
              ) : (
                <div className="space-y-3">
                  {education.map((edu, idx) => (
                    <div key={idx} className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-[#3a3a3a] font-mono">#{idx + 1}</span>
                        <button
                          onClick={() => removeEducation(idx)}
                          className="text-[#a3a3a3] hover:text-[#ef4444] transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                          placeholder="Institution"
                          className="px-2 py-1.5 bg-[#121212] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                        />
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                          placeholder="Degree"
                          className="px-2 py-1.5 bg-[#121212] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                        />
                        <input
                          type="text"
                          value={edu.year}
                          onChange={(e) => updateEducation(idx, 'year', e.target.value)}
                          placeholder="Year"
                          className="px-2 py-1.5 bg-[#121212] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Work History */}
            <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#4a9eff]" />
                  <h2 className="text-sm font-semibold text-[#e5e5e5]">Work History</h2>
                </div>
                <button
                  onClick={addWork}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] bg-[#1a1a1a] border border-[#2a2a2a] rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {workHistory.length === 0 ? (
                <p className="text-xs text-[#3a3a3a]">No work history entries added</p>
              ) : (
                <div className="space-y-3">
                  {workHistory.map((work, idx) => (
                    <div key={idx} className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-[#3a3a3a] font-mono">#{idx + 1}</span>
                        <button
                          onClick={() => removeWork(idx)}
                          className="text-[#a3a3a3] hover:text-[#ef4444] transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                        <input
                          type="text"
                          value={work.company}
                          onChange={(e) => updateWork(idx, 'company', e.target.value)}
                          placeholder="Company"
                          className="px-2 py-1.5 bg-[#121212] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                        />
                        <input
                          type="text"
                          value={work.role}
                          onChange={(e) => updateWork(idx, 'role', e.target.value)}
                          placeholder="Role"
                          className="px-2 py-1.5 bg-[#121212] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                        />
                        <input
                          type="text"
                          value={work.duration}
                          onChange={(e) => updateWork(idx, 'duration', e.target.value)}
                          placeholder="Duration (e.g. 2yr)"
                          className="px-2 py-1.5 bg-[#121212] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
                        />
                      </div>
                      <textarea
                        value={work.description}
                        onChange={(e) => updateWork(idx, 'description', e.target.value)}
                        placeholder="Brief description..."
                        rows={2}
                        className="w-full px-2 py-1.5 bg-[#121212] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resume Tab */}
        {activeTab === 'resume' && (
          <div className="space-y-4">
            <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-[#4a9eff]" />
                <h2 className="text-sm font-semibold text-[#e5e5e5]">Saved Resume</h2>
              </div>

              {resume?.fileName ? (
                <div className="mb-4 p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-[#10b981]" />
                    <span className="text-sm text-[#e5e5e5]">{resume.fileName}</span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-[#a3a3a3] font-mono">
                    {resume.fileSize && (
                      <span>{(resume.fileSize / 1024).toFixed(1)} KB</span>
                    )}
                    {resume.uploadedAt && (
                      <span>Uploaded: {new Date(resume.uploadedAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  {/* Parsed data summary */}
                  {resume.parsedData && (
                    <div className="mt-3 space-y-2">
                      {resume.parsedData.summary && (
                        <div>
                          <span className="text-[10px] text-[#a3a3a3] block mb-0.5">Summary</span>
                          <p className="text-xs text-[#e5e5e5]">{resume.parsedData.summary}</p>
                        </div>
                      )}
                      {resume.parsedData.skills?.length > 0 && (
                        <div>
                          <span className="text-[10px] text-[#a3a3a3] block mb-0.5">Extracted Skills</span>
                          <div className="flex flex-wrap gap-1">
                            {resume.parsedData.skills.map((s: string, i: number) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[10px] text-[#a3a3a3]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {resume.parsedData.experience && (
                        <div>
                          <span className="text-[10px] text-[#a3a3a3] block mb-0.5">Experience Level</span>
                          <span className="text-xs font-mono text-[#e5e5e5]">
                            {resume.parsedData.experience}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#3a3a3a] mb-4">
                  No resume uploaded yet. Upload once and use it to apply for multiple jobs.
                </p>
              )}

              <div>
                <label className="text-xs text-[#a3a3a3] block mb-2">
                  {resume?.fileName ? 'Replace Resume' : 'Upload Resume'} (PDF or TXT)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-[#4a9eff] text-white text-sm font-medium rounded-lg hover:bg-[#3b8de6] cursor-pointer transition-colors">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading ? 'Uploading...' : 'Choose File'}
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleResumeUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
                <p className="text-[10px] text-[#a3a3a3]">
                  Your saved resume will be used when applying to jobs with the &quot;Apply with Profile Resume&quot; option. You can also upload a different resume for specific job applications.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4a9eff] text-white text-sm font-medium rounded-lg hover:bg-[#3b8de6] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

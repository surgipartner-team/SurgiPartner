'use client';

import { useState } from 'react';
import { X, Phone, Users, Zap, User, Info } from 'lucide-react';

// Enhanced Assign Leads Dialog
function EnhancedAssignLeadsDialog({ selectedLeads, salesTeam, onClose, onSubmit }) {
  const [mode, setMode] = useState('manual');
  const [assigneeId, setAssigneeId] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  const getWorkload = () => {
    const workload = {};
    salesTeam.forEach(member => {
      workload[member.username] = member.active_leads || 0;
    });
    return workload;
  };

  const workload = getWorkload();

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setAssigneeId(member.id);
  };

  const handleSubmit = () => {
    if (mode === 'manual' && !assigneeId) {
      alert('Please select a team member');
      return;
    }
    onSubmit(assigneeId, mode);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assign Leads</h2>
            <p className="text-sm text-gray-600">Assign {selectedLeads.length} selected lead{selectedLeads.length > 1 ? 's' : ''} to a sales team member</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Selected Leads ({selectedLeads.length})</h3>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="text-sm text-gray-600">
                {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected for assignment
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Assignment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`p-3 border-2 rounded-lg transition-all ${mode === 'manual' ? 'border-[#19ADB8] bg-cyan-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#004071]" />
                  </div>
                  <div className="text-sm font-bold text-gray-900">Manual</div>
                </div>
                <div className="text-xs text-gray-500 text-left pl-11">Select specific user</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('round-robin')}
                className={`p-3 border-2 rounded-lg transition-all ${mode === 'round-robin' ? 'border-[#19ADB8] bg-cyan-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#004071]" />
                  </div>
                  <div className="text-sm font-bold text-gray-900">Round Robin</div>
                </div>
                <div className="text-xs text-gray-500 text-left pl-11">Distribute evenly</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('least-loaded')}
                className={`p-3 border-2 rounded-lg transition-all ${mode === 'least-loaded' ? 'border-[#19ADB8] bg-cyan-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[#004071]" />
                  </div>
                  <div className="text-sm font-bold text-gray-900">Least Loaded</div>
                </div>
                <div className="text-xs text-gray-500 text-left pl-11">Assign to least busy</div>
              </button>
            </div>
          </div>

          {mode === 'manual' && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Sales Team Member</h3>
              <div className="space-y-3">
                {selectedMember && (
                  <div className="border-2 border-teal-500 rounded-lg p-4 bg-teal-50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-teal-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-teal-800">
                          {selectedMember.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{selectedMember.username}</div>
                        <div className="text-sm text-gray-600">
                          Sales Team • {workload[selectedMember.username] || 0} active leads
                        </div>
                      </div>
                      <svg className="w-6 h-6 text-[#004071]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {salesTeam
                    .filter(member => !selectedMember || member.id !== selectedMember.id)
                    .map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleMemberSelect(member)}
                        className="border-2 border-gray-200 hover:border-teal-300 rounded-lg p-4 text-left transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-gray-700">
                              {member.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{member.username}</div>
                            <div className="text-xs text-gray-500">
                              {workload[member.username] || 0} leads
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'round-robin' && (
            <div className="mb-6 bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#004071] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-teal-900 mb-2">
                    Leads will be distributed evenly across all team members
                  </div>
                  <div className="text-sm text-[#00335a]">
                    <span className="font-medium">Current workload:</span>{' '}
                    {salesTeam.map(m => `${m.username.split(' ')[0]}: ${workload[m.username] || 0}`).join(', ')}
                  </div>
                  <div className="text-xs text-teal-700 bg-teal-100 rounded px-2 py-1 inline-block mt-2">
                    {selectedLeads.length} leads will be distributed to balance the workload
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === 'least-loaded' && (
            <div className="mb-6 bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-[#004071] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-teal-900 mb-2">
                    Leads will be distributed evenly, prioritizing team members with the fewest active leads
                  </div>
                  <div className="text-sm text-[#00335a] mb-2">
                    <span className="font-medium">Current workload:</span>{' '}
                    {salesTeam
                      .sort((a, b) => (workload[a.username] || 0) - (workload[b.username] || 0))
                      .map(m => `${m.username.split(' ')[0]}: ${workload[m.username] || 0}`)
                      .join(', ')}
                  </div>
                  <div className="text-xs text-teal-700 bg-teal-100 rounded px-2 py-1 inline-block">
                    {selectedLeads.length} leads will be distributed to balance the workload
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mode === 'manual' && !assigneeId}
            className="flex-1 px-4 py-2.5 bg-[#004071] text-white rounded-lg font-medium hover:bg-[#00335a] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Assign {selectedLeads.length} Lead{selectedLeads.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// Enhanced Call Outcome Sheet - FIXED
function EnhancedCallOutcomeSheet({ lead, onClose, onSubmit }) {
  const [callDuration, setCallDuration] = useState(0);
  const [outcome, setOutcome] = useState({
    status: 'follow-up',
    notes: '',
    surgery_name: lead.surgery_name || '',
    estimated_amount: '',
    next_followup_date: '',
    next_followup_time: '',
    next_followup_time: '',
    not_converted_reason: '',
    files: [],
    consulted_date: lead.consulted_date || ''
  });

  const handleSubmit = () => {
    // Validation
    if (outcome.status === 'follow-up' && (!outcome.next_followup_date || !outcome.next_followup_time)) {
      alert('Please set next follow-up date and time');
      return;
    }

    if (outcome.status === 'converted' && (!outcome.surgery_name || !outcome.consulted_date)) {
      alert('Please fill surgery name and consulted date');
      return;
    }

    // FIXED: Changed from 'not converted' to 'not-converted'
    if (outcome.status === 'not-converted' && !outcome.not_converted_reason) {
      alert('Please provide reason for not converting');
      return;
    }

    if (outcome.status === 'dummy' && !outcome.notes) {
      alert('Please provide a note for dummy lead');
      return;
    }

    // Combine date and time for follow-up
    const next_followup_at = outcome.next_followup_date && outcome.next_followup_time
      ? `${outcome.next_followup_date}T${outcome.next_followup_time}`
      : null;

    onSubmit({
      ...outcome,
      call_duration: callDuration,
      next_followup_at
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:justify-end z-50">
      <div className="bg-white w-full sm:w-[480px] h-full sm:h-screen overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Phone className="text-[#004071]" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">Call Outcome</h3>
            <p className="text-sm text-gray-600">{lead.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call Duration
              </label>
              <input
                type="text"
                min="0"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                {lead.phone}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Select Outcome
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOutcome({ ...outcome, status: 'follow-up' })}
                className={`p-4 border-2 rounded-lg transition-all ${outcome.status === 'follow-up' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${outcome.status === 'follow-up' ? 'bg-amber-200 text-amber-900' : 'bg-gray-200 text-gray-700'
                  }`}>
                  Follow-up
                </div>
                <div className="text-sm text-gray-600">Schedule next call</div>
              </button>

              <button
                type="button"
                onClick={() => setOutcome({ ...outcome, status: 'converted' })}
                className={`p-4 border-2 rounded-lg transition-all ${outcome.status === 'converted' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${outcome.status === 'converted' ? 'bg-green-200 text-green-900' : 'bg-gray-200 text-gray-700'
                  }`}>
                  Converted
                </div>
                <div className="text-sm text-gray-600">Ready for consultation</div>
              </button>

              {/* FIXED: Changed from 'not converted' to 'not-converted' */}
              <button
                type="button"
                onClick={() => setOutcome({ ...outcome, status: 'not-converted' })}
                className={`p-4 border-2 rounded-lg transition-all ${outcome.status === 'not-converted' ? 'border-gray-500 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${outcome.status === 'not-converted' ? 'bg-gray-300 text-gray-900' : 'bg-gray-200 text-gray-700'
                  }`}>
                  Not Converted
                </div>
                <div className="text-sm text-gray-600">Lost lead</div>
              </button>

              <button
                type="button"
                onClick={() => setOutcome({ ...outcome, status: 'dummy' })}
                className={`p-4 border-2 rounded-lg transition-all ${outcome.status === 'dummy' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${outcome.status === 'dummy' ? 'bg-red-200 text-red-900' : 'bg-gray-200 text-gray-700'
                  }`}>
                  Dummy
                </div>
                <div className="text-sm text-gray-600">Invalid lead</div>
              </button>
            </div>
          </div>

          {outcome.status === 'follow-up' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Next Follow-up Date *
                  </label>
                  <input
                    type="date"
                    value={outcome.next_followup_date}
                    onChange={(e) => setOutcome({ ...outcome, next_followup_date: e.target.value })}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={outcome.next_followup_time}
                    onChange={(e) => setOutcome({ ...outcome, next_followup_time: e.target.value })}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {outcome.status === 'converted' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Surgery Name *
                </label>
                <input
                  type="text"
                  value={outcome.surgery_name}
                  onChange={(e) => setOutcome({ ...outcome, surgery_name: e.target.value })}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Knee Replacement"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Consulted Date *
                </label>
                <input
                  type="date"
                  value={outcome.consulted_date || ''}
                  onChange={(e) => setOutcome({ ...outcome, consulted_date: e.target.value })}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Estimated Amount (₹)
                </label>
                <input
                  type="text"
                  value={outcome.estimated_amount}
                  onChange={(e) => setOutcome({ ...outcome, estimated_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., 250000"
                />
              </div>
            </div>
          )}

          {/* FIXED: Changed from 'not converted' to 'not-converted' */}
          {outcome.status === 'not-converted' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Reason for Not Converting *
              </label>
              <input
                type="text"
                value={outcome.not_converted_reason}
                onChange={(e) => setOutcome({ ...outcome, not_converted_reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                placeholder="e.g., Chose different hospital, Budget constraints"
              />
            </div>
          )}

          {outcome.status === 'dummy' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Note *
              </label>
              <input
                type="text"
                value={outcome.notes}
                onChange={(e) => setOutcome({ ...outcome, notes: e.target.value })}
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., Wrong number, Spam"
              />
            </div>
          )}

          {outcome.status !== 'dummy' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={outcome.notes}
                onChange={(e) => setOutcome({ ...outcome, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                rows={3}
                placeholder="Any additional information from the call..."
              />
            </div>
          )}

          {/* File Upload Section */}
          {(outcome.status === 'follow-up' || outcome.status === 'converted' || outcome.status === 'not-converted') && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach Document(s)
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setOutcome({ ...outcome, files: Array.from(e.target.files) })}
                className="w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-violet-50 file:text-violet-700
                  hover:file:bg-violet-100"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2.5 bg-[#004071] text-white rounded-lg font-medium hover:bg-[#00335a] transition-colors"
            >
              Save Outcome
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { EnhancedAssignLeadsDialog, EnhancedCallOutcomeSheet };
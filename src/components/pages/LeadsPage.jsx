'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import { Delete, EditIcon, SlidersHorizontal, MessagesSquareIcon, PhoneIcon, Search, ViewIcon, File, FileArchive, Mail, LocateIcon, Map, MapPin, Layers, Tag, Book, User, Calendar, Phone, MessageSquare, ChevronLeft, ChevronRight, Grid3X3, List, FileText, Download, Upload, History } from 'lucide-react';
import CustomSelect from '@/components/layouts/CustomSelect';
import { EnhancedAssignLeadsDialog, EnhancedCallOutcomeSheet } from '@/components/layouts/EnhancedComponents';
import { toast } from 'react-toastify';
import { usePermissions } from '@/hooks/usePermissions';


export default function LeadsPage() {
  const router = useRouter();
  const { can, loading: permissionsLoading, user } = usePermissions();
  /* Removed local user state to use hook context */
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [salesTeam, setSalesTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // Default to table, can be toggled

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showCallOutcome, setShowCallOutcome] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [surgeryFilter, setSurgeryFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const fetchSalesTeam = useCallback(async () => {
    try {
      // Fetch only sales users for lead assignment
      const response = await axios.get(`${API_ENDPOINTS.USERS}?role=sales`);
      setSalesTeam(response.data.users || []);
    } catch (error) {
      toast('Error fetching team:', error);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (surgeryFilter !== 'all') params.append('surgery', surgeryFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (cityFilter !== 'all') params.append('city', cityFilter);
      if (ownerFilter !== 'all') params.append('owner', ownerFilter);
      if (dateFromFilter) params.append('dateFrom', dateFromFilter);
      if (dateToFilter) params.append('dateTo', dateToFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await axios.get(`${API_ENDPOINTS.LEADS}?${params.toString()}`);
      setLeads(response.data.leads || []);
      setStats(response.data.stats || {});
    } catch (error) {
      toast('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, surgeryFilter, categoryFilter, cityFilter, ownerFilter, dateFromFilter, dateToFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sourceFilter, surgeryFilter, categoryFilter, cityFilter, ownerFilter, dateFromFilter, dateToFilter, searchQuery, activeFilter, pageSize]);


  // Fetch data when user or filters change
  useEffect(() => {
    if (user) {
      fetchLeads();
      if (can('leads', 'assign')) {
        fetchSalesTeam();
      }
    }
  }, [user, fetchLeads, fetchSalesTeam, can]);

  const handleAddLead = async (formData) => {
    try {
      await axios.post(API_ENDPOINTS.LEADS, formData);
      fetchLeads();
      setShowAddModal(false);
      toast('Lead added successfully!');
    } catch (error) {
      toast('Error adding lead:', error);
      toast(error.response?.data?.message || 'Error adding lead');
    }
  };

  const handleUpdateLead = async (updates) => {
    try {
      await axios.put(API_ENDPOINTS.LEADS, updates);
      fetchLeads();
      setShowEditModal(false);
      setSelectedLead(null);
      toast('Lead updated successfully!');
    } catch (error) {
      toast('Error updating lead:', error);
      toast(error.response?.data?.message || 'Error updating lead');
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;

    try {
      await axios.delete(`${API_ENDPOINTS.LEADS}?id=${selectedLead.id}`);
      fetchLeads();
      setShowDeleteModal(false);
      setSelectedLead(null);
      toast('Lead deleted successfully!');
    } catch (error) {
      toast('Error deleting lead:', error);
      toast(error.response?.data?.message || 'Error deleting lead');
    }
  };

  const handleBulkAssign = async (assigneeId, assignmentMode) => {
    try {
      const response = await axios.post(API_ENDPOINTS.LEAD_ASSIGN, {
        leadIds: selectedLeadIds,
        assigneeId,
        assignmentMode,
      });

      fetchLeads();
      fetchSalesTeam(); // Refresh team workload counts
      setSelectedLeadIds([]);
      setShowAssignModal(false);
      toast(response.data.message || 'Leads assigned successfully!');
    } catch (error) {
      toast('Error assigning leads:', error);
      toast(error.response?.data?.message || 'Error assigning leads');
    }
  };

  const handleCallOutcome = async (outcomeData) => {
    if (!selectedLead) return;

    try {
      const updateData = {
        id: selectedLead.id,
        status: outcomeData.status,
        notes: outcomeData.notes || '',
      };

      // Add conditional fields based on status
      if (outcomeData.status === 'converted') {
        updateData.surgery_name = outcomeData.surgery_name;
        updateData.estimated_amount = outcomeData.estimated_amount || null;
        updateData.notes = outcomeData.notes;
        updateData.consulted_date = outcomeData.consulted_date;
      }

      if (outcomeData.status === 'follow-up') {
        updateData.next_followup_at = outcomeData.next_followup_at;
      }

      if (outcomeData.status === 'not-converted') {
        updateData.not_converted_reason = outcomeData.not_converted_reason;
        updateData.notes = outcomeData.notes
          ? `${outcomeData.notes}\n\nReason: ${outcomeData.not_converted_reason}`
          : `Reason: ${outcomeData.not_converted_reason}`;
      }

      // Update the lead
      await axios.put(API_ENDPOINTS.LEADS, updateData);

      // Upload document if present
      // Upload documents if present
      if (outcomeData.files && outcomeData.files.length > 0) {
        try {
          // Upload files sequentially or in parallel
          const uploadPromises = outcomeData.files.map(file => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('document_name', file.name);
            formData.append('document_type', file.type || 'application/octet-stream');
            formData.append('file_size', file.size);

            return axios.post(`${API_ENDPOINTS.LEADS}/${selectedLead.id}/documents`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
          });

          await Promise.all(uploadPromises);
          toast.success(`${outcomeData.files.length} document(s) uploaded successfully`);
        } catch (docError) {
          console.error('Error uploading documents:', docError);
          toast.error('Error uploading one or more documents');
        }
      } else if (outcomeData.file) {
        // Fallback for single file if needed (though we updated the component)
        const formData = new FormData();
        formData.append('file', outcomeData.file);
        formData.append('document_name', outcomeData.file.name);
        formData.append('document_type', outcomeData.file.type || 'application/octet-stream');
        formData.append('file_size', outcomeData.file.size);

        await axios.post(`${API_ENDPOINTS.LEADS}/${selectedLead.id}/documents`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('Document uploaded successfully');
      }

      // Log the call activity - FIXED: Pass the lead ID to the endpoint function
      try {
        await axios.post(API_ENDPOINTS.LEAD_ACTIVITIES(selectedLead.id), {
          lead_id: selectedLead.id, // Include lead_id in the body as well
          activity_type: 'call',
          description: `Call duration: ${outcomeData.call_duration || 0}. ${outcomeData.notes || ''}`,
          old_status: selectedLead.status,
          new_status: outcomeData.status,
        });
      } catch (activityError) {
        console.error('Error logging activity (non-critical):', activityError);
      }

      fetchLeads();
      setShowCallOutcome(false);
      setSelectedLead(null);

      toast.success('Lead updated successfully!');

      // Redirect removed as per request
      /*
      if (outcomeData.status === 'converted') {
        setTimeout(() => {
          user && router.push(`/${user.role}/pipeline`);
        }, 1500);
      }
      */
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error(error.response?.data?.message || 'Error updating lead');
    }
  };

  const handleExport = async (exportType, selectedFields) => {
    try {
      let leadsToExport = [];

      // Determine which leads to export
      switch (exportType) {
        case 'selected':
          leadsToExport = leads.filter(lead => selectedLeadIds.includes(lead.id));
          break;
        case 'filtered':
          leadsToExport = filteredLeads;
          break;
        case 'all':
          leadsToExport = leads;
          break;
        default:
          leadsToExport = [];
      }

      if (leadsToExport.length === 0) {
        toast.error('No leads to export');
        return;
      }

      // Create CSV content
      const headers = selectedFields.map(field => {
        const fieldInfo = [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'city', label: 'City' },
          { key: 'category', label: 'Category' },
          { key: 'source', label: 'Source' },
          { key: 'surgery_name', label: 'Surgery Type' },
          { key: 'status', label: 'Status' },
          { key: 'owner_name', label: '' },
          { key: 'next_followup_at', label: 'Next Follow-up' },
          { key: 'created_at', label: 'Created Date' },
          { key: 'notes', label: 'Notes' }
        ].find(f => f.key === field);
        return fieldInfo ? fieldInfo.label : field;
      });

      const csvRows = [headers.join(',')];

      leadsToExport.forEach(lead => {
        const row = selectedFields.map(field => {
          let value = lead[field] || '';

          // Format dates
          if ((field === 'next_followup_at' || field === 'created_at') && value) {
            value = new Date(value).toLocaleString('en-IN');
          }

          // Escape commas and quotes in values
          if (typeof value === 'string') {
            value = value.replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
              value = `"${value}"`;
            }
          }

          return value;
        });
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setShowExportModal(false);
      toast.success(`Successfully exported ${leadsToExport.length} leads!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export leads');
    }
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const clearAllFilters = () => {
    setActiveFilter('all');
    setStatusFilter('all');
    setSourceFilter('all');
    setSurgeryFilter('all');
    setCategoryFilter('all');
    setCityFilter('all');
    setOwnerFilter('all');
    setSearchQuery('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const getStatusColor = (status) => {
    const colors = {
      'new': 'bg-blue-100 text-blue-900',
      'follow-up': 'bg-amber-100 text-amber-900',
      'converted': 'bg-green-100 text-green-900',
      'not-converted': 'bg-slate-100 text-slate-700',
      'not converted': 'bg-slate-100 text-slate-700',
      'dummy': 'bg-red-100 text-red-900'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryInfo = (category) => {
    const info = {
      'surgery/patient': { icon: '', label: 'Surgery / Patient', color: 'bg-teal-100 text-[#00335a]' },
      'machines': { icon: '', label: 'Machine', color: 'bg-blue-100 text-blue-700' },
      'consumables': { icon: '', label: 'Consumable', color: 'bg-purple-100 text-purple-700' }
    };
    return info[category] || { icon: '', label: category, color: 'bg-gray-100 text-gray-700' };
  };

  const filteredLeads = leads.filter(lead => {
    if (activeFilter === 'mine' && user?.role !== 'admin' && lead.owner_id !== user?.id) return false;
    if (activeFilter === 'new' && lead.status !== 'new') return false;
    if (activeFilter === 'follow-up' && lead.status !== 'follow-up') return false;
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  const uniqueSources = [...new Set(leads.map(l => l.source))];
  const uniqueCities = [...new Set(leads.map(l => l.city))];
  const uniqueSurgeries = [...new Set(leads.map(l => l.surgery_name).filter(Boolean))];

  const activeFiltersCount = [
    statusFilter !== 'all',
    sourceFilter !== 'all',
    surgeryFilter !== 'all',
    categoryFilter !== 'all',
    cityFilter !== 'all',
    ownerFilter !== 'all',
    dateFromFilter !== '',
    dateToFilter !== '',
  ].filter(Boolean).length;

  const PaginationControls = () => {
    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        }
      }

      return pages;
    };
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-t border-slate-200">
        {/* Results Info */}
        <div className="text-sm text-slate-600 order-3 sm:order-1">
          Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, filteredLeads.length)}</span> of <span className="font-semibold">{filteredLeads.length}</span> leads
          {selectedLeadIds.length > 0 && ` • ${selectedLeadIds.length} selected`}
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2 order-1 sm:order-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Rows per page:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#004071] focus:border-transparent bg-white"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center gap-1 order-2 sm:order-3">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Page Numbers */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-slate-400">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                    ? 'bg-[#004071] text-white'
                    : 'border border-gray-300 hover:bg-gray-50 text-slate-700'
                    }`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          {/* Mobile: Current Page Display */}
          <div className="sm:hidden px-3 py-1.5 text-sm text-slate-700">
            Page {currentPage} of {totalPages}
          </div>

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };
  if (loading && !leads.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#004071] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading leads...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Admin Access Banner */}
      {can('leads', 'assign') && (
        <div className="mb-6 p-4 bg-gradient-to-bl from-[#004071] to-[#19ADB8] border-2 border-[#19ADB8] rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-[#19ADB8] text-xl">{user?.role?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Full Access</h3>
              <p className="text-xs text-white">You can view and manage all leads across the organization</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-slate-900 mb-1 text-3xl font-bold">Leads Management</h1>
          <p className="text-slate-600">
            {filteredLeads.length} of {leads.length} leads
            {selectedLeadIds.length > 0 && ` • ${selectedLeadIds.length} selected`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1 mr-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#004071] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Grid View"
            >
              <Grid3X3 size={20} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-[#004071] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Table View"
            >
              <List size={20} />
            </button>
          </div>
          {can('leads', 'create') && (
            <button
              className="px-4 py-2 bg-[#004071] hover:bg-[#00335a] text-white rounded-lg font-medium transition-colors cursor-pointer"
              onClick={() => setShowAddModal(true)}
            >
              Add Lead
            </button>
          )}
          {user?.role === 'admin' && (
            <>
              <button
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors cursor-pointer"
                onClick={() => setShowImportModal(true)}
              >
                Import CSV
              </button>
              <button
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors cursor-pointer"
                onClick={() => setShowExportModal(true)}
              >
                Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards (for users with assign permission) */}
      {can('leads', 'assign') && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600 mb-1">Total Leads</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="text-sm text-gray-600 mb-1">New Leads</div>
            <div className="text-2xl font-bold text-gray-900">{stats.new_count || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="text-sm text-gray-600 mb-1">Follow-ups</div>
            <div className="text-2xl font-bold text-gray-900">{stats.followup_count || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-600 mb-1">Converted</div>
            <div className="text-2xl font-bold text-gray-900">{stats.converted_count || 0}</div>
          </div>
        </div>
      )}

      {/* Search and Quick Filters */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative flex items-center">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={18} /></span>
              <input
                placeholder="Search by name, phone, email, city, or surgery..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center bg-[#004071] text-white gap-1 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${showAdvancedFilters ? 'bg-[#004071] text-white' : 'border border-gray-300 hover:bg-[#00335a]'
                }`}
            > <SlidersHorizontal size={18} />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white text-[#00335a] rounded-full text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeFilter === 'all' ? 'bg-[#004071] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              All Leads
            </button>
            <button
              onClick={() => setActiveFilter('mine')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeFilter === 'mine' ? 'bg-[#004071] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              My Leads
            </button>
            <button
              onClick={() => setActiveFilter('new')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeFilter === 'new' ? 'bg-[#004071] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              New
            </button>
            <button
              onClick={() => setActiveFilter('follow-up')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeFilter === 'follow-up' ? 'bg-[#004071] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Follow-up Required
            </button>
            {(activeFilter !== 'all' || activeFiltersCount > 0 || searchQuery) && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                ✕ Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Advanced Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-600 mb-2 font-medium">Status</label>
              <CustomSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "new", label: "New" },
                  { value: "follow-up", label: "Follow-up" },
                  { value: "converted", label: "Converted" },
                  { value: "not-converted", label: "Not Converted" },
                  { value: "dummy", label: "Dummy" }
                ]}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-2 font-medium">Source</label>
              <CustomSelect
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e)}
                placeholder="Select Source"
                options={[
                  { value: "all", label: "All Sources" },
                  ...uniqueSources.map((source) => ({
                    value: source,
                    label: source,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-2 font-medium">Surgery Type</label>
              <CustomSelect
                value={surgeryFilter}
                onChange={(e) => setSurgeryFilter(e)}
                options={[
                  { value: "all", label: "All Surgeries" },
                  { value: "lasik", label: "Lasik" },
                  { value: "cataract", label: "Cataract" },
                  { value: "orthopedic", label: "Orthopedic" },
                  { value: "hipReplacement", label: "Hip Replacement" },
                  { value: "kneeReplacement", label: "Knee Replacement" },
                  { value: "aclInjury", label: "ACL Injury" },
                  { value: "varicoseVeins", label: "Varicose Veins" },
                  { value: "hernia", label: "Hernia" },
                  { value: "piles", label: "Piles" },
                  { value: "fissure", label: "Fissure" },
                  { value: "fistula", label: "Fistula" },
                  { value: "circumcision", label: "Circumcision" },
                  { value: "lipoma", label: "Lipoma" },
                  { value: "diagnosticServices", label: "Diagnostic Services" },
                  { value: "septoplasty", label: "Septoplasty" },
                  { value: "sinusitis", label: "Sinusitis" },
                  { value: "neurology", label: "Neurology" },
                  { value: "gallstones", label: "Gallstones" },
                  { value: "cosmetology", label: "Cosmetology" },
                  { value: "gynecology", label: "Gynecology" },
                  { value: "ent", label: "ENT" },
                  { value: "uterineFibroids", label: "Uterine Fibroids" },
                  { value: "breastLumps", label: "Breast Lumps" },
                  { value: "hydrocele", label: "Hydrocele" },
                  { value: "thyroidAblation", label: "Thyroid Ablation" },
                  { value: "arthroscopy", label: "Arthroscopy" },
                  { value: "varicocele", label: "Varicocele" },
                  { value: "inguinalHernia", label: "Inguinal Hernia" },
                  { value: "cardiac", label: "Cardiac" },
                  { value: "rhinoplasty", label: "Rhinoplasty" },
                  { value: "liposuction", label: "Liposuction" },
                  { value: "hairTransplant", label: "Hair Transplant" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-2 font-medium">Category</label>
              <CustomSelect
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e)}
                options={[
                  { value: "all", label: "All Categories" },
                  { value: "surgery/patient", label: "Surgery/patient" },
                  { value: "machines", label: "Machines" },
                  { value: "consumables", label: "Consumables" }
                ]}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-2 font-medium">City</label>
              <CustomSelect
                value={cityFilter}
                onChange={(e) => setCityFilter(e)}
                placeholder="Select Source"
                options={[
                  { value: "all", label: "All Sources" },
                  ...uniqueCities.map((city) => ({
                    value: city,
                    label: city,
                  })),
                ]}
              />
            </div>

            {can('leads', 'assign') && (
              <div>
                <label className="block text-xs text-slate-600 mb-2 font-medium">Sales Person</label>
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">Sales Person</option>
                  <option value="unassigned">Unassigned</option>
                  {salesTeam.map(member => (
                    <option key={member.id} value={member.username}>{member.username}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div>
              <label className="block text-xs text-slate-600 mb-2 font-medium">Created From</label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-2 font-medium">Created To</label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="mb-4 p-3 border border-[#19ADB8] bg-cyan-50 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#004071] text-white rounded-full text-xs font-bold uppercase tracking-wide">
              {selectedLeadIds.length} Selected
            </span>
            <span className="text-sm text-teal-900 font-medium hidden sm:inline-block">Bulk actions:</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {can('leads', 'assign') && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-cyan-50 border border-[#19ADB8] rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-[#004071]"
              >
                Assign to Sales
              </button>
            )}
            {user?.role === 'admin' && (
              <button
                className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-cyan-50 border border-[#19ADB8] rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-[#004071]"
                onClick={() => setShowExportModal(true)}
              >
                Export
              </button>
            )}
            <button
              onClick={() => setSelectedLeadIds([])}
              className="p-2 hover:bg-cyan-100 rounded-lg text-teal-700 transition-colors"
              title="Clear selection"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Leads Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedLeads.map((lead) => (
            <div key={lead.id} className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow relative ${selectedLeadIds.includes(lead.id) ? 'border-[#19ADB8] ring-1 ring-[#19ADB8]' : 'border-slate-200'}`}>
              {/* Checkbox absolute position */}
              <div className="absolute top-4 right-4 z-10">
                <input
                  type="checkbox"
                  checked={selectedLeadIds.includes(lead.id)}
                  onChange={(e) => { e.stopPropagation(); toggleLeadSelection(lead.id); }}
                  className="w-4 h-4 rounded border-gray-300 accent-[#004071] hover:accent-[#00335a] text-[#004071] focus:ring-[#004071]"
                />
              </div>

              <div className="flex items-start gap-3 mb-3 pr-8">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm text-teal-900 font-semibold">
                    {lead.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{lead.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{lead.city}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide rounded-full ${getCategoryInfo(lead.category).color}`}>
                      {getCategoryInfo(lead.category).label}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide rounded-full ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" />
                  <span>{lead.phone}</span>
                </div>
                {lead.surgery_name && (
                  <div className="flex items-center gap-2">
                    <Book size={14} className="text-gray-400" />
                    <span>{lead.surgery_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  <span className={lead.owner_name ? '' : 'text-gray-400'}>{lead.owner_name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className={lead.next_followup_at ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                    {lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'No follow-up'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">Source: {lead.source}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setSelectedLead(lead); setShowCallOutcome(true); }}
                    className="p-1.5 hover:bg-cyan-50 hover:text-[#00335a] rounded-lg transition-colors text-gray-500"
                    title="Call"
                  >
                    <PhoneIcon size={16} />
                  </button>
                  <button
                    onClick={() => { setSelectedLead(lead); setShowEditModal(true); }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                  >
                    <EditIcon size={16} />
                  </button>
                  <button
                    onClick={() => { setSelectedLead(lead); setShowDeleteModal(true); }}
                    className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-gray-500"
                  >
                    <Delete size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {/* Table Header with Select All */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.length === paginatedLeads.length && paginatedLeads.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded accent-[#004071] hover:accent-[#00335a] border-gray-300 text-[#004071] focus:ring-[#004071]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Lead Info</span>
                  </th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    <span className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Contact</span>
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <span className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Dates</span>
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <span className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Surgery</span>
                  </th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell">
                    <span className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Source</span>
                  </th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell">
                    <span className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Owner</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Status</span>
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <span className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Next Follow-up</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-slate-50 transition-colors duration-150 ${selectedLeadIds.includes(lead.id) ? 'bg-teal-50' : ''
                      }`}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-[#004071] hover:accent-[#00335a] text-[#004071] focus:ring-[#004071]"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm text-teal-900 font-semibold">
                            {lead.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-900 truncate font-medium">{lead.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-slate-500">{lead.city}</p>
                            <span className="text-slate-300">•</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryInfo(lead.category).color}`}>
                              <span>{getCategoryInfo(lead.category).icon}</span>
                              <span>{getCategoryInfo(lead.category).label}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Rest of the table cells remain the same */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-600">{lead.phone}</div>
                        <div className="text-xs text-slate-500">{lead.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-500">
                          <span className="font-medium text-slate-600">Created:</span> {new Date(lead.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          <span className="font-medium text-slate-600">Updated:</span> {new Date(lead.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-sm text-slate-700">
                        {lead.surgery_name || <span className="text-slate-400">Not specified</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        {lead.owner_name ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-indigo-900 font-semibold">
                                {lead.owner_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <span className="text-sm text-slate-700 truncate">{lead.owner_name}</span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full w-fit ${getStatusColor(lead.status)}`}>
                          {lead.status.replace('-', ' ')}
                        </span>
                        {lead.status === 'converted' && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar size={10} />
                            <span>{new Date(lead.consulted_date).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {lead.next_followup_at ? (
                        <div className="text-xs">
                          <div className="text-slate-900">
                            {new Date(lead.next_followup_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-slate-500">
                            {new Date(lead.next_followup_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                            setShowCallOutcome(true);
                          }}
                          className="p-2 hover:bg-cyan-50 hover:text-[#00335a] rounded-lg transition-colors"
                          title="Make a call"
                        >
                          <PhoneIcon size={18} />
                        </button>
                        <ThreeDotMenu
                          lead={lead}
                          can={can}
                          onEdit={(lead) => {
                            setSelectedLead(lead);
                            setShowEditModal(true);
                          }}
                          onDelete={(lead) => {
                            setSelectedLead(lead);
                            setShowDeleteModal(true);
                          }}
                          onView={(lead) => {
                            setSelectedLead(lead);
                            setShowDetailDrawer(true);
                          }}
                          onHistory={(lead) => {
                            setSelectedLead(lead);
                            setShowHistoryModal(true);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {paginatedLeads.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-slate-400" />
              </div>
              <h3 className="text-slate-900 mb-2 font-semibold">No leads found</h3>
              <p className="text-sm text-slate-500 mb-4">
                {searchQuery || activeFiltersCount > 0
                  ? 'Try adjusting your filters or search query'
                  : 'Get started by adding your first lead'}
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {paginatedLeads.length > 0 && <PaginationControls />}
        </div>
      )
      }

      {/* Modals - Import your existing modal components here */}
      {showAddModal && <AddLeadDialog onClose={() => setShowAddModal(false)} onSubmit={handleAddLead} user={user} />}
      {showEditModal && selectedLead && <EditLeadDialog lead={selectedLead} onClose={() => setShowEditModal(false)} onSubmit={handleUpdateLead} />}
      {showDeleteModal && selectedLead && <DeleteLeadDialog lead={selectedLead} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteLead} />}
      {
        showAssignModal && (
          <EnhancedAssignLeadsDialog
            selectedLeads={selectedLeadIds}
            salesTeam={salesTeam}
            onClose={() => setShowAssignModal(false)}
            onSubmit={handleBulkAssign}
          />
        )
      }

      {
        showCallOutcome && selectedLead && (
          <EnhancedCallOutcomeSheet
            lead={selectedLead}
            onClose={() => setShowCallOutcome(false)}
            onSubmit={handleCallOutcome}
          />
        )
      }
      {showDetailDrawer && selectedLead && <LeadDetailDrawer lead={selectedLead} onClose={() => setShowDetailDrawer(false)} />}
      {showImportModal && <ImportLeadsDialog onClose={() => setShowImportModal(false)} onComplete={fetchLeads} />}
      {
        showExportModal && <ExportLeadsDialog
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          totalLeads={leads.length}
          filteredLeads={filteredLeads.length}
          selectedLeads={selectedLeadIds.length}
        />
      }
      {showHistoryModal && selectedLead && <LeadHistoryDialog lead={selectedLead} onClose={() => setShowHistoryModal(false)} />}
    </div >
  );
}

function AddLeadDialog({ onClose, onSubmit, user }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    source: 'Website',
    category: 'surgery/patient',
    surgery_name: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.city) {
      toast('Please fill in all required fields');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between">
          <div className=''>
            <h2 className="text-xl font-semibold">Add New Lead</h2>
            <p className='text-sm text-gray-600'>Enter the lead details to add them to your pipeline</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="lg:grid grid-cols-2 gap-4">
            <div className='mb-2'>
              <label className="block text-sm font-medium mb-1">Full Name <span className='text-sm text-red-600'>*</span></label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Full Name"
              />
            </div>
            <div className='mb-2'>
              <label className="block text-sm font-medium mb-1">Phone Number <span className='text-sm text-red-600'>*</span></label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border-gray-300 border rounded-lg"
                placeholder="Phone Number"
                maxLength={13}
              />
            </div>
            <div className='mb-2'>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border-gray-300 border rounded-lg"
                placeholder='Email'
              />
            </div>
            <div className='mb-2'>
              <label className="block text-sm font-medium mb-1">City <span className='text-sm text-red-600'>*</span></label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border-gray-300 border rounded-lg"
                placeholder='City'
              />
            </div>
            <div className='mb-2'>
              <label className="block text-sm font-medium mb-1">Lead Category <span className='text-sm text-red-600'>*</span></label>
              <CustomSelect
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
                placeholder="Select Category"
                options={[
                  { value: "surgery/patient", label: "Surgery / Patient" },
                  { value: "machines", label: "Machine" },
                  { value: "consumables", label: "Consumable" }
                ]}
              />
            </div>
            <div className='mb-2'>
              <label className="block text-sm font-medium mb-1">Lead Source <span className='text-sm text-red-600'>*</span></label>
              <CustomSelect
                value={formData.source}
                onChange={(val) => setFormData({ ...formData, source: val })}
                placeholder="Select Source"
                options={[
                  { value: "Website", label: "Website" },
                  { value: "Referral", label: "Referral" },
                  { value: "WhatsApp", label: "WhatsApp" },
                  { value: "Facebook", label: "Facebook" },
                  { value: "Google Ads", label: "Google Ads" }
                ]}
              />
            </div>
            <div className='mb-2'>
              <label className="block text-sm font-medium mb-1">Surgery Type</label>
              <CustomSelect
                value={formData.surgery_name}
                onChange={(val) => setFormData({ ...formData, surgery_name: val })}
                placeholder="Select Source"
                options={[
                  { value: "Lasik", label: "Lasik" },
                  { value: "Cataract", label: "Cataract" },
                  { value: "Orthopedic", label: "Orthopedic" },
                  { value: "Hip Replacement", label: "Hip Replacement" },
                  { value: "KneeReplacement", label: "Knee Replacement" },
                  { value: "Acl Injury", label: "ACL Injury" },
                  { value: "VaricoseVeins", label: "Varicose Veins" },
                  { value: "Hernia", label: "Hernia" },
                  { value: "Piles", label: "Piles" },
                  { value: "Fissure", label: "Fissure" },
                  { value: "Fistula", label: "Fistula" },
                  { value: "Circumcision", label: "Circumcision" },
                  { value: "Lipoma", label: "Lipoma" },
                  { value: "Diagnostic Services", label: "Diagnostic Services" },
                  { value: "Septoplasty", label: "Septoplasty" },
                  { value: "Sinusitis", label: "Sinusitis" },
                  { value: "Neurology", label: "Neurology" },
                  { value: "Gallstones", label: "Gallstones" },
                  { value: "Cosmetology", label: "Cosmetology" },
                  { value: "Gynecology", label: "Gynecology" },
                  { value: "ENT", label: "ENT" },
                  { value: "Uterine Fibroids", label: "Uterine Fibroids" },
                  { value: "Breast Lumps", label: "Breast Lumps" },
                  { value: "Hydrocele", label: "Hydrocele" },
                  { value: "Thyroid Ablation", label: "Thyroid Ablation" },
                  { value: "Arthroscopy", label: "Arthroscopy" },
                  { value: "Varicocele", label: "Varicocele" },
                  { value: "Inguinal Hernia", label: "Inguinal Hernia" },
                  { value: "Cardiac", label: "Cardiac" },
                  { value: "Rhinoplasty", label: "Rhinoplasty" },
                  { value: "Liposuction", label: "Liposuction" },
                  { value: "Hair Transplant", label: "Hair Transplant" },
                ]}
              />
            </div>
          </div>
          <div className='mb-2'>
            <label className="block text-sm font-medium mb-1">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 border rounded-lg ppearance-none"
              rows={3}
              placeholder='Any additional information about the lead....'
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button type="button" onClick={onClose} className="w-full sm:flex-1 px-4 py-2 border rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" className="w-full sm:flex-1 px-4 py-2 bg-[#004071] text-white rounded-lg cursor-pointer">Add Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditLeadDialog({ lead, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    category: lead.category || 'surgery/patient',
    source: lead.source || 'Website',
    surgery_name: lead.surgery_name || '',
    status: lead.status,
    notes: lead.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl">
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-bl from-[#004071] to-[#19ADB8]">
          <h2 className="text-xl text-white font-semibold">Edit Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="new">New</option>
                <option value="follow-up">Follow-up</option>
                <option value="converted">Converted</option>
                <option value="not-converted">Not Converted</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <CustomSelect
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
                options={[
                  { value: "surgery/patient", label: "Surgery / Patient" },
                  { value: "machines", label: "Machine" },
                  { value: "consumables", label: "Consumable" }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <CustomSelect
                value={formData.source}
                onChange={(val) => setFormData({ ...formData, source: val })}
                options={[
                  { value: "Website", label: "Website" },
                  { value: "Referral", label: "Referral" },
                  { value: "WhatsApp", label: "WhatsApp" },
                  { value: "Facebook", label: "Facebook" },
                  { value: "Google Ads", label: "Google Ads" }
                ]}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Surgery Type</label>
              <CustomSelect
                value={formData.surgery_name}
                onChange={(val) => setFormData({ ...formData, surgery_name: val })}
                options={[
                  { value: "Lasik", label: "Lasik" },
                  { value: "Cataract", label: "Cataract" },
                  { value: "Orthopedic", label: "Orthopedic" },
                  { value: "Hip Replacement", label: "Hip Replacement" },
                  { value: "KneeReplacement", label: "Knee Replacement" },
                  { value: "Acl Injury", label: "ACL Injury" },
                  { value: "VaricoseVeins", label: "Varicose Veins" },
                  { value: "Hernia", label: "Hernia" },
                  { value: "Piles", label: "Piles" },
                  { value: "Fissure", label: "Fissure" },
                  { value: "Fistula", label: "Fistula" },
                  { value: "Circumcision", label: "Circumcision" },
                  { value: "Lipoma", label: "Lipoma" },
                  { value: "Diagnostic Services", label: "Diagnostic Services" },
                  { value: "Septoplasty", label: "Septoplasty" },
                  { value: "Sinusitis", label: "Sinusitis" },
                  { value: "Neurology", label: "Neurology" },
                  { value: "Gallstones", label: "Gallstones" },
                  { value: "Cosmetology", label: "Cosmetology" },
                  { value: "Gynecology", label: "Gynecology" },
                  { value: "ENT", label: "ENT" },
                  { value: "Uterine Fibroids", label: "Uterine Fibroids" },
                  { value: "Breast Lumps", label: "Breast Lumps" },
                  { value: "Hydrocele", label: "Hydrocele" },
                  { value: "Thyroid Ablation", label: "Thyroid Ablation" },
                  { value: "Arthroscopy", label: "Arthroscopy" },
                  { value: "Varicocele", label: "Varicocele" },
                  { value: "Inguinal Hernia", label: "Inguinal Hernia" },
                  { value: "Cardiac", label: "Cardiac" },
                  { value: "Rhinoplasty", label: "Rhinoplasty" },
                  { value: "Liposuction", label: "Liposuction" },
                  { value: "Hair Transplant", label: "Hair Transplant" },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button type="button" onClick={onClose} className="w-full sm:flex-1 px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="w-full sm:flex-1 px-4 py-2 bg-[#004071] text-white rounded-lg">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteLeadDialog({ lead, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          </div>
          <h2 className="text-xl font-bold">Delete Lead</h2>
        </div>
        <p className="mb-4">Are you sure you want to delete <strong>{lead.name}</strong>?</p>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-800">This action cannot be undone. All associated data will be permanently deleted.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={onClose} className="w-full sm:flex-1 px-4 py-2 border rounded-lg">Cancel</button>
          <button onClick={onConfirm} className="w-full sm:flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
        </div>
      </div>
    </div>
  );
}

function LeadDetailDrawer({ lead, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (lead?.id) {
      fetchDocuments();
    }
  }, [lead]);

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const response = await axios.get(`${API_ENDPOINTS.LEADS}/${lead.id}/documents`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-end justify-end z-[60]">
      <div className="bg-white w-full sm:w-96 h-full overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-semibold text-gray-900">{lead.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${lead.status === 'new' ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'}`}>
                {lead.status}
              </span>
              {lead.status === 'converted' && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(lead.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="p-6 space-y-6">
          {/* Documents Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <FileText size={16} className="text-[#004071]" />
                Documents
              </h3>
            </div>
            {loadingDocs ? (
              <div className="text-center text-xs text-gray-500 py-2">Loading...</div>
            ) : documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]" title={doc.document_name}>{doc.document_name}</p>
                        <p className="text-[10px] text-gray-500">{new Date(doc.uploaded_at || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <a
                      href={`/api/v1/documents/download?type=lead&docId=${doc.id}&preview=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Document"
                    >
                      <ViewIcon size={14} />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg bg-white">
                <p className="text-xs text-gray-500">No documents</p>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md mb-3 text-gray-600">Contact Information</h4>
            <div className="space-y-2">
              <div className='flex flex-row items-center gap-2'>
                <div>
                  <Calendar size={16} className='text-gray-600' />
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div>
                    <label className='text-gray-600 text-xs block'>Created</label>
                    <p className="text-sm">{new Date(lead.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className='text-gray-600 text-xs block'>Updated</label>
                    <p className="text-sm">{new Date(lead.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className='flex flex-row items-center gap-2'>
                <div>
                  <PhoneIcon size={16} className='text-gray-600' />
                </div>
                <div>
                  <label className='text-gray-600 text-sm'>Phone</label>
                  <p className="text-sm">{lead.phone}</p>
                </div>
              </div>
              <div className='flex flex-row items-center gap-2'>
                <div>
                  <Mail size={16} className='text-gray-600' />
                </div>
                <div>
                  <label className='text-gray-600 text-sm'>Email</label>
                  <p className="text-sm">{lead.email}</p>
                </div>
              </div>
              <div className='flex flex-row items-center gap-2'>
                <div>
                  <MapPin size={16} className='text-gray-600' />
                </div>
                <div>
                  <label className='text-gray-600 text-sm'>City</label>
                  <p className="text-sm">{lead.city}</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-md mb-3 text-gray-600">Lead Details</h4>
            <div className="space-y-2">
              <div className='flex flex-row items-center gap-2'>
                <div>
                  <Layers size={16} className='text-gray-600' />
                </div>
                <div>
                  <label className='text-gray-600 text-sm'>Category</label>
                  <p className="text-sm">{lead.category}</p>
                </div>
              </div>
              <div className='flex flex-row items-center gap-2'>
                <div>
                  <Tag size={16} className='text-gray-600' />
                </div>
                <div>
                  <label className='text-gray-600 text-sm'>Source</label>
                  <p className="text-sm">{lead.source}</p>
                </div>
              </div>
              <div className='flex flex-row items-center gap-2'>
                <div>
                  <Book size={16} className='text-gray-600' />
                </div>
                <div>
                  <label className='text-gray-600 text-sm'>Surgery Type</label>
                  <p className="text-sm">{lead.surgery_name}</p>
                </div>
              </div>
              <div className='flex flex-row items-center gap-2'>
                <div>
                  <User size={18} className='text-gray-600' />
                </div>
                <div>
                  <label className='text-gray-600 text-sm'>Owner</label>
                  <p className="text-sm">{lead.owner_name}</p>
                </div>
              </div>
              <div className='flex flex-row items-center gap-2'>
                <div>
                  <Calendar size={16} className='text-gray-600' />
                </div>
                <div>
                  <label className='text-gray-600 text-sm'>Owner</label>
                  <p className="text-sm">
                    {new Date(lead.created_at)
                      .toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Kolkata",
                      })
                      .replace(",", " at")}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {lead.notes && (
            <div>
              <h4 className="text-sm text-gray-600 mb-3">Notes</h4>
              <div className='border border-blue-100 p-2 rounded-xl bg-blue-100'>
                <p className="text-sm text-gray-700">{lead.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Fuzzy Matching Helpers
const getLevenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const findBestMatch = (input, options, threshold = 3) => {
  if (!input) return null;
  const lowerInput = input.toLowerCase().trim();

  let bestMatch = null;
  let minDistance = Infinity;

  for (const option of options) {
    const lowerOption = option.toLowerCase();

    // Exact substring match check (prioritize this)
    if (lowerOption.includes(lowerInput) || lowerInput.includes(lowerOption)) {
      // If very close in length, prefer this
      if (Math.abs(lowerOption.length - lowerInput.length) <= 2) {
        return option;
      }
    }

    const distance = getLevenshteinDistance(lowerInput, lowerOption);

    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = option;
    }
  }

  return minDistance <= threshold ? bestMatch : null;
};

// Valid Options Lists
const VALID_SOURCES = [
  "Website", "Referral", "WhatsApp", "Facebook", "Google Ads"
];

const VALID_SURGERIES = [
  "Lasik", "Cataract", "Orthopedic", "Hip Replacement", "Knee Replacement",
  "ACL Injury", "Varicose Veins", "Hernia", "Piles", "Fissure", "Fistula",
  "Circumcision", "Lipoma", "Diagnostic Services", "Septoplasty", "Sinusitis",
  "Neurology", "Gallstones", "Cosmetology", "Gynecology", "ENT",
  "Uterine Fibroids", "Breast Lumps", "Hydrocele", "Thyroid Ablation",
  "Arthroscopy", "Varicocele", "Inguinal Hernia", "Cardiac", "Rhinoplasty",
  "Liposuction", "Hair Transplant"
];

function ImportLeadsDialog({ onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [duplicates, setDuplicates] = useState([]); // NEW: Track duplicates
  const [successCount, setSuccessCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0); // NEW: Track duplicate count
  const [processing, setProcessing] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState('surgery/patient');
  const [defaultSource, setDefaultSource] = useState('Website');

  const requiredFields = ['name', 'phone', 'city'];
  const allFields = [
    { key: 'name', label: 'Full Name', required: true },
    { key: 'phone', label: 'Phone Number', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'city', label: 'City', required: true },
    { key: 'category', label: 'Category', required: false },
    { key: 'source', label: 'Source', required: false },
    { key: 'surgery_name', label: 'Surgery Type', required: false },
    { key: 'notes', label: 'Notes', required: false }
  ];

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);

    try {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();

      if (fileType === 'csv') {
        await parseCSV(selectedFile);
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        await parseExcel(selectedFile);
      } else {
        setErrors(['Unsupported file format. Please upload CSV or Excel files.']);
        setFile(null);
      }
    } catch (error) {
      setErrors([`Error reading file: ${error.message}`]);
      setFile(null);
    }
  };

  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(line => line.trim());

          if (lines.length < 2) {
            reject(new Error('File must contain headers and at least one data row'));
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
          const data = lines.slice(1).map((line, index) => {
            const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
            const row = { _rowNumber: index + 2 };
            headers.forEach((header, i) => {
              row[header] = values[i] || '';
            });
            return row;
          });

          setHeaders(headers);
          setFileData(data);
          autoMapFields(headers);
          setStep(2);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Simple Excel parsing - in production, you'd use a library like xlsx
          // For now, we'll show an error message
          setErrors(['Excel import requires the SheetJS library. Please use CSV format or add XLSX support.']);
          reject(new Error('Excel parsing not implemented'));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const autoMapFields = (fileHeaders) => {
    const mapping = {};

    // Auto-detect common field names
    fileHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();

      if (lowerHeader.includes('name') && !lowerHeader.includes('surgery')) {
        mapping['name'] = header;
      } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('contact')) {
        mapping['phone'] = header;
      } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
        mapping['email'] = header;
      } else if (lowerHeader.includes('city') || lowerHeader.includes('location')) {
        mapping['city'] = header;
      } else if (lowerHeader.includes('category')) {
        mapping['category'] = header;
      } else if (lowerHeader.includes('source')) {
        mapping['source'] = header;
      } else if (lowerHeader.includes('surgery')) {
        mapping['surgery_name'] = header;
      } else if (lowerHeader.includes('note')) {
        mapping['notes'] = header;
      }
    });

    setFieldMapping(mapping);
  };

  const checkDuplicates = async (validRows) => {
    try {
      const phoneNumbers = validRows.map(row => row[fieldMapping['phone']]);

      const response = await axios.post(API_ENDPOINTS.CHECK_DUPLICATES, {
        phoneNumbers: phoneNumbers
      });

      const existingPhones = response.data.existingPhones || [];

      const duplicateRows = [];
      const uniqueRows = [];

      validRows.forEach(row => {
        const phone = row[fieldMapping['phone']];
        if (existingPhones.includes(phone)) {
          duplicateRows.push({
            row: row._rowNumber,
            phone: phone,
            name: row[fieldMapping['name']]
          });
        } else {
          uniqueRows.push(row);
        }
      });

      return { duplicateRows, uniqueRows };
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return { duplicateRows: [], uniqueRows: validRows };
    }
  };

  const validateData = async () => {
    const validationErrors = [];
    const validRows = [];

    // First, validate format
    fileData.forEach((row) => {
      const rowErrors = [];

      requiredFields.forEach(field => {
        const headerName = fieldMapping[field];
        if (!headerName || !row[headerName] || row[headerName].trim() === '') {
          rowErrors.push(`Missing required field: ${field}`);
        }
      });

      const phoneHeader = fieldMapping['phone'];
      if (phoneHeader && row[phoneHeader]) {
        const phone = row[phoneHeader].replace(/\D/g, '');
        if (phone.length < 10) {
          rowErrors.push('Invalid phone number format');
        }
      }

      const emailHeader = fieldMapping['email'];
      if (emailHeader && row[emailHeader] && row[emailHeader].trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row[emailHeader])) {
          rowErrors.push('Invalid email format');
        }
      }

      if (rowErrors.length > 0) {
        validationErrors.push({
          row: row._rowNumber,
          errors: rowErrors
        });
      } else {
        validRows.push(row);
      }
    });

    // Check for duplicates within CSV itself
    const phoneCounts = {};
    const csvDuplicates = [];

    validRows.forEach(row => {
      const phone = row[fieldMapping['phone']];
      if (phoneCounts[phone]) {
        csvDuplicates.push({
          row: row._rowNumber,
          errors: [`Duplicate phone number within CSV: ${phone}`]
        });
      } else {
        phoneCounts[phone] = 1;
      }
    });

    const uniqueValidRows = validRows.filter(row => {
      const phone = row[fieldMapping['phone']];
      return phoneCounts[phone] === 1;
    });

    // Check for duplicates in database
    const { duplicateRows, uniqueRows } = await checkDuplicates(uniqueValidRows);

    setErrors([...validationErrors, ...csvDuplicates]);
    setDuplicates(duplicateRows);

    return {
      valid: validationErrors.length === 0 && csvDuplicates.length === 0,
      validRows: uniqueRows
    };
  };

  const handleImport = async () => {
    const { valid, validRows } = await validateData();

    if (!valid && validRows.length === 0) {
      setStep(3);
      return;
    }

    setProcessing(true);
    const importErrors = [];
    let imported = 0;

    try {
      for (const row of validRows) {
        try {
          // Enhanced Normalization with Fuzzy Matching
          const normalizeCategory = (val) => {
            if (!val) return defaultCategory;
            const lower = val.toLowerCase().trim();

            // Direct keyword mapping first
            if (lower.includes('surgery') || lower.includes('patient') || lower === 'surgeries' || lower === 'surgry') return 'surgery/patient';
            if (lower.includes('machine') || lower.includes('machin')) return 'machines';
            if (lower.includes('consumable') || lower.includes('consumble')) return 'consumables';

            return defaultCategory;
          };

          const normalizeSource = (val) => {
            if (!val) return defaultSource;
            const match = findBestMatch(val, VALID_SOURCES, 3);
            return match || defaultSource;
          };

          const normalizeSurgery = (val) => {
            if (!val) return '';
            const match = findBestMatch(val, VALID_SURGERIES, 4); // Slightly higher threshold for longer names
            return match || val; // Keep original if no match found, worst case
          };

          const leadData = {
            name: row[fieldMapping['name']],
            phone: row[fieldMapping['phone']],
            email: row[fieldMapping['email']] || '',
            city: row[fieldMapping['city']],
            category: normalizeCategory(row[fieldMapping['category']]),
            source: normalizeSource(row[fieldMapping['source']]),
            surgery_name: normalizeSurgery(row[fieldMapping['surgery_name']]),
            notes: row[fieldMapping['notes']] || ''
          };

          await axios.post(API_ENDPOINTS.LEADS, leadData);
          imported++;
        } catch (error) {
          importErrors.push({
            row: row._rowNumber,
            errors: [error.response?.data?.message || 'Import failed']
          });
        }
      }

      setSuccessCount(imported);
      setDuplicateCount(duplicates.length);
      setStep(4);
    } catch (error) {
      toast.error('Import process failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'name,phone,email,city,category,source,surgery_name,notes\n' +
      'John Doe,9876543210,john@example.com,Mumbai,surgeries,Website,Lasik,Sample lead';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leads_template.csv';
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Leads</h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 1 && 'Upload your CSV or Excel file'}
              {step === 2 && 'Map your file columns to lead fields'}
              {step === 3 && 'Review validation results'}
              {step === 4 && 'Import complete'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {['Upload', 'Map Fields', 'Preview', 'Complete'].map((label, index) => (
              <div key={label} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step > index + 1 ? 'bg-cyan-50 text-white' :
                  step === index + 1 ? 'bg-indigo-600 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                  {step > index + 1 ? '✓' : index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${step === index + 1 ? 'text-indigo-600' : 'text-gray-600'
                  }`}>
                  {label}
                </span>
                {index < 3 && <div className="w-12 h-0.5 bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📄</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload Your File</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Support for CSV and Excel files (.csv, .xlsx, .xls)
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700"
                >
                  Choose File
                </label>
                {file && (
                  <p className="mt-4 text-sm text-gray-700">
                    Selected: <span className="font-medium">{file.name}</span>
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">📋 Template Requirements</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Required fields: Name, Phone, City</li>
                  <li>Optional fields: Email, Category, Source, Surgery Type, Notes</li>
                  <li>First row must contain column headers</li>
                  <li>Phone numbers should be 10 digits</li>
                </ul>
                <button
                  onClick={downloadTemplate}
                  className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Download Sample Template →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Default Category</label>
                  <select
                    value={defaultCategory}
                    onChange={(e) => setDefaultCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="surgery/patient">Surgery / Patient</option>
                    <option value="machines">Machine</option>
                    <option value="consumables">Consumable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Default Source</label>
                  <select
                    value={defaultSource}
                    onChange={(e) => setDefaultSource(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Google Ads">Google Ads</option>
                  </select>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-900 mb-2"> Upload Errors</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Map Fields */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-900">
                  <strong>Map your file columns</strong> to the corresponding lead fields. Required fields must be mapped.
                </p>
              </div>

              <div className="space-y-3">
                {allFields.map(field => (
                  <div key={field.key} className="grid grid-cols-3 gap-4 items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={fieldMapping[field.key] || ''}
                        onChange={(e) => setFieldMapping({ ...fieldMapping, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">-- Select Column --</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-100 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2">Preview (First 3 rows)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {allFields.filter(f => fieldMapping[f.key]).map(field => (
                          <th key={field.key} className="text-left p-2 font-medium">{field.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fileData.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b">
                          {allFields.filter(f => fieldMapping[f.key]).map(field => (
                            <td key={field.key} className="p-2">{row[fieldMapping[field.key]] || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview/Validation */}
          {step === 3 && (
            <div className="space-y-4">
              {errors.length === 0 ? (
                <div className="bg-cyan-50 border border-[#19ADB8] rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-[#004071] mb-2">✓ Validation Successful</h4>
                  <p className="text-sm text-[#004071]">
                    All {fileData.length} rows passed validation and are ready to import.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-red-900 mb-2">Validation Errors Found</h4>
                    <p className="text-sm text-red-800 mb-3">
                      {errors.length} row(s) have validation errors. Fix these in your file and re-upload.
                    </p>
                  </div>

                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    {errors.map((error, i) => (
                      <div key={i} className="p-4 border-b last:border-b-0">
                        <div className="font-medium text-sm mb-1">Row {error.row}</div>
                        <ul className="text-sm text-red-600 space-y-1">
                          {error.errors.map((err, j) => (
                            <li key={j}>• {err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-cyan-50 border border-[#19ADB8] rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-white">✓</span>
                </div>
                <h3 className="text-xl font-bold text-[#004071] mb-2">Import Complete!</h3>
                <p className="text-[#004071]">
                  Successfully imported <strong>{successCount}</strong> leads
                </p>
              </div>

              {errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                    {errors.length} rows failed to import
                  </h4>
                  <div className="max-h-48 overflow-y-auto">
                    {errors.map((error, i) => (
                      <div key={i} className="text-sm text-yellow-800 mb-2">
                        Row {error.row}: {error.errors.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            {step === 4 ? 'Close' : 'Cancel'}
          </button>
          <div className="flex gap-3">
            {step > 1 && step < 4 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Back
              </button>
            )}
            {step === 2 && (
              <button
                onClick={() => {
                  const missingRequired = requiredFields.filter(field => !fieldMapping[field]);
                  if (missingRequired.length > 0) {
                    alert(`Please map required fields: ${missingRequired.join(', ')}`);
                    return;
                  }
                  setStep(3);
                  validateData();
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Continue to Preview
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleImport}
                disabled={processing || errors.length > 0}
                className="px-6 py-2 bg-[#004071] text-white rounded-lg hover:bg-[#00335a] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {processing ? 'Importing...' : 'Import Leads'}
              </button>
            )}
            {step === 4 && (
              <button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                View Leads
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreeDotMenu({ lead, onEdit, onDelete, onView, onHistory, can }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const canEdit = can ? can('leads', 'edit') : true;
  const canDelete = can ? can('leads', 'delete') : true;

  if (!canEdit && !canDelete && !onView) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors"
      >
        ⋮
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onView(lead);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            >
              <ViewIcon size={16} /> View Details
            </button>
          )}
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onEdit(lead);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <EditIcon size={16} /> Edit Lead
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onHistory && onHistory(lead);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-100"
          >
            <History size={16} /> View History
          </button>
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onDelete(lead);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
            >
              <Delete size={16} /> Delete Lead
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ExportLeadsDialog({ onClose, onExport, totalLeads, filteredLeads, selectedLeads }) {
  const [exportType, setExportType] = useState(selectedLeads > 0 ? 'selected' : 'filtered');
  const [selectedFields, setSelectedFields] = useState([
    'name', 'phone', 'email', 'city', 'category', 'source',
    'surgery_name', 'status', 'owner_name', 'next_followup_at', 'created_at'
  ]);

  const allFields = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'city', label: 'City' },
    { key: 'category', label: 'Category' },
    { key: 'source', label: 'Source' },
    { key: 'surgery_name', label: 'Surgery Type' },
    { key: 'status', label: 'Status' },
    { key: 'owner_name', label: 'Sales Person' },
    { key: 'next_followup_at', label: 'Next Follow-up' },
    { key: 'created_at', label: 'Created Date' },
    { key: 'notes', label: 'Notes' }
  ];

  const toggleField = (fieldKey) => {
    setSelectedFields(prev =>
      prev.includes(fieldKey)
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(allFields.map(f => f.key));
  };

  const deselectAllFields = () => {
    setSelectedFields([]);
  };

  const handleExport = () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field to export');
      return;
    }
    onExport(exportType, selectedFields);
  };

  const getExportCount = () => {
    switch (exportType) {
      case 'selected':
        return selectedLeads;
      case 'filtered':
        return filteredLeads;
      case 'all':
        return totalLeads;
      default:
        return 0;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 bg-gradient-to-bl from-[#004071] to-[#19ADB8]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Export Leads</h2>
              <p className="text-sm text-white mt-1">
                Choose what to export and which fields to include
              </p>
            </div>
            <button onClick={onClose} className="text-white hover:text-white text-2xl">×</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Export Type Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">What to Export</h3>
            <div className="grid grid-cols-3 gap-3">
              {selectedLeads > 0 && (
                <button
                  type="button"
                  onClick={() => setExportType('selected')}
                  className={`p-4 border-2 rounded-lg transition-all ${exportType === 'selected'
                    ? 'border-[#19ADB8] bg-cyan-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="text-2xl mb-2">✓</div>
                  <div className="text-sm font-medium mb-1">Selected Leads</div>
                  <div className="text-lg font-bold text-[#004071]">{selectedLeads}</div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setExportType('filtered')}
                className={`p-4 border-2 rounded-lg transition-all ${exportType === 'filtered'
                  ? 'border-[#19ADB8] bg-cyan-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="text-sm font-medium mb-1">Filtered Leads</div>
                <div className="text-lg font-bold text-[#004071]">{filteredLeads}</div>
              </button>

              <button
                type="button"
                onClick={() => setExportType('all')}
                className={`p-4 border-2 rounded-lg transition-all ${exportType === 'all'
                  ? 'border-[#19ADB8] bg-cyan-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="text-sm font-medium mb-1">All Leads</div>
                <div className="text-lg font-bold text-[#004071]">{totalLeads}</div>
              </button>
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Fields to Include</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllFields}
                  className="text-xs text-[#004071] hover:text-[#00335a] font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAllFields}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg">
              {allFields.map(field => (
                <label
                  key={field.key}
                  className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.key)}
                    onChange={() => toggleField(field.key)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#004071] hover:accent-[#00335a] text-[#004071] focus:ring-[#004071]"
                  />
                  <span className="text-sm text-gray-700">{field.label}</span>
                </label>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Export Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Export Summary</h4>
                <p className="text-sm text-blue-800">
                  You&apos;re about to export <strong>{getExportCount()} lead{getExportCount() !== 1 ? 's' : ''}</strong> with{' '}
                  <strong>{selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''}</strong> as a CSV file.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedFields.length === 0}
            className="px-6 py-2 bg-[#004071] text-white rounded-lg hover:bg-[#00335a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadHistoryDialog({ lead, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API_ENDPOINTS.LEADS}?history=${lead.id}`);
        setHistory(response.data.history || []);
      } catch (error) {
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    if (lead) fetchHistory();
  }, [lead]);

  const formatValue = (val) => {
    if (val === null || val === undefined) return 'Empty';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="border-b px-6 py-4 bg-gradient-to-bl from-[#004071] to-[#19ADB8] flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History size={20} /> History: {lead?.name}
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/10 p-1 rounded-full text-2xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#004071]"></div></div>
          ) : history.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No history available yet.</div>
          ) : (
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
              {history.map((record, idx) => (
                <div key={record.id} className="relative pl-8">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-[#19ADB8] border-2 border-white shadow-sm ring-1 ring-gray-100"></div>
                  <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-semibold text-[#004071] capitalize block">
                          {record.action_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          by <span className="font-medium">{record.changed_by_name || 'System'}</span>
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(record.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded border border-gray-100">
                      {record.description || 'No description'}
                      {record.old_values && record.new_values && (
                        <div className="mt-3 space-y-2">
                          {Object.keys(record.new_values).map(key => (
                            <div key={key} className="grid grid-cols-[120px,1fr,auto,1fr] gap-2 items-center text-xs">
                              <span className="font-semibold text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                              <div className="text-red-500 line-through bg-red-50 p-1 rounded truncate" title={formatValue(record.old_values[key])}>
                                {formatValue(record.old_values[key])}
                              </div>
                              <div className="text-gray-400">→</div>
                              <div className="text-green-600 font-medium bg-green-50 p-1 rounded truncate" title={formatValue(record.new_values[key])}>
                                {formatValue(record.new_values[key])}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
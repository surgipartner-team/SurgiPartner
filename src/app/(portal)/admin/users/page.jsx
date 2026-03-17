'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import {
  Search, Users, UserCheck, UserX, MoreVertical, Plus, X,
  Mail, Phone, Calendar, Clock, Shield, Key, Ban, CheckCircle,
  Eye, EyeOff, RefreshCw, AlertTriangle
} from 'lucide-react';
import CustomSelect from '@/components/layouts/CustomSelect';
import { toast } from 'react-toastify';

const ROLES = ['admin', 'sales', 'ops', 'carebuddy', 'accountant', 'outsourcing', 'patient'];
const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  sales: 'bg-blue-100 text-blue-700',
  ops: 'bg-green-100 text-green-700',
  carebuddy: 'bg-pink-100 text-pink-700',
  accountant: 'bg-yellow-100 text-yellow-700',
  outsourcing: 'bg-orange-100 text-orange-700',
  patient: 'bg-indigo-100 text-indigo-700'
};

const ROLE_DEPARTMENTS = {
  admin: 'Administration',
  sales: 'Sales',
  ops: 'Operations',
  carebuddy: 'Patient Care',
  accountant: 'Finance',
  outsourcing: 'Outsourcing',
  patient: 'Patients'
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const response = await axios.get(`${API_ENDPOINTS.USERS}?${params.toString()}`);
      setUsers(response.data.users || []);
      setStats(response.data.stats || {});
    } catch (error) {
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleStatusToggle = async (userId, currentActive) => {
    try {
      await axios.put(API_ENDPOINTS.USERS, {
        id: userId,
        action: currentActive ? 'deactivate' : 'activate'
      });
      toast.success(`User ${currentActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Error updating user status');
    }
    setOpenDropdown(null);
  };

  const handleSuspend = async (userId) => {
    try {
      await axios.put(API_ENDPOINTS.USERS, { id: userId, action: 'suspend' });
      toast.success('User suspended successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Error suspending user');
    }
    setOpenDropdown(null);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (role) => {
    const colors = {
      admin: 'bg-purple-500',
      sales: 'bg-blue-500',
      ops: 'bg-green-500',
      carebuddy: 'bg-pink-500',
      accountant: 'bg-yellow-500',
      outsourcing: 'bg-orange-500',
      patient: 'bg-indigo-500'
    };
    return colors[role] || 'bg-gray-500';
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <Icon size={18} className={color} />
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading && !users.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage users, roles, permissions, and access control</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium shadow-lg shadow-[#19ADB8]/30 w-full sm:w-auto"
        >
          <Plus size={18} />
          Add New User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <StatCard icon={Users} label="Total Users" value={stats.total || 0} color="text-gray-600" />
        <StatCard icon={UserCheck} label="Active" value={stats.active || 0} color="text-green-600" />
        <StatCard icon={UserX} label="Inactive" value={stats.inactive || 0} color="text-gray-400" />
        <StatCard icon={Users} label="Sales" value={stats.sales || 0} color="text-blue-600" />
        <StatCard icon={Users} label="OPS" value={stats.ops || 0} color="text-green-600" />
        <StatCard icon={Users} label="Carebuddy" value={stats.carebuddy || 0} color="text-pink-600" />
        <StatCard icon={Users} label="Finance" value={stats.accountant || 0} color="text-yellow-600" />
        <StatCard icon={Users} label="Patients" value={stats.patient || 0} color="text-indigo-600" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
            />
          </div>
          <div className="w-full md:w-40">
            <CustomSelect
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: 'all', label: 'All Roles' },
                ...ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))
              ]}
            />
          </div>
          <div className="w-full md:w-40">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* User Cards */}
      <div className="space-y-4">
        {users.length === 0 ? (
          <div className="bg-white rounded-xl border p-16 text-center">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">Add a new user to get started</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full ${getAvatarColor(user.role)} flex items-center justify-center text-white font-semibold text-lg`}>
                  {getInitials(user.username)}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{user.username}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {user.role}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.is_active ? 'active' : 'inactive'}
                    </span>
                    {user.custom_permissions_count > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Custom Permissions
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {user.email}
                    </span>
                    {user.mobile && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {user.mobile}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {ROLE_DEPARTMENTS[user.role] || 'General'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Joined {formatDate(user.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Last login: {formatDateTime(user.last_login)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield size={12} />
                      {user.permissions_count || 0} permissions
                    </span>
                  </div>
                </div>

                {/* Actions Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical size={18} className="text-gray-500" />
                  </button>
                  {openDropdown === user.id && (
                    <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[180px]">
                      <button
                        onClick={() => { setSelectedUser(user); setShowPermissionsModal(true); setOpenDropdown(null); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Shield size={16} /> Manage Permissions
                      </button>
                      <button
                        onClick={() => { setSelectedUser(user); setShowPasswordModal(true); setOpenDropdown(null); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Key size={16} /> Reset Password
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => handleStatusToggle(user.id, user.is_active)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        {user.is_active ? 'Deactivate User' : 'Activate User'}
                      </button>
                      <button
                        onClick={() => handleSuspend(user.id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Ban size={16} /> Suspend User
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchUsers(); }} />}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onClose={() => { setShowPasswordModal(false); setSelectedUser(null); }}
        />
      )}

      {/* Manage Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <ManagePermissionsModal
          user={selectedUser}
          onClose={() => { setShowPermissionsModal(false); setSelectedUser(null); }}
          onSuccess={() => { setShowPermissionsModal(false); setSelectedUser(null); fetchUsers(); }}
        />
      )}
    </div>
  );
}

// Add User Modal
function AddUserModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    username: '', email: '', mobile: '', role: '', password: '', confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await axios.post(API_ENDPOINTS.REGISTER_USER, formData);
      toast.success('User created successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error creating user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b z-10">
          <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
              <input type="tel" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" required>
              <option value="">Select Role</option>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <input type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" required />
            </div>
          </div>
          <p className="text-xs text-gray-500">Password must be at least 8 characters</p>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium disabled:opacity-50">{loading ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reset Password Modal
function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setPassword(pwd);
    setConfirmPassword(pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      await axios.post(`${API_ENDPOINTS.USERS}/${user.id}/reset-password`, { password });
      toast.success('Password reset successfully!');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
            <p className="text-sm text-gray-500">Reset password for {user.username} ({user.email})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-900">{user.username}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-sm text-gray-500">Role: {user.role}</p>
          </div>

          <button type="button" onClick={generatePassword} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#19ADB8] text-[#19ADB8] rounded-lg hover:bg-[#19ADB8]/10 font-medium">
            <RefreshCw size={18} />
            Generate Strong Password
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password (min 8 characters)" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8]" required />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800">Password Requirements:</p>
            <ul className="text-sm text-yellow-700 list-disc list-inside mt-1">
              <li>Minimum 8 characters</li>
              <li>Recommended: Mix of uppercase, lowercase, numbers & symbols</li>
            </ul>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-2">
            <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-700">The user will be logged out and must use the new password to login. Make sure to securely share the new password with the user.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium disabled:opacity-50">{loading ? 'Resetting...' : 'Reset Password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Manage Permissions Modal
function ManagePermissionsModal({ user, onClose, onSuccess }) {
  const [permissions, setPermissions] = useState({});
  const [defaultPermissions, setDefaultPermissions] = useState({});
  const [summary, setSummary] = useState({ totalEnabled: 0, customAdded: 0, restricted: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const PERMISSION_GROUPS = {
    leads: { label: 'Leads', actions: ['view', 'create', 'edit', 'delete', 'assign'] },
    patients: { label: 'Patients', actions: ['view', 'create', 'edit', 'delete'] },
    pipeline: { label: 'Pipeline', actions: ['view', 'create', 'manage'] },
    hospitals: { label: 'Hospitals', actions: ['view', 'create', 'edit', 'delete'] },
    machines: { label: 'Machines', actions: ['view', 'create', 'edit', 'delete'] },
    consumables: { label: 'Consumables', actions: ['view', 'create', 'edit', 'delete'] },
    billing: { label: 'Billing', actions: ['view', 'create', 'edit', 'delete', 'payments'] },
    finance: { label: 'Finance', actions: ['view', 'export'] },
    analytics: { label: 'Analytics', actions: ['view', 'export'] },
    calendar: { label: 'Calendar', actions: ['view', 'manage'] },
    users: { label: 'Users', actions: ['view', 'create', 'edit', 'delete'] },
    reviews: { label: 'Reviews', actions: ['view', 'create', 'delete'] },
  };

  const ACTION_LABELS = {
    view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete',
    assign: 'Assign', manage: 'Manage', payments: 'Record Payments', export: 'Export'
  };

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await axios.get(`${API_ENDPOINTS.USERS}/${user.id}/permissions`);
        setPermissions(response.data.permissions || {});
        setDefaultPermissions(response.data.defaultPermissions || {});
        setSummary(response.data.summary || {});
      } catch (error) {
        // Initialize empty permissions if table doesn't exist yet
        const initial = {};
        for (const [module, config] of Object.entries(PERMISSION_GROUPS)) {
          initial[module] = {};
          for (const action of config.actions) {
            initial[module][action] = { enabled: false, isDefault: false, isCustom: false };
          }
        }
        setPermissions(initial);
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, [user.id]);

  const togglePermission = (module, action) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: {
          ...prev[module]?.[action],
          enabled: !prev[module]?.[action]?.enabled,
          isCustom: true
        }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_ENDPOINTS.USERS}/${user.id}/permissions`, { permissions });
      toast.success('Permissions saved successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error saving permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_ENDPOINTS.USERS}/${user.id}/permissions`);
      toast.success('Permissions reset to default!');
      onSuccess();
    } catch (error) {
      toast.error('Error resetting permissions');
    } finally {
      setSaving(false);
    }
  };

  const isDefault = (module, action) => defaultPermissions[module]?.includes(action);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Permissions</h2>
            <p className="text-sm text-gray-500">Customize permissions for {user.username} ({user.role} role)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* User Info */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div>
                <p className="font-semibold text-gray-900">{user.username}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${ROLE_COLORS[user.role]}`}>{user.role}</span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#19ADB8] rounded"></div> Default for role</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div> Custom added</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"></div> Restricted</span>
            </div>

            {/* Permission Groups - Show ALL modules so admin can grant any permission to any role */}
            {Object.entries(PERMISSION_GROUPS).map(([module, config]) => {
              const hasDefaultsForModule = defaultPermissions[module]?.length > 0;
              return (
                <div key={module} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
                    <Shield size={16} className="text-[#19ADB8]" />
                    <span className="font-medium text-gray-900">{config.label}</span>
                    {!hasDefaultsForModule && (
                      <span className="ml-auto text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded">Not in role defaults</span>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {config.actions.map(action => {
                      const perm = permissions[module]?.[action];
                      const enabled = perm?.enabled;
                      const isDefaultPerm = isDefault(module, action);

                      return (
                        <label
                          key={action}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                                                    ${enabled ? 'bg-[#19ADB8]/10 border-[#19ADB8]' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                        >
                          <input
                            type="checkbox"
                            checked={enabled || false}
                            onChange={() => togglePermission(module, action)}
                            className="w-4 h-4 text-[#19ADB8] rounded border-gray-300 focus:ring-[#19ADB8]"
                          />
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {ACTION_LABELS[action] || action} {module.charAt(0).toUpperCase() + module.slice(1)}
                          </span>
                          {isDefaultPerm && enabled && (
                            <span className="ml-auto px-2 py-0.5 text-xs bg-[#19ADB8] text-white rounded">Default</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900 mb-2">Permission Summary:</p>
              <div className="flex gap-6 text-sm">
                <span>Total Enabled: <strong className="text-[#19ADB8]">{summary.totalEnabled}</strong></span>
                <span>Custom Added: <strong className="text-green-600">{summary.customAdded}</strong></span>
                <span>Restricted: <strong className="text-red-600">{summary.restricted}</strong></span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <button onClick={onClose} className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium w-full sm:w-auto">Cancel</button>
              <button onClick={handleReset} disabled={saving} className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium w-full sm:w-auto">Reset to Default</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium disabled:opacity-50 w-full sm:w-auto">
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
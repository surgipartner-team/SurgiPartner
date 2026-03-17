'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import { Search, Users, Mail, Phone, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  sales: 'bg-blue-100 text-blue-700',
  ops: 'bg-green-100 text-green-700',
  carebuddy: 'bg-pink-100 text-pink-700',
  accountant: 'bg-yellow-100 text-yellow-700',
  outsourcing: 'bg-orange-100 text-orange-700',
  patient: 'bg-indigo-100 text-indigo-700'
};

export default function OutsourcingUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await axios.get(`${API_ENDPOINTS.USERS}?${params.toString()}`);
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

  if (loading && !users.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users Directory</h1>
        <p className="text-gray-500">View all users in the system</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
          />
        </div>
      </div>

      {/* User Cards */}
      <div className="space-y-4">
        {users.length === 0 ? (
          <div className="bg-white rounded-xl border p-16 text-center">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">Try adjusting your search</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full ${getAvatarColor(user.role)} flex items-center justify-center text-white font-semibold text-lg`}>
                  {getInitials(user.username)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{user.username}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {user.role}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.is_active ? 'active' : 'inactive'}
                    </span>
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
                      <Calendar size={12} />
                      Joined {formatDate(user.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


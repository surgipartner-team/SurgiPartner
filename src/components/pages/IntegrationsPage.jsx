'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Facebook, Globe, MessageCircle, Search, Settings, ExternalLink, RefreshCw, CheckCircle, XCircle, Instagram } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/constants';

// Since we don't have these icons in lucide-react (or uncertain), using generic ones or custom SVGs is better.
// But for now, we map providers to available Lucide icons or simple placeholders.
const ProviderIcon = ({ provider, className }) => {
    switch (provider) {
        case 'facebook':
            return <Facebook className={className} />;
        case 'instagram':
            return <Instagram className={className} />;
        case 'google':
            return <Search className={className} />; // Google lens/search icon
        case 'whatsapp':
            return <MessageCircle className={className} />;
        default: // website
            return <Globe className={className} />;
    }
};

const getProviderColor = (provider) => {
    switch (provider) {
        case 'facebook': return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'instagram': return 'text-pink-600 bg-pink-50 border-pink-200';
        case 'google': return 'text-orange-500 bg-orange-50 border-orange-200';
        case 'whatsapp': return 'text-green-600 bg-green-50 border-green-200';
        default: return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    }
};

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [configuringId, setConfiguringId] = useState(null);

    const fetchIntegrations = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/v1/integrations');
            setIntegrations(res.data.integrations || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load integrations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const handleToggle = async (id, currentState) => {
        try {
            await axios.put('/api/v1/integrations', { id, is_active: !currentState });
            setIntegrations(prev => prev.map(i => i.id === id ? { ...i, is_active: !currentState } : i));
            toast.success(`Integration ${!currentState ? 'enabled' : 'disabled'}`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to update status');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading integrations...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lead Integrations</h1>
                    <p className="text-slate-500 mt-1">Manage external sources for automatic lead ingestion</p>
                </div>
                <button onClick={fetchIntegrations} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrations.map((integration) => (
                    <div key={integration.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getProviderColor(integration.provider)}`}>
                                    <ProviderIcon provider={integration.provider} className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{integration.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${integration.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {integration.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toast.info('Configure modal coming soon')}
                                    className="p-2 text-slate-400 hover:text-[#004071] transition-colors rounded-lg hover:bg-slate-50"
                                    title="Configure"
                                >
                                    <Settings size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Webhook URL</label>
                                <div className="flex items-center gap-2 mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                    <code className="text-xs text-slate-600 truncate flex-1 font-mono">{integration.webhook_url}</code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(integration.webhook_url || '');
                                            toast.success('Copied to clipboard');
                                        }}
                                        className="text-slate-400 hover:text-slate-600"
                                        title="Copy URL"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{integration.total_leads_received}</div>
                                    <div className="text-xs text-slate-500">Leads Received</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-700">Auto-Assign</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        {integration.is_active ? <CheckCircle size={12} className="text-green-500" /> : <XCircle size={12} className="text-slate-400" />}
                                        {integration.is_active ? 'Enabled' : 'Disabled'}
                                    </div>
                                </div>
                            </div>

                            {integration.last_lead_received_at && (
                                <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                                    Last lead received: {new Date(integration.last_lead_received_at).toLocaleString()}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button className="flex-1 py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                                <Settings size={16} /> Configure
                            </button>
                            <button className={`flex-1 py-2 px-4 text-white text-sm font-medium rounded-lg transition-colors ${integration.is_active ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                                onClick={() => handleToggle(integration.id, integration.is_active)}
                            >
                                {integration.is_active ? 'Disable' : 'Enable'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

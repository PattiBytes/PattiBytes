'use client';
import { Crown, Shield, Users, Settings, Database, BarChart3, GitBranch } from 'lucide-react';

const PRIVILEGES = [
  { icon: Crown,    label: 'Full system access',                  color: 'text-yellow-600' },
  { icon: Users,    label: 'Create, edit & remove admin accounts', color: 'text-blue-600'   },
  { icon: GitBranch,label: 'Assign admins to branches',           color: 'text-purple-600' },
  { icon: Shield,   label: 'Set admin permissions & levels',       color: 'text-green-600'  },
  { icon: BarChart3,label: 'Access all analytics & reports',       color: 'text-orange-600' },
  { icon: Settings, label: 'System configuration',                color: 'text-gray-600'   },
  { icon: Database, label: 'Database & data management',           color: 'text-red-600'    },
];

export default function PrivilegesCard() {
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Crown size={22} className="text-yellow-600" />
        <h3 className="font-bold text-gray-900 text-lg">Super Admin Privileges</h3>
      </div>
      <ul className="space-y-2">
        {PRIVILEGES.map(p => (
          <li key={p.label} className="flex items-center gap-3">
            <p.icon size={15} className={`${p.color} shrink-0`} />
            <span className="text-sm text-gray-700">{p.label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 pt-4 border-t border-yellow-200">
        <p className="text-xs text-yellow-700 font-semibold">
          ⚠️ With great power comes great responsibility. All actions are logged.
        </p>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  BarChart3, 
  Plus, 
  X, 
  Check, 
  Utensils, 
  ShoppingBag, 
  Bus, 
  Home, 
  Tv, 
  Stethoscope, 
  Gamepad2, 
  Package, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  Wallet,
  Calendar,
  AlertCircle,
  Search,
  Settings,
  Download,
  Upload,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type TransactionType = 'income' | 'expense';

interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  note: string;
  amount: number;
  date: string;
}

interface Shortcut {
  id: string;
  name: string;
  category: string;
  amount: number;
  type: TransactionType;
}

interface SavingGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  color: string;
}

interface Reminder {
  id: string;
  type: 'deposit' | 'debt' | 'card';
  title: string;
  amount: number;
  date: string;
  interestRate?: number;
  isCompleted: boolean;
}

interface CategoryBudget {
  [category: string]: number;
}

// --- Constants ---
interface CategoryConfig {
  icon: string; // Store icon name as string for persistence
  color: string;
  hex: string;
}

const DEFAULT_CATEGORIES: Record<string, Record<string, CategoryConfig>> = {
  EXPENSE: {
    '餐飲': { icon: 'Utensils', color: 'bg-orange-100 text-orange-500', hex: '#f97316' },
    '交通': { icon: 'Bus', color: 'bg-sky-100 text-sky-500', hex: '#0ea5e9' },
    '購物': { icon: 'ShoppingBag', color: 'bg-rose-100 text-rose-500', hex: '#f43f5e' },
    '娛樂': { icon: 'Gamepad2', color: 'bg-purple-100 text-purple-500', hex: '#a855f7' },
    '日用品': { icon: 'Package', color: 'bg-emerald-100 text-emerald-500', hex: '#10b981' },
    '醫藥': { icon: 'Stethoscope', color: 'bg-red-100 text-red-500', hex: '#ef4444' },
    '居住': { icon: 'Home', color: 'bg-amber-100 text-amber-600', hex: '#d97706' },
    '數位': { icon: 'Tv', color: 'bg-indigo-100 text-indigo-500', hex: '#6366f1' },
  },
  INCOME: {
    '薪資': { icon: 'Wallet', color: 'bg-blue-100 text-blue-500', hex: '#3b82f6' },
    '獎金': { icon: 'TrendingUp', color: 'bg-yellow-100 text-yellow-600', hex: '#ca8a04' },
    '投資': { icon: 'BarChart3', color: 'bg-violet-100 text-violet-500', hex: '#8b5cf6' },
    '其他': { icon: 'Plus', color: 'bg-slate-100 text-slate-500', hex: '#64748b' },
  }
};

const IconMap: Record<string, React.ReactNode> = {
  Utensils: <Utensils size={18}/>,
  Bus: <Bus size={18}/>,
  ShoppingBag: <ShoppingBag size={18}/>,
  Gamepad2: <Gamepad2 size={18}/>,
  Package: <Package size={18}/>,
  Stethoscope: <Stethoscope size={18}/>,
  Home: <Home size={18}/>,
  Tv: <Tv size={18}/>,
  Wallet: <Wallet size={18}/>,
  TrendingUp: <TrendingUp size={18}/>,
  BarChart3: <BarChart3 size={18}/>,
  Plus: <Plus size={18}/>,
  TrendingDown: <TrendingDown size={18}/>,
  ArrowUpRight: <ArrowUpRight size={18}/>,
  ArrowDownRight: <ArrowDownRight size={18}/>,
};

const STORAGE_KEY = 'aki_finance_transactions';
const BUDGET_KEY = 'aki_finance_category_budgets';
const SAVINGS_KEY = 'aki_finance_savings';
const REMINDERS_KEY = 'aki_finance_reminders';
const SHORTCUTS_KEY = 'aki_finance_shortcuts';
const CATEGORIES_KEY = 'aki_finance_categories';
const APP_TITLE_KEY = 'aki_finance_app_title';

const App = () => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'savings' | 'deposits' | 'report' | 'calendar' | 'settings'>('dashboard');
  const [appTitle, setAppTitle] = useState(() => localStorage.getItem(APP_TITLE_KEY) || 'Aki Finance');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState<Record<string, Record<string, CategoryConfig>>>(() => {
    const saved = localStorage.getItem(CATEGORIES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget>(() => {
    const saved = localStorage.getItem(BUDGET_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  
  const [savings, setSavings] = useState<SavingGoal[]>(() => {
    const saved = localStorage.getItem(SAVINGS_KEY);
    return saved ? JSON.parse(saved) : [
      { id: '1', name: '旅行基金', target: 50000, current: 12000, color: 'bg-pink-200' },
      { id: '2', name: '緊急預備金', target: 100000, current: 45000, color: 'bg-blue-200' }
    ];
  });

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem(REMINDERS_KEY);
    if (saved) return JSON.parse(saved);
    
    // Migration from old key if exists
    const old = localStorage.getItem('aki_finance_deposits');
    if (old) {
      const parsed = JSON.parse(old);
      return parsed.map((d: any) => ({
        id: d.id,
        type: 'deposit',
        title: d.bank,
        amount: d.amount,
        date: d.maturityDate,
        interestRate: d.interestRate,
        isCompleted: d.isRenewed
      }));
    }

    return [
      { id: '1', type: 'deposit', title: 'BOC', amount: 100000, date: '2026-06-30', interestRate: 3.5, isCompleted: false }
    ];
  });

  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    const saved = localStorage.getItem(SHORTCUTS_KEY);
    return saved ? JSON.parse(saved) : [
      { id: '1', name: '午餐', category: '餐飲', amount: 60, type: 'expense' },
      { id: '2', name: '巴士', category: '交通', amount: 12, type: 'expense' },
      { id: '3', name: '超市', category: '購物', amount: 200, type: 'expense' },
    ];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [activeBudgetCategory, setActiveBudgetCategory] = useState<string | null>(null);
  const [budgetInputValue, setBudgetInputValue] = useState('');

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isManagingShortcuts, setIsManagingShortcuts] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'transaction' | 'saving' | 'reminder' | 'shortcut'>('transaction');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    reminderType: 'deposit' as 'deposit' | 'debt' | 'card',
    amount: '',
    category: '餐飲',
    note: '',
    date: new Date().toISOString().split('T')[0],
    title: '',
    interestRate: '0',
    shortcutName: ''
  });
  
  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    localStorage.setItem(BUDGET_KEY, JSON.stringify(categoryBudgets));
    localStorage.setItem(SAVINGS_KEY, JSON.stringify(savings));
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    localStorage.setItem(APP_TITLE_KEY, appTitle);
  }, [transactions, categoryBudgets, savings, reminders, shortcuts, categories, appTitle]);

  // --- Data Computation ---
  const stats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const categoryMap: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    const categoryList = Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value,
        percent: totalExpense > 0 ? Math.round((value / totalExpense) * 100) : 0,
        color: categories.EXPENSE[name]?.color || 'bg-k-beige text-k-ink',
        hex: categories.EXPENSE[name]?.hex || '#4A4A4A'
      }))
      .sort((a, b) => b.value - a.value);

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, categoryList };
  }, [transactions, categories]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(t => 
      t.note.toLowerCase().includes(q) || 
      t.category.toLowerCase().includes(q)
    );
  }, [transactions, searchQuery]);

  // --- Actions ---
  const handleOpenModal = (item?: Transaction | Reminder | Shortcut) => {
    if (item) {
      setEditingId(item.id);
      if ('type' in item && (item.type === 'income' || item.type === 'expense')) {
        if ('name' in item) {
          // Shortcut
          const sItem = item as Shortcut;
          setFormData({
            ...formData,
            type: sItem.type,
            amount: sItem.amount.toString(),
            category: sItem.category,
            shortcutName: sItem.name,
            note: sItem.name
          });
          setModalType('shortcut');
        } else {
          // Transaction
          const tItem = item as Transaction;
          setFormData({
            ...formData,
            type: tItem.type,
            amount: tItem.amount.toString(),
            category: tItem.category,
            note: tItem.note,
            date: tItem.date.split('T')[0]
          });
          setModalType('transaction');
        }
      } else {
        const rItem = item as Reminder;
        setFormData({
          ...formData,
          reminderType: rItem.type,
          amount: rItem.amount.toString(),
          title: rItem.title,
          date: rItem.date,
          interestRate: rItem.interestRate?.toString() || '0'
        });
        setModalType('reminder');
      }
    } else {
      setEditingId(null);
      setFormData({
        type: 'expense',
        reminderType: 'deposit',
        amount: '',
        category: '餐飲',
        note: '',
        date: new Date().toISOString().split('T')[0],
        title: '',
        interestRate: '0',
        shortcutName: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const amount = Number(formData.amount);
    if (!amount || amount <= 0) return;

    if (modalType === 'transaction') {
      if (editingId) {
        setTransactions(prev => prev.map(t => t.id === editingId ? { 
          ...t, 
          type: formData.type,
          category: formData.category,
          note: formData.note,
          amount,
          date: new Date(formData.date).toISOString()
        } : t));
      } else {
        setTransactions(prev => [{
          id: Date.now().toString(),
          type: formData.type,
          category: formData.category,
          note: formData.note,
          amount,
          date: new Date(formData.date).toISOString()
        }, ...prev]);
      }
    } else if (modalType === 'reminder') {
      if (editingId) {
        setReminders(prev => prev.map(r => r.id === editingId ? {
          ...r,
          type: formData.reminderType,
          title: formData.title || 'Unknown',
          amount,
          date: formData.date,
          interestRate: formData.reminderType === 'deposit' ? Number(formData.interestRate) : undefined
        } : r));
      } else {
        setReminders(prev => [...prev, {
          id: Date.now().toString(),
          type: formData.reminderType,
          title: formData.title || 'Unknown',
          amount,
          date: formData.date,
          interestRate: formData.reminderType === 'deposit' ? Number(formData.interestRate) : undefined,
          isCompleted: false
        }]);
      }
    } else if (modalType === 'shortcut') {
      if (editingId) {
        setShortcuts(prev => prev.map(s => s.id === editingId ? {
          ...s,
          name: formData.shortcutName,
          category: formData.category,
          amount,
          type: formData.type
        } : s));
      } else {
        setShortcuts(prev => [...prev, {
          id: Date.now().toString(),
          name: formData.shortcutName,
          category: formData.category,
          amount,
          type: formData.type
        }]);
      }
    }
    setIsModalOpen(false);
  };

  const useShortcut = (shortcut: Shortcut) => {
    setTransactions(prev => [{
      id: Date.now().toString(),
      type: shortcut.type,
      category: shortcut.category,
      note: shortcut.name,
      amount: shortcut.amount,
      date: new Date().toLocaleDateString('en-CA')
    }, ...prev]);
  };

  const moveShortcut = (index: number, direction: number) => {
    const newShortcuts = [...shortcuts];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newShortcuts.length) return;
    [newShortcuts[index], newShortcuts[targetIndex]] = [newShortcuts[targetIndex], newShortcuts[index]];
    setShortcuts(newShortcuts);
  };

  const handleDelete = (id: string) => {
    if (modalType === 'transaction') {
      setTransactions(prev => prev.filter(t => t.id !== id));
    } else if (modalType === 'reminder') {
      setReminders(prev => prev.filter(r => r.id !== id));
    } else if (modalType === 'shortcut') {
      setShortcuts(prev => prev.filter(s => s.id !== id));
    }
    setIsModalOpen(false);
  };

  const exportData = () => {
    const data = {
      transactions,
      categoryBudgets,
      savings,
      reminders,
      shortcuts,
      categories,
      appTitle
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appTitle}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.transactions) setTransactions(data.transactions);
        if (data.categoryBudgets) setCategoryBudgets(data.categoryBudgets);
        if (data.savings) setSavings(data.savings);
        if (data.reminders) setReminders(data.reminders);
        if (data.shortcuts) setShortcuts(data.shortcuts);
        if (data.categories) setCategories(data.categories);
        if (data.appTitle) setAppTitle(data.appTitle);
        alert('匯入成功！');
      } catch (err) {
        alert('匯入失敗，請檢查檔案格式。');
      }
    };
    reader.readAsText(file);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const type = formData.type.toUpperCase();
    const newCat: CategoryConfig = {
      icon: 'Plus',
      color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
      hex: '#64748b'
    };
    
    setCategories(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [newCategoryName]: newCat
      }
    }));
    setFormData({ ...formData, category: newCategoryName });
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Date Logic
  const today = new Date();
  const remainingDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();

  return (
    <div className={cn(
      "flex flex-col min-h-screen text-k-ink select-none overflow-x-hidden transition-colors duration-300 bg-k-cream"
    )}>
      
      {/* Header */}
      <header className="px-6 pt-10 pb-6 bg-cute-pink/20 rounded-b-[3rem] border-b-2 border-cute-pink/30">
        <div className="flex justify-between items-end">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center border border-cute-pink">
                <span className="text-lg">🧸</span>
              </div>
              <p className="text-[10px] font-bold text-k-accent uppercase tracking-widest">
                {new Date().toLocaleDateString('zh-HK', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            {isEditingTitle ? (
              <input 
                autoFocus
                className="text-3xl font-black bg-transparent border-b-2 border-cute-pink outline-none w-full"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              />
            ) : (
              <h1 
                onClick={() => setIsEditingTitle(true)}
                className="text-3xl font-black tracking-tight cursor-pointer hover:text-cute-pink transition-colors"
              >
                {appTitle}
              </h1>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Calendar size={12} className="text-cute-pink" />
              <span className="text-[10px] font-bold text-k-accent uppercase tracking-widest">
                剩餘 {remainingDays} 天
              </span>
            </div>
          </motion.div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('settings')}
              className="bg-white p-3 rounded-2xl border-2 border-cute-pink text-cute-pink active:scale-95 transition-all shadow-sm"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Balance Card */}
              <div className="bg-white p-6 rounded-[2.5rem] text-k-ink shadow-xl shadow-cute-pink/10 border-2 border-cute-pink relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cute-pink/20 rounded-full blur-3xl -translate-y-12 translate-x-12" />
                <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-k-accent uppercase tracking-[0.2em] mb-1">目前結餘</p>
                      <h2 className="text-4xl font-black tracking-tighter">
                        ${stats.balance.toLocaleString()}
                      </h2>
                    </div>
                    <div className="bg-cute-yellow/30 px-4 py-2 rounded-2xl border border-cute-yellow/50">
                       <span className="text-[10px] font-bold text-k-accent uppercase tracking-widest">本月</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-1 bg-cute-green/20 rounded-2xl p-3 border border-cute-green/40 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-cute-green flex items-center justify-center text-emerald-600">
                        <ArrowUpRight size={16} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-emerald-700 uppercase leading-none mb-1">收入</p>
                        <p className="text-sm font-black text-emerald-600">+{stats.totalIncome.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex-1 bg-cute-pink/20 rounded-2xl p-3 border border-cute-pink/40 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-cute-pink flex items-center justify-center text-rose-500">
                        <ArrowDownRight size={16} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-rose-700 uppercase leading-none mb-1">支出</p>
                        <p className="text-sm font-black text-rose-500">-{stats.totalExpense.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shortcuts Section */}
              <section className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-black text-k-ink text-lg">快捷輸入</h3>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsManagingShortcuts(!isManagingShortcuts)} 
                      className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors px-2 py-1 rounded-lg", isManagingShortcuts ? "bg-cute-pink text-rose-500" : "text-k-accent")}
                    >
                      {isManagingShortcuts ? '完成' : '管理'}
                    </button>
                    <button onClick={() => { setModalType('shortcut'); handleOpenModal(); }} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                      新增
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2">
                  {shortcuts.map((s, idx) => (
                    <div key={s.id} className="flex flex-col gap-2 flex-shrink-0">
                      <motion.button
                        whileTap={isManagingShortcuts ? {} : { scale: 0.95 }}
                        onClick={() => isManagingShortcuts ? handleOpenModal(s) : useShortcut(s)}
                        className={cn(
                          "bg-white px-6 py-4 rounded-[2rem] border-2 shadow-sm flex items-center gap-4 transition-all relative min-w-[140px]",
                          isManagingShortcuts ? "border-cute-pink scale-105" : "border-cute-yellow active:bg-cute-yellow/20"
                        )}
                      >
                        <div className={cn("p-2.5 rounded-2xl", s.type === 'expense' ? "bg-cute-pink/40 text-rose-500" : "bg-cute-green/40 text-emerald-500")}>
                          {s.type === 'expense' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div className="text-left flex flex-col min-w-0">
                          <p className="text-sm font-black text-k-ink leading-tight truncate">{s.name}</p>
                          <p className="text-[11px] font-bold text-k-accent whitespace-nowrap">${s.amount}</p>
                        </div>
                        {isManagingShortcuts && (
                          <div className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-2 shadow-lg">
                            <Settings size={10} />
                          </div>
                        )}
                      </motion.button>
                      {isManagingShortcuts && (
                        <div className="flex gap-2 justify-center">
                          <button 
                            disabled={idx === 0}
                            onClick={() => moveShortcut(idx, -1)}
                            className="p-2 bg-cute-yellow/40 rounded-xl text-k-accent disabled:opacity-30"
                          >
                            <ChevronRight size={14} className="rotate-180" />
                          </button>
                          <button 
                            disabled={idx === shortcuts.length - 1}
                            onClick={() => moveShortcut(idx, 1)}
                            className="p-2 bg-cute-yellow/40 rounded-xl text-k-accent disabled:opacity-30"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Reminders Section (Compact) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-black text-k-ink text-lg">提醒</h3>
                  <button onClick={() => { setModalType('reminder'); handleOpenModal(); }} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                    新增
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2">
                  {reminders.map(rem => (
                    <motion.button 
                      key={rem.id} 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleOpenModal(rem)}
                      className={cn(
                        "bg-white px-6 py-4 rounded-[2rem] border-2 shadow-sm flex items-center gap-4 transition-all flex-shrink-0 min-w-[160px]",
                        rem.type === 'deposit' ? "border-cute-green" : 
                        rem.type === 'debt' ? "border-cute-pink" : "border-cute-blue"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-2xl",
                        rem.type === 'deposit' ? "bg-cute-green/40 text-emerald-600" : 
                        rem.type === 'debt' ? "bg-cute-pink/40 text-rose-500" : "bg-cute-blue/40 text-blue-500"
                      )}>
                        {rem.type === 'deposit' ? <TrendingUp size={18} /> : 
                         rem.type === 'debt' ? <AlertCircle size={18} /> : <Wallet size={18} />}
                      </div>
                      <div className="text-left flex flex-col min-w-0">
                        <p className="text-sm font-black text-k-ink leading-tight truncate">{rem.title}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-bold text-k-accent whitespace-nowrap">${rem.amount.toLocaleString()}</p>
                          <span className="w-1 h-1 rounded-full bg-k-accent/30" />
                          <p className="text-[9px] font-bold text-k-accent/60 uppercase tracking-tighter">{rem.date}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* Recent Activity */}
              <section className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-black text-k-ink text-lg">最近活動</h3>
                  <button onClick={() => setActiveTab('expenses')} className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">查看全部</button>
                </div>
                <div className="space-y-4">
                  {transactions.slice(0, 5).map(t => (
                    <TransactionItem 
                      key={t.id} 
                      item={t} 
                      categories={categories}
                      onClick={() => handleOpenModal(t)}
                    />
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="bg-white p-10 rounded-[3rem] border-2 border-cute-pink shadow-xl shadow-cute-pink/10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-cute-pink/20 rounded-full blur-3xl -translate-y-12 -translate-x-12" />
                <h2 className="text-2xl font-black text-k-ink relative z-10">設置與備份</h2>
                
                <div className="space-y-6 relative z-10">
                  <div className="p-6 bg-cute-yellow/30 rounded-[2rem] border-2 border-cute-yellow/50">
                    <h4 className="font-bold text-k-ink mb-2">數據備份</h4>
                    <p className="text-xs text-k-ink/60 mb-6">將您的所有交易、預算和設置導出為 JSON 檔案。</p>
                    <button 
                      onClick={exportData}
                      className="w-full py-4 bg-cute-pink text-white rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-cute-pink/20 flex items-center justify-center gap-2"
                    >
                      <Download size={18} /> 導出數據
                    </button>
                  </div>

                  <div className="p-6 bg-cute-blue/30 rounded-[2rem] border-2 border-cute-blue/50">
                    <h4 className="font-bold text-k-ink mb-2">數據恢復</h4>
                    <p className="text-xs text-k-ink/60 mb-6">從備份檔案中恢復您的數據。這將覆蓋目前的數據。</p>
                    <label className="w-full py-4 bg-white text-cute-pink border-2 border-cute-pink border-dashed rounded-2xl font-bold active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                      <Upload size={18} /> 匯入數據
                      <input type="file" accept=".json" onChange={importData} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="pt-8 border-t-2 border-cute-pink/20 relative z-10">
                  <p className="text-xs text-center text-k-ink/40 tracking-widest">Aki Finance v2.5 • 韓國文青可愛風 🧸</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'savings' && (
            <motion.div 
              key="savings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="font-black text-k-ink text-lg px-2">儲錢目標</h3>
              <div className="grid grid-cols-1 gap-4">
                {savings.map(goal => (
                  <div key={goal.id} className="bg-white p-6 rounded-[2rem] border-2 border-cute-pink/20 shadow-sm space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cute-blue/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <h4 className="font-black text-k-ink text-lg">{goal.name}</h4>
                        <p className="text-[11px] font-bold text-k-accent uppercase tracking-widest">
                          目標: ${goal.target.toLocaleString()}
                        </p>
                      </div>
                      <span className="text-sm font-black text-blue-500 bg-cute-blue/40 px-3 py-1 rounded-xl border border-cute-blue/50">
                        {Math.round((goal.current / goal.target) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-cute-blue/20 rounded-full overflow-hidden border border-cute-blue/30 relative z-10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(goal.current / goal.target) * 100}%` }}
                        className="h-full bg-blue-400 rounded-full shadow-sm"
                      />
                    </div>
                    <div className="flex justify-between relative z-10">
                      <span className="text-[11px] font-bold text-k-accent/60">${goal.current.toLocaleString()}</span>
                      <span className="text-[11px] font-bold text-k-accent/60">${goal.target.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'deposits' && (
            <motion.div 
              key="deposits"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-k-ink text-lg">提醒</h3>
                <button onClick={() => { setModalType('reminder'); handleOpenModal(); }} className="p-2 bg-k-rose text-rose-500 rounded-xl">
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {reminders.map(rem => (
                  <div key={rem.id} className="bg-white p-5 rounded-[2rem] border border-k-beige shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-3.5 rounded-[1.2rem]",
                          rem.type === 'deposit' ? "bg-k-sage text-emerald-500" : 
                          rem.type === 'debt' ? "bg-k-rose text-amber-600" : "bg-k-beige text-blue-500"
                        )}>
                          {rem.type === 'deposit' ? <TrendingUp size={18} /> : 
                           rem.type === 'debt' ? <AlertCircle size={18} /> : <Wallet size={18} />}
                        </div>
                        <div>
                          <h4 className="font-black text-k-ink text-sm">{rem.title}</h4>
                          <span className="text-[10px] text-k-accent font-bold uppercase tracking-wider">
                            {rem.type === 'deposit' ? '到期日' : '還款日'}: {rem.date}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-k-ink">${rem.amount.toLocaleString()}</p>
                        {rem.type === 'deposit' && <p className="text-[10px] font-bold text-emerald-500">{rem.interestRate}% P.A.</p>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-k-beige">
                      <div className="text-[10px] font-bold text-k-accent uppercase">
                        {rem.type === 'deposit' ? `利息: $${(rem.amount * (rem.interestRate || 0) / 100).toLocaleString()}` : 
                         rem.type === 'debt' ? '欠款' : '信用卡還款'}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(rem)} className="text-[10px] font-bold text-k-accent uppercase tracking-widest">
                          編輯
                        </button>
                        <button 
                          onClick={() => setReminders(reminders.map(r => r.id === rem.id ? { ...r, isCompleted: !r.isCompleted } : r))}
                          className={cn("text-[10px] font-bold uppercase tracking-widest", rem.isCompleted ? "text-emerald-500" : "text-rose-500")}
                        >
                          {rem.isCompleted ? '已完成' : '待處理'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div 
              key="expenses"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-4 mb-2">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-black text-k-ink text-lg">歷史明細</h3>
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-k-beige text-[10px] font-bold text-k-accent">
                    共 {filteredTransactions.length} 筆
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-k-accent/40" size={16} />
                  <input 
                    type="text"
                    placeholder="搜尋備註或分類..."
                    className="w-full bg-white border border-k-beige rounded-2xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-k-rose/20 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredTransactions.map(item => (
                  <TransactionItem 
                    key={item.id} 
                    item={item} 
                    categories={categories}
                    onClick={() => handleOpenModal(item)} 
                  />
                ))}
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-20">
                    <p className="text-k-accent/40 text-sm">找不到相關紀錄</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div 
              key="report"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-cute-pink/10 border-2 border-cute-pink">
                <h3 className="font-black text-k-ink mb-8 text-center text-xl">收支報告</h3>
                
                {/* Recharts Donut Chart */}
                <div className="h-64 w-full mb-10 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryList}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {stats.categoryList.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.hex} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '24px', border: '2px solid #FFD1DC', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)', backgroundColor: '#ffffff', color: '#5D5451' }}
                        itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-k-ink">${stats.totalExpense.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-k-accent uppercase mt-1 tracking-widest">總支出</span>
                  </div>
                </div>

                <div className="space-y-8">
                  {Object.keys(categories.EXPENSE).map((catName) => {
                    const catData = stats.categoryList.find(c => c.name === catName) || { value: 0, percent: 0, color: categories.EXPENSE[catName].color };
                    const catBudget = categoryBudgets[catName] || 0;
                    const isOverBudget = catBudget > 0 && catData.value > catBudget;
                    const percentUsed = catBudget > 0 ? Math.round((catData.value / catBudget) * 100) : 0;

                    return (
                      <div key={catName} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn("p-3 rounded-2xl", categories.EXPENSE[catName].color)}>
                              {IconMap[categories.EXPENSE[catName].icon]}
                            </div>
                            <div>
                              <span className="text-sm font-black text-k-ink">{catName}</span>
                              <p className="text-[11px] font-bold text-k-accent uppercase">
                                ${catData.value.toLocaleString()} / {catBudget > 0 ? `$${catBudget.toLocaleString()}` : '無預算'}
                                {catBudget > 0 && <span className={cn("ml-2", isOverBudget ? "text-rose-500" : "text-emerald-500")}>({percentUsed}%)</span>}
                              </p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveBudgetCategory(catName);
                              setBudgetInputValue(catBudget.toString());
                              setIsBudgetModalOpen(true);
                            }}
                            className="text-[10px] font-bold text-rose-500 uppercase tracking-widest bg-cute-pink/40 px-3 py-1.5 rounded-xl active:scale-90 transition-all border border-cute-pink/50"
                          >
                            設定預算
                          </button>
                        </div>
                        {catBudget > 0 && (
                          <div className="w-full h-2 bg-cute-yellow/30 rounded-full overflow-hidden border border-cute-yellow/50">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((catData.value / catBudget) * 100, 100)}%` }}
                              className={cn("h-full rounded-full", isOverBudget ? 'bg-rose-400' : 'bg-emerald-400')}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border-2 border-cute-pink/20 shadow-sm">
                  <p className="text-[10px] font-bold text-k-accent uppercase tracking-widest mb-1">總收入</p>
                  <p className="text-lg font-black text-emerald-500">${stats.totalIncome.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border-2 border-cute-pink/20 shadow-sm">
                  <p className="text-[10px] font-bold text-k-accent uppercase tracking-widest mb-1">總支出</p>
                  <p className="text-lg font-black text-rose-400">${stats.totalExpense.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'calendar' && (
            <CalendarView 
              transactions={transactions} 
              categoryBudgets={categoryBudgets}
              onDateClick={(date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const localDate = `${year}-${month}-${day}`;
                
                setFormData({
                  ...formData,
                  date: localDate,
                  type: 'expense'
                });
                setModalType('transaction');
                setIsModalOpen(true);
              }} 
            />
          )}
          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="font-black text-k-ink text-lg px-2">設定</h3>
              
              <div className="bg-white p-6 rounded-[2rem] border-2 border-cute-pink/20 shadow-sm space-y-6">
                <div className="space-y-2">
                  <h4 className="font-black text-k-ink">數據備份</h4>
                  <p className="text-xs text-k-accent">匯出您的所有交易紀錄、預算及設定。</p>
                  <button 
                    onClick={exportData}
                    className="w-full py-4 bg-cute-pink text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-cute-pink/20"
                  >
                    <Download size={18} /> 匯出數據 (JSON)
                  </button>
                </div>

                <div className="pt-6 border-t border-k-beige space-y-2">
                  <h4 className="font-black text-k-ink">匯入數據</h4>
                  <p className="text-xs text-k-accent">從備份檔案恢復數據。注意：這將覆蓋目前所有數據。</p>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={importData}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button className="w-full py-4 bg-cute-yellow/30 text-k-accent rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-cute-yellow/50">
                      <Upload size={18} /> 選擇備份檔案
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border-2 border-cute-pink/20 shadow-sm">
                <h4 className="font-black text-k-ink mb-2">關於</h4>
                <p className="text-xs text-k-accent leading-relaxed">
                  Aki Finance 是一款專為追求生活品質的您設計的理財工具。採用韓國文青手繪風格，讓記帳也成為一種享受。
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t-2 border-cute-pink/30 flex justify-around items-center pt-4 pb-10 px-6 z-50">
        <TabItem active={activeTab === 'dashboard'} icon={<LayoutDashboard size={24} />} onClick={() => setActiveTab('dashboard')} />
        <TabItem active={activeTab === 'calendar'} icon={<Calendar size={24} />} onClick={() => setActiveTab('calendar')} />
        <div className="relative -top-8">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setModalType('transaction'); handleOpenModal(); }}
            className="w-16 h-16 bg-cute-pink rounded-[2rem] shadow-xl shadow-cute-pink/40 flex items-center justify-center text-white border-4 border-white"
          >
            <Plus size={32} />
          </motion.button>
        </div>
        <TabItem active={activeTab === 'expenses'} icon={<Receipt size={24} />} onClick={() => setActiveTab('expenses')} />
        <TabItem active={activeTab === 'report'} icon={<BarChart3 size={24} />} onClick={() => setActiveTab('report')} />
      </nav>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-k-ink/40 backdrop-blur-sm" 
              onClick={() => setIsModalOpen(false)} 
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full rounded-t-[4rem] shadow-2xl relative z-[110] p-10 pb-16 overflow-y-auto max-h-[92vh] border-t-4 border-cute-pink"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-k-ink">
                  {editingId ? '編輯' : '新增'} {modalType === 'transaction' ? '明細' : modalType === 'reminder' ? '提醒' : modalType === 'shortcut' ? '快捷' : ''}
                </h3>
                <div className="flex gap-3">
                  {editingId && (
                    <button onClick={() => handleDelete(editingId)} className="p-4 bg-cute-pink/20 text-rose-500 rounded-[1.5rem] active:scale-90 transition-all border border-cute-pink/30">
                      <Trash2 size={22} />
                    </button>
                  )}
                  <button onClick={() => setIsModalOpen(false)} className="p-4 bg-cute-yellow/30 text-k-accent rounded-[1.5rem] active:scale-90 transition-all border border-cute-yellow/50">
                    <X size={22} />
                  </button>
                </div>
              </div>

              <div className="space-y-10">
                {(modalType === 'transaction' || modalType === 'shortcut') && (
                  <>
                    {/* Type Switch */}
                    <div className="flex bg-cute-yellow/20 p-2 rounded-[2.5rem] border-2 border-cute-yellow/30">
                      <button 
                        onClick={() => setFormData({...formData, type: 'expense', category: '餐飲'})}
                        className={cn(
                          "flex-1 py-4 rounded-[2rem] text-sm font-bold transition-all flex items-center justify-center gap-2",
                          formData.type === 'expense' ? 'bg-white text-rose-500 shadow-md' : 'text-k-accent/60'
                        )}
                      >
                        <TrendingDown size={16} /> 支出
                      </button>
                      <button 
                        onClick={() => setFormData({...formData, type: 'income', category: '薪資'})}
                        className={cn(
                          "flex-1 py-4 rounded-[2rem] text-sm font-bold transition-all flex items-center justify-center gap-2",
                          formData.type === 'income' ? 'bg-white text-emerald-500 shadow-md' : 'text-k-accent/60'
                        )}
                      >
                        <TrendingUp size={16} /> 收入
                      </button>
                    </div>

                    {/* Shortcut Name Input */}
                    {modalType === 'shortcut' && (
                      <div className="space-y-3">
                        <label className="text-[11px] font-bold text-k-accent uppercase tracking-widest ml-2">快捷名稱</label>
                        <input 
                          type="text"
                          className="w-full bg-cute-yellow/20 border-2 border-cute-yellow/30 rounded-[2rem] px-8 py-5 text-base font-bold text-k-ink focus:bg-white focus:ring-4 ring-cute-pink/10 transition-all outline-none"
                          placeholder="例如：午餐"
                          value={formData.shortcutName}
                          onChange={(e) => setFormData({ ...formData, shortcutName: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Amount Input */}
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-k-accent uppercase tracking-widest mb-4">金額 (HKD)</p>
                      <input 
                        type="number" 
                        autoFocus
                        placeholder="0"
                        className="w-full bg-transparent border-none text-7xl font-black text-k-ink text-center outline-none tracking-tighter"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                      />
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-4">
                      <p className="text-[11px] font-bold text-k-accent uppercase tracking-widest ml-2">分類</p>
                      <div className="grid grid-cols-4 gap-4">
                        {Object.entries(categories[formData.type.toUpperCase() as keyof typeof categories] || {}).map(([name, config]: [string, any]) => (
                          <button 
                            key={name}
                            onClick={() => setFormData({...formData, category: name})}
                            className={cn(
                              "flex flex-col items-center gap-3 p-4 rounded-[2rem] transition-all border-2",
                              formData.category === name 
                                ? 'bg-cute-pink border-cute-pink text-white shadow-xl ring-4 ring-cute-pink/20' 
                                : 'bg-cute-yellow/20 border-cute-yellow/30 text-k-accent'
                            )}
                          >
                            <div className="scale-125">{IconMap[config.icon]}</div>
                            <span className="text-[11px] font-bold">{name}</span>
                          </button>
                        ))}
                        <button 
                          onClick={() => setIsAddingCategory(true)}
                          className="flex flex-col items-center gap-3 p-4 rounded-[2rem] bg-white border-2 border-dashed border-cute-pink/40 text-cute-pink"
                        >
                          <Plus size={24} />
                          <span className="text-[11px] font-bold">新增</span>
                        </button>
                      </div>

                      {isAddingCategory && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex gap-3 mt-4"
                        >
                          <input 
                            type="text"
                            placeholder="新分類名稱"
                            className="flex-1 bg-cute-yellow/20 border-2 border-cute-yellow/30 rounded-2xl px-6 py-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 ring-cute-pink/10 transition-all"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                          />
                          <button 
                            onClick={handleAddCategory}
                            className="bg-cute-pink text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-cute-pink/20"
                          >
                            添加
                          </button>
                          <button 
                            onClick={() => setIsAddingCategory(false)}
                            className="bg-cute-yellow/30 text-k-accent px-6 py-3 rounded-2xl text-sm font-bold border border-cute-yellow/50"
                          >
                            取消
                          </button>
                        </motion.div>
                      )}
                    </div>

                    {/* Note & Date (Transaction Only) */}
                    {modalType === 'transaction' && (
                      <div className="grid grid-cols-1 gap-6">
                        <input 
                          type="text" 
                          placeholder="備註"
                          className="w-full bg-cute-yellow/20 border-2 border-cute-yellow/30 rounded-[2rem] px-8 py-5 text-base font-bold text-k-ink focus:bg-white focus:ring-4 ring-cute-pink/10 transition-all outline-none"
                          value={formData.note}
                          onChange={e => setFormData({...formData, note: e.target.value})}
                        />
                        <input 
                          type="date"
                          className="w-full bg-cute-yellow/20 border-2 border-cute-yellow/30 rounded-[2rem] px-8 py-5 text-base font-bold text-k-ink focus:bg-white focus:ring-4 ring-cute-pink/10 transition-all outline-none"
                          value={formData.date}
                          onChange={e => setFormData({...formData, date: e.target.value})}
                        />
                      </div>
                    )}
                  </>
                )}

                {(modalType === 'reminder') && (
                  <div className="space-y-8">
                    {/* Reminder Type Switch */}
                    <div className="flex bg-cute-yellow/20 p-2 rounded-[2.5rem] border-2 border-cute-yellow/30">
                      <button 
                        onClick={() => setFormData({...formData, reminderType: 'deposit'})}
                        className={cn(
                          "flex-1 py-4 rounded-[2rem] text-[11px] font-bold transition-all",
                          formData.reminderType === 'deposit' ? 'bg-white text-emerald-500 shadow-md' : 'text-k-accent/60'
                        )}
                      >
                        定期存款
                      </button>
                      <button 
                        onClick={() => setFormData({...formData, reminderType: 'debt'})}
                        className={cn(
                          "flex-1 py-4 rounded-[2rem] text-[11px] font-bold transition-all",
                          formData.reminderType === 'debt' ? 'bg-white text-rose-500 shadow-md' : 'text-k-accent/60'
                        )}
                      >
                        欠款
                      </button>
                      <button 
                        onClick={() => setFormData({...formData, reminderType: 'card'})}
                        className={cn(
                          "flex-1 py-4 rounded-[2rem] text-[11px] font-bold transition-all",
                          formData.reminderType === 'card' ? 'bg-white text-blue-500 shadow-md' : 'text-k-accent/60'
                        )}
                      >
                        信用卡還款
                      </button>
                    </div>

                    <div className="text-center">
                      <p className="text-[11px] font-bold text-k-accent uppercase tracking-widest mb-4">金額 (HKD)</p>
                      <input 
                        type="number" 
                        autoFocus
                        placeholder="0"
                        className="w-full bg-transparent border-none text-7xl font-black text-k-ink text-center outline-none tracking-tighter"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                      />
                    </div>
                    <input 
                      type="text" 
                      placeholder={formData.reminderType === 'deposit' ? '銀行' : '備註'}
                      className="w-full bg-cute-yellow/20 border-2 border-cute-yellow/30 rounded-[2rem] px-8 py-5 text-base font-bold text-k-ink focus:bg-white focus:ring-4 ring-cute-pink/10 transition-all outline-none"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                    <div className="space-y-4">
                      <p className="text-[11px] font-bold text-k-accent uppercase tracking-widest ml-2">
                        {formData.reminderType === 'deposit' ? '到期日' : '還款日'}
                      </p>
                      <input 
                        type="date"
                        className="w-full bg-cute-yellow/20 border-2 border-cute-yellow/30 rounded-[2rem] px-8 py-5 text-base font-bold text-k-ink focus:bg-white focus:ring-4 ring-cute-pink/10 transition-all outline-none"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                    {formData.reminderType === 'deposit' && (
                      <input 
                        type="number" 
                        placeholder="利息"
                        className="w-full bg-cute-yellow/20 border-2 border-cute-yellow/30 rounded-[2rem] px-8 py-5 text-base font-bold text-k-ink focus:bg-white focus:ring-4 ring-cute-pink/10 transition-all outline-none"
                        value={formData.interestRate}
                        onChange={e => setFormData({...formData, interestRate: e.target.value})}
                      />
                    )}
                  </div>
                )}

                <button 
                  onClick={handleSave}
                  className={cn(
                    "w-full py-6 rounded-[2.5rem] font-black text-white shadow-2xl transition-all active:scale-[0.98] mt-8 flex items-center justify-center gap-3 text-lg",
                    formData.type === 'expense' ? 'bg-cute-pink' : 'bg-emerald-400'
                  )}
                >
                  <Check size={24} /> {editingId ? '儲存' : '新增'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Budget Modal */}
      <AnimatePresence>
        {isBudgetModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-k-ink/40 backdrop-blur-sm" 
              onClick={() => setIsBudgetModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl relative z-[130] p-10 border-4 border-cute-pink"
            >
              <h3 className="text-2xl font-black text-k-ink mb-2 text-center">設定預算</h3>
              <p className="text-xs font-bold text-k-accent uppercase tracking-widest mb-8 text-center">{activeBudgetCategory}</p>
              
              <div className="space-y-8">
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-cute-pink/40 text-lg">HKD</span>
                  <input 
                    type="number"
                    autoFocus
                    className="w-full bg-cute-yellow/20 border-2 border-cute-yellow/30 rounded-[2rem] pl-20 pr-8 py-5 text-2xl font-black text-k-ink outline-none focus:ring-4 ring-cute-pink/10 transition-all"
                    value={budgetInputValue}
                    onChange={(e) => setBudgetInputValue(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsBudgetModalOpen(false)}
                    className="flex-1 py-4 rounded-[1.5rem] font-bold text-k-accent bg-cute-yellow/30 border border-cute-yellow/50 active:scale-95 transition-all"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      if (activeBudgetCategory) {
                        setCategoryBudgets(prev => ({ ...prev, [activeBudgetCategory]: Number(budgetInputValue) || 0 }));
                      }
                      setIsBudgetModalOpen(false);
                    }}
                    className="flex-1 py-4 rounded-[1.5rem] font-bold text-white bg-cute-pink shadow-lg shadow-cute-pink/20 active:scale-95 transition-all"
                  >
                    儲存
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sub-components ---

const CalendarView: React.FC<{ 
  transactions: Transaction[], 
  categoryBudgets: CategoryBudget,
  onDateClick: (date: Date) => void 
}> = ({ transactions, categoryBudgets, onDateClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let i = 1; i <= days; i++) calendarDays.push(new Date(year, month, i));
    
    return calendarDays;
  }, [currentMonth]);

  const dailyBudget = useMemo(() => {
    const totalBudget = (Object.values(categoryBudgets) as number[]).reduce((sum, b) => sum + b, 0);
    const days = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    return totalBudget / days;
  }, [categoryBudgets, currentMonth]);

  const getDayStats = (date: Date) => {
    const dayTrans = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === date.getFullYear() && 
             d.getMonth() === date.getMonth() && 
             d.getDate() === date.getDate();
    });
    
    const expense = dayTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const income = dayTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    
    return { expense, income, transactions: dayTrans };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-cute-pink/10 border-2 border-cute-pink"
    >
      <div className="flex justify-between items-center mb-8">
        <h3 className="font-black text-k-ink text-xl">
          {currentMonth.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })}
        </h3>
        <div className="flex gap-3">
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-3 bg-cute-pink/20 rounded-2xl text-rose-500 border border-cute-pink/30 active:scale-90 transition-all"
          >
            <ChevronRight size={18} className="rotate-180" />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-3 bg-cute-pink/20 rounded-2xl text-rose-500 border border-cute-pink/30 active:scale-90 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 mb-4">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="text-center text-xs font-bold text-k-accent uppercase tracking-widest">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3">
        {daysInMonth.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const { expense, income } = getDayStats(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const isOverDailyBudget = dailyBudget > 0 && expense > dailyBudget;

          return (
            <button 
              key={date.toISOString()} 
              onClick={() => onDateClick(date)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center gap-1 relative active:scale-90 transition-all border-2 rounded-2xl",
                isOverDailyBudget ? "border-rose-200 bg-rose-50/50" : "border-cute-yellow/30 hover:border-cute-pink"
              )}
            >
              {isToday && <div className="absolute inset-0 bg-cute-pink/30 rounded-2xl -z-10" />}
              <span className={cn("text-xs font-black", isToday ? "text-rose-500" : "text-k-ink/60")}>
                {date.getDate()}
              </span>
              
              <div className="flex flex-col items-center">
                {expense > 0 && (
                  <span className="text-[9px] font-black text-rose-400 tracking-tighter leading-none">
                    -${expense > 999 ? (expense/1000).toFixed(1) + 'k' : expense}
                  </span>
                )}
                {income > 0 && (
                  <span className="text-[9px] font-black text-emerald-400 tracking-tighter leading-none">
                    +${income > 999 ? (income/1000).toFixed(1) + 'k' : income}
                  </span>
                )}
              </div>

              <div className="flex gap-1 mt-1">
                {income > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                {expense > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

const TransactionItem: React.FC<{ item: Transaction, categories: Record<string, Record<string, CategoryConfig>>, onClick: () => void }> = ({ item, categories, onClick }) => {
  const isExpense = item.type === 'expense';
  const config = isExpense ? categories.EXPENSE[item.category] : categories.INCOME[item.category];
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="bg-white p-6 rounded-[2rem] flex items-center justify-between border-2 border-cute-pink/20 shadow-sm active:scale-95 transition-all group cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-4 rounded-2xl transition-transform group-hover:scale-105",
          config?.color || 'bg-cute-yellow/30'
        )}>
          {config?.icon ? IconMap[config.icon] : <Plus size={20}/>}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-black text-k-ink text-base leading-tight">{item.note || item.category}</h4>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-k-accent font-bold uppercase tracking-widest">
              {new Date(item.date).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' })}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cute-pink/50" />
            <span className="text-[11px] text-k-ink/40 font-bold uppercase tracking-widest">
              {item.category}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={cn(
            "font-black text-lg tracking-tighter flex items-center justify-end gap-0.5",
            isExpense ? 'text-rose-500' : 'text-emerald-500'
          )}>
            {isExpense ? '-' : '+'}
            ${item.amount.toLocaleString()}
          </p>
          <div className="flex items-center justify-end">
            {isExpense ? <ArrowDownRight size={12} className="text-rose-400" /> : <ArrowUpRight size={12} className="text-emerald-400" />}
          </div>
        </div>
        <ChevronRight size={16} className="text-cute-pink/40" />
      </div>
    </motion.div>
  );
};

const TabItem: React.FC<{ icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ icon, active, onClick }) => {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "p-4 rounded-[1.5rem] transition-all active:scale-75 relative",
        active ? 'text-rose-500 bg-cute-pink/40' : 'text-k-accent/40 hover:text-cute-pink'
      )}
    >
      {icon}
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-500"
        />
      )}
    </button>
  );
};

export default App;

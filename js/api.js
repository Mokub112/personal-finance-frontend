'use strict';

const API_BASE_URL = 'https://personal-finance-backend-7tx6.onrender.com/api';

const API = {
  // ส่ง Request ไป Backend พร้อม Token
  async request(path, options = {}) {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    return result.data;
  },

  // =========================
  // AUTHENTICATION
  // =========================
  async register(user) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: user.password
      })
    });

    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    return data.user;
  },

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    return data.user;
  },

  logout() {
    localStorage.removeItem('token');
  },

  // =========================
  // DASHBOARD
  // =========================
  getDashboard() {
    return this.request('/dashboard');
  },

  // =========================
  // TRANSACTIONS
  // =========================
  async getTransactions() {
    const data = await this.request('/transactions');

    return data.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      cat: t.category ?? t.cat ?? 'ไม่ระบุหมวดหมู่',
      name: t.description ?? t.name ?? t.category ?? 'ไม่ระบุชื่อรายการ',
      date: String(t.date).slice(0, 10)
    }));
  },

  createTransaction(t) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: t.type,
        amount: Number(t.amount),
        category: t.category || t.cat,
        description: t.description || t.name || '',
        date: t.date
      })
    });
  },

  deleteTransaction(id) {
    return this.request(
      `/transactions/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
  },

  // =========================
  // SAVING GOALS
  // =========================
  async getGoals() {
    return this.request('/goals');
  },

  createGoal(goal) {
    return this.request('/goals', {
      method: 'POST',
      body: JSON.stringify({
        title: goal.name,
        targetAmount: Number(goal.target),
        savedAmount: Number(goal.current || 0),
        deadline: goal.deadline || null
      })
    });
  },

  updateGoal(id, goal) {
    return this.request(`/goals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(goal.name !== undefined ? { title: goal.name } : {}),
        ...(goal.target !== undefined
          ? { targetAmount: Number(goal.target) }
          : {}),
        ...(goal.current !== undefined
          ? { savedAmount: Number(goal.current) }
          : {}),
        ...(goal.deadline !== undefined
          ? { deadline: goal.deadline || null }
          : {})
      })
    });
  },

  deleteGoal(id) {
    return this.request(
      `/goals/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
  }
};